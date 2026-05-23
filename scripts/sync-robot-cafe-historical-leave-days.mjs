import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const LEAVE_TYPE = "Annual Leave";
const DEFAULT_ENTITLEMENT = 21;
const TODAY = new Date().toISOString().slice(0, 10);

const TARGETS = [
  { label: "Edwin kisaka", aliases: ["Edwin kisaka", "Edwin Kisaka"], takenDays: 3 },
  { label: "Lavender kanguha", aliases: ["Lavender kanguha", "Lavender Kanguha"], takenDays: 8 },
  { label: "Judy bundi", aliases: ["Judy bundi", "Judy Bundi", "Judith Kerubo"], takenDays: 6 },
  { label: "Janis maina", aliases: ["Janis maina", "Janis Maina"], takenDays: 7 },
  { label: "Jane kinyua", aliases: ["Jane kinyua", "Jane Kinyua"], takenDays: 12 },
  { label: "Austin Nga'nga Gathoni", aliases: ["Austin Nga'nga Gathoni", "Austin Gathoni"], takenDays: 3 },
  { label: "Wilkister shivoko", aliases: ["Wilkister shivoko", "Willkister Shivoko", "Wilkister Shivoko"], takenDays: 2 },
  { label: "Ali Mapesa", aliases: ["Ali Mapesa"], takenDays: 3 },
  { label: "Brian Steve munyi", aliases: ["Brian Steve munyi", "Brian Steve", "Brian Munyi"], takenDays: 1 },
  { label: "Bonaventure Amboko", aliases: ["Bonaventure Amboko", "Bonventure Amboko"], takenDays: 1 },
  { label: "Nickson odinga", aliases: ["Nickson odinga", "Nick Odinga"], takenDays: 1 },
  { label: "Linus mulimo", aliases: ["Linus mulimo", "Linus Muhemo"], takenDays: 3 },
  { label: "Christine Syombua Mwongela", aliases: ["Christine Syombua Mwongela"], takenDays: 6 },
];

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

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildMatcher(aliases) {
  const normalizedAliases = aliases.map((value) => normalize(value)).filter(Boolean);
  return (employee) => {
    const fullName = normalize(employee.fullName);
    return normalizedAliases.some((alias) => fullName === alias);
  };
}

async function main() {
  await loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("supabase_admin_env_missing");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: employees, error: employeeError } = await admin
    .from("employees")
    .select("id, employee_number, first_name, last_name, status")
    .eq("company_id", COMPANY_ID);

  if (employeeError) throw employeeError;

  const employeeRows = (employees ?? []).map((employee) => ({
    id: employee.id,
    employeeNumber: employee.employee_number,
    fullName: `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim(),
    status: employee.status,
  }));

  const { data: balances, error: balanceError } = await admin
    .from("leave_balances")
    .select("id, employee_id, leave_type, opening_balance, accrued_days, taken_days, pending_days, balance_days, as_of_date")
    .eq("company_id", COMPANY_ID)
    .eq("leave_type", LEAVE_TYPE)
    .order("as_of_date", { ascending: false });

  if (balanceError) throw balanceError;

  const latestBalanceByEmployee = new Map();
  for (const row of balances ?? []) {
    if (!latestBalanceByEmployee.has(row.employee_id)) {
      latestBalanceByEmployee.set(row.employee_id, row);
    }
  }

  const applied = [];
  const unresolved = [];

  for (const target of TARGETS) {
    const employee = employeeRows.find(buildMatcher(target.aliases));
    if (!employee) {
      unresolved.push({ target: target.label, reason: "employee_not_found" });
      continue;
    }

    const existing = latestBalanceByEmployee.get(employee.id) ?? null;
    const openingBalance = Number(existing?.opening_balance ?? DEFAULT_ENTITLEMENT);
    const accruedDays = Number(existing?.accrued_days ?? openingBalance);
    const pendingDays = Number(existing?.pending_days ?? 0);
    const displayBase = openingBalance > 0 ? openingBalance : accruedDays;
    const balanceDays = Math.max(0, displayBase - target.takenDays);

    if (existing?.id) {
      const { error: updateError } = await admin
        .from("leave_balances")
        .update({
          opening_balance: openingBalance,
          accrued_days: accruedDays,
          taken_days: target.takenDays,
          pending_days: pendingDays,
          balance_days: balanceDays,
        })
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await admin
        .from("leave_balances")
        .insert({
          company_id: COMPANY_ID,
          employee_id: employee.id,
          leave_type: LEAVE_TYPE,
          opening_balance: openingBalance,
          accrued_days: accruedDays,
          taken_days: target.takenDays,
          pending_days: pendingDays,
          balance_days: balanceDays,
          as_of_date: TODAY,
        });

      if (insertError) throw insertError;
    }

    applied.push({
      employeeNumber: employee.employeeNumber,
      employeeName: employee.fullName,
      takenDays: target.takenDays,
      balanceDays,
    });
  }

  console.log(
    JSON.stringify(
      {
        companyId: COMPANY_ID,
        leaveType: LEAVE_TYPE,
        applied,
        unresolved,
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
