import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getPage,
  getPlatformSnapshot as getStaticPlatformSnapshot,
  type ApprovalTask,
  type AuditEvent,
  type EmployeeProfile,
  type EmployeeRecord,
  type ModuleSpec,
  type PageSpec,
  type PayrollPackage,
  type PayrollProcessData,
  type PayrollVarianceItem,
  type PlatformSnapshot,
} from "@/lib/solva-data";
import {
  normalizeRole,
  roleCanAccessPayroll,
  roleCanAccessPeople,
  roleCanAccessRecruitment,
  type AppRole,
  type AuthUserProfile,
} from "@/lib/auth";
import { getStorageBucketNames } from "@/lib/supabase/env";

type LookupTable = "branches" | "departments" | "designations" | "job_grades" | "payroll_groups";

type RequestContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  profile: AuthUserProfile;
};

type EmployeeRow = Record<string, unknown>;
type TaskRow = Record<string, unknown>;
type PayrollRunRow = Record<string, unknown>;

const ADMIN_PEOPLE_ROLES: AppRole[] = ["Super Admin", "HR Admin", "Operator", "Supervisor", "Auditor"];
const PAYROLL_ROLES: AppRole[] = ["Super Admin", "Payroll Admin", "Finance Officer", "Auditor"];
const RECRUITMENT_ROLES: AppRole[] = ["Super Admin", "HR Admin", "Recruiter", "Manager", "Finance Officer", "Auditor"];

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const [first] = value;
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }

  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return null;
}

