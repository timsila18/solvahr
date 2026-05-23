import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const HR_ADMIN_EMAIL = "hr.admin@solvahr.co.ke";
const HR_ADMIN_PASSWORD = "RobotCafe#HR2026";
const DEFAULT_BASE_URL = process.env.SOLVA_BASE_URL ?? "https://solvahr.co.ke";

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
    // ignore missing env
  }
}

function safeString(value, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value == null) {
    return fallback;
  }
  return String(value).trim() || fallback;
}

function cookieHeaderFromSetCookie(setCookieValues) {
  return setCookieValues
    .map((entry) => safeString(entry).split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function loginToApp(baseUrl) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: HR_ADMIN_EMAIL,
      password: HR_ADMIN_PASSWORD,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`login_failed:${payload?.error ?? response.status}`);
  }

  const setCookie = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const cookieHeader = cookieHeaderFromSetCookie(setCookie);

  if (!cookieHeader) {
    throw new Error("login_cookie_missing");
  }

  return cookieHeader;
}

async function createAdminClient() {
  await loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("missing_supabase_admin_environment");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function listRobotCafeStaff(admin) {
  const { data, error } = await admin
    .from("employees")
    .select("id, employee_number, first_name, last_name, status")
    .eq("company_id", COMPANY_ID)
    .like("employee_number", "RC-%")
    .order("employee_number", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).filter((row) => safeString(row.status).toLowerCase() === "active");
}

async function issueDocument(baseUrl, cookieHeader, employeeId, kind) {
  const response = await fetch(`${baseUrl}/api/people/employees/${employeeId}/hr-documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      kind,
      autoApprove: true,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${kind}_failed:${payload?.error ?? response.status}`);
  }

  return payload;
}

async function main() {
  const baseUrl = process.argv[2] ? safeString(process.argv[2]) : DEFAULT_BASE_URL;
  const admin = await createAdminClient();
  const staff = await listRobotCafeStaff(admin);
  const cookieHeader = await loginToApp(baseUrl);

  const summary = {
    baseUrl,
    totalStaff: staff.length,
    generatedContracts: 0,
    generatedAppointmentLetters: 0,
    failures: [],
  };

  for (const employee of staff) {
    const employeeName = `${safeString(employee.first_name)} ${safeString(employee.last_name)}`.trim();

    try {
      await issueDocument(baseUrl, cookieHeader, safeString(employee.id), "contract");
      summary.generatedContracts += 1;
    } catch (error) {
      summary.failures.push({
        employeeNumber: safeString(employee.employee_number),
        employeeName,
        kind: "contract",
        error: error instanceof Error ? error.message : "unknown_error",
      });
      continue;
    }

    try {
      await issueDocument(baseUrl, cookieHeader, safeString(employee.id), "appointment_letter");
      summary.generatedAppointmentLetters += 1;
    } catch (error) {
      summary.failures.push({
        employeeNumber: safeString(employee.employee_number),
        employeeName,
        kind: "appointment_letter",
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

await main();
