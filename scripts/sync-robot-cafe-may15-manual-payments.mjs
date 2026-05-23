import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const PAYROLL_RUN_ID = "2d2779ea-26ce-4ebb-96b4-1ee0907360df";
const WORKBOOK_PATH = "C:/Robots Docs/Robot - net-to-mpesa-may-2026.xlsx";
const MANAGEMENT_DEDUCTION_LABEL = "Management Adjustment";

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

function roundAmount(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function parseWorkbook() {
  const workbook = XLSX.readFile(WORKBOOK_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    range: 1,
    header: ["sno", "employeeNumber", "employeeName", "department", "bank", "accountNumber", "netPay", "notes"],
  });
  const mapped = new Map();

  for (const row of rows) {
    const employeeNumber = String(row.employeeNumber ?? "").trim();
    if (!employeeNumber || !employeeNumber.startsWith("RC-")) {
      continue;
    }

    const netPay = roundAmount(row.netPay ?? 0);
    const phone = String(row.accountNumber ?? "").trim();

    mapped.set(employeeNumber, {
      employeeNumber,
      netPay,
      phone,
    });
  }

  return mapped;
}

async function main() {
  const admin = await loadSupabaseAdmin();
  const workbookRows = parseWorkbook();

  const { data: payrollRows, error: payrollRowsError } = await admin
    .from("payroll_employees")
    .select("id, employee_id, gross_pay, net_pay, basic_salary, deductions, employee:employee_id(employee_number, phone)")
    .eq("payroll_run_id", PAYROLL_RUN_ID)
    .order("created_at", { ascending: true });

  if (payrollRowsError) {
    throw payrollRowsError;
  }

  const updates = [];
  for (const row of payrollRows ?? []) {
    const employee = row.employee ?? {};
    const employeeNumber = String(employee.employee_number ?? "").trim();
    const workbookRow = workbookRows.get(employeeNumber);
    if (!workbookRow) {
      continue;
    }

    const grossPay = roundAmount(row.gross_pay);
    const currentNetPay = roundAmount(row.net_pay);
    const targetNetPay = roundAmount(workbookRow.netPay);
    const managementDeduction = roundAmount(Math.max(0, grossPay - targetNetPay));
    const currentDeductions = row.deductions && typeof row.deductions === "object" ? { ...row.deductions } : {};

    currentDeductions[MANAGEMENT_DEDUCTION_LABEL] = managementDeduction;

    if (currentNetPay === targetNetPay && roundAmount(Number(currentDeductions[MANAGEMENT_DEDUCTION_LABEL] ?? 0)) === managementDeduction) {
      continue;
    }

    updates.push({
      id: row.id,
      employeeNumber,
      grossPay,
      previousNetPay: currentNetPay,
      targetNetPay,
      managementDeduction,
      deductions: currentDeductions,
      phone: workbookRow.phone,
      employeeId: row.employee_id,
    });
  }

  for (const update of updates) {
    const { error: updatePayrollRowError } = await admin
      .from("payroll_employees")
      .update({
        net_pay: update.targetNetPay,
        deductions: update.deductions,
      })
      .eq("id", update.id);

    if (updatePayrollRowError) {
      throw updatePayrollRowError;
    }

    if (update.phone) {
      const { error: employeeUpdateError } = await admin
        .from("employees")
        .update({ phone: update.phone })
        .eq("id", update.employeeId)
        .eq("company_id", COMPANY_ID);

      if (employeeUpdateError) {
        throw employeeUpdateError;
      }
    }
  }

  const { data: refreshedRows, error: refreshedRowsError } = await admin
    .from("payroll_employees")
    .select("gross_pay, net_pay")
    .eq("payroll_run_id", PAYROLL_RUN_ID);

  if (refreshedRowsError) {
    throw refreshedRowsError;
  }

  const totals = (refreshedRows ?? []).reduce(
    (accumulator, row) => {
      const gross = roundAmount(row.gross_pay);
      const net = roundAmount(row.net_pay);
      accumulator.grossPay = roundAmount(accumulator.grossPay + gross);
      accumulator.netPay = roundAmount(accumulator.netPay + net);
      return accumulator;
    },
    { grossPay: 0, netPay: 0 }
  );

  const totalDeductions = roundAmount(totals.grossPay - totals.netPay);

  const { data: existingRun, error: runLookupError } = await admin
    .from("payroll_runs")
    .select("metadata, employer_cost")
    .eq("id", PAYROLL_RUN_ID)
    .maybeSingle();

  if (runLookupError) {
    throw runLookupError;
  }

  const metadata =
    existingRun?.metadata && typeof existingRun.metadata === "object" ? { ...existingRun.metadata } : {};
  metadata.manualNetPayImport = {
    source: "Robot - net-to-mpesa-may-2026.xlsx",
    appliedAt: new Date().toISOString(),
    updatedRows: updates.map((row) => ({
      employeeNumber: row.employeeNumber,
      previousNetPay: row.previousNetPay,
      targetNetPay: row.targetNetPay,
      managementDeduction: row.managementDeduction,
    })),
  };

  const { error: runUpdateError } = await admin
    .from("payroll_runs")
    .update({
      gross_pay: totals.grossPay,
      net_pay: totals.netPay,
      total_deductions: totalDeductions,
      employer_cost: existingRun?.employer_cost ?? totals.grossPay,
      metadata,
    })
    .eq("id", PAYROLL_RUN_ID);

  if (runUpdateError) {
    throw runUpdateError;
  }

  console.log(
    JSON.stringify(
      {
        runId: PAYROLL_RUN_ID,
        updatedRows: updates,
        totals: {
          grossPay: totals.grossPay,
          netPay: totals.netPay,
          totalDeductions,
        },
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
