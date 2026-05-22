import * as XLSX from "xlsx";

export const ROBOT_CAFE_COMPANY_ID = "33333333-3333-3333-3333-333333333333";

export type RobotCafeShiftCode = "AM" | "SWING" | "PM" | "OFF" | "LEAVE";
export type RosterPeriodType = "weekly" | "monthly";

export type ShiftTemplateEmployee = {
  employeeId: string;
  staffNumber: string;
  employeeName: string;
  department: string;
};

export type ShiftTemplateDefinition = {
  code: RobotCafeShiftCode;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  overtimeEligible: boolean;
};

export type ParsedRosterCell = {
  rowNumber: number;
  staffNumber: string;
  employeeName: string;
  date: string;
  shiftCode: RobotCafeShiftCode;
};

export type ParsedRosterIssue = {
  rowNumber: number;
  staffNumber: string;
  employeeName: string;
  date?: string;
  columnNumber?: number;
  message: string;
};

export const ROBOT_CAFE_SHIFT_DEFINITIONS: ShiftTemplateDefinition[] = [
  {
    code: "AM",
    name: "AM Shift",
    startTime: "06:30",
    endTime: "15:00",
    breakMinutes: 30,
    overtimeEligible: true,
  },
  {
    code: "SWING",
    name: "Swing Shift",
    startTime: "11:00",
    endTime: "20:00",
    breakMinutes: 30,
    overtimeEligible: true,
  },
  {
    code: "PM",
    name: "PM Shift",
    startTime: "15:00",
    endTime: "23:00",
    breakMinutes: 30,
    overtimeEligible: true,
  },
  {
    code: "OFF",
    name: "Off Day",
    startTime: "00:00",
    endTime: "00:00",
    breakMinutes: 0,
    overtimeEligible: false,
  },
  {
    code: "LEAVE",
    name: "Leave",
    startTime: "00:00",
    endTime: "00:00",
    breakMinutes: 0,
    overtimeEligible: false,
  },
];

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(date: Date) {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function resolveRosterPeriod(
  periodType: string | null | undefined,
  startDateValue: string | null | undefined
) {
  const normalizedPeriod: RosterPeriodType = periodType === "monthly" ? "monthly" : "weekly";
  const seedDate = startDateValue ? new Date(startDateValue) : new Date();
  const baseDate = Number.isNaN(seedDate.getTime()) ? new Date() : seedDate;
  const startDate = normalizedPeriod === "monthly" ? startOfMonth(baseDate) : startOfWeek(baseDate);
  const endDate =
    normalizedPeriod === "monthly"
      ? new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
      : addDays(startDate, 6);
  const dates: string[] = [];
  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    dates.push(toIsoDate(cursor));
  }

  return {
    periodType: normalizedPeriod,
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
    dates,
    label:
      normalizedPeriod === "monthly"
        ? new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric" }).format(startDate)
        : `${toIsoDate(startDate)} to ${toIsoDate(endDate)}`,
  };
}