function formatCurrency(value: number) {
  return `KES ${new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function titleFromEmployee(row: EmployeeRow) {
  return `${safeString(row.first_name)} ${safeString(row.last_name)}`.trim();
}

function mapEmployeeRecord(row: EmployeeRow): EmployeeRecord {
  return {
    id: safeString(row.id),
    employeeNumber: safeString(row.employee_number),
    fullName: titleFromEmployee(row),
    department: safeString((row.department as { name?: string } | null)?.name, "Unassigned"),
    branch: safeString((row.branch as { name?: string } | null)?.name, "Unassigned"),
    employmentType: safeString(row.employment_type, "Unknown"),
    status: safeString(row.status, "active"),
  };
}

function mapEmployeeProfile(
  row: EmployeeRow,
  documents: Array<Record<string, unknown>>,
  movements: Array<Record<string, unknown>>
): EmployeeProfile {
  const record = mapEmployeeRecord(row);
  const supervisor = asRecord(row.supervisor);

  return {
    ...record,
    phoneNumber: safeString(row.phone, "-"),
    companyEmail: safeString(row.email, "-"),
    supervisor: supervisor
      ? `${safeString(supervisor.first_name)} ${safeString(supervisor.last_name)}`.trim()
      : "Unassigned",
    costCenter: safeString((row.department as { code?: string } | null)?.code, "-"),
    kraPin: safeString(row.kra_pin, "-"),
    shifNumber: safeString(row.shif_number, "-"),
    nssfNumber: safeString(row.nssf_number, "-"),
    bankName: safeString(row.bank_name, "-"),
    bankAccount: safeString(row.bank_account, "-"),
    hireDate: safeString(row.hire_date, "-"),
    profileSections: [
      {
        title: "Personal and contact",
        items: [
          { label: "Phone", value: safeString(row.phone, "-") },
          { label: "Company email", value: safeString(row.email, "-") },
          { label: "Branch", value: safeString((row.branch as { name?: string } | null)?.name, "-") },
          { label: "Department", value: safeString((row.department as { name?: string } | null)?.name, "-") },
        ],
      },
      {
        title: "Employment and reporting",
        items: [
          { label: "Hire date", value: safeString(row.hire_date, "-") },
          { label: "Supervisor", value: supervisor ? `${safeString(supervisor.first_name)} ${safeString(supervisor.last_name)}`.trim() : "Unassigned" },
          { label: "Designation", value: safeString((row.designation as { title?: string } | null)?.title, "-") },
          { label: "Job grade", value: safeString((row.job_grade as { name?: string } | null)?.name, "-") },
        ],
      },
      {
        title: "Statutory and bank",
        items: [
          { label: "KRA PIN", value: safeString(row.kra_pin, "-") },
          { label: "SHIF", value: safeString(row.shif_number, "-") },
          { label: "NSSF", value: safeString(row.nssf_number, "-") },
          { label: "Bank", value: `${safeString(row.bank_name, "-")} ${safeString(row.bank_account, "")}`.trim() },
        ],
      },
    ],
    documentSummary: documents.map((document) => ({
      name: safeString(document.file_name),
      category: safeString(document.category),
      status: "Uploaded",
      expiry: safeString(document.uploaded_at, "N/A"),
    })),
    movementHistory: movements.map((movement) => ({
      title: safeString(movement.action),
      detail: safeString(movement.approval_action || movement.entity_type || movement.module_key),
      date: safeString(movement.created_at),
    })),
  };
}

function mapApprovalTask(row: TaskRow): ApprovalTask {
  const requester = asRecord(row.requester);
  return {
    id: safeString(row.id),
    kind: safeString(row.entity_type) as ApprovalTask["kind"],
    moduleKey: safeString(row.module_key),
    title: safeString(row.title),
    description: safeString(row.description),
    ownerRole: safeString(row.owner_role),
    requestedBy: safeString(requester?.email, safeString(row.requested_by)),
    requestedByRole: safeString(requester?.role, "Employee"),
    status: (safeString(row.status) as ApprovalTask["status"]) || "pending",
    stage: safeString(row.stage),
    due: safeString(row.due_at, "-"),
    updatedAt: safeString(row.updated_at, safeString(row.created_at)),
  };
}

function mapAuditEvent(row: Record<string, unknown>): AuditEvent {
  return {
    id: safeString(row.id),
    moduleKey: safeString(row.module_key),
    category: safeString(row.entity_type),
    action: safeString(row.action),
    actorEmail: safeString(row.actor_email),
    actorRole: safeString(row.actor_role),
    subject: safeString(row.approval_action || row.entity_type),
    outcome: safeString(row.action),
    timestamp: safeString(row.created_at),
  };
}

function mapPayrollPackage(row: PayrollRunRow): PayrollPackage {
  return {
    period: safeString(row.period_label, "Current period"),
    status: safeString(row.status, "draft"),
    employeeCount: String(safeNumber(row.employee_count, 0)),
    grossPay: formatCurrency(safeNumber(row.gross_pay, 0)),
    netPay: formatCurrency(safeNumber(row.net_pay, 0)),
    paye: formatCurrency(safeNumber(row.paye_total, 0)),
    shif: formatCurrency(safeNumber(row.shif_total, 0)),
    nssf: formatCurrency(safeNumber(row.nssf_total, 0)),
    housingLevy: formatCurrency(safeNumber(row.housing_levy_total, 0)),
  };
}

async function getRequestContext(): Promise<RequestContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("unauthorized");
  }

  const { data } = await supabase
    .from("users")
    .select("id, company_id, full_name, email, phone, role, employee_id, branch_id, department_id, last_login, status")
    .eq("id", user.id)
    .single();

  const profile: AuthUserProfile = data
    ? {
        ...data,
        role: normalizeRole(safeString(data.role)),
      }
    : {
        id: user.id,
        company_id: null,
        full_name: safeString(user.user_metadata.full_name, user.email ?? "Solva User"),
        email: user.email ?? "",
        phone: null,
        role: normalizeRole(safeString(user.app_metadata.role, "Employee")),
        employee_id: null,
        branch_id: null,
        department_id: null,
        last_login: null,
        status: "active",
      };

  return { supabase, profile };
}

function ensureRole(profile: AuthUserProfile, allowedRoles: AppRole[]) {
  if (!allowedRoles.includes(profile.role)) {
    throw new Error("forbidden");
  }
}

async function createAuditLog(
  context: RequestContext,
  input: {
    moduleKey: string;
    entityType: string;
    entityId?: string | null;
    action: string;
    beforeValue?: Record<string, unknown>;
    afterValue?: Record<string, unknown>;
    approvalAction?: string;
  }
) {
  await context.supabase.from("audit_logs").insert({
    company_id: context.profile.company_id,
    module_key: input.moduleKey,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    actor_id: context.profile.id,
    actor_email: context.profile.email,
    actor_role: context.profile.role,
    before_value: input.beforeValue ?? {},
    after_value: input.afterValue ?? {},
    ip_address: "placeholder-ip",
    device_info: "placeholder-device",
    approval_action: input.approvalAction ?? null,
  });
}

async function getLatestPayrollRun(context: RequestContext) {
  let query = context.supabase
    .from("payroll_runs")
    .select("*, payroll_employees(count)")
    .order("processed_at", { ascending: false })
    .limit(1);

  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data as PayrollRunRow | null;
}

function withEmployeeScope(query: any, profile: AuthUserProfile) {
  if (["Super Admin", "HR Admin", "Payroll Admin", "Finance Officer", "Auditor", "Operator"].includes(profile.role)) {
    return query;
  }

  if (["Manager", "Supervisor"].includes(profile.role) && profile.employee_id) {
    return query.or(`id.eq.${profile.employee_id},supervisor_employee_id.eq.${profile.employee_id}`);
  }

  if (profile.employee_id) {
    return query.eq("id", profile.employee_id);
  }

  return query.eq("id", "00000000-0000-0000-0000-000000000000");
}

export async function buildPlatformSnapshot(): Promise<PlatformSnapshot> {
  const context = await getRequestContext();
  const base = getStaticPlatformSnapshot();

  let employeeCountQuery = context.supabase.from("employees").select("*", { count: "exact", head: true });
  let approvalsCountQuery = context.supabase
    .from("approval_tasks")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (context.profile.company_id) {
    employeeCountQuery = employeeCountQuery.eq("company_id", context.profile.company_id);
    approvalsCountQuery = approvalsCountQuery.eq("company_id", context.profile.company_id);
  }

  const [employeeCountResult, approvalCountResult, payrollRun] = await Promise.all([
    employeeCountQuery,
    approvalsCountQuery,
    getLatestPayrollRun(context),
  ]);

  const employeeCount = employeeCountResult.count ?? 0;
  const approvalCount = approvalCountResult.count ?? 0;
  const currentRun = payrollRun ? mapPayrollPackage(payrollRun) : null;

  return {
    ...base,
    loginProfiles: [
      {
        role: context.profile.role,
        email: context.profile.email,
      },
    ],
    modules: base.modules.map((module) => {
      if (module.key === "people") {
        return {
          ...module,
          heroStats: module.heroStats.map((metric) =>
            metric.label === "Employees"
              ? { ...metric, value: String(employeeCount), hint: "Persistent employee records from Supabase" }
              : metric
          ),
        };
      }

      if (module.key === "payroll" && currentRun) {
        return {
          ...module,
          heroStats: module.heroStats.map((metric) => {
            if (metric.label === "Payroll month") {
              return { ...metric, value: currentRun.period, hint: `Status: ${currentRun.status}` };
            }

            if (metric.label === "Gross pay") {
              return { ...metric, value: currentRun.grossPay, hint: `${currentRun.employeeCount} active payroll employees` };
            }

            return metric;
          }),
        };
      }

      return module;
    }),
    featured: {
      ...base.featured,
      approvals: [
        {
          item: `${approvalCount} pending approvals`,
          owner: context.profile.role,
          status: "Live workflow queue",
          due: "Check task center",
        },
        ...base.featured.approvals.slice(0, 2),
      ],
      summary: `Live Supabase snapshot for ${context.profile.full_name} (${context.profile.role}).`,
    },
  };
}

export async function listAuditEvents(): Promise<AuditEvent[]> {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Payroll Admin", "Finance Officer", "Auditor"]);

  let query = context.supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapAuditEvent(row));
}

export async function listEmployeeRecords(): Promise<EmployeeRecord[]> {
  const context = await getRequestContext();

  if (!roleCanAccessPeople(context.profile.role) && context.profile.role !== "Employee") {
    throw new Error("forbidden");
  }

  let query = context.supabase
    .from("employees")
    .select("id, employee_number, first_name, last_name, employment_type, status, department:departments(name), branch:branches(name), supervisor_employee_id")
    .order("employee_number", { ascending: true })
    .limit(200);

  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }

  query = withEmployeeScope(query as never, context.profile) as typeof query;

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapEmployeeRecord(row as EmployeeRow));
}

export async function getEmployeeProfile(employeeId: string): Promise<EmployeeProfile | null> {
  const context = await getRequestContext();
  if (!roleCanAccessPeople(context.profile.role) && context.profile.role !== "Employee") {
    throw new Error("forbidden");
  }

  const { data, error } = await context.supabase
    .from("employees")
    .select(
      "id, employee_number, first_name, last_name, phone, email, employment_type, hire_date, confirmation_date, contract_end_date, national_id, kra_pin, shif_number, nssf_number, bank_name, bank_branch, bank_account, salary, status, department:departments(name, code), branch:branches(name), designation:designations(title), job_grade:job_grades(name), payroll_group:payroll_groups(name), supervisor:supervisor_employee_id(first_name, last_name)"
    )
    .eq("id", employeeId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const [documentsResult, movementsResult] = await Promise.all([
    context.supabase
      .from("employee_documents")
      .select("file_name, category, uploaded_at")
      .eq("employee_id", employeeId)
      .order("uploaded_at", { ascending: false })
      .limit(8),
    context.supabase
      .from("audit_logs")
      .select("action, approval_action, entity_type, module_key, created_at")
      .eq("entity_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return mapEmployeeProfile(
    data as EmployeeRow,
    (documentsResult.data ?? []) as Array<Record<string, unknown>>,
    (movementsResult.data ?? []) as Array<Record<string, unknown>>
  );
}

export async function createEmployeeRecord(input: {
  fullName: string;
  departmentId?: string | null;
  branchId?: string | null;
  employmentType: string;
  actorEmail?: string;
  actorRole?: string;
}) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Operator", "Supervisor"]);

  const [firstName, ...rest] = input.fullName.trim().split(/\s+/);
  const lastName = rest.join(" ") || "Employee";

  let deptId = input.departmentId ?? context.profile.department_id;
  let branchId = input.branchId ?? context.profile.branch_id;

  if (!deptId || !branchId) {
    const { data: departmentRow } = await context.supabase
      .from("departments")
      .select("id, branch_id")
      .limit(1)
      .maybeSingle();

    deptId = deptId ?? safeString(departmentRow?.id, null as never);
    branchId = branchId ?? safeString(departmentRow?.branch_id, null as never);
  }

  const { count } = await context.supabase.from("employees").select("*", { count: "exact", head: true });
  const employeeNumber = `SOL-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data, error } = await context.supabase
    .from("employees")
    .insert({
      company_id: context.profile.company_id,
      employee_number: employeeNumber,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, ".") + "@solvahr.app",
      phone: "0700000000",
      employment_type: input.employmentType,
      department_id: deptId,
      branch_id: branchId,
      status: "Pending activation",
      salary: 0,
    })
    .select("id, employee_number, first_name, last_name, employment_type, status, department:departments(name), branch:branches(name)")
    .single();

  if (error || !data) {
    throw error ?? new Error("employee_create_failed");
  }

  const workflow = await context.supabase
    .from("approval_tasks")
    .insert({
      company_id: context.profile.company_id,
      module_key: "people",
      entity_type: "employee_activation",
      entity_id: data.id,
      title: `Activate ${firstName} ${lastName}`,
      description: `${firstName} ${lastName} prepared for activation`,
      requested_by: context.profile.id,
      owner_role: "Supervisor",
      status: "pending",
      stage: "Supervisor review",
      metadata: { final_status: "active" },
    })
    .select("id")
    .single();

  await createAuditLog(context, {
    moduleKey: "people",
    entityType: "employee",
    entityId: safeString(data.id),
    action: "created_employee_record",
    afterValue: data as Record<string, unknown>,
    approvalAction: workflow.data ? `approval_task:${workflow.data.id}` : "pending_supervisor_review",
  });

  return mapEmployeeRecord(data as EmployeeRow);
}

