import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const EMPLOYEE_NUMBER = "RC-044";
const TARGET_EMAIL = "grace.waruingi@solvahr.co.ke";
const TARGET_PASSWORD = "RobotCafe123";
const TARGET_FULL_NAME = "Grace Wanjiku Waruingi";

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

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id, employee_number, first_name, last_name, email")
    .eq("company_id", COMPANY_ID)
    .eq("employee_number", EMPLOYEE_NUMBER)
    .maybeSingle();

  if (employeeError || !employee) {
    throw employeeError ?? new Error("grace_employee_not_found");
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, email, full_name, role, employee_id, status")
    .eq("company_id", COMPANY_ID)
    .eq("employee_id", employee.id)
    .maybeSingle();

  if (profileError || !profile) {
    throw profileError ?? new Error("grace_user_profile_not_found");
  }

  const authUpdate = await admin.auth.admin.updateUserById(profile.id, {
    email: TARGET_EMAIL,
    password: TARGET_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: TARGET_FULL_NAME,
    },
  });

  if (authUpdate.error || !authUpdate.data.user) {
    throw authUpdate.error ?? new Error("grace_auth_update_failed");
  }

  const { error: profileUpdateError } = await admin
    .from("users")
    .update({
      email: TARGET_EMAIL,
      full_name: TARGET_FULL_NAME,
      must_reset_password: false,
      status: "active",
    })
    .eq("id", profile.id);

  if (profileUpdateError) {
    throw profileUpdateError;
  }

  const { error: employeeUpdateError } = await admin
    .from("employees")
    .update({
      first_name: "Grace",
      last_name: "Wanjiku Waruingi",
      email: TARGET_EMAIL,
    })
    .eq("id", employee.id);

  if (employeeUpdateError) {
    throw employeeUpdateError;
  }

  console.log(
    JSON.stringify(
      {
        employeeNumber: EMPLOYEE_NUMBER,
        fullName: TARGET_FULL_NAME,
        email: TARGET_EMAIL,
        password: TARGET_PASSWORD,
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
