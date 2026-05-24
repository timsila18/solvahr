import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

const SAFA_DAIRY_COMPANY_ID = "46604299-3e3b-43b5-8722-d088082ed3bd";
const ROBOT_CAFE_COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const DEFAULT_WORKBOOK = "C:/Users/user/Downloads/solva-hr-staff-upload-template.xlsx";

const PRESERVED_LEADERS = {
  "john kariuki": {
    employeeNumber: "SDL-001",
    email: "john.kariuki@solvahr.co.ke",
    password: "SafaDairyGM#2026",
    role: "Manager",
  },
  "salman hussein abdille": {
    employeeNumber: "SDL-002",
    email: "salman.hussein@solvahr.co.ke",
    password: "WADANI2026#",
    role: "Manager",
  },
  "winfred kithikii": {
    employeeNumber: "SDL-003",
    email: "winfred.kithikii@solvahr.co.ke",
    password: "SafaDairySales#2026",
    role: "Supervisor",
  },
  "masumbuko kotti musombah": {
    employeeNumber: "SDL-004",
    email: "masumbuko.musombah@solvahr.co.ke",
    password: "SafaDairyProd#2026",
    role: "Supervisor",
  },
  "timothy sila kamwilwa": {
    employeeNumber: null,
    email: "timothy.kamwilwa@solvahr.co.ke",
    password: "SafaDairyHR#2026",
    role: "HR Admin",
  },
};

const DECOMMISSION_USER_EMAILS = [
  "gm.safadairy@solvahr.co.ke",
  "hr.admin.safadairy@solvahr.co.ke",
  "payroll.operator.safadairy@solvahr.co.ke",
];

const BOARD_ADMIN = {
  email: "board.admin@solvahr.co.ke",
  password: "BoardAdmin#2026",
  fullName: "Safa Dairy Board Admin",
  role: "Super Admin",
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
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // ignore
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

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
}

function splitName(fullName) {
  const parts = safeString(fullName).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || "Staff",
  };
}

