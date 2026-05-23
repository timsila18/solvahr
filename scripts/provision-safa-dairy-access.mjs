import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "46604299-3e3b-43b5-8722-d088082ed3bd";

const ACCESS_USERS = [
  {
    key: "supervisor",
    email: "salman.hussein@solvahr.co.ke",
    password: "WADANI2026#",
    role: "Supervisor",
    fullName: "Salman Hussein",
  },
  {
    key: "manager",
    email: "gm.safadairy@solvahr.co.ke",
    password: "SafaDairyGM#2026",
    role: "Manager",
    fullName: "Safa Dairy General Manager",
  },
  {
    key: "payrollOperator",
    email: "payroll.operator.safadairy@solvahr.co.ke",
    password: "SafaDairyPay#2026",
    role: "Payroll Admin",
    fullName: "Safa Dairy Payroll Operator",
  },
  {
    key: "hrAdmin",
    email: "hr.admin.safadairy@solvahr.co.ke",
    password: "SafaDairyHR#2026",
    role: "HR Admin",
    fullName: "Safa Dairy HR Admin",
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
  return typeof value === "string" ? value.trim() || fallback : fallback;
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

  const existing = list.data.users.find(
    (user) => safeString(user.email).toLowerCase() === input.email.toLowerCase()
  );

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
    throw companyResult.error ?? new Error("safa_dairy_company_not_found");
  }

  const [branchResult, departmentResult] = await Promise.all([
    admin
      .from("branches")
      .select("id, name")
      .eq("company_id", COMPANY_ID)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("departments")
      .select("id, name")
      .eq("company_id", COMPANY_ID)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (branchResult.error) {
    throw branchResult.error;
  }

  if (departmentResult.error) {
    throw departmentResult.error;
  }

  const branchId = safeString(branchResult.data?.id) || null;
  const departmentId = safeString(departmentResult.data?.id) || null;

  const existingUserResult = await admin
    .from("users")
    .select("phone")
    .eq("company_id", COMPANY_ID)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingUserResult.error) {
    throw existingUserResult.error;
  }

  const phone = safeString(existingUserResult.data?.phone) || null;
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
        branch: branchResult.data,
        department: departmentResult.data,
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