export function buildRobotCafeRosterTemplateWorkbook(input: {
  organizationName: string;
  supervisorName: string;
  periodType: RosterPeriodType;
  startDate: string;
  employees: ShiftTemplateEmployee[];
}) {
  const period = resolveRosterPeriod(input.periodType, input.startDate);
  const workbook = XLSX.utils.book_new();
  const title = `${input.organizationName} Shift Allocation Template`;
  const rows: Array<Array<string>> = [
    [title],
    [`Supervisor: ${input.supervisorName}`],
    [`Roster period: ${period.label} (${period.periodType})`],
    ["Allowed codes: AM, SWING, PM, OFF, LEAVE"],
    [],
    [
      "Staff Number",
      "Employee Name",
      "Department",
      "Roster Period Type",
      "Roster Label",
      ...period.dates,
    ],
    ...input.employees.map((employee) => [
      employee.staffNumber,
      employee.employeeName,
      employee.department,
      period.periodType,
      period.label,
      ...period.dates.map(() => ""),
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 16 },
    { wch: 28 },
    { wch: 20 },
    { wch: 16 },
    { wch: 24 },
    ...period.dates.map(() => ({ wch: 14 })),
  ];
  sheet["!freeze"] = { xSplit: 5, ySplit: 6 };

  const legendSheet = XLSX.utils.aoa_to_sheet([
    ["Robot Cafe Shift Legend"],
    ["Code", "Meaning", "Time"],
    ["AM", "AM Shift", "6:30 AM - 3:00 PM"],
    ["SWING", "Swing Shift", "11:00 AM - 8:00 PM"],
    ["PM", "PM Shift", "3:00 PM - 11:00 PM"],
    ["OFF", "Off Day", "No scheduled shift"],
    ["LEAVE", "Approved Leave", "Leave day marker"],
    [],
    ["Powered by Solva HR"],
  ]);
  legendSheet["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 24 }];

  XLSX.utils.book_append_sheet(workbook, sheet, "Roster");
  XLSX.utils.book_append_sheet(workbook, legendSheet, "Legend");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  }) as Buffer;

  return {
    fileName: `robot-cafe-roster-${period.periodType}-${period.startDate}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: new Uint8Array(buffer),
    period,
  };
}

function normalizeShiftCode(value: string): RobotCafeShiftCode | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (["AM", "AM SHIFT"].includes(normalized)) return "AM";
  if (["SWING", "SWING SHIFT"].includes(normalized)) return "SWING";
  if (["PM", "PM SHIFT"].includes(normalized)) return "PM";
  if (["OFF", "OFF DAY"].includes(normalized)) return "OFF";
  if (["LEAVE", "LV"].includes(normalized)) return "LEAVE";
  return null;
}

export function parseRobotCafeRosterWorkbook(fileBytes: Uint8Array) {
  const workbook = XLSX.read(fileBytes, { type: "array" });
  const [sheetName] = workbook.SheetNames;
  if (!sheetName) {
    throw new Error("empty_roster_workbook");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Array<string>>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  const headerRowIndex = rows.findIndex((row) => String(row?.[0] ?? "").trim().toLowerCase() === "staff number");
  if (headerRowIndex === -1) {
    throw new Error("invalid_roster_template_headers");
  }

  const headers = rows[headerRowIndex] ?? [];
  const fixedColumnCount = 5;
  if (headers.length <= fixedColumnCount) {
    throw new Error("invalid_roster_template_dates");
  }

  const dateColumns = headers.slice(fixedColumnCount).map((value) => String(value).trim());
  const invalidDateHeader = dateColumns.find((value) => Number.isNaN(new Date(value).getTime()));
  if (invalidDateHeader) {
    throw new Error(`invalid_roster_date_header:${invalidDateHeader}`);
  }

  const assignments: ParsedRosterCell[] = [];
  const issues: ParsedRosterIssue[] = [];
  const seenKeys = new Set<string>();

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const staffNumber = String(row[0] ?? "").trim().toUpperCase();
    const employeeName = String(row[1] ?? "").trim();

    if (!staffNumber && !employeeName) {
      continue;
    }

    for (let dateIndex = 0; dateIndex < dateColumns.length; dateIndex += 1) {
      const rawCode = String(row[fixedColumnCount + dateIndex] ?? "").trim();
      if (!rawCode) {
        continue;
      }

      const shiftCode = normalizeShiftCode(rawCode);
      if (!shiftCode) {
        issues.push({
          rowNumber: rowIndex + 1,
          staffNumber,
          employeeName,
          date: dateColumns[dateIndex],
          columnNumber: fixedColumnCount + dateIndex + 1,
          message: `Invalid shift code "${rawCode}". Use AM, SWING, PM, OFF, or LEAVE.`,
        });
        continue;
      }

      const assignmentDate = dateColumns[dateIndex];
      const dedupeKey = `${staffNumber}:${assignmentDate}`;
      if (seenKeys.has(dedupeKey)) {
        issues.push({
          rowNumber: rowIndex + 1,
          staffNumber,
          employeeName,
          date: assignmentDate,
          columnNumber: fixedColumnCount + dateIndex + 1,
          message: "Duplicate shift assignment for the same employee and date.",
        });
        continue;
      }

      seenKeys.add(dedupeKey);
      assignments.push({
        rowNumber: rowIndex + 1,
        staffNumber,
        employeeName,
        date: assignmentDate,
        shiftCode,
      });
    }
  }

  return {
    sheetName,
    headerRowIndex,
    periodStart: dateColumns[0],
    periodEnd: dateColumns[dateColumns.length - 1],
    dateColumns,
    assignments,
    issues,
  };
}
