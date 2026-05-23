import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

const WORKBOOK_PATH = "C:/Users/user/Downloads/Robot Cafe Statutories April 2026 (1).xlsx";
const COMPANY_NAME = "Robot Cafe & Bistro";

async function loadLocalEnv() {
  try {
    const envFile = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore
  }
}

async function loadSupabaseAdmin() {
  await loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("supabase_admin_env_missing");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeEmployeeNumber(value) {
  const raw = clean(value).toUpperCase().replace(/\s+/g, "");
  const match = raw.match(/^RC-?(\d{1,3})$/);
  if (!match) {
    return raw;
  }
  return `RC-${match[1].padStart(3, "0")}`;
}

function normalizeDocumentValue(value) {
  const cleaned = clean(value);
  if (!cleaned || cleaned === "-" || cleaned.toLowerCase() === "null") {
    return "";
  }
  return cleaned;
}

function isBlank(value) {
  return !normalizeDocumentValue(value);
}

function parseWorkbook() {
  const workbook = XLSX.readFile(WORKBOOK_PATH);
  const rowsByEmployee = new Map();

  const ensureRow = (employeeNumber) => {
    const normalized = normalizeEmployeeNumber(employeeNumber);
    if (!normalized) return null;
    if (!rowsByEmployee.has(normalized)) {
      rowsByEmployee.set(normalized, {
        employeeNumber: normalized,
        nationalId: "",
        kraPin: "",
        nssfNumber: "",
        shifNumber: "",
      });
    }
    return rowsByEmployee.get(normalized);
  };

  const nssfRows = XLSX.utils.sheet_to_json(workbook.Sheets["Nssf2026-04"], { defval: "" });
  for (const row of nssfRows) {
    const target = ensureRow(row["PAYROLL NUMBER"]);
    if (!target) continue;
    const nationalId = normalizeDocumentValue(row["ID NO"]);
    const nssfNumber = normalizeDocumentValue(row["NSSF NO"]);
    if (nationalId) target.nationalId = nationalId;
    if (nssfNumber) target.nssfNumber = nssfNumber;
  }

  const shaRows = XLSX.utils.sheet_to_json(workbook.Sheets["SHA2026-04"], { defval: "" });
  for (const row of shaRows) {
    const target = ensureRow(row["PAYROLL NUMBER"]);
    if (!target) continue;
    const nationalId = normalizeDocumentValue(row["ID NO"]);
    const kraPin = normalizeDocumentValue(row["KRA PIN"]);
    const shifNumber = normalizeDocumentValue(row["NHIF NO"]);
    if (nationalId) target.nationalId = nationalId;
    if (kraPin) target.kraPin = kraPin;
    if (shifNumber) target.shifNumber = shifNumber;
  }

  const itaxRows = XLSX.utils.sheet_to_json(workbook.Sheets["ITAX2026-04"], { defval: "" });
  for (const row of itaxRows) {
    const target = ensureRow(row["PAYROLL NUMBER"]);
    if (!target) continue;
    const nationalId = normalizeDocumentValue(row["ID NO"]);
    const kraPin = normalizeDocumentValue(row["KRA PIN"]);
    if (nationalId) target.nationalId = nationalId;
    if (kraPin) target.kraPin = kraPin;
  }

  return rowsByEmployee;
}

async function main() {
  const admin = await loadSupabaseAdmin();
  const workbookRows = parseWorkbook();

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id")
    .ilike("name", COMPANY_NAME)
    .maybeSingle();

  if (companyError || !company?.id) {
    throw companyError ?? new Error("robot_cafe_company_not_found");
  }

  const { data: employees, error: employeesError } = await admin
    .from("employees")
    .select("id, employee_number, national_id, kra_pin, shif_number, nssf_number")
    .eq("company_id", company.id)
    .order("employee_number", { ascending: true });

  if (employeesError) {
    throw employeesError;
  }

  const updates = [];
  const unmatchedWorkbookRows = [];

  for (const [employeeNumber, workbookRow] of workbookRows.entries()) {
    const employee = (employees ?? []).find((row) => normalizeEmployeeNumber(row.employee_number) === employeeNumber);
    if (!employee) {
      unmatchedWorkbookRows.push(employeeNumber);
      continue;
    }

    const patch = {};

    if (isBlank(employee.national_id) && workbookRow.nationalId) {
      patch.national_id = workbookRow.nationalId;
    }
    if (isBlank(employee.kra_pin) && workbookRow.kraPin) {
      patch.kra_pin = workbookRow.kraPin;
    }
    if (isBlank(employee.nssf_number) && workbookRow.nssfNumber) {
      patch.nssf_number = workbookRow.nssfNumber;
    }
    if (isBlank(employee.shif_number) && workbookRow.shifNumber) {
      patch.shif_number = workbookRow.shifNumber;
    }

    if (!Object.keys(patch).length) {
      continue;
    }

    const { error: updateError } = await admin
      .from("employees")
      .update(patch)
      .eq("id", employee.id)
      .eq("company_id", company.id);

    if (updateError) {
      throw updateError;
    }

    updates.push({
      employeeNumber,
      updatedFields: patch,
    });
  }

  const summary = {
    workbookPath: WORKBOOK_PATH,
    companyId: company.id,
    workbookRows: workbookRows.size,
    updatedEmployees: updates.length,
    updatedFieldCounts: {
      nationalId: updates.filter((item) => "national_id" in item.updatedFields).length,
      kraPin: updates.filter((item) => "kra_pin" in item.updatedFields).length,
      nssfNumber: updates.filter((item) => "nssf_number" in item.updatedFields).length,
      shifNumber: updates.filter((item) => "shif_number" in item.updatedFields).length,
    },
    unmatchedWorkbookRows,
    updates,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