function parseExcelDate(value) {
  const raw = safeString(value);
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g, "");
  const mdy = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    let year = Number(mdy[3]);
    if (year < 100) year += 2000;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const iso = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${String(Number(iso[2])).padStart(2, "0")}-${String(Number(iso[3])).padStart(2, "0")}`;
  }
  return raw;
}

function parseMoney(value) {
  const cleaned = safeString(value).replace(/,/g, "");
  return Number(cleaned || 0);
}

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(safeString(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addMonthsIso(isoDate, months) {
  const [year, month, day] = safeString(isoDate).split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const next = new Date(Date.UTC(year, month - 1 + months, day));
  if (Number.isNaN(next.getTime())) return null;
  return next.toISOString().slice(0, 10);
}

function addDaysIso(isoDate, days) {
  const [year, month, day] = safeString(isoDate).split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const next = new Date(Date.UTC(year, month - 1, day + days));
  if (Number.isNaN(next.getTime())) return null;
  return next.toISOString().slice(0, 10);
}

async function createAdminClient() {
  await loadLocalEnv();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureAuthUser(admin, email, password, fullName, role, preferredUserId = null) {
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw list.error;

  let existing = preferredUserId ? list.data.users.find((user) => user.id === preferredUserId) : null;
  if (!existing) {
    existing = list.data.users.find((user) => normalize(user.email) === normalize(email)) ?? null;
  }

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

async function deleteAuthUserByEmail(admin, email) {
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw list.error;
  const existing = list.data.users.find((user) => normalize(user.email) === normalize(email));
  if (!existing) return;
  const removed = await admin.auth.admin.deleteUser(existing.id);
  if (removed.error) throw removed.error;
}

async function ensureLookup(admin, table, selectColumns, companyId, matchField, value, extra = {}) {
  const { data: found, error: findError } = await admin
    .from(table)
    .select(selectColumns)
    .eq("company_id", companyId)
    .eq(matchField, value)
    .maybeSingle();
  if (findError) throw findError;
  if (found) return found;

  const codePrefix =
    table === "branches" ? "BR" : table === "departments" ? "DEP" : table === "designations" ? "DES" : "LKP";
  const payload = {
    company_id: companyId,
    [matchField]: value,
    code: `${codePrefix}-${slugify(value).slice(0, 10).toUpperCase() || "AUTO"}`,
    status: "active",
    ...extra,
  };
  const { data, error } = await admin.from(table).insert(payload).select(selectColumns).single();
  if (error || !data) throw error ?? new Error(`failed_to_create_${table}:${value}`);
  return data;
}

function buildDesiredRows(workbookPath) {
  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd" });

  const reservedNames = new Set(Object.keys(PRESERVED_LEADERS));
  let sequential = 5;

  return rows.map((row, index) => {
    const fullName = safeString(row["Full Name"]);
    const normalizedName = normalize(fullName);
    const preserved = PRESERVED_LEADERS[normalizedName] ?? null;
    const { firstName, lastName } = splitName(fullName);
    return {
      rowNumber: index + 2,
      fullName,
      normalizedName,
      firstName,
      lastName,
      phone: safeString(row["Phone Number"]),
      employmentType: safeString(row["Employment Type"], "Contract"),
      salary: parseMoney(row["Gross Salary"]),
      hireDate: parseExcelDate(row["Hire Date (YYYY-MM-DD)"]),
      branchName: safeString(row["Branch Name"]),
      departmentName: safeString(row["Department Name"]),
      designationTitle: safeString(row["Designation Title"]),
      supervisorReference: safeString(row["Supervisor Employee Number"]),
      kraPin: safeString(row["KRA PIN"]),
      shifNumber: safeString(row["SHIF Number"]),
      nssfNumber: safeString(row["NSSF Number"]),
      probationMonths: parseInteger(row["Probation Months"], 0),
      contractDurationMonths: parseInteger(row["Contract Duration Months"], 12),
      employeeNumber:
        preserved?.employeeNumber ??
        `SDL-${String(sequential++).padStart(3, "0")}`,
      email: preserved?.email ?? "",
      loginPassword: preserved?.password ?? null,
      role: preserved?.role ?? null,
      preserved: reservedNames.has(normalizedName),
    };
  });
}

async function main() {
  const workbookPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : DEFAULT_WORKBOOK;
  const admin = await createAdminClient();
  const desiredRows = buildDesiredRows(workbookPath);
  const desiredByName = new Map(desiredRows.map((row) => [row.normalizedName, row]));

  const [{ data: employees, error: employeesError }, { data: users, error: usersError }] = await Promise.all([
    admin
      .from("employees")
      .select(
        "id, employee_number, first_name, last_name, email, phone, branch_id, department_id, designation_id, supervisor_employee_id, employment_type, designation:designation_id(title)"
      )
      .eq("company_id", SAFA_DAIRY_COMPANY_ID)
      .order("created_at", { ascending: true }),
    admin
      .from("users")
      .select("id, full_name, email, role, employee_id, branch_id, department_id, phone, status")
      .eq("company_id", SAFA_DAIRY_COMPANY_ID),
  ]);
  if (employeesError) throw employeesError;
  if (usersError) throw usersError;

  const employeeRows = employees ?? [];
  const userRows = users ?? [];
  const employeeByName = new Map();
  for (const row of employeeRows) {
    employeeByName.set(normalize(`${safeString(row.first_name)} ${safeString(row.last_name)}`), row);
  }

  let temporaryCounter = 1;
  for (const row of employeeRows) {
    const normalizedName = normalize(`${safeString(row.first_name)} ${safeString(row.last_name)}`);
    if (!desiredByName.has(normalizedName)) {
      continue;
    }
    if (PRESERVED_LEADERS[normalizedName]?.employeeNumber) {
      continue;
    }
    const temporaryNumber = `SDL-X${String(temporaryCounter++).padStart(3, "0")}`;
    const { error } = await admin
      .from("employees")
      .update({ employee_number: temporaryNumber })
      .eq("id", safeString(row.id));
    if (error) throw error;
    row.employee_number = temporaryNumber;
  }

  for (const email of DECOMMISSION_USER_EMAILS) {
    const linked = userRows.find((row) => normalize(row.email) === normalize(email));
    if (linked) {
      await admin.from("users").delete().eq("id", safeString(linked.id));
      await deleteAuthUserByEmail(admin, email);
    }
  }

  const unwantedEmployees = employeeRows.filter((row) => !desiredByName.has(normalize(`${safeString(row.first_name)} ${safeString(row.last_name)}`)));
  for (const row of unwantedEmployees) {
    const linkedUser = userRows.find((user) => safeString(user.employee_id) === safeString(row.id));
    if (linkedUser) {
      await admin.from("users").delete().eq("id", safeString(linkedUser.id));
      await deleteAuthUserByEmail(admin, safeString(linkedUser.email));
    }
    const { error } = await admin.from("employees").delete().eq("id", safeString(row.id));
    if (error) throw error;
  }

  const branchCache = new Map();
  const departmentCache = new Map();
  const designationCache = new Map();
  const createdOrUpdatedEmployees = [];

  for (const row of desiredRows) {
    const branch = await ensureLookup(
      admin,
      "branches",
      "id, name, code",
      SAFA_DAIRY_COMPANY_ID,
      "name",
      row.branchName,
      { location: row.branchName }
    );
    branchCache.set(normalize(row.branchName), branch);

    const department = await ensureLookup(
      admin,
      "departments",
      "id, name, code, branch_id",
      SAFA_DAIRY_COMPANY_ID,
      "name",
      row.departmentName,
      { branch_id: safeString(branch.id) }
    );
    departmentCache.set(normalize(row.departmentName), department);

    const designation = await ensureLookup(
      admin,
      "designations",
      "id, title, code",
      SAFA_DAIRY_COMPANY_ID,
      "title",
      row.designationTitle
    );
    designationCache.set(normalize(row.designationTitle), designation);

    const existing = employeeByName.get(row.normalizedName) ?? null;
    const employeePayload = {
      company_id: SAFA_DAIRY_COMPANY_ID,
      employee_number: row.employeeNumber,
      first_name: row.firstName,
      last_name: row.lastName,
      email: row.email || safeString(existing?.email) || `${slugify(row.fullName)}@solvahr.co.ke`,
      phone: row.phone || null,
      employment_type: row.employmentType,
      hire_date: row.hireDate,
      branch_id: safeString(branch.id),
      department_id: safeString(department.id),
      designation_id: safeString(designation.id),
      salary: row.salary,
      kra_pin: row.kraPin || null,
      shif_number: row.shifNumber || null,
      nssf_number: row.nssfNumber || null,
      confirmation_date: row.hireDate ? addDaysIso(addMonthsIso(row.hireDate, Math.max(1, row.probationMonths || 3)), 1) : null,
      contract_end_date: row.hireDate ? addMonthsIso(row.hireDate, Math.max(0, row.contractDurationMonths || 12)) : null,
      status: "Active",
    };

    let employeeRecord = existing;
    if (existing) {
      const { data, error } = await admin.from("employees").update(employeePayload).eq("id", safeString(existing.id)).select("*").single();
      if (error || !data) throw error ?? new Error(`failed_to_update_employee:${row.fullName}`);
      employeeRecord = data;
    } else {
      const { data, error } = await admin.from("employees").insert(employeePayload).select("*").single();
      if (error || !data) throw error ?? new Error(`failed_to_create_employee:${row.fullName}`);
      employeeRecord = data;
    }
    createdOrUpdatedEmployees.push({ row, employee: employeeRecord });
    employeeByName.set(row.normalizedName, employeeRecord);
  }

  const john = employeeByName.get("john kariuki");
  const salman = employeeByName.get("salman hussein abdille");
  const winfred = employeeByName.get("winfred kithikii");
  const masumbuko = employeeByName.get("masumbuko kotti musombah");
  const timothy = employeeByName.get("timothy sila kamwilwa");

  const supervisorByReference = new Map([
    ["general manager", safeString(salman?.id)],
    ["sales manager", safeString(winfred?.id)],
    ["production manager", safeString(masumbuko?.id)],
    ["board of directors", null],
  ]);

  for (const { row, employee } of createdOrUpdatedEmployees) {
    let supervisorEmployeeId = supervisorByReference.get(normalize(row.supervisorReference)) ?? null;
    if (row.normalizedName === "john kariuki" || row.normalizedName === "salman hussein abdille") {
      supervisorEmployeeId = null;
    }
    const { error } = await admin
      .from("employees")
      .update({ supervisor_employee_id: supervisorEmployeeId })
      .eq("id", safeString(employee.id));
    if (error) throw error;
  }

  const leadershipUsers = [
    { employee: john, profile: PRESERVED_LEADERS["john kariuki"] },
    { employee: salman, profile: PRESERVED_LEADERS["salman hussein abdille"] },
    { employee: winfred, profile: PRESERVED_LEADERS["winfred kithikii"] },
    { employee: masumbuko, profile: PRESERVED_LEADERS["masumbuko kotti musombah"] },
    { employee: timothy, profile: PRESERVED_LEADERS["timothy sila kamwilwa"] },
  ];

  for (const item of leadershipUsers) {
    const employee = item.employee;
    const profile = item.profile;
    if (!employee || !profile) continue;
    const existingUser =
      userRows.find((row) => safeString(row.employee_id) === safeString(employee.id)) ??
      userRows.find((row) => normalize(row.email) === normalize(profile.email)) ??
      null;
    const userId = await ensureAuthUser(
      admin,
      profile.email,
      profile.password,
      `${safeString(employee.first_name)} ${safeString(employee.last_name)}`.trim(),
      profile.role,
      safeString(existingUser?.id) || null
    );

    const { error } = await admin.from("users").upsert(
      {
        id: userId,
        company_id: SAFA_DAIRY_COMPANY_ID,
        full_name: `${safeString(employee.first_name)} ${safeString(employee.last_name)}`.trim(),
        email: profile.email,
        phone: safeString(employee.phone) || safeString(existingUser?.phone) || null,
        role: profile.role,
        employee_id: safeString(employee.id),
        branch_id: safeString(employee.branch_id) || null,
        department_id: safeString(employee.department_id) || null,
        status: "active",
        activation_state: "active",
        must_reset_password: false,
        activated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) throw error;
  }

  const boardAdminUserId = await ensureAuthUser(
    admin,
    BOARD_ADMIN.email,
    BOARD_ADMIN.password,
    BOARD_ADMIN.fullName,
    BOARD_ADMIN.role,
    null
  );

  const defaultBranchId = safeString(john?.branch_id || salman?.branch_id);
  const defaultDepartmentId = safeString(john?.department_id || salman?.department_id);
  const { error: boardAdminError } = await admin.from("users").upsert(
    {
      id: boardAdminUserId,
      company_id: null,
      full_name: BOARD_ADMIN.fullName,
      email: BOARD_ADMIN.email,
      phone: null,
      role: BOARD_ADMIN.role,
      employee_id: null,
      branch_id: null,
      department_id: null,
      status: "active",
      activation_state: "active",
      must_reset_password: false,
      activated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (boardAdminError) throw boardAdminError;

  console.log(
    JSON.stringify(
      {
        workbook: workbookPath,
        rebuiltCount: createdOrUpdatedEmployees.length,
        preservedLeadership: leadershipUsers.map((item) => ({
          name: item.employee ? `${safeString(item.employee.first_name)} ${safeString(item.employee.last_name)}`.trim() : null,
          employeeNumber: safeString(item.employee?.employee_number),
          email: item.profile?.email ?? null,
          role: item.profile?.role ?? null,
        })),
        boardAdmin: {
          email: BOARD_ADMIN.email,
          role: BOARD_ADMIN.role,
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
