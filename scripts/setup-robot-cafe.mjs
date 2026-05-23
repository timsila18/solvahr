import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const COMPANY_SLUG = "robot-cafe-bistro";
const COMPANY_NAME = "Robot Cafe & Bistro";
const COMPANY_EMAIL = "admin@robotcafe.solvahr.app";
const LOGIN_DOMAIN = "solvahr.co.ke";
const EMPLOYEE_PASSWORD = "RobotCafe123";
const PAYROLL_OPERATOR_PASSWORD = "RobotCafe#Pay2026";
const GM_PASSWORD = "RobotCafe#GM2026";
const HR_ADMIN_PASSWORD = "RobotCafe#HR2026";
const SUPERVISOR_PASSWORD = "RobotCafe#Sup2026";
const ROBOT_CAFE_LOGO_PATH = resolve(process.cwd(), "public/tenant-logos/robot-cafe-logo.jpg");

async function loadLocalEnv() {
  try {
    const envFile = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }
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

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeName(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function logoMark(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function departmentCode(name) {
  return name
    .replace(/[^A-Za-z]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 4);
}

function normalizeEmailLocalPart(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
}

function buildEmployeeEmail(row) {
  const parts = String(row.fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const localPart = normalizeEmailLocalPart(
    [parts[0] || "", parts[parts.length - 1] || ""].filter(Boolean).join(".")
  );
  if (localPart) {
    return `${localPart}@${LOGIN_DOMAIN}`;
  }

  return `${String(row.employeeNumber).toLowerCase()}@${LOGIN_DOMAIN}`;
}

function buildEmployeeAuthProfile(row) {
  return {
    email: buildEmployeeEmail(row),
    password: row.role === "Supervisor" ? SUPERVISOR_PASSWORD : EMPLOYEE_PASSWORD,
    role: row.role === "Supervisor" ? "Supervisor" : "Employee",
  };
}

function buildEmployeeStatus(row) {
  return String(row.status || "Active");
}

function isOffboardedSourceStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized.includes("offboarded") || normalized.includes("dismissed") || normalized.includes("terminated");
}

function buildEmployeeDeductions(row) {
  const deductions = {};
  if (row.shif > 0) deductions.SHIF = row.shif;
  if (row.nssf > 0) deductions.NSSF = row.nssf;
  if (row.housingLevy > 0) deductions["Housing Levy"] = row.housingLevy;
  if (row.paye > 0) deductions.PAYE = row.paye;
  if (row.variance < 0) deductions["Absence Deduction"] = Math.abs(row.variance);
  return deductions;
}

function buildEmployeeAllowances(row) {
  const allowances = {};
  if (row.variance > 0) {
    allowances.Adjustments = row.variance;
  }
  return allowances;
}

function sumValues(record) {
  return Object.values(record).reduce((sum, value) => sum + Number(value || 0), 0);
}

async function parseRobotCafeSource() {
  const raw = await readFile(resolve(process.cwd(), "scripts/robot-cafe-source.json"), "utf8");
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  if (parsed?.organization?.address) {
    parsed.organization.address = String(parsed.organization.address).replace(/â€“|�|â/g, "–");
  }
  return parsed;
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

function getPayrollDocumentsBucket() {
  return process.env.SUPABASE_PAYROLL_DOCUMENTS_BUCKET ?? "payroll-documents";
}

async function ensureCompany(admin, source) {
  await admin.from("companies").upsert(
    {
      id: COMPANY_ID,
      name: COMPANY_NAME,
      slug: COMPANY_SLUG,
      status: "active",
    },
    { onConflict: "id" }
  );

  const logoBytes = await readFile(ROBOT_CAFE_LOGO_PATH);
  const logoStoragePath = `companies/${COMPANY_ID}/branding/robot-cafe-logo.jpg`;
  try {
    const logoUpload = await admin.storage
      .from(getPayrollDocumentsBucket())
      .upload(logoStoragePath, logoBytes, { contentType: "image/jpeg", upsert: true });
    if (logoUpload.error) {
      console.warn(`robot_cafe_logo_upload_skipped:${logoUpload.error.message}`);
    }
  } catch (error) {
    console.warn(`robot_cafe_logo_upload_skipped:${error instanceof Error ? error.message : "unknown_error"}`);
  }

  const branding = {
    displayName: COMPANY_NAME,
    employerIdentifier: source.organization.identifier,
    logoPath: logoStoragePath,
    logoMark: logoMark(COMPANY_NAME),
    reportFooter: "Powered by Solva HR",
    accentColor: "#0b6fb8",
  };

  const payrollDefaults = {
    frequency: "Semi-Monthly",
    midMonthDay: 15,
    finalPayDay: "Month End",
    operationalHalfRun: true,
    statutoryAtMonthEndOnly: true,
    payslipMode: "monthly_rollup",
    allowedEarnings: ["Basic Pay", "Incentives", "Bonus", "Overtime", "Adjustments"],
    allowedDeductions: [
      "PAYE",
      "SHIF",
      "NSSF",
      "HELB",
      "Housing Levy",
      "Court Orders / Family Remittances",
      "Hotel Breakages",
      "Loans",
      "SACCO Loan Repayment",
      "SACCO Contribution",
      "Staff Welfare Contribution",
      "Absence Deduction",
      "Other approved deductions",
    ],
  };

  const settingsResult = await admin.from("company_settings").upsert(
    {
      company_id: COMPANY_ID,
      primary_email: COMPANY_EMAIL,
      phone: "+254700000000",
      physical_address: `${source.organization.address}, ${source.organization.city}`,
      default_currency: source.organization.currency,
      country: source.organization.country,
      timezone: source.organization.timezone,
      registration_number: source.organization.identifier,
      tax_pin: null,
      working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      payroll_defaults: payrollDefaults,
      leave_year_settings: {
        startMonth: 1,
        carryForwardCap: 5,
      },
      branding,
    },
    { onConflict: "company_id" }
  );
  if (settingsResult.error) {
    throw settingsResult.error;
  }
}

async function ensureLookup(admin, table, matchColumn, matchValue, payload) {
  const existing = await admin
    .from(table)
    .select("id")
    .eq("company_id", COMPANY_ID)
    .eq(matchColumn, matchValue)
    .maybeSingle();
  if (existing.error) {
    throw existing.error;
  }
  if (existing.data?.id) {
    const updateResult = await admin.from(table).update(payload).eq("id", existing.data.id).select("id").single();
    if (updateResult.error || !updateResult.data) {
      throw updateResult.error ?? new Error(`failed_to_update_${table}`);
    }
    return updateResult.data.id;
  }
  const insertResult = await admin
    .from(table)
    .insert({
      id: crypto.randomUUID(),
      company_id: COMPANY_ID,
      ...payload,
    })
    .select("id")
    .single();
  if (insertResult.error || !insertResult.data) {
    throw insertResult.error ?? new Error(`failed_to_insert_${table}`);
  }
  return insertResult.data.id;
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

async function updateAuthUserById(admin, userId, input) {
  const updated = await admin.auth.admin.updateUserById(userId, {
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
    throw updated.error ?? new Error("failed_to_update_auth_user_by_id");
  }
  return updated.data.user.id;
}

async function deleteAuthUser(admin, userId) {
  const removed = await admin.auth.admin.deleteUser(userId);
  if (removed.error) {
    console.warn(`robot_cafe_auth_cleanup_skipped:${userId}:${removed.error.message}`);
  }
}

async function main() {
  const source = await parseRobotCafeSource();
  const admin = await loadSupabaseAdmin();

  await ensureCompany(admin, source);

  const branchId = await ensureLookup(admin, "branches", "code", "RCB-LANA", {
    code: "RCB-LANA",
    name: "Robot Cafe & Bistro Lana Plaza",
    location: "Lana Plaza, Nairobi, Kenya",
    status: "active",
    contact_email: COMPANY_EMAIL,
    contact_phone: "+254700000000",
  });

  await ensureLookup(admin, "branches", "code", "RCB-IMAARA", {
    code: "RCB-IMAARA",
    name: "Robot Cafe & Bistro Imaara Mall",
    location: "Imaara Mall, Nairobi, Kenya",
    status: "active",
    contact_email: COMPANY_EMAIL,
    contact_phone: "+254700000000",
  });

  const payrollGroupId = await ensureLookup(admin, "payroll_groups", "name", "Robot Cafe Monthly", {
    name: "Robot Cafe Monthly",
    frequency: "Semi-Monthly",
    currency: "KES",
    cut_off_day: 30,
    pay_day: 30,
    status: "active",
  });

  const departmentIds = new Map();
  for (const departmentName of new Set(source.employees.map((row) => row.departmentName))) {
    const code = `RC-${departmentCode(departmentName) || "GEN"}`;
    const id = await ensureLookup(admin, "departments", "code", code, {
      branch_id: branchId,
      code,
      name: departmentName,
      status: "active",
    });
    departmentIds.set(departmentName, id);
  }

  const designationIds = new Map();
  for (const position of new Set(source.employees.map((row) => row.position))) {
    const code = `DS-${slugify(position).slice(0, 18).toUpperCase()}`;
    const id = await ensureLookup(admin, "designations", "code", code, {
      code,
      title: position,
      status: "active",
    });
    designationIds.set(position, id);
  }

  const gradeConfig = [
    ["RC-G1", "Grade 1", 1],
    ["RC-G2", "Grade 2", 2],
    ["RC-G3", "Grade 3", 3],
    ["RC-G4", "Grade 4", 4],
    ["RC-G5", "Grade 5", 5],
  ];
  const jobGradeIds = new Map();
  for (const [code, name, rank] of gradeConfig) {
    const id = await ensureLookup(admin, "job_grades", "code", code, {
      code,
      name,
      level_rank: rank,
      status: "active",
    });
    jobGradeIds.set(code, id);
  }

  const existingEmployeesResult = await admin
    .from("employees")
    .select("id, employee_number, first_name, last_name, email")
    .eq("company_id", COMPANY_ID);
  if (existingEmployeesResult.error) {
    throw existingEmployeesResult.error;
  }
  const employeeIdsByNumber = new Map();
  const employeeIdsByEmail = new Map();
  const employeeIdsByName = new Map();
  for (const row of existingEmployeesResult.data ?? []) {
    if (row.employee_number) {
      employeeIdsByNumber.set(row.employee_number, row.id);
    }
    if (row.email) {
      employeeIdsByEmail.set(String(row.email).toLowerCase(), row.id);
    }
    const fullName = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
    if (fullName) {
      employeeIdsByName.set(normalizeName(fullName), row.id);
    }
  }

  for (const row of source.employees) {
    const authProfile = buildEmployeeAuthProfile(row);
    const employeePayload = {
      company_id: COMPANY_ID,
      employee_number: row.employeeNumber,
      first_name: row.firstName,
      last_name: row.lastName,
      national_id: row.nationalId || null,
      kra_pin: row.kraPin || null,
      shif_number: row.shifNumber || null,
      nssf_number: row.nssfNumber || null,
      phone: row.phone || null,
      email: authProfile.email,
      employment_type: "Contract",
      department_id: departmentIds.get(row.departmentName) ?? null,
      branch_id: branchId,
      designation_id: designationIds.get(row.position) ?? null,
      job_grade_id: jobGradeIds.get(row.jobGradeCode) ?? null,
      hire_date: row.hireDate ?? "2026-03-01",
      payroll_group_id: payrollGroupId,
      bank_name: null,
      bank_branch: null,
      bank_account: null,
      salary: row.fullSalary,
      status: buildEmployeeStatus(row),
      next_of_kin: {},
      emergency_contact: {},
      documents: {
        sourceFiles: [
          "RC NSSF 2026-03.xlsx",
          "RC SHA 2026-03.xlsx",
          "Robot Cafe Payroll 30th April 2026.xlsx",
        ],
        sourcePayrollNumber: row.sourcePayrollNumber,
        roleHint: row.role,
        supervisorName: row.supervisorName ?? null,
        remarks: row.notes || row.remarks || null,
      },
    };

    const existingEmployeeId =
      employeeIdsByNumber.get(row.employeeNumber) ??
      employeeIdsByEmail.get(String(authProfile.email).toLowerCase()) ??
      employeeIdsByName.get(normalizeName(row.fullName));
    if (existingEmployeeId) {
      const updateResult = await admin
        .from("employees")
        .update(employeePayload)
        .eq("id", existingEmployeeId)
        .select("id")
        .single();
      if (updateResult.error || !updateResult.data) {
        throw updateResult.error ?? new Error(`failed_to_update_employee_${row.employeeNumber}`);
      }
      employeeIdsByNumber.set(row.employeeNumber, updateResult.data.id);
      employeeIdsByEmail.set(String(authProfile.email).toLowerCase(), updateResult.data.id);
      employeeIdsByName.set(normalizeName(row.fullName), updateResult.data.id);
    } else {
      const insertResult = await admin
        .from("employees")
        .insert({
          id: crypto.randomUUID(),
          ...employeePayload,
        })
        .select("id")
        .single();
      if (insertResult.error || !insertResult.data) {
        throw insertResult.error ?? new Error(`failed_to_insert_employee_${row.employeeNumber}`);
      }
      employeeIdsByNumber.set(row.employeeNumber, insertResult.data.id);
      employeeIdsByEmail.set(String(authProfile.email).toLowerCase(), insertResult.data.id);
      employeeIdsByName.set(normalizeName(row.fullName), insertResult.data.id);
    }
  }

  const employeeNameToId = new Map();
  const freshEmployees = await admin
    .from("employees")
    .select("id, employee_number, first_name, last_name")
    .eq("company_id", COMPANY_ID);
  if (freshEmployees.error) {
    throw freshEmployees.error;
  }
  for (const employee of freshEmployees.data ?? []) {
    employeeNameToId.set(normalizeName(`${employee.first_name} ${employee.last_name}`.trim()), employee.id);
  }

  for (const row of source.employees) {
    const employeeId = employeeIdsByNumber.get(row.employeeNumber);
    if (!employeeId) continue;
    const supervisorName = row.supervisorName ? normalizeName(row.supervisorName) : "";
    const supervisorId = supervisorName && supervisorName !== "general manager"
      ? employeeNameToId.get(supervisorName) ?? null
      : null;
    await admin.from("employees").update({ supervisor_employee_id: supervisorId }).eq("id", employeeId);
  }

  const existingRuns = await admin
    .from("payroll_runs")
    .select("id")
    .eq("company_id", COMPANY_ID)
    .eq("period_label", "Apr 2026")
    .eq("payroll_type", "Full Month")
    .maybeSingle();
  if (existingRuns.error) {
    throw existingRuns.error;
  }
  const payrollRunId = existingRuns.data?.id ?? crypto.randomUUID();
  const runPayload = {
    id: payrollRunId,
    company_id: COMPANY_ID,
    period_label: "Apr 2026",
    payroll_type: "Full Month",
    status: "Approved",
    processed_at: "2026-04-30T18:00:00.000Z",
    gross_pay: source.totals.grossPay,
    net_pay: source.totals.netPay,
    total_deductions: source.totals.totalDeductions,
    employer_cost: Number((source.totals.grossPay + source.totals.nssf + source.totals.housingLevy + 50 * source.totals.employeeCount).toFixed(2)),
    paye_total: source.totals.paye,
    shif_total: source.totals.shif,
    housing_levy_total: source.totals.housingLevy,
    nssf_total: source.totals.nssf,
    pension_total: 0,
    validation_errors: 0,
    metadata: {
      period_year: "2026",
      period_month: "04",
      cycle: "month_end",
      tenantProfile: "robot-cafe-bistro",
      monthlyPayslipMode: true,
      operationalHalfRun: true,
      statutoryExportsAllowed: true,
      sourceFiles: [
        "robot cafe update .csv",
        "Robot Cafe Payroll 30th April 2026.xlsx",
        "RC NSSF 2026-03.xlsx",
        "RC SHA 2026-03.xlsx",
      ],
    },
  };
  await admin.from("payroll_runs").upsert(runPayload, { onConflict: "id" });

  const existingPayrollRows = await admin
    .from("payroll_employees")
    .select("id, employee_id")
    .eq("payroll_run_id", payrollRunId);
  if (existingPayrollRows.error) {
    throw existingPayrollRows.error;
  }

  const desiredAprilEmployeeIds = new Set(
    source.aprilPayroll
      .map((row) => employeeIdsByNumber.get(row.employeeNumber))
      .filter(Boolean)
  );

  for (const payrollRow of existingPayrollRows.data ?? []) {
    if (!desiredAprilEmployeeIds.has(payrollRow.employee_id)) {
      const deleteResult = await admin.from("payroll_employees").delete().eq("id", payrollRow.id);
      if (deleteResult.error) {
        throw deleteResult.error;
      }
    }
  }

  const refreshedPayrollRows = await admin
    .from("payroll_employees")
    .select("id, employee_id")
    .eq("payroll_run_id", payrollRunId);
  if (refreshedPayrollRows.error) {
    throw refreshedPayrollRows.error;
  }
  const payrollRowsByEmployeeId = new Map(
    (refreshedPayrollRows.data ?? []).map((row) => [row.employee_id, row.id])
  );

  for (const row of source.aprilPayroll) {
    const employeeId = employeeIdsByNumber.get(row.employeeNumber);
    if (!employeeId) continue;
    const allowances = buildEmployeeAllowances(row);
    const deductions = buildEmployeeDeductions(row);
    const grossPay = Number((row.fullSalary + sumValues(allowances)).toFixed(2));
    const totalDeductions = Number(sumValues(deductions).toFixed(2));
    const netPay = Number((grossPay - totalDeductions).toFixed(2));
    const payload = {
      payroll_run_id: payrollRunId,
      employee_id: employeeId,
      basic_salary: row.fullSalary,
      allowances,
      deductions,
      gross_pay: grossPay,
      net_pay: netPay,
      status: "Approved",
    };
    const existingId = payrollRowsByEmployeeId.get(employeeId);
    if (existingId) {
      await admin.from("payroll_employees").update(payload).eq("id", existingId);
    } else {
      await admin.from("payroll_employees").insert({
        id: crypto.randomUUID(),
        ...payload,
      });
    }
  }

  const authUsers = [
    {
      email: `hr.admin@${LOGIN_DOMAIN}`,
      password: HR_ADMIN_PASSWORD,
      role: "HR Admin",
      fullName: "Robot Cafe HR Admin",
      phone: "+254700000003",
      employeeId: null,
      branchId,
      departmentId: null,
    },
    {
      email: `payroll.operator@${LOGIN_DOMAIN}`,
      password: PAYROLL_OPERATOR_PASSWORD,
      role: "Payroll Admin",
      fullName: "Robot Cafe Payroll Operator",
      phone: "+254700000001",
      employeeId: null,
      branchId,
      departmentId: null,
    },
    {
      email: `gm@${LOGIN_DOMAIN}`,
      password: GM_PASSWORD,
      role: "Manager",
      fullName: "Robot Cafe General Manager",
      phone: "+254700000002",
      employeeId: null,
      branchId,
      departmentId: null,
    },
  ];

  for (const row of source.employees) {
    const profile = buildEmployeeAuthProfile(row);
    const employeeId = employeeIdsByNumber.get(row.employeeNumber);
    authUsers.push({
      email: profile.email,
      password: profile.password,
      role: profile.role,
      fullName: row.fullName,
      phone: row.phone || null,
      employeeId: employeeId ?? null,
      branchId,
      departmentId: departmentIds.get(row.departmentName) ?? null,
      employeeStatus: buildEmployeeStatus(row),
    });
  }

  const authDirectory = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authDirectory.error) {
    throw authDirectory.error;
  }
  const authUsersByEmail = new Map(
    (authDirectory.data.users ?? [])
      .filter((user) => user.email)
      .map((user) => [String(user.email).toLowerCase(), user])
  );

  for (const user of authUsers) {
    let userId = "";
    const desiredAuthUser = authUsersByEmail.get(String(user.email).toLowerCase()) ?? null;
    if (user.employeeId) {
      const existingProfile = await admin
        .from("users")
        .select("id, email")
        .eq("company_id", COMPANY_ID)
        .eq("employee_id", user.employeeId)
        .maybeSingle();
      if (existingProfile.error) {
        throw existingProfile.error;
      }
      if (existingProfile.data?.id) {
        if (desiredAuthUser && desiredAuthUser.id !== existingProfile.data.id) {
          userId = await updateAuthUserById(admin, desiredAuthUser.id, user);
          const deleteUserProfile = await admin.from("users").delete().eq("id", existingProfile.data.id);
          if (deleteUserProfile.error) {
            throw deleteUserProfile.error;
          }
          await deleteAuthUser(admin, existingProfile.data.id);
        } else {
          userId = await updateAuthUserById(admin, existingProfile.data.id, user);
        }
      }
    }
    if (!userId) {
      userId = await ensureAuthUser(admin, user);
    }
    const upsertResult = await admin.from("users").upsert(
      {
        id: userId,
        company_id: COMPANY_ID,
        full_name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        employee_id: user.employeeId,
        branch_id: user.branchId,
        department_id: user.departmentId,
        status: isOffboardedSourceStatus(user.employeeStatus) ? "inactive" : "active",
        activation_state: isOffboardedSourceStatus(user.employeeStatus) ? "deactivated" : "active",
        must_reset_password: false,
        activated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (upsertResult.error) {
      throw upsertResult.error;
    }
  }

  const existingWorkflow = await admin
    .from("approval_workflows")
    .select("id")
    .eq("company_id", COMPANY_ID)
    .eq("module_key", "payroll")
    .eq("name", "Robot Cafe Payroll Approval")
    .maybeSingle();
  if (existingWorkflow.error) {
    throw existingWorkflow.error;
  }
  const workflowPayload = {
    company_id: COMPANY_ID,
    module_key: "payroll",
    name: "Robot Cafe Payroll Approval",
    steps: [
      { role: "Payroll Admin", stage: "Payroll prepared" },
      { role: "Manager", stage: "General Manager approval" },
    ],
    status: "active",
    module_scope: "company",
    escalation_rule: {
      notifyAfterHours: 24,
    },
    maker_checker_enabled: true,
    final_approval_required: true,
  };
  if (existingWorkflow.data?.id) {
    await admin.from("approval_workflows").update(workflowPayload).eq("id", existingWorkflow.data.id);
  } else {
    await admin.from("approval_workflows").insert({
      id: crypto.randomUUID(),
      ...workflowPayload,
    });
  }

  const missingReport = source.employees.flatMap((row) => {
    const missing = [];
    if (!row.kraPin) missing.push("KRA PIN");
    if (!row.nssfNumber) missing.push("NSSF number");
    if (!row.shifNumber) missing.push("SHIF number");
    missing.push("Bank name", "Bank branch", "Bank account");
    return missing.length
      ? [
          {
            employeeNumber: row.employeeNumber,
            employeeName: row.fullName,
            missing,
          },
        ]
      : [];
  });

  console.log(
    JSON.stringify(
      {
        companyId: COMPANY_ID,
        employeeCount: source.employees.length,
        aprilPayrollCount: source.aprilPayroll.length,
        payrollRunId,
        totals: source.totals,
        credentials: {
          employeePassword: EMPLOYEE_PASSWORD,
          payrollOperator: {
            email: `payroll.operator@${LOGIN_DOMAIN}`,
            password: PAYROLL_OPERATOR_PASSWORD,
          },
          generalManager: {
            email: `gm@${LOGIN_DOMAIN}`,
            password: GM_PASSWORD,
          },
          hrAdmin: {
            email: `hr.admin@${LOGIN_DOMAIN}`,
            password: HR_ADMIN_PASSWORD,
          },
          supervisors: [
            { email: `brian.niva@${LOGIN_DOMAIN}`, password: SUPERVISOR_PASSWORD },
            { email: `william.wambua@${LOGIN_DOMAIN}`, password: SUPERVISOR_PASSWORD },
            { email: `derrick.numi@${LOGIN_DOMAIN}`, password: SUPERVISOR_PASSWORD },
            { email: `regina.wariara@${LOGIN_DOMAIN}`, password: SUPERVISOR_PASSWORD },
          ],
        },
        missingReport,
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
