import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const TODAY = new Date().toISOString().slice(0, 10);
const ANNUAL_LEAVE = "Annual Leave";
const ENTITLEMENT = 21;

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

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isOffboardedStatus(status) {
  const normalized = normalize(status);
  return ["separated", "terminated", "dismissed", "offboarded", "exited"].some((token) =>
    normalized.includes(token)
  );
}

function buildEmployeeMatcher(fullName) {
  const normalized = normalize(fullName);
  const tokens = normalized.split(" ").filter(Boolean);
  return (employee) => {
    const employeeName = normalize(`${employee.first_name ?? ""} ${employee.last_name ?? ""}`);
    if (employeeName === normalized) {
      return true;
    }

    if (tokens.length === 1) {
      return employeeName.includes(tokens[0]);
    }

    return tokens.every((token) => employeeName.includes(token));
  };
}

async function main() {
  const admin = await loadSupabaseAdmin();

  const shiftPayload = [
    { code: "AM", name: "AM Shift", start_time: "06:30", end_time: "15:00", break_minutes: 30, overtime_eligible: true, status: "active" },
    { code: "SWING", name: "Swing Shift", start_time: "11:00", end_time: "20:00", break_minutes: 30, overtime_eligible: true, status: "active" },
    { code: "PM", name: "PM Shift", start_time: "15:00", end_time: "23:00", break_minutes: 30, overtime_eligible: true, status: "active" },
  ].map((item) => ({ ...item, company_id: COMPANY_ID }));

  const { error: shiftError } = await admin
    .from("shifts")
    .upsert(shiftPayload, { onConflict: "company_id,code" });

  if (shiftError) {
    throw shiftError;
  }

  const { data: employees, error: employeeError } = await admin
    .from("employees")
    .select("id, employee_number, first_name, last_name, status")
    .eq("company_id", COMPANY_ID);

  if (employeeError) {
    throw employeeError;
  }

  const activeEmployees = (employees ?? []).filter((employee) => !isOffboardedStatus(employee.status));

  const baselineRows = activeEmployees.map((employee) => ({
    company_id: COMPANY_ID,
    employee_id: employee.id,
    leave_type: ANNUAL_LEAVE,
    opening_balance: ENTITLEMENT,
    accrued_days: ENTITLEMENT,
    taken_days: 0,
    pending_days: 0,
    balance_days: ENTITLEMENT,
    as_of_date: TODAY,
  }));

  const { error: baselineError } = await admin
    .from("leave_balances")
    .upsert(baselineRows, { onConflict: "employee_id,leave_type,as_of_date" });

  if (baselineError) {
    throw baselineError;
  }

  const namedAdjustments = [
    { matcher: buildEmployeeMatcher("Bonventure"), takenDays: 1, balanceDays: 20 },
    { matcher: buildEmployeeMatcher("Brian Steve"), takenDays: 1, balanceDays: 20 },
    { matcher: buildEmployeeMatcher("Divinah Moke"), takenDays: 3, balanceDays: 18 },
    { matcher: buildEmployeeMatcher("Mercy Ogoda"), takenDays: 6, balanceDays: 15 },
    { matcher: buildEmployeeMatcher("Linos Muhemo"), takenDays: 15, balanceDays: 6 },
    { matcher: buildEmployeeMatcher("Linus Muhemo"), takenDays: 15, balanceDays: 6 },
  ];

  const applied = [];
  const seenEmployeeIds = new Set();
  for (const adjustment of namedAdjustments) {
    const employee = activeEmployees.find((item) => adjustment.matcher(item));
    if (!employee || seenEmployeeIds.has(employee.id)) {
      continue;
    }

    seenEmployeeIds.add(employee.id);
    const { error: adjustmentError } = await admin
      .from("leave_balances")
      .update({
        opening_balance: ENTITLEMENT,
        accrued_days: ENTITLEMENT,
        taken_days: adjustment.takenDays,
        pending_days: 0,
        balance_days: adjustment.balanceDays,
      })
      .eq("employee_id", employee.id)
      .eq("leave_type", ANNUAL_LEAVE)
      .eq("as_of_date", TODAY);

    if (adjustmentError) {
      throw adjustmentError;
    }

    applied.push({
      employee_number: employee.employee_number,
      full_name: `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim(),
      taken_days: adjustment.takenDays,
      balance_days: adjustment.balanceDays,
    });
  }

  console.log(
    JSON.stringify(
      {
        shiftsUpdated: shiftPayload.map((item) => ({
          code: item.code,
          start_time: item.start_time,
          end_time: item.end_time,
        })),
        annualLeaveResetCount: baselineRows.length,
        namedAdjustmentsApplied: applied,
        asOfDate: TODAY,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
