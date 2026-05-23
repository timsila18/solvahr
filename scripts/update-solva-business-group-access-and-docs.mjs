import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "2742dd9d-f689-48bf-aaec-652b9731de6a";
const DEFAULT_BASE_URL = process.env.SOLVA_BASE_URL ?? "https://solvahr.co.ke";
const DOCUMENT_ADMIN_LOGIN = {
  email: "payroll.operator.sbg@solvahr.co.ke",
  password: "SolvaBG#Pay2026",
};

const TARGET_USERS = [
  {
    fullName: "Cyril Wambanda",
    firstName: "Cyril",
    lastName: "Wambanda",
    role: "Supervisor",
  },
  {
    fullName: "Timothy Sila Kamwilwa",
    firstName: "Timothy",
    lastName: "Sila Kamwilwa",
    role: "Manager",
  },
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

async function loginToApp(baseUrl) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(DOCUMENT_ADMIN_LOGIN),
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

async function loadEmployees(admin) {
  const { data, error } = await admin
    .from("employees")
    .select("id, employee_number, first_name, last_name, linked_user:users!users_employee_id_fkey(id,email,role,status)")
    .eq("company_id", COMPANY_ID)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

function findEmployee(employees, target) {
  return employees.find(
    (row) =>
      safeString(row.first_name).toLowerCase() === target.firstName.toLowerCase() &&
      safeString(row.last_name).toLowerCase() === target.lastName.toLowerCase()
  );
}

async function updateRole(admin, userId, role) {
  const updated = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      role,
    },
  });

  if (updated.error) {
    throw updated.error;
  }

  const { error } = await admin.from("users").update({ role }).eq("id", userId);
  if (error) {
    throw error;
  }
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
  const employees = await loadEmployees(admin);
  const cookieHeader = await loginToApp(baseUrl);
  const summary = [];

  for (const target of TARGET_USERS) {
    const employee = findEmployee(employees, target);
    if (!employee) {
      throw new Error(`employee_not_found:${target.fullName}`);
    }

    const linkedUser = employee.linked_user;
    if (!linkedUser?.id) {
      throw new Error(`linked_user_missing:${target.fullName}`);
    }

    await updateRole(admin, safeString(linkedUser.id), target.role);
    const contract = await issueDocument(baseUrl, cookieHeader, safeString(employee.id), "contract");
    const appointmentLetter = await issueDocument(baseUrl, cookieHeader, safeString(employee.id), "appointment_letter");

    summary.push({
      employeeNumber: safeString(employee.employee_number),
      employeeName: `${safeString(employee.first_name)} ${safeString(employee.last_name)}`.trim(),
      loginEmail: safeString(linkedUser.email),
      role: target.role,
      contract,
      appointmentLetter,
    });
  }

  console.log(JSON.stringify({ baseUrl, summary }, null, 2));
}

await main();