export async function updateEmployeeRecord(employeeId: string, patch: Record<string, unknown>) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Operator", "Supervisor"]);

  const before = await context.supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .single();

  if (before.error || !before.data) {
    throw before.error ?? new Error("employee_not_found");
  }

  const { data, error } = await context.supabase
    .from("employees")
    .update(patch)
    .eq("id", employeeId)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("employee_update_failed");
  }

  await createAuditLog(context, {
    moduleKey: "people",
    entityType: "employee",
    entityId: employeeId,
    action: "updated_employee_record",
    beforeValue: before.data,
    afterValue: data,
  });

  return data;
}

export async function listApprovalTasks(): Promise<ApprovalTask[]> {
  const context = await getRequestContext();

  let query = context.supabase
    .from("approval_tasks")
    .select("*, requester:requested_by(email, role)")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }

  if (context.profile.role !== "Super Admin") {
    query = query.or(`requested_by.eq.${context.profile.id},owner_role.eq.${context.profile.role}`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapApprovalTask(row as TaskRow));
}

async function createTask(
  context: RequestContext,
  task: {
    module_key: string;
    entity_type: string;
    entity_id?: string | null;
    title: string;
    description: string;
    owner_role: AppRole;
    stage: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { data, error } = await context.supabase
    .from("approval_tasks")
    .insert({
      company_id: context.profile.company_id,
      module_key: task.module_key,
      entity_type: task.entity_type,
      entity_id: task.entity_id ?? null,
      title: task.title,
      description: task.description,
      requested_by: context.profile.id,
      owner_role: task.owner_role,
      status: "pending",
      stage: task.stage,
      metadata: task.metadata ?? {},
    })
    .select("*, requester:requested_by(email, role)")
    .single();

  if (error || !data) {
    throw error ?? new Error("approval_task_create_failed");
  }

  return data as TaskRow;
}

export async function createEmployeeActivationRequest(input: {
  employeeName: string;
  department: string;
  branch: string;
  employmentType: string;
}) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Operator"]);

  const record = await createEmployeeRecord({
    fullName: input.employeeName,
    employmentType: input.employmentType,
  });

  const { data } = await context.supabase
    .from("approval_tasks")
    .select("*, requester:requested_by(email, role)")
    .eq("entity_id", record.id)
    .eq("entity_type", "employee_activation")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return mapApprovalTask(data as TaskRow);
}

