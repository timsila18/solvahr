import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const ACTIVE_EMPLOYEE_NUMBER = "RC-054";
const SEPARATED_EMPLOYEE_NUMBER = "RC-053";
const TARGET_EMAIL = "telvin.awino@solvahr.co.ke";
const TARGET_PASSWORD = "RobotCafe123";
const ARCHIVED_EMAIL = "telvin.awino.archived@solvahr.co.ke";

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

  const { data: employees, error: employeeError } = await admin
    .from("employees")
    .select("id, employee_number, first_name, last_name, email, status")
    .eq("company_id", COMPANY_ID)
    .in("employee_number", [ACTIVE_EMPLOYEE_NUMBER, SEPARATED_EMPLOYEE_NUMBER]);

  if (employeeError) throw employeeError;

  const activeEmployee = (employees ?? []).find((row) => row.employee_number === ACTIVE_EMPLOYEE_NUMBER);
  const separatedEmployee = (employees ?? []).find((row) => row.employee_number === SEPARATED_EMPLOYEE_NUMBER);

  if (!activeEmployee || !separatedEmployee) {
    throw new Error("telvin_employee_records_not_found");
  }

  const { data: userProfiles, error: userProfilesError } = await admin
    .from("users")
    .select("id, email, full_name, employee_id, status")
    .eq("company_id", COMPANY_ID)
    .in("employee_id", [activeEmployee.id, separatedEmployee.id]);

  if (userProfilesError) throw userProfilesError;

  const activeProfile = (userProfiles ?? []).find((row) => row.employee_id === activeEmployee.id);
  const separatedProfile = (userProfiles ?? []).find((row) => row.employee_id === separatedEmployee.id);

  if (!activeProfile || !separatedProfile) {
    throw new Error("telvin_user_profiles_not_found");
  }

  const authList = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authList.error) throw authList.error;

  const activeAuthUser = authList.data.users.find((user) => user.id === activeProfile.id);
  const separatedAuthUser = authList.data.users.find((user) => user.id === separatedProfile.id);

  if (!activeAuthUser || !separatedAuthUser) {
    throw new Error("telvin_auth_users_not_found");
  }

  const archivedUpdate = await admin.auth.admin.updateUserById(separatedAuthUser.id, {
    email: ARCHIVED_EMAIL,
    email_confirm: true,
    user_metadata: {
      ...(separatedAuthUser.user_metadata ?? {}),
      archived_from: TARGET_EMAIL,
    },
  });

  if (archivedUpdate.error || !archivedUpdate.data.user) {
    throw archivedUpdate.error ?? new Error("telvin_archived_auth_update_failed");
  }

  const activeUpdate = await admin.auth.admin.updateUserById(activeAuthUser.id, {
    email: TARGET_EMAIL,
    password: TARGET_PASSWORD,
    email_confirm: true,
  });

  if (activeUpdate.error || !activeUpdate.data.user) {
    throw activeUpdate.error ?? new Error("telvin_active_auth_update_failed");
  }

  const { error: separatedProfileUpdateError } = await admin
    .from("users")
    .update({ email: ARCHIVED_EMAIL })
    .eq("id", separatedProfile.id);

  if (separatedProfileUpdateError) throw separatedProfileUpdateError;

  const { error: activeProfileUpdateError } = await admin
    .from("users")
    .update({ email: TARGET_EMAIL, must_reset_password: false, status: "active" })
    .eq("id", activeProfile.id);

  if (activeProfileUpdateError) throw activeProfileUpdateError;

  const { error: separatedEmployeeUpdateError } = await admin
    .from("employees")
    .update({ email: ARCHIVED_EMAIL })
    .eq("id", separatedEmployee.id);

  if (separatedEmployeeUpdateError) throw separatedEmployeeUpdateError;

  const { error: activeEmployeeUpdateError } = await admin
    .from("employees")
    .update({ email: TARGET_EMAIL })
    .eq("id", activeEmployee.id);

  if (activeEmployeeUpdateError) throw activeEmployeeUpdateError;

  console.log(
    JSON.stringify(
      {
        activeEmployee: {
          employeeNumber: activeEmployee.employee_number,
          fullName: `${activeEmployee.first_name ?? ""} ${activeEmployee.last_name ?? ""}`.trim(),
          companyEmail: TARGET_EMAIL,
          loginEmail: TARGET_EMAIL,
          password: TARGET_PASSWORD,
        },
        archivedSeparatedEmployee: {
          employeeNumber: separatedEmployee.employee_number,
          archivedEmail: ARCHIVED_EMAIL,
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
