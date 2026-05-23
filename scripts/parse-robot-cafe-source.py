from __future__ import annotations

import csv
import json
import os
import re
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime
from pathlib import Path

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def env_path(name: str, fallback: str) -> Path:
    return Path(os.environ.get(name, fallback))


MASTER_CSV_PATH = env_path(
    "RC_MASTER_UPDATE_PATH",
    r"C:\Users\user\Downloads\robot cafe update .csv",
)
APRIL_PAYROLL_PATH = env_path(
    "RC_APRIL_PAYROLL_PATH",
    r"C:\Users\user\OneDrive\Desktop\Solva Consult\Robots Cafe\Robots Docs\Robot Cafe Payroll 30th April 2026.xlsx",
)
NSSF_PATH = env_path(
    "RC_NSSF_PATH",
    r"C:\Users\user\OneDrive\Desktop\Solva Consult\Robots Cafe\Robots Docs\Statutories\RC NSSF 2026-03.xlsx",
)
SHA_PATH = env_path(
    "RC_SHA_PATH",
    r"C:\Users\user\OneDrive\Desktop\Solva Consult\Robots Cafe\Robots Docs\Statutories\RC SHA 2026-03.xlsx",
)


def safe_number(value: str | float | int | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    text = str(value).replace("KES", "").replace(",", "").strip()
    try:
        return round(float(text), 2)
    except Exception:
        return 0.0


def key_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def get_shared_strings(zipped: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zipped.namelist():
        return []
    root = ET.fromstring(zipped.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for item in root.findall("main:si", NS):
        strings.append("".join(node.text or "" for node in item.iterfind(".//main:t", NS)))
    return strings


def get_sheet_targets(zipped: zipfile.ZipFile) -> list[tuple[str, str]]:
    workbook = ET.fromstring(zipped.read("xl/workbook.xml"))
    rels_root = ET.fromstring(zipped.read("xl/_rels/workbook.xml.rels"))
    rels = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels_root.findall("pkgrel:Relationship", NS)
    }
    sheets: list[tuple[str, str]] = []
    for sheet in workbook.find("main:sheets", NS):
        relationship_id = sheet.attrib.get(f"{{{NS['rel']}}}id")
        target = rels.get(relationship_id, "")
        if not target.startswith("xl/"):
            target = "xl/" + target.lstrip("/")
        sheets.append((sheet.attrib.get("name", "Sheet1"), target))
    return sheets


def col_index(ref: str) -> int | None:
    match = re.match(r"([A-Z]+)(\d+)", ref)
    if not match:
        return None
    value = 0
    for char in match.group(1):
        value = value * 26 + (ord(char) - 64)
    return value


def read_cell(cell: ET.Element, shared: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value_node = cell.find("main:v", NS)
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iterfind(".//main:t", NS))
    if value_node is None:
        return ""
    raw = value_node.text or ""
    if cell_type == "s":
        try:
            return shared[int(raw)]
        except Exception:
            return raw
    return raw


def read_first_sheet_rows(path: Path) -> list[list[str]]:
    with zipfile.ZipFile(path) as zipped:
        shared = get_shared_strings(zipped)
        _, target = get_sheet_targets(zipped)[0]
        root = ET.fromstring(zipped.read(target))
        rows: list[list[str]] = []
        for row in root.findall(".//main:sheetData/main:row", NS):
            values: dict[int, str] = {}
            for cell in row.findall("main:c", NS):
                index = col_index(cell.attrib.get("r", ""))
                if index is None:
                    continue
                values[index] = read_cell(cell, shared)
            if not values:
                continue
            highest = max(values)
            rows.append([values.get(i, "") for i in range(1, highest + 1)])
        return rows


def infer_department(position: str) -> str:
    role = position.lower()
    if any(token in role for token in ["barista", "bar supervisor", "bar "]):
        return "Beverage"
    if any(token in role for token in ["waiter", "waitress", "hostess", "steward", "service"]):
        return "Service"
    if any(token in role for token in ["marketing", "social media", "film"]):
        return "Marketing"
    if "supervisor" in role or "manager" in role:
        return "Operations"
    return "Kitchen"


def infer_grade(full_salary: float) -> str:
    if full_salary <= 20000:
        return "RC-G1"
    if full_salary <= 25000:
        return "RC-G2"
    if full_salary <= 35000:
        return "RC-G3"
    if full_salary <= 50000:
        return "RC-G4"
    return "RC-G5"


def parse_hire_date(note: str, period: str) -> str:
    lowered = note.lower()
    if "27th march" in lowered:
        return "2026-03-27"
    if "1st may" in lowered:
        return "2026-05-01"
    if "1st march" in lowered or "hired from 1st march" in lowered:
        return "2026-03-01"
    if period.lower().startswith("may"):
        return "2026-05-01"
    return "2026-03-01"


def infer_role(note: str, full_name: str) -> str:
    lowered = note.lower()
    if "supervisor rights" in lowered or "supervises" in lowered:
        return "Supervisor"
    if full_name.lower() in {"brian niva", "william wambua", "derrick numi", "regina wariara kamau"}:
        return "Supervisor"
    return "Employee"


def infer_position(note: str, full_name: str) -> str:
    lowered = note.lower()
    if "hostess" in lowered:
        return "Hostess"
    if "waitress" in lowered:
        return "Waitress"
    if "waiter" in lowered:
        return "Waiter"
    if "barista" in lowered:
        return "Barista/Sushi Chef"
    if "chef" in lowered:
        return "Chef"
    if "steward" in lowered:
        return "Steward"
    if full_name.lower() == "regina wariara kamau":
        return "Sales & Marketing Manager"
    if full_name.lower() == "victor nandwa":
        return "Film & Social Media Specialist"
    return "Staff"


def infer_supervisor_name(position: str, full_name: str, role: str) -> str | None:
    if role == "Supervisor":
        return "General Manager"
    lowered_name = full_name.lower()
    if lowered_name == "victor nandwa":
        return "Regina Wariara Kamau"
    lowered = position.lower()
    if any(token in lowered for token in ["barista", "bar supervisor", "bar "]):
        return "William wambua"
    if any(token in lowered for token in ["waiter", "waitress", "hostess", "steward", "service"]):
        return "Brian Niva"
    if any(token in lowered for token in ["marketing", "social media", "film"]):
        return "Regina Wariara Kamau"
    return "Derrick Numi"


master_rows: list[dict[str, str]] = []
with open(MASTER_CSV_PATH, "r", encoding="utf-8-sig", newline="") as handle:
    reader = csv.reader(handle)
    next(reader, None)
    for row in reader:
        if not row or not row[0].strip():
            continue
        employee_label = row[0].strip()
        if employee_label.lower() == "general manager":
            continue
        parts = employee_label.split(" ", 1)
        employee_number = parts[0].strip()
        full_name = parts[1].strip() if len(parts) > 1 else employee_label
        master_rows.append(
            {
                "employeeNumber": employee_number,
                "fullName": re.sub(r"\s+", " ", full_name),
                "period": row[1].strip(),
                "grossPay": row[2].strip(),
                "email": row[3].strip(),
                "notes": row[4].strip() if len(row) > 4 else "",
            }
        )


nssf_rows = read_first_sheet_rows(NSSF_PATH)
sha_rows = read_first_sheet_rows(SHA_PATH)
april_rows = read_first_sheet_rows(APRIL_PAYROLL_PATH)

nssf_map: dict[str, dict[str, str]] = {}
for row in nssf_rows[1:]:
    if len(row) >= 6 and row[1]:
        nssf_map[key_name(row[1])] = {
            "nationalId": row[2].strip(),
            "kraPin": row[3].strip(),
            "nssfNumber": row[4].strip(),
        }

sha_map: dict[str, dict[str, str]] = {}
for row in sha_rows[1:]:
    if len(row) >= 9 and (row[1] or row[2]):
        name = " ".join(part.strip() for part in [row[1], row[2]] if part and part.strip())
        sha_map[key_name(name)] = {
            "nationalId": row[4].strip(),
            "kraPin": row[5].strip(),
            "shifNumber": row[6].strip(),
            "phone": row[8].strip(),
        }

april_payroll_map: dict[str, dict[str, object]] = {}
april_payroll_by_sno: dict[int, dict[str, object]] = {}
for row in april_rows[3:]:
    if not row or not row[0].strip().isdigit() or len(row) < 16:
        continue
    serial = int(row[0].strip())
    full_name = re.sub(r"\s+", " ", row[1].strip())
    payload = {
        "fullName": full_name,
        "position": row[2].strip(),
        "phone": row[3].strip(),
        "halfSalary": safe_number(row[4]),
        "fullSalary": safe_number(row[5]),
        "fifteenthPaid": safe_number(row[6]),
        "monthEndAmount": safe_number(row[7]),
        "appointmentSalary": safe_number(row[8]),
        "shif": safe_number(row[9]),
        "nssf": safe_number(row[10]),
        "employerNssf": safe_number(row[11]),
        "paye": safe_number(row[12]),
        "housingLevy": safe_number(row[13]),
        "employerHousingLevy": safe_number(row[14]),
        "monthEndNet": safe_number(row[15]),
        "variance": safe_number(row[16]),
        "remarks": row[17].strip() if len(row) > 17 else "",
    }
    april_payroll_map[key_name(full_name)] = payload
    april_payroll_by_sno[serial] = payload

employees: list[dict[str, object]] = []
april_payroll: list[dict[str, object]] = []

for row in master_rows:
    lookup_key = key_name(row["fullName"])
    employee_suffix = row["employeeNumber"].split("-")[-1]
    try:
        employee_serial = int(employee_suffix)
    except Exception:
        employee_serial = 0
    payroll_row = april_payroll_map.get(lookup_key, {})
    if not payroll_row and row["period"].lower().startswith("apr") and employee_serial:
        payroll_row = april_payroll_by_sno.get(employee_serial, {})
    nssf_row = nssf_map.get(lookup_key, {})
    sha_row = sha_map.get(lookup_key, {})
    effective_full_name = str(payroll_row.get("fullName") or row["fullName"]).strip()
    first_name, *rest = effective_full_name.split(" ")
    position = str(payroll_row.get("position") or infer_position(row["notes"], row["fullName"])).strip()
    full_salary = safe_number(payroll_row.get("fullSalary") or row["grossPay"])
    role = infer_role(row["notes"], row["fullName"])
    employee = {
        "employeeNumber": row["employeeNumber"],
        "sourcePayrollNumber": row["employeeNumber"],
        "firstName": first_name,
        "lastName": " ".join(rest) if rest else "Staff",
        "fullName": effective_full_name,
        "position": position,
        "departmentName": infer_department(position),
        "jobGradeCode": infer_grade(full_salary),
        "phone": str(payroll_row.get("phone") or sha_row.get("phone") or "").strip(),
        "nationalId": str(sha_row.get("nationalId") or nssf_row.get("nationalId") or "").strip(),
        "kraPin": str(sha_row.get("kraPin") or nssf_row.get("kraPin") or "").strip(),
        "nssfNumber": str(nssf_row.get("nssfNumber") or "").strip(),
        "shifNumber": str(sha_row.get("shifNumber") or "").strip(),
        "fullSalary": full_salary,
        "email": row["email"],
        "hireDate": parse_hire_date(row["notes"], row["period"]),
        "role": role,
        "supervisorName": infer_supervisor_name(position, row["fullName"], role),
        "notes": row["notes"],
    }
    employees.append(employee)

    if payroll_row:
        april_payroll.append(
            {
                **employee,
                "halfSalary": safe_number(payroll_row.get("halfSalary")),
                "fifteenthPaid": safe_number(payroll_row.get("fifteenthPaid")),
                "monthEndAmount": safe_number(payroll_row.get("monthEndAmount")),
                "shif": safe_number(payroll_row.get("shif")),
                "nssf": safe_number(payroll_row.get("nssf")),
                "employerNssf": safe_number(payroll_row.get("employerNssf")),
                "paye": safe_number(payroll_row.get("paye")),
                "housingLevy": safe_number(payroll_row.get("housingLevy")),
                "employerHousingLevy": safe_number(payroll_row.get("employerHousingLevy")),
                "monthEndNet": safe_number(payroll_row.get("monthEndNet")),
                "variance": safe_number(payroll_row.get("variance")),
                "remarks": str(payroll_row.get("remarks") or row["notes"]).strip(),
            }
        )


gross_total = round(sum(float(item["fullSalary"]) + max(float(item["variance"]), 0.0) for item in april_payroll), 2)
deductions_total = round(
    sum(
        float(item["shif"])
        + float(item["nssf"])
        + float(item["housingLevy"])
        + float(item["paye"])
        + abs(min(float(item["variance"]), 0.0))
        for item in april_payroll
    ),
    2,
)
net_total = round(sum(float(item["fifteenthPaid"]) + float(item["monthEndNet"]) for item in april_payroll), 2)

payload = {
    "organization": {
        "name": "Robot Cafe & Bistro",
        "identifier": "RCB",
        "address": "P.O. Box 80402 – 00100",
        "city": "Nairobi, Kenya",
        "country": "Kenya",
        "timezone": "Africa/Nairobi",
        "currency": "KES",
    },
    "employees": employees,
    "aprilPayroll": april_payroll,
    "totals": {
        "employeeCount": len(april_payroll),
        "grossPay": gross_total,
        "totalDeductions": deductions_total,
        "netPay": net_total,
        "shif": round(sum(float(item["shif"]) for item in april_payroll), 2),
        "nssf": round(sum(float(item["nssf"]) for item in april_payroll), 2),
        "housingLevy": round(sum(float(item["housingLevy"]) for item in april_payroll), 2),
        "paye": round(sum(float(item["paye"]) for item in april_payroll), 2),
    },
}

output_path = Path(__file__).with_name("robot-cafe-source.json")
output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(payload, ensure_ascii=False))