export async function createLeaveRequest(input: {
  employeeName: string;
  leaveType: string;
  days: string;
  startDate: string;
}) {
  const context = await getRequestContext();
  const employeeId = context.profile.employee_id;

  if (!employeeId && context.profile.role === "Employee") {
    throw new Error("employee_profile_required");
  }

  const startDate = new Date(input.startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Number(input.days || 1) - 1);

  const { data, error } = await context.supabase
    .from("leave_requests")
    .insert({
      company_id: context.profile.company_id,
      employee_id: employeeId,
      leave_type: input.leaveType,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      days: Number(input.days),
      reason: `Requested by ${input.employeeName}`,
      status: "pending",
      created_by: context.profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("leave_request_failed");
  }

  const taskRow = await createTask(context, {
    module_key: "leave",
    entity_type: "leave_request",
    entity_id: safeString(data.id),
    title: `${input.leaveType} request for ${input.employeeName}`,
    description: `${input.days} day(s) starting ${input.startDate}`,
    owner_role: "Supervisor",
    stage: "Supervisor review",
    metadata: { final_status: "approved" },
  });

  await context.supabase
    .from("leave_requests")
    .update({ approval_task_id: taskRow.id })
    .eq("id", data.id);

  await createAuditLog(context, {
    moduleKey: "leave",
    entityType: "leave_request",
    entityId: safeString(data.id),
    action: "created_leave_request",
    afterValue: {
      leave_type: input.leaveType,
      days: Number(input.days),
      start_date: input.startDate,
    },
  });

  return mapApprovalTask(taskRow);
}

export async function createTrainingRequest(input: {
  employeeName: string;
  programName: string;
  schedule: string;
  budget: string;
}) {
  const context = await getRequestContext();

  const { data, error } = await context.supabase
    .from("training_requests")
    .insert({
      company_id: context.profile.company_id,
      employee_id: context.profile.employee_id,
      program_name: input.programName,
      schedule: input.schedule,
      budget: Number(input.budget || 0),
      notes: `Requested by ${input.employeeName}`,
      status: "pending",
      created_by: context.profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("training_request_failed");
  }

  const taskRow = await createTask(context, {
    module_key: "training",
    entity_type: "training_request",
    entity_id: safeString(data.id),
    title: `Approve ${input.programName}`,
    description: `${input.employeeName} | ${input.schedule} | Budget KES ${input.budget}`,
    owner_role: "HR Admin",
    stage: "HR training review",
    metadata: { final_status: "approved" },
  });

  await context.supabase
    .from("training_requests")
    .update({ approval_task_id: taskRow.id })
    .eq("id", data.id);

  return mapApprovalTask(taskRow);
}

export async function createAssetRequest(input: {
  employeeName: string;
  assetName: string;
  requestType: string;
  branch: string;
}) {
  const context = await getRequestContext();

  const { data, error } = await context.supabase
    .from("asset_requests")
    .insert({
      company_id: context.profile.company_id,
      employee_id: context.profile.employee_id,
      asset_name: input.assetName,
      request_type: input.requestType,
      branch_id: context.profile.branch_id,
      notes: `Requested by ${input.employeeName}`,
      status: "pending",
      created_by: context.profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("asset_request_failed");
  }

  const taskRow = await createTask(context, {
    module_key: "assets",
    entity_type: "asset_request",
    entity_id: safeString(data.id),
    title: `${input.requestType} ${input.assetName}`,
    description: `${input.employeeName} | ${input.branch}`,
    owner_role: "HR Admin",
    stage: "Asset approval",
    metadata: { final_status: "approved" },
  });

  await context.supabase
    .from("asset_requests")
    .update({ approval_task_id: taskRow.id })
    .eq("id", data.id);

  return mapApprovalTask(taskRow);
}

export async function createRequisitionApprovalRequest(input: {
  roleTitle: string;
  departmentId?: string | null;
  branchId?: string | null;
  headcount: string;
}) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Recruiter", "Manager"]);

  const { data, error } = await context.supabase
    .from("recruitment_requisitions")
    .insert({
      company_id: context.profile.company_id,
      requested_by: context.profile.id,
      role_title: input.roleTitle,
      department_id: input.departmentId ?? context.profile.department_id,
      branch_id: input.branchId ?? context.profile.branch_id,
      headcount: Number(input.headcount),
      notes: "Submitted from Solva HR recruitment workspace",
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("requisition_create_failed");
  }

  const taskRow = await createTask(context, {
    module_key: "recruitment",
    entity_type: "requisition_approval",
    entity_id: safeString(data.id),
    title: `Approve ${input.roleTitle} requisition`,
    description: `Headcount ${input.headcount}`,
    owner_role: "Finance Officer",
    stage: "Finance review",
    metadata: {
      next_owner_role: "HR Admin",
      next_stage: "HR release",
      final_status: "approved",
    },
  });

  await context.supabase
    .from("recruitment_requisitions")
    .update({ approval_task_id: taskRow.id })
    .eq("id", data.id);

  return mapApprovalTask(taskRow);
}

export async function createProfileUpdateRequest(input: {
  employeeName: string;
  fieldName: string;
  newValue: string;
}) {
  const context = await getRequestContext();

  const taskRow = await createTask(context, {
    module_key: "ess",
    entity_type: "profile_update",
    title: `Approve profile change for ${input.employeeName}`,
    description: `${input.fieldName} -> ${input.newValue}`,
    owner_role: "HR Admin",
    stage: "HR validation",
    metadata: {
      field_name: input.fieldName,
      new_value: input.newValue,
    },
  });

  return mapApprovalTask(taskRow);
}

export async function createPayrollApprovalRequest(input: {
  period: string;
  grossPay: string;
  netPay: string;
  employeeCount: string;
}) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "Payroll Admin"]);

  const latestRun = await getLatestPayrollRun(context);
  const payrollRunId = safeString(latestRun?.id);

  const taskRow = await createTask(context, {
    module_key: "payroll",
    entity_type: "payroll_approval",
    entity_id: payrollRunId || null,
    title: `Approve ${input.period} payroll`,
    description: `${input.employeeCount} employees | Gross ${input.grossPay} | Net ${input.netPay}`,
    owner_role: "Finance Officer",
    stage: "Finance review",
    metadata: {
      next_owner_role: "Super Admin",
      next_stage: "Executive sign-off",
      final_status: "approved",
    },
  });

  if (payrollRunId) {
    await context.supabase.from("payroll_approvals").insert({
      payroll_run_id: payrollRunId,
      stage_name: "Prepared by",
      owner_role: "Payroll Admin",
      acted_by: context.profile.id,
      status: "completed",
      comments: "Submitted from payroll workspace.",
      acted_at: new Date().toISOString(),
    });
  }

  return mapApprovalTask(taskRow);
}

