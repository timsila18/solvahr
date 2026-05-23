import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "2742dd9d-f689-48bf-aaec-652b9731de6a";
const LOGIN_DOMAIN = "solvahr.co.ke";

const ACCESS_USERS = [
  {
    key: "supervisor",
    email: `supervisor.sbg@${LOGIN_DOMAIN}`,
    password: "SolvaBG#Sup2026",
    role: "Supervisor",
    fullName: "Solva Business Group Supervisor",
  },
  {
    key: "manager",
    email: `manager.sbg@${LOGIN_DOMAIN}`,
    password: "SolvaBG#Mgr2026",
    role: "Manager",
    fullName: "Solva Business Group Manager",
  },
  {
    key: "payrollOperator",
    email: `payroll.operator.sbg@${LOGIN_DOMAIN}`,
    password: "SolvaBG#Pay2026",
    role: "Payroll Admin",
    fullName: "Solva Business Group Payroll Operator",
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
    // ignore
  }
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
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

async function ensureAuthUser(admin, input) {
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) {
    throw list.error;
  }
  const existing = list.data.users.find((user) => user.email?.toLowerCase() === input.email.toLowerCase());
  if (existing) {
    const updated = await admin.auth.admin.updateUserById(existing.id, {
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone ?? null,
      },
      app_metadata: {
        role: input.role,
      },
    });
    if (updated.error || !updated.data.user) {
      throw updated.error ?? new Error("failed_to_update_auth_user");
    }
    return updated.data.user.id;
  }
  const created = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      phone: input.phone ?? null,
    },
    app_metadata: {
      role: input.role,
    },
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error("failed_to_create_auth_user");
  }
  return created.data.user.id;
}

async function main() {
  const admin = await loadSupabaseAdmin();

  const companyResult = await admin
    .from("companies")
    .select("id, name, slug, status")
    .eq("id", COMPANY_ID)
    .maybeSingle();
  if (companyResult.error || !companyResult.data) {
    throw companyResult.error ?? new Error("solva_business_group_company_not_found");
  }

  const anchorUserResult = await admin
    .from("users")
    .select("branch_id, department_id, phone")
    .eq("company_id", COMPANY_ID)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (anchorUserResult.error) {
    throw anchorUserResult.error;
  }

  const branchId = safeString(anchorUserResult.data?.branch_id) || null;
  const departmentId = safeString(anchorUserResult.data?.department_id) || null;
  const phone = safeString(anchorUserResult.data?.phone) || null;

  const credentials = [];

  for (const accessUser of ACCESS_USERS) {
    const userId = await ensureAuthUser(admin, {
      email: accessUser.email,
      password: accessUser.password,
      role: accessUser.role,
      fullName: accessUser.fullName,
      phone,
    });

    const upsertResult = await admin.from("users").upsert(
      {
        id: userId,
        company_id: COMPANY_ID,
        full_name: accessUser.fullName,
        email: accessUser.email,
        phone,
        role: accessUser.role,
        employee_id: null,
        branch_id: branchId,
        department_id: departmentId,
        status: "active",
        activation_state: "active",
        must_reset_password: false,
        activated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (upsertResult.error) {
      throw upsertResult.error;
    }

    credentials.push({
      label: accessUser.fullName,
      role: accessUser.role,
      email: accessUser.email,
      password: accessUser.password,
    });
  }

  console.log(
    JSON.stringify(
      {
        company: companyResult.data,
        credentials,
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
