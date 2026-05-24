import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "46604299-3e3b-43b5-8722-d088082ed3bd";

const TARGETS = [
  {
    key: "john",
    employeeMatch: { fullName: "John Kariuki", designationTitle: "General Manager" },
    desiredEmployeeNumber: "SDL-001",
    desiredRole: "Manager",
    desiredEmail: "john.kariuki@solvahr.co.ke",
    desiredPassword: "SafaDairyGM#2026",
  },
  {
    key: "salman",
    employeeMatch: { fullName: "Salman Hussein Abdille", designationTitle: "General Manager" },
    desiredEmployeeNumber: "SDL-002",
    desiredRole: "Manager",
    desiredEmail: "salman.hussein@solvahr.co.ke",
    desiredPassword: "WADANI2026#",
  },
  {
    key: "salesManager",
    employeeMatch: { designationTitle: "Sales Manager" },
    desiredEmployeeNumber: "SDL-003",
    desiredRole: "Supervisor",
    desiredEmail: "winfred.kithikii@solvahr.co.ke",
    desiredPassword: "SafaDairySales#2026",
  },
  {
    key: "productionManager",
    employeeMatch: { designationTitle: "Production Manager" },
    desiredEmployeeNumber: "SDL-004",
    desiredRole: "Supervisor",
    desiredEmail: "masumbuko.musombah@solvahr.co.ke",
    desiredPassword: "SafaDairyProd#2026",
  },
  {
    key: "hrConsultant",
    employeeMatch: { designationTitle: "HR Consultant" },
    desiredEmployeeNumber: null,
    desiredRole: "HR Admin",
    desiredEmail: "timothy.kamwilwa@solvahr.co.ke",
    desiredPassword: "SafaDairyHR#2026",
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
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // ignore missing env file
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

function normalize(value) {
  return safeString(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function fullNameOf(employee) {
  return `${safeString(employee.first_name)} ${safeString(employee.last_name)}`.trim();
}

async function createAdminClient() {
  await loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("missing_admin_environment");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function employeeMatchesTarget(employee, target) {
  const name = fullNameOf(employee);
  const designation = safeString(employee.designation?.title);
  const match = target.employeeMatch;

  if (match.fullName && normalize(name) === normalize(match.fullName)) return true;
  if (match.designationTitle && normalize(designation) === normalize(match.designationTitle)) return true;
  return false;
}

function buildTemporaryEmployeeNumber(index) {
  return `SDL-T${String(index).padStart(3, "0")}`;
}

async function ensureAuthUser(admin, email, password, fullName, role) {
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw list.error;

  const existing = list.data.users.find((user) => normalize(user.email) === normalize(email));

  if (existing) {
    const updated = await admin.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        full_name: fullName,
      },
      app_metadata: {
        ...(existing.app_metadata ?? {}),
        role,
      },
    });
    if (updated.error || !updated.data.user) {
      throw updated.error ?? new Error(`failed_to_update_auth_user:${email}`);
    }
    return updated.data.user.id;
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
    app_metadata: {
      role,
    },
  });
  if (created.error || !created.data.user) {
    throw created.error ?? new Error(`failed_to_create_auth_user:${email}`);
  }
  return created.data.user.id;
}

async function updateAuthUserById(admin, userId, email, password, fullName, role) {
  const updated = await admin.auth.admin.updateUserById(userId, {
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
    app_metadata: {
      role,
    },
  });
  if (updated.error || !updated.data.user) {
    throw updated.error ?? new Error(`failed_to_update_auth_user_by_id:${email}`);
  }
  return updated.data.user.id;
}

async function upsertUserRecord(admin, input) {
  const payload = {
    id: input.userId,
    company_id: COMPANY_ID,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    role: input.role,
    employee_id: input.employeeId,
    branch_id: input.branchId,
    department_id: input.departmentId,
    status: "active",
    activation_state: "active",
    must_reset_password: false,
    activated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("users").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

async function main() {
  const admin = await createAdminClient();

  const [{ data: employeeRows, error: employeeError }, { data: userRows, error: userError }] = await Promise.all([
    admin
      .from("employees")
      .select(
        "id, employee_number, first_name, last_name, email, phone, branch_id, department_id, designation:designation_id(title), supervisor_employee_id"
      )
      .eq("company_id", COMPANY_ID)
      .order("created_at", { ascending: true }),
    admin
      .from("users")
      .select("id, full_name, email, role, employee_id, branch_id, department_id, phone, status")
      .eq("company_id", COMPANY_ID),
  ]);

  if (employeeError) throw employeeError;
  if (userError) throw userError;

  const employees = employeeRows ?? [];
  const users = userRows ?? [];

  const selectedTargets = TARGETS.map((target) => {
    const employee = employees.find((row) => employeeMatchesTarget(row, target));
    if (!employee) {
      throw new Error(`employee_not_found:${target.key}`);
    }
    return { target, employee };
  });

  const targetEmployeeIds = new Set(selectedTargets.map((item) => safeString(item.employee.id)));

  let tempIndex = 1;
  for (const { target } of selectedTargets) {
    if (!target.desiredEmployeeNumber) continue;

    const conflictingEmployee = employees.find(
      (row) =>
        safeString(row.employee_number) === target.desiredEmployeeNumber &&
        !targetEmployeeIds.has(safeString(row.id))
    );

    if (conflictingEmployee) {
      const temporaryNumber = buildTemporaryEmployeeNumber(tempIndex++);
      const { error } = await admin
        .from("employees")
        .update({ employee_number: temporaryNumber })
        .eq("id", safeString(conflictingEmployee.id));
      if (error) throw error;
      conflictingEmployee.employee_number = temporaryNumber;
    }
  }

  for (const { target, employee } of selectedTargets) {
    try {
      const employeeId = safeString(employee.id);
      const employeeFullName = fullNameOf(employee);
      const desiredEmail = target.desiredEmail;
      const existingLinkedUser =
        users.find((row) => safeString(row.employee_id) === employeeId) ??
        users.find((row) => normalize(row.email) === normalize(desiredEmail));
      const userId = existingLinkedUser?.id
        ? await updateAuthUserById(
            admin,
            safeString(existingLinkedUser.id),
            desiredEmail,
            target.desiredPassword,
            employeeFullName,
            target.desiredRole
          )
        : await ensureAuthUser(
            admin,
            desiredEmail,
            target.desiredPassword,
            employeeFullName,
            target.desiredRole
          );

      const employeePatch = {
        employee_number: target.desiredEmployeeNumber ?? safeString(employee.employee_number),
        email: desiredEmail,
      };
      const { error: employeeUpdateError } = await admin.from("employees").update(employeePatch).eq("id", employeeId);
      if (employeeUpdateError) throw employeeUpdateError;

      await upsertUserRecord(admin, {
        userId,
        fullName: employeeFullName,
        email: desiredEmail,
        role: target.desiredRole,
        employeeId,
        branchId: safeString(employee.branch_id) || null,
        departmentId: safeString(employee.department_id) || null,
        phone: safeString(employee.phone) || safeString(existingLinkedUser?.phone) || null,
      });
    } catch (error) {
      throw new Error(`target_failed:${target.key}:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const refreshed = (
    await admin
      .from("employees")
      .select("id, employee_number, first_name, last_name, designation:designation_id(title)")
      .eq("company_id", COMPANY_ID)
  ).data ?? [];

  const temporaryNumberHolders = refreshed.filter((row) => safeString(row.employee_number).startsWith("SDL-T"));
  let nextSequential = 35;
  for (const employee of temporaryNumberHolders) {
    const nextNumber = `SDL-${String(nextSequential).padStart(3, "0")}`;
    nextSequential += 1;
    const { error } = await admin
      .from("employees")
      .update({ employee_number: nextNumber })
      .eq("id", safeString(employee.id));
    if (error) throw error;
    employee.employee_number = nextNumber;
  }

  const john = refreshed.find((row) => employeeMatchesTarget(row, TARGETS[0]));
  const salman = refreshed.find((row) => employeeMatchesTarget(row, TARGETS[1]));
  const salesManager = refreshed.find((row) => employeeMatchesTarget(row, TARGETS[2]));
  const productionManager = refreshed.find((row) => employeeMatchesTarget(row, TARGETS[3]));

  const johnId = safeString(john?.id);
  const salmanId = safeString(salman?.id);
  const salesManagerId = safeString(salesManager?.id);
  const productionManagerId = safeString(productionManager?.id);

  if (!johnId || !salmanId) {
    throw new Error("leadership_records_missing_after_refresh");
  }

  const productionTeamIds = refreshed
    .filter((row) => normalize(safeString(row.designation?.title)).includes("production assistant"))
    .map((row) => safeString(row.id))
    .filter(Boolean);
  if (productionTeamIds.length && productionManagerId) {
    const { error } = await admin
      .from("employees")
      .update({ supervisor_employee_id: productionManagerId })
      .in("id", productionTeamIds);
    if (error) throw error;
  }

  const salesTeamIds = refreshed
    .filter((row) => normalize(safeString(row.designation?.title)).includes("sales executive"))
    .map((row) => safeString(row.id))
    .filter(Boolean);
  if (salesTeamIds.length && salesManagerId) {
    const { error } = await admin
      .from("employees")
      .update({ supervisor_employee_id: salesManagerId })
      .in("id", salesTeamIds);
    if (error) throw error;
  }

  const directLeadershipReports = [salesManagerId, productionManagerId].filter(Boolean);
  if (directLeadershipReports.length) {
    const { error } = await admin
      .from("employees")
      .update({ supervisor_employee_id: salmanId })
      .in("id", directLeadershipReports);
    if (error) throw error;
  }

  const allOtherIds = refreshed
    .map((row) => safeString(row.id))
    .filter((id) => id && ![johnId, salmanId, salesManagerId, productionManagerId].includes(id))
    .filter((id) => !productionTeamIds.includes(id) && !salesTeamIds.includes(id));
  if (allOtherIds.length) {
    const { error } = await admin
      .from("employees")
      .update({ supervisor_employee_id: salmanId })
      .in("id", allOtherIds);
    if (error) throw error;
  }

  const { data: finalUsers, error: finalUsersError } = await admin
    .from("users")
    .select("full_name, email, role, employee_id")
    .eq("company_id", COMPANY_ID)
    .in("email", TARGETS.map((item) => item.desiredEmail));
  if (finalUsersError) throw finalUsersError;

  console.log(
    JSON.stringify(
      {
        companyId: COMPANY_ID,
        updatedAccess: finalUsers,
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