export async function updateApprovalTask(taskId: string, action: "approve" | "reject") {
  const context = await getRequestContext();

  const { data: task, error } = await context.supabase
    .from("approval_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error || !task) {
    throw new Error("task_not_found");
  }

  const taskRow = task as TaskRow;
  const ownerRole = safeString(taskRow.owner_role);

  if (context.profile.role !== "Super Admin" && ownerRole !== context.profile.role) {
    throw new Error("forbidden");
  }

  const metadata = (taskRow.metadata as Record<string, unknown> | null) ?? {};
  const before = { ...taskRow };

  if (action === "reject") {
    const { data: updated } = await context.supabase
      .from("approval_tasks")
      .update({
        status: "rejected",
        stage: `Rejected by ${context.profile.role}`,
        updated_at: new Date().toISOString(),
        approval_chain: [...(((taskRow.approval_chain as unknown[]) ?? []) as unknown[]), { action, actor: context.profile.email, role: context.profile.role }],
      })
      .eq("id", taskId)
      .select("*, requester:requested_by(email, role)")
      .single();

    await createAuditLog(context, {
      moduleKey: safeString(taskRow.module_key),
      entityType: safeString(taskRow.entity_type),
      entityId: safeString(taskRow.entity_id, null as never),
      action: "rejected_approval_task",
      beforeValue: before,
      afterValue: updated as Record<string, unknown>,
      approvalAction: "reject",
    });

    return mapApprovalTask(updated as TaskRow);
  }

  const nextOwnerRole = safeString(metadata.next_owner_role);
  const nextStage = safeString(metadata.next_stage);
  const shouldAdvance =
    (safeString(taskRow.entity_type) === "payroll_approval" && ownerRole === "Finance Officer") ||
    (safeString(taskRow.entity_type) === "requisition_approval" && ownerRole === "Finance Officer");

  if (shouldAdvance && nextOwnerRole && nextStage) {
    const { data: updated } = await context.supabase
      .from("approval_tasks")
      .update({
        owner_role: nextOwnerRole,
        stage: nextStage,
        updated_at: new Date().toISOString(),
        approval_chain: [...(((taskRow.approval_chain as unknown[]) ?? []) as unknown[]), { action, actor: context.profile.email, role: context.profile.role }],
        metadata: {
          ...metadata,
          next_owner_role: null,
          next_stage: null,
        },
      })
      .eq("id", taskId)
      .select("*, requester:requested_by(email, role)")
      .single();

    await createAuditLog(context, {
      moduleKey: safeString(taskRow.module_key),
      entityType: safeString(taskRow.entity_type),
      entityId: safeString(taskRow.entity_id, null as never),
      action: "advanced_approval_task",
      beforeValue: before,
      afterValue: updated as Record<string, unknown>,
      approvalAction: `${context.profile.role} -> ${nextOwnerRole}`,
    });

    return mapApprovalTask(updated as TaskRow);
  }

  const { data: updated } = await context.supabase
    .from("approval_tasks")
    .update({
      status: "approved",
      stage: "Completed",
      updated_at: new Date().toISOString(),
      approval_chain: [...(((taskRow.approval_chain as unknown[]) ?? []) as unknown[]), { action, actor: context.profile.email, role: context.profile.role }],
    })
    .eq("id", taskId)
    .select("*, requester:requested_by(email, role)")
    .single();

  const entityType = safeString(taskRow.entity_type);
  const entityId = safeString(taskRow.entity_id);
  const finalStatus = safeString(metadata.final_status, "approved");

  if (entityType === "employee_activation") {
    await context.supabase.from("employees").update({ status: "Active" }).eq("id", entityId);
  } else if (entityType === "leave_request") {
    await context.supabase.from("leave_requests").update({ status: finalStatus }).eq("id", entityId);
  } else if (entityType === "training_request") {
    await context.supabase.from("training_requests").update({ status: finalStatus }).eq("id", entityId);
  } else if (entityType === "asset_request") {
    await context.supabase.from("asset_requests").update({ status: finalStatus }).eq("id", entityId);
  } else if (entityType === "requisition_approval") {
    await context.supabase.from("recruitment_requisitions").update({ status: finalStatus }).eq("id", entityId);
  } else if (entityType === "payroll_approval" && entityId) {
    await context.supabase.from("payroll_runs").update({ status: "Approved" }).eq("id", entityId);
    await context.supabase.from("payroll_approvals").insert({
      payroll_run_id: entityId,
      stage_name: "Approved by",
      owner_role: context.profile.role,
      acted_by: context.profile.id,
      status: "completed",
      comments: "Approved from workflow queue.",
      acted_at: new Date().toISOString(),
    });
  }

  await createAuditLog(context, {
    moduleKey: safeString(taskRow.module_key),
    entityType,
    entityId: entityId || null,
    action: "approved_approval_task",
    beforeValue: before,
    afterValue: updated as Record<string, unknown>,
    approvalAction: "approve",
  });

  return mapApprovalTask(updated as TaskRow);
}

export async function getPayrollPackage(): Promise<PayrollPackage | null> {
  const context = await getRequestContext();
  if (!roleCanAccessPayroll(context.profile.role) && context.profile.role !== "Employee") {
    throw new Error("forbidden");
  }

  const run = await getLatestPayrollRun(context);
  if (!run) {
    return null;
  }

  const { count } = await context.supabase
    .from("payroll_employees")
    .select("*", { count: "exact", head: true })
    .eq("payroll_run_id", safeString(run.id));

  return mapPayrollPackage({
    ...run,
    employee_count: count ?? 0,
  });
}

export async function getPayrollVariance(): Promise<PayrollVarianceItem[]> {
  const context = await getRequestContext();
  ensureRole(context.profile, PAYROLL_ROLES);

  let query = context.supabase
    .from("payroll_runs")
    .select("*")
    .order("processed_at", { ascending: false })
    .limit(2);

  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const [current, previous] = (data ?? []) as PayrollRunRow[];
  if (!current) {
    return [];
  }

  const pairs = [
    { label: "Gross pay", current: safeNumber(current.gross_pay), previous: safeNumber(previous?.gross_pay, 0) },
    { label: "Net pay", current: safeNumber(current.net_pay), previous: safeNumber(previous?.net_pay, 0) },
    { label: "PAYE", current: safeNumber(current.paye_total), previous: safeNumber(previous?.paye_total, 0) },
    { label: "SHIF", current: safeNumber(current.shif_total), previous: safeNumber(previous?.shif_total, 0) },
  ];

  return pairs.map((item) => {
    const diff = item.current - item.previous;
    const tone: PayrollVarianceItem["tone"] =
      diff > 200000 ? "warning" : diff >= 0 ? "positive" : "critical";

    return {
      label: item.label,
      current: formatCurrency(item.current),
      previous: formatCurrency(item.previous),
      movement: `${diff >= 0 ? "+" : ""}${formatCurrency(diff)}`,
      tone,
    };
  });
}

export async function getPayrollProcessData(): Promise<PayrollProcessData> {
  const context = await getRequestContext();
  ensureRole(context.profile, PAYROLL_ROLES);

  const run = await getLatestPayrollRun(context);
  if (!run) {
    return { validations: [], approvals: [], history: [], exports: [] };
  }

  const [validationRows, approvalRows, historyRows, exportRows] = await Promise.all([
    context.supabase
      .from("payroll_employees")
      .select("id, status, employee_id, gross_pay, net_pay")
      .eq("payroll_run_id", safeString(run.id))
      .neq("status", "Ready")
      .limit(8),
    context.supabase
      .from("payroll_approvals")
      .select("id, stage_name, owner_role, status, comments, acted_at")
      .eq("payroll_run_id", safeString(run.id))
      .order("created_at", { ascending: true }),
    context.supabase
      .from("payroll_runs")
      .select("*")
      .order("processed_at", { ascending: false })
      .limit(6),
    context.supabase
      .from("payroll_exports")
      .select("id, export_type, created_at, status, file_name, creator:created_by(email)")
      .eq("payroll_run_id", safeString(run.id))
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    validations: ((validationRows.data ?? []) as Array<Record<string, unknown>>).map((row, index) => ({
      id: safeString(row.id, `validation-${index}`),
      title: safeString(row.status, "Validation issue"),
      detail: `Employee row ${safeString(row.employee_id)} | Gross ${formatCurrency(safeNumber(row.gross_pay))} | Net ${formatCurrency(safeNumber(row.net_pay))}`,
      severity: safeString(row.status).toLowerCase().includes("error") ? "critical" : "warning",
      owner: "Payroll Admin",
      status: safeString(row.status),
    })),
    approvals: ((approvalRows.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: safeString(row.id),
      label: safeString(row.stage_name),
      owner: safeString(row.owner_role),
      status: safeString(row.status),
      comment: safeString(row.comments, "No comment recorded"),
      date: safeString(row.acted_at, "-"),
    })),
    history: ((historyRows.data ?? []) as PayrollRunRow[]).map((row) => ({
      period: safeString(row.period_label),
      payrollType: safeString(row.payroll_type),
      status: safeString(row.status),
      grossPay: formatCurrency(safeNumber(row.gross_pay)),
      netPay: formatCurrency(safeNumber(row.net_pay)),
      processedAt: safeString(row.processed_at, safeString(row.created_at)),
    })),
    exports: ((exportRows.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: safeString(row.id),
      label: safeString(row.file_name, safeString(row.export_type)),
      actor: safeString((row.creator as { email?: string } | null)?.email, "system"),
      status: safeString(row.status),
      generatedAt: safeString(row.created_at),
    })),
  };
}

