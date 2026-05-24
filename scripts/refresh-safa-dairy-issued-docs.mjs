import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "46604299-3e3b-43b5-8722-d088082ed3bd";
const BASE_URL = process.env.SOLVA_BASE_URL ?? "https://solvahr.co.ke";
const LOGIN = {
  email: "timothy.kamwilwa@solvahr.co.ke",
  password: "SafaDairyHR#2026",
};

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
  if (value == null) return fallback;
  return String(value).trim() || fallback;
}

function cookieHeaderFromSetCookie(setCookieValues) {
  return setCookieValues
    .map((entry) => safeString(entry).split(";")[0])
    .filter(Boolean)
    .join("; ");
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

async function loginToApp() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(LOGIN),
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

async function issueDocument(cookieHeader, employeeId, kind) {
  const response = await fetch(`${BASE_URL}/api/people/employees/${employeeId}/hr-documents`, {
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
  const admin = await createAdminClient();
  const employeesResult = await admin
    .from("employees")
    .select("id, employee_number, first_name, last_name, status")
    .eq("company_id", COMPANY_ID)
    .order("employee_number", { ascending: true });

  if (employeesResult.error) {
    throw employeesResult.error;
  }

  const employees = (employeesResult.data ?? []).filter((row) => safeString(row.status).toLowerCase() === "active");
  const cookieHeader = await loginToApp();
  const refreshed = [];

  for (const employee of employees) {
    const contract = await issueDocument(cookieHeader, safeString(employee.id), "contract");
    const appointmentLetter = await issueDocument(cookieHeader, safeString(employee.id), "appointment_letter");
    refreshed.push({
      employeeNumber: safeString(employee.employee_number),
      employeeName: `${safeString(employee.first_name)} ${safeString(employee.last_name)}`.trim(),
      contract: contract.document,
      appointmentLetter: appointmentLetter.document,
    });
  }

  console.log(
    JSON.stringify(
      {
        refreshedCount: refreshed.length,
        refreshed,
      },
      null,
      2
    )
  );
}

await main();
