import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const LOGIN_DOMAIN = "solvahr.co.ke";
const HR_ADMIN_EMAIL = `hr.admin@${LOGIN_DOMAIN}`;
const HR_ADMIN_PASSWORD = "RobotCafe#HR2026";
const HR_ADMIN_NAME = "Robot Cafe HR Admin";
const HR_ADMIN_PHONE = "+254700000003";

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

async function main() {
  const admin = await loadSupabaseAdmin();

  const branchResult = await admin
    .from("branches")
    .select("id")
    .eq("company_id", COMPANY_ID)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (branchResult.error) {
    throw branchResult.error;
  }

  const authList = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authList.error) {
    throw authList.error;
  }

  const existingAuthUser =
    authList.data.users.find((user) => user.email?.toLowerCase() === HR_ADMIN_EMAIL.toLowerCase()) ?? null;

  let authUserId = existingAuthUser?.id ?? "";
  if (existingAuthUser) {
    const updated = await admin.auth.admin.updateUserById(existingAuthUser.id, {
      email: HR_ADMIN_EMAIL,
      password: HR_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: HR_ADMIN_NAME,
        phone: HR_ADMIN_PHONE,
      },
      app_metadata: {
        role: "HR Admin",
      },
    });
    if (updated.error || !updated.data.user) {
      throw updated.error ?? new Error("robot_cafe_hr_admin_auth_update_failed");
    }
    authUserId = updated.data.user.id;
  } else {
    const created = await admin.auth.admin.createUser({
      email: HR_ADMIN_EMAIL,
      password: HR_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: HR_ADMIN_NAME,
        phone: HR_ADMIN_PHONE,
      },
      app_metadata: {
        role: "HR Admin",
      },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("robot_cafe_hr_admin_auth_create_failed");
    }
    authUserId = created.data.user.id;
  }

  const upsertProfile = await admin.from("users").upsert(
    {
      id: authUserId,
      company_id: COMPANY_ID,
      full_name: HR_ADMIN_NAME,
      email: HR_ADMIN_EMAIL,
      phone: HR_ADMIN_PHONE,
      role: "HR Admin",
      employee_id: null,
      branch_id: branchResult.data?.id ?? null,
      department_id: null,
      status: "active",
      activation_state: "active",
      must_reset_password: false,
      activated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (upsertProfile.error) {
    throw upsertProfile.error;
  }

  console.log(
    JSON.stringify(
      {
        email: HR_ADMIN_EMAIL,
        password: HR_ADMIN_PASSWORD,
        role: "HR Admin",
        companyId: COMPANY_ID,
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