export async function listPayrollPeriods() {
  const context = await getRequestContext();
  ensureRole(context.profile, PAYROLL_ROLES);

  let query = context.supabase
    .from("payroll_runs")
    .select("id, period_label, payroll_type, status, processed_at, gross_pay, net_pay, validation_errors")
    .order("processed_at", { ascending: false })
    .limit(24);

  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listEmployeePayrollData() {
  const context = await getRequestContext();
  ensureRole(context.profile, PAYROLL_ROLES);

  const run = await getLatestPayrollRun(context);
  if (!run) {
    return [];
  }

  const { data, error } = await context.supabase
    .from("payroll_employees")
    .select(
      "id, basic_salary, allowances, deductions, gross_pay, net_pay, status, employee:employee_id(employee_number, first_name, last_name, kra_pin, shif_number, nssf_number, bank_name, bank_branch, bank_account, employment_type, salary, department:department_id(name), branch:branch_id(name), designation:designation_id(title), job_grade:job_grade_id(name), payroll_group:payroll_group_id(name))"
    )
    .eq("payroll_run_id", safeString(run.id))
    .order("created_at", { ascending: true })
    .limit(250);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getStatutorySummary() {
  const context = await getRequestContext();
  ensureRole(context.profile, PAYROLL_ROLES);

  const run = await getLatestPayrollRun(context);
  if (!run) {
    return [];
  }

  return [
    { label: "PAYE", value: formatCurrency(safeNumber(run.paye_total)), filingStatus: "Ready" },
    { label: "SHIF", value: formatCurrency(safeNumber(run.shif_total)), filingStatus: "Ready" },
    { label: "Housing Levy", value: formatCurrency(safeNumber(run.housing_levy_total)), filingStatus: "Ready" },
    { label: "NSSF", value: formatCurrency(safeNumber(run.nssf_total)), filingStatus: "Ready" },
    { label: "Pension", value: formatCurrency(safeNumber(run.pension_total)), filingStatus: "Review" },
  ];
}

export async function listPayslips() {
  const context = await getRequestContext();
  const run = await getLatestPayrollRun(context);

  if (!run) {
    return [];
  }

  let query = context.supabase
    .from("payroll_employees")
    .select(
      "id, gross_pay, net_pay, deductions, allowances, employee:employee_id(id, employee_number, first_name, last_name, email)"
    )
    .eq("payroll_run_id", safeString(run.id))
    .order("created_at", { ascending: true })
    .limit(250);

  if (context.profile.role === "Employee" && context.profile.employee_id) {
    query = query.eq("employee_id", context.profile.employee_id);
  } else if (!roleCanAccessPayroll(context.profile.role)) {
    throw new Error("forbidden");
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const employee = asRecord(row.employee);
    return {
      id: safeString(row.id),
      employeeId: safeString(employee?.id),
      employeeNumber: safeString(employee?.employee_number),
      fullName: `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
      email: safeString(employee?.email),
      period: safeString(run.period_label),
      grossPay: formatCurrency(safeNumber(row.gross_pay)),
      netPay: formatCurrency(safeNumber(row.net_pay)),
      allowances: row.allowances ?? {},
      deductions: row.deductions ?? {},
    };
  });
}

export async function getPayslip(employeeId: string) {
  const slips = await listPayslips();
  return slips.find((item) => item.employeeId === employeeId) ?? null;
}

export async function getPayrollSettingsSnapshot() {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "Payroll Admin", "Finance Officer", "HR Admin", "Auditor"]);

  const [payrollGroupsResult, workflowResult] = await Promise.all([
    context.supabase
      .from("payroll_groups")
      .select("name, frequency, currency, cut_off_day, pay_day, status")
      .eq("company_id", context.profile.company_id)
      .order("name", { ascending: true }),
    context.supabase
      .from("approval_workflows")
      .select("module_key, name, steps, status")
      .eq("company_id", context.profile.company_id)
      .eq("module_key", "payroll"),
  ]);

  return {
    payrollGroups: payrollGroupsResult.data ?? [],
    workflows: workflowResult.data ?? [],
    defaults: {
      currency: "KES",
      shifFormula: "2.75% of gross pay",
      housingLevyFormula: "1.5% employee + 1.5% employer",
      nssfFormula: "KES 1,080 employee + KES 1,080 employer",
    },
  };
}

export async function listPayrollAuditEvents() {
  const context = await getRequestContext();
  ensureRole(context.profile, PAYROLL_ROLES);

  let query = context.supabase
    .from("audit_logs")
    .select("*")
    .eq("module_key", "payroll")
    .order("created_at", { ascending: false })
    .limit(100);

  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapAuditEvent(row));
}

export async function recordPayrollExport(input: {
  exportType: "net_to_bank" | "paye_report" | "payroll_register" | "p9_forms";
}) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "Payroll Admin", "Finance Officer"]);

  const run = await getLatestPayrollRun(context);
  if (!run) {
    throw new Error("payroll_run_not_found");
  }

  const exportLabels: Record<string, string> = {
    net_to_bank: "Net-to-bank export",
    paye_report: "PAYE support schedule",
    payroll_register: "Payroll register",
    p9_forms: "P9 forms bundle",
  };

  const fileName = `${input.exportType}-${safeString(run.period_label).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  const { data, error } = await context.supabase
    .from("payroll_exports")
    .insert({
      payroll_run_id: safeString(run.id),
      export_type: input.exportType,
      file_name: fileName,
      storage_bucket: getStorageBucketNames().payrollDocuments,
      storage_path: `generated/${fileName}`,
      status: "ready",
      created_by: context.profile.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("payroll_export_create_failed");
  }

  await createAuditLog(context, {
    moduleKey: "payroll",
    entityType: "payroll_export",
    entityId: safeString(data.id),
    action: "generated_payroll_export",
    afterValue: data as Record<string, unknown>,
    approvalAction: exportLabels[input.exportType],
  });

  return {
    exportType: input.exportType,
    label: exportLabels[input.exportType],
    period: safeString(run.period_label),
    status: "ready",
  };
}

export async function getPayrollExportFile(
  exportType: "net_to_bank" | "paye_report" | "payroll_register" | "p9_forms"
) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "Payroll Admin", "Finance Officer", "Auditor"]);

  const run = await getLatestPayrollRun(context);
  if (!run) {
    throw new Error("payroll_run_not_found");
  }

  const { data, error } = await context.supabase
    .from("payroll_employees")
    .select("gross_pay, net_pay, deductions, allowances, employee:employee_id(employee_number, first_name, last_name, bank_name, bank_account, salary)")
    .eq("payroll_run_id", safeString(run.id))
    .order("created_at", { ascending: true })
    .limit(250);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  let header = "";
  let body = "";
  if (exportType === "payroll_register") {
    header = "employee_number,employee_name,gross_pay,net_pay\n";
    body = rows
      .map((row) => {
        const employee = asRecord(row.employee);
        return [
          safeString(employee?.employee_number),
          `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
          safeNumber(row.gross_pay),
          safeNumber(row.net_pay),
        ].join(",");
      })
      .join("\n");
  } else if (exportType === "net_to_bank") {
    header = "employee_number,employee_name,bank,account_number,net_pay\n";
    body = rows
      .map((row) => {
        const employee = asRecord(row.employee);
        return [
          safeString(employee?.employee_number),
          `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
          safeString(employee?.bank_name),
          safeString(employee?.bank_account),
          safeNumber(row.net_pay),
        ].join(",");
      })
      .join("\n");
  } else if (exportType === "paye_report") {
    header = "employee_number,employee_name,taxable_pay,paye\n";
    body = rows
      .map((row) => {
        const employee = asRecord(row.employee);
        const deductions = (row.deductions as Record<string, unknown> | null) ?? {};
        return [
          safeString(employee?.employee_number),
          `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
          safeNumber(row.gross_pay),
          safeNumber(deductions.paye),
        ].join(",");
      })
      .join("\n");
  } else {
    header = "employee_number,employee_name,ytd_taxable_pay,ytd_paye\n";
    body = rows
      .map((row) => {
        const employee = asRecord(row.employee);
        const deductions = (row.deductions as Record<string, unknown> | null) ?? {};
        return [
          safeString(employee?.employee_number),
          `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
          safeNumber(row.gross_pay) * 12,
          safeNumber(deductions.paye) * 12,
        ].join(",");
      })
      .join("\n");
  }

  await createAuditLog(context, {
    moduleKey: "payroll",
    entityType: "payroll_export",
    action: "downloaded_payroll_export",
    afterValue: { exportType, period: safeString(run.period_label) },
    approvalAction: `${exportType} download`,
  });

  return {
    filename: `${exportType}-${safeString(run.period_label).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
    body: `${header}${body}\n`,
  };
}

export async function listLookupRecords(table: LookupTable) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Payroll Admin", "Auditor"]);

  let query = context.supabase.from(table).select("*").order("created_at", { ascending: true });
  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function createLookupRecord(table: LookupTable, payload: Record<string, unknown>) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Payroll Admin"]);

  const { data, error } = await context.supabase
    .from(table)
    .insert({
      company_id: context.profile.company_id,
      ...payload,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("lookup_create_failed");
  }

  await createAuditLog(context, {
    moduleKey: "settings",
    entityType: table,
    entityId: safeString(data.id),
    action: "created_lookup_record",
    afterValue: data as Record<string, unknown>,
  });

  return data;
}

export async function updateLookupRecord(table: LookupTable, recordId: string, payload: Record<string, unknown>) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Payroll Admin"]);

  const before = await context.supabase.from(table).select("*").eq("id", recordId).single();
  const { data, error } = await context.supabase
    .from(table)
    .update(payload)
    .eq("id", recordId)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("lookup_update_failed");
  }

  await createAuditLog(context, {
    moduleKey: "settings",
    entityType: table,
    entityId: recordId,
    action: "updated_lookup_record",
    beforeValue: before.data as Record<string, unknown>,
    afterValue: data as Record<string, unknown>,
  });

  return data;
}

export async function deleteLookupRecord(table: LookupTable, recordId: string) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Payroll Admin"]);

  const before = await context.supabase.from(table).select("*").eq("id", recordId).single();
  const { error } = await context.supabase.from(table).delete().eq("id", recordId);
  if (error) {
    throw error;
  }

  await createAuditLog(context, {
    moduleKey: "settings",
    entityType: table,
    entityId: recordId,
    action: "deleted_lookup_record",
    beforeValue: before.data as Record<string, unknown>,
  });

  return { success: true };
}

export async function inviteUser(input: {
  email: string;
  fullName: string;
  role: AppRole;
  employeeId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
}) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin"]);

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: {
      full_name: input.fullName,
    },
    redirectTo: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (error || !data.user) {
    throw error ?? new Error("invite_failed");
  }

  await admin.from("users").upsert({
    id: data.user.id,
    company_id: context.profile.company_id,
    full_name: input.fullName,
    email: input.email,
    role: input.role,
    employee_id: input.employeeId ?? null,
    branch_id: input.branchId ?? null,
    department_id: input.departmentId ?? null,
    status: "invited",
  });

  await createAuditLog(context, {
    moduleKey: "settings",
    entityType: "user",
    entityId: data.user.id,
    action: "invited_user",
    afterValue: {
      email: input.email,
      role: input.role,
    },
  });

  return { id: data.user.id, email: input.email, role: input.role };
}

export async function uploadEmployeeDocument(input: {
  employeeId: string;
  category: string;
  file: File;
}) {
  const context = await getRequestContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Payroll Admin", "Operator", "Employee"]);

  const buckets = getStorageBucketNames();
  const bucket =
    input.category.toLowerCase().includes("payslip") || input.category.toLowerCase().includes("p9")
      ? buckets.payrollDocuments
      : buckets.employeeDocuments;

  const ext = input.file.name.split(".").pop() ?? "bin";
  const filePath = `${input.employeeId}/${Date.now()}-${input.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`;
  const fileBuffer = Buffer.from(await input.file.arrayBuffer());

  const admin = createSupabaseAdminClient();
  const uploadResult = await admin.storage.from(bucket).upload(filePath, fileBuffer, {
    contentType: input.file.type,
    upsert: true,
  });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const { data, error } = await context.supabase
    .from("employee_documents")
    .insert({
      company_id: context.profile.company_id,
      employee_id: input.employeeId,
      category: input.category,
      file_name: input.file.name,
      storage_bucket: bucket,
      storage_path: filePath,
      mime_type: input.file.type,
      size_bytes: input.file.size,
      uploaded_by: context.profile.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("document_record_failed");
  }

  await createAuditLog(context, {
    moduleKey: "people",
    entityType: "employee_document",
    entityId: safeString(data.id),
    action: "uploaded_employee_document",
    afterValue: data as Record<string, unknown>,
  });

  return data;
}

export async function buildPageFromDatabase(module: ModuleSpec, item: string): Promise<PageSpec> {
  const base = getPage(module, item);
  const context = await getRequestContext();

  if (module.key === "people" && item === "Employee Directory") {
    const employees = await listEmployeeRecords();
    return {
      ...base,
      metrics: base.metrics.map((metric) =>
        metric.label === "Directory records"
          ? { ...metric, value: String(employees.length), hint: "Real employee records from Supabase" }
          : metric
      ),
      table: {
        ...base.table,
        rows: employees.slice(0, 20).map((employee) => ({
          employee: `${employee.employeeNumber} ${employee.fullName}`,
          department: employee.department,
          branch: employee.branch,
          employment: employee.employmentType,
          status: employee.status,
        })),
      },
    };
  }

  if (module.key === "payroll" && item === "Payroll Dashboard") {
    const payroll = await getPayrollPackage();
    if (!payroll) {
      return base;
    }
    return {
      ...base,
      metrics: base.metrics.map((metric) => {
        if (metric.label === "Current payroll month") {
          return { ...metric, value: payroll.period, hint: payroll.status };
        }
        if (metric.label === "Active payroll employees") {
          return { ...metric, value: payroll.employeeCount, hint: "Employees in current run" };
        }
        if (metric.label === "Gross pay") {
          return { ...metric, value: payroll.grossPay, hint: "Live payroll run total" };
        }
        if (metric.label === "Net pay") {
          return { ...metric, value: payroll.netPay, hint: "Live net pay total" };
        }
        return metric;
      }),
    };
  }

  if (module.key === "payroll" && item === "Payroll Periods") {
    const periods = await listPayrollPeriods();
    return {
      ...base,
      table: {
        title: "Payroll periods",
        description: "Live payroll runs stored in Supabase.",
        columns: [
          { key: "period", label: "Period" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "gross", label: "Gross Pay" },
          { key: "processed", label: "Processed" },
        ],
        rows: periods.map((row) => ({
          period: safeString(row.period_label),
          type: safeString(row.payroll_type),
          status: safeString(row.status),
          gross: formatCurrency(safeNumber(row.gross_pay)),
          processed: safeString(row.processed_at, "-"),
        })),
      },
    };
  }

  if (module.key === "payroll" && item === "Employee Payroll Data") {
    const rows = await listEmployeePayrollData();
    return {
      ...base,
      table: {
        title: "Employee payroll data",
        description: "Live payroll employee rows from the active payroll run.",
        columns: [
          { key: "employee", label: "Employee" },
          { key: "department", label: "Department" },
          { key: "bank", label: "Bank" },
          { key: "gross", label: "Gross Pay" },
          { key: "net", label: "Net Pay" },
          { key: "status", label: "Status" },
        ],
        rows: rows.map((row) => {
          const employee = asRecord(row.employee);
          return {
            employee: `${safeString(employee?.employee_number)} ${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
            department: safeString((employee?.department as { name?: string } | null)?.name, "-"),
            bank: `${safeString(employee?.bank_name)} ${safeString(employee?.bank_account)}`.trim(),
            gross: formatCurrency(safeNumber(row.gross_pay)),
            net: formatCurrency(safeNumber(row.net_pay)),
            status: safeString(row.status),
          };
        }),
      },
    };
  }

  if (module.key === "payroll" && item === "Statutory Reports") {
    const summary = await getStatutorySummary();
    return {
      ...base,
      table: {
        title: "Statutory summary",
        description: "Live statutory totals generated from the active payroll run.",
        columns: [
          { key: "label", label: "Report" },
          { key: "value", label: "Amount" },
          { key: "status", label: "Filing Status" },
        ],
        rows: summary.map((item) => ({
          label: item.label,
          value: item.value,
          status: item.filingStatus,
        })),
      },
    };
  }

  if (module.key === "payroll" && item === "Payslips") {
    const payslips = await listPayslips();
    return {
      ...base,
      table: {
        title: "Payslip register",
        description: "Live payslip rows from the active payroll run.",
        columns: [
          { key: "employee", label: "Employee" },
          { key: "period", label: "Period" },
          { key: "gross", label: "Gross Pay" },
          { key: "net", label: "Net Pay" },
          { key: "email", label: "Email" },
        ],
        rows: payslips.map((payslip) => ({
          employee: `${payslip.employeeNumber} ${payslip.fullName}`,
          period: payslip.period,
          gross: payslip.grossPay,
          net: payslip.netPay,
          email: payslip.email,
        })),
      },
    };
  }

  if (module.key === "payroll" && item === "Payroll Audit Trail") {
    const events = await listPayrollAuditEvents();
    return {
      ...base,
      table: {
        title: "Payroll audit trail",
        description: "Live payroll actions captured in the audit log.",
        columns: [
          { key: "action", label: "Action" },
          { key: "actor", label: "Actor" },
          { key: "subject", label: "Subject" },
          { key: "timestamp", label: "Timestamp" },
        ],
        rows: events.map((event) => ({
          action: event.action,
          actor: `${event.actorRole} | ${event.actorEmail}`,
          subject: event.subject,
          timestamp: event.timestamp,
        })),
      },
    };
  }

  if (module.key === "payroll" && item === "Payroll Settings") {
    const settings = await getPayrollSettingsSnapshot();
    return {
      ...base,
      table: {
        title: "Payroll settings snapshot",
        description: "Live payroll groups and workflow settings.",
        columns: [
          { key: "name", label: "Payroll Group" },
          { key: "frequency", label: "Frequency" },
          { key: "currency", label: "Currency" },
          { key: "status", label: "Status" },
        ],
        rows: settings.payrollGroups.map((group) => ({
          name: safeString(group.name),
          frequency: safeString(group.frequency),
          currency: safeString(group.currency),
          status: safeString(group.status),
        })),
      },
    };
  }

  if (module.key === "leave" && item === "Leave Dashboard") {
    let query = context.supabase.from("leave_requests").select("*", { count: "exact", head: true });
    if (context.profile.company_id) {
      query = query.eq("company_id", context.profile.company_id);
    }
    const { count } = await query;
    return {
      ...base,
      metrics: base.metrics.map((metric) =>
        metric.label === "Leave requests"
          ? { ...metric, value: String(count ?? 0), hint: "Live leave records from Supabase" }
          : metric
      ),
    };
  }

  if (module.key === "recruitment" && item === "Job Requisitions") {
    let query = context.supabase
      .from("recruitment_requisitions")
      .select("role_title, status, headcount, created_at, department:departments(name)")
      .order("created_at", { ascending: false })
      .limit(20);
    if (context.profile.company_id) {
      query = query.eq("company_id", context.profile.company_id);
    }
    const { data } = await query;
    return {
      ...base,
      table: {
        ...base.table,
        rows: ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          role: safeString(row.role_title),
          department: safeString((row.department as { name?: string } | null)?.name, "-"),
          status: safeString(row.status),
          owner: "Workflow",
          updated: safeString(row.created_at),
        })),
      },
    };
  }

  return base;
}
