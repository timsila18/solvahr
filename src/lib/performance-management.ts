import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeRole, roleCanAccessModule, type AppRole, type AuthUserProfile } from "@/lib/auth";
import {
  buildPerformanceAppraisalReportPdf,
  type PerformanceAppraisalPdfDataset,
  type PerformanceAppraisalPdfFile,
} from "@/lib/payroll-output-builders";
import { getBundledSolvaHrLogoJpeg } from "@/lib/platform-branding";
import { ROBOT_CAFE_COMPANY_ID } from "@/lib/shift-roster";

type PerformanceContext = {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  profile: AuthUserProfile;
};

type RecordMap = Record<string, unknown>;
const ROBOT_CAFE_SHARED_SERVICE_SUPERVISORS = new Set([
  "brian.niva@solvahr.co.ke",
  "grace.wariungi@solvahr.co.ke",
  "victor.akoyo@solvahr.co.ke",
  "brian niva",
  "grace wanjiku wariungi",
  "victor akoyo",
]);

const PERFORMANCE_KPI_CATEGORIES = [
  "Sales Performance",
  "Customer Service",
  "Attendance & Reliability",
  "Food Quality / Service Quality",
  "Hygiene & Compliance",
  "Teamwork",
  "Speed of Service",
  "Stock / Waste Control",
  "Leadership",
  "Training Completion",
] as const;

const PERFORMANCE_RATING_SCALE = [
  { label: "Excellent", minimum: 101, maximum: 999 },
  { label: "Good", minimum: 100, maximum: 100 },
  { label: "Fair", minimum: 80, maximum: 99.99 },
  { label: "Poor", minimum: 70, maximum: 79.99 },
  { label: "Very Poor", minimum: 0, maximum: 69.99 },
] as const;

const PERFORMANCE_ROLE_EXAMPLES = [
  {
    role: "Waiter",
    title: "Weekly Sales",
    category: "Sales Performance",
    measurementUnit: "KES",
    targetValue: 50000,
    weightPercent: 40,
  },
  {
    role: "Chef",
    title: "Food Quality Compliance",
    category: "Food Quality / Service Quality",
    measurementUnit: "%",
    targetValue: 95,
    weightPercent: 30,
  },
  {
    role: "Supervisor",
    title: "Team Sales Achievement",
    category: "Leadership",
    measurementUnit: "KES",
    targetValue: 500000,
    weightPercent: 40,
  },
  {
    role: "Cashier",
    title: "Till Accuracy",
    category: "Attendance & Reliability",
    measurementUnit: "%",
    targetValue: 100,
    weightPercent: 35,
  },
  {
    role: "Cleaner",
    title: "Hygiene Checklist Compliance",
    category: "Hygiene & Compliance",
    measurementUnit: "%",
    targetValue: 98,
    weightPercent: 40,
  },
  {
    role: "Barista",
    title: "Speed of Service",
    category: "Speed of Service",
    measurementUnit: "%",
    targetValue: 95,
    weightPercent: 30,
  },
  {
    role: "Admin Staff",
    title: "Task Completion Accuracy",
    category: "Teamwork",
    measurementUnit: "%",
    targetValue: 100,
    weightPercent: 30,
  },
] as const;

const SIMPLE_ROBOT_CAFE_APPRAISAL_AREAS = [
  {
    title: "Punctuality",
    performanceIndicator: "Attendance, timekeeping, and shift readiness",
    expectedOutput: "Reports on time, prepared for duty, and supports smooth shift handover.",
  },
  {
    title: "Teamwork",
    performanceIndicator: "Collaboration and communication",
    expectedOutput: "Works well with kitchen, service, cashier, and support teams during operations.",
  },
  {
    title: "Service / Quality of Work",
    performanceIndicator: "Guest experience and quality standards",
    expectedOutput: "Delivers service or assigned duties to the expected Robot Cafe standard.",
  },
  {
    title: "Discipline / Reliability",
    performanceIndicator: "Conduct and consistency",
    expectedOutput: "Follows instructions, upholds conduct standards, and can be relied on operationally.",
  },
  {
    title: "Role Delivery / Job Knowledge",
    performanceIndicator: "Role competence and execution",
    expectedOutput: "Understands the role well and delivers duties with growing confidence and accuracy.",
  },
] as const;

const SIMPLE_ROBOT_CAFE_FINAL_OUTCOMES = [
  "Performing Well",
  "Stable / Good",
  "Training Needed",
  "Needs Improvement",
  "Promotion Potential",
  "Formal Follow-Up Required",
] as const;
const SIMPLE_ROBOT_CAFE_SELF_SHARE = 33;
const SIMPLE_ROBOT_CAFE_SUPERVISOR_SHARE = 33;
const SIMPLE_ROBOT_CAFE_GM_SHARE = 34;
const SIMPLE_ROBOT_CAFE_TOTAL_SHARE =
  SIMPLE_ROBOT_CAFE_SELF_SHARE +
  SIMPLE_ROBOT_CAFE_SUPERVISOR_SHARE +
  SIMPLE_ROBOT_CAFE_GM_SHARE;

const SIMPLE_ROBOT_CAFE_REVIEW_STATUSES = {
  self: "self_review_pending",
  supervisor: "supervisor_review_pending",
  gm: "gm_review_pending",
  final: "finalized",
} as const;

function safeString(value: unknown, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value == null) {
    return fallback;
  }
  return String(value).trim() || fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordMap)
    : null;
}

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is RecordMap =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      )
    : [];
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function normalizeIdentity(value: string | null | undefined) {
  return safeString(value).trim().toLowerCase();
}

function isRobotCafePerformanceWorkflow(companyId: string | null | undefined) {
  return safeString(companyId) === ROBOT_CAFE_COMPANY_ID;
}

function canEmployeeEditSimpleSelfReview(status: string) {
  const normalizedStatus = safeString(status);
  return (
    normalizedStatus === SIMPLE_ROBOT_CAFE_REVIEW_STATUSES.self ||
    normalizedStatus === SIMPLE_ROBOT_CAFE_REVIEW_STATUSES.supervisor
  );
}

function getInitialsFromName(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, "").charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 5)
    .join("") || "SG";
}

function getDefaultExecutiveSignatoryTitle(companyName: string) {
  const cleanName = safeString(companyName, "the organization");
  if (/solva business group/i.test(cleanName)) {
    return `C.E.O ${cleanName}`;
  }
  return `General Manager - ${cleanName}`;
}

function isRobotCafeSharedServiceSupervisor(profile: AuthUserProfile) {
  if (profile.role !== "Supervisor" || safeString(profile.company_id) !== ROBOT_CAFE_COMPANY_ID) {
    return false;
  }

  return (
    ROBOT_CAFE_SHARED_SERVICE_SUPERVISORS.has(normalizeIdentity(profile.email)) ||
    ROBOT_CAFE_SHARED_SERVICE_SUPERVISORS.has(normalizeIdentity(profile.full_name))
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isEvaluationRole(role: AppRole) {
  return ["Supervisor", "Manager", "HR Admin", "Super Admin", "Payroll Admin"].includes(role);
}

function qualitativeScoreToPercent(score: number) {
  if (score >= 5) return 110;
  if (score >= 4) return 100;
  if (score >= 3) return 90;
  if (score >= 2) return 75;
  return 60;
}

function deriveRatingBand(score: number) {
  if (score >= 101) return "Excellent";
  if (score >= 100) return "Good";
  if (score >= 80) return "Fair";
  if (score >= 70) return "Poor";
  return "Very Poor";
}

function deriveIndicator(score: number) {
  if (score >= 100) return "green";
  if (score >= 80) return "amber";
  return "red";
}

function deriveMatrixBox(performanceBand: string, potentialRating: string) {
  const normalizedBand = safeString(performanceBand).toLowerCase();
  const normalizedPotential = safeString(potentialRating).toLowerCase();

  const performanceTier =
    normalizedBand === "excellent" || normalizedBand === "good"
      ? "high"
      : normalizedBand === "fair"
        ? "medium"
        : "low";
  const potentialTier =
    normalizedPotential === "high"
      ? "high"
      : normalizedPotential === "medium"
        ? "medium"
        : "low";

  if (performanceTier === "high" && potentialTier === "high") return "High Performer / High Potential";
  if (performanceTier === "high") return "Strong Performer";
  if (performanceTier === "medium" && potentialTier === "high") return "Strong Performer";
  if (performanceTier === "medium") return "Stable Performer";
  if (potentialTier === "high") return "Needs Development";
  return "At Risk";
}

function mapViewerRole(value: string | null | undefined) {
  return normalizeRole(value);
}

async function getPerformanceContext(): Promise<PerformanceContext> {
  const authSupabase = await createSupabaseServerClient();
  const supabase = createSupabaseAdminClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    throw new Error("unauthorized");
  }

  const { data } = await supabase
    .from("users")
    .select("id, company_id, full_name, email, phone, role, employee_id, branch_id, department_id, last_login, status")
    .eq("id", user.id)
    .single();

  const metadataStatus =
    typeof user.app_metadata.status === "string"
      ? user.app_metadata.status
      : typeof user.user_metadata.status === "string"
        ? user.user_metadata.status
        : "active";

  const profile: AuthUserProfile = data
    ? {
        ...data,
        role: normalizeRole(safeString(data.role)),
        status:
          safeString(data.status).toLowerCase() === "pending_approval" || metadataStatus === "pending_approval"
            ? "pending_approval"
            : safeString(data.status, metadataStatus),
      }
    : {
        id: user.id,
        company_id: null,
        full_name: safeString(user.user_metadata.full_name, user.email ?? "Solva User"),
        email: user.email ?? "",
        phone: null,
        role: mapViewerRole(safeString(user.app_metadata.role, "Employee")),
        employee_id: null,
        branch_id: null,
        department_id: null,
        last_login: null,
        status: metadataStatus,
      };

  if (["pending_approval", "suspended", "deactivated", "revoked"].includes(profile.status.toLowerCase())) {
    throw new Error("forbidden");
  }

  return { supabase, profile };
}

function ensureRole(profile: AuthUserProfile, allowedRoles: AppRole[]) {
  if (!allowedRoles.includes(profile.role)) {
    throw new Error("forbidden");
  }
}

function withEmployeeScope<
  T extends {
    eq: (column: string, value: string) => T;
    or: (filters: string) => T;
  },
>(
  query: T,
  profile: AuthUserProfile
) {
  if (
    [
      "Super Admin",
      "HR Admin",
      "Payroll Admin",
      "Finance Officer",
      "Auditor",
      "Operator",
      "Manager",
    ].includes(profile.role)
  ) {
    return query;
  }
  if (profile.role === "Supervisor" && profile.employee_id) {
    return query.or(`id.eq.${profile.employee_id},supervisor_employee_id.eq.${profile.employee_id}`);
  }
  if (profile.employee_id) {
    return query.eq("id", profile.employee_id as never);
  }
  return query.eq("id", "00000000-0000-0000-0000-000000000000" as never);
}

async function assertEmployeeScope(context: PerformanceContext, employeeId: string) {
  const scopedEmployeeIds = await getScopedEmployeeIds(context);
  if (scopedEmployeeIds !== null && !scopedEmployeeIds.includes(employeeId)) {
    throw new Error("forbidden");
  }

  let query = context.supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("id", employeeId);

  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }

  const { count, error } = await query;
  if (error) {
    throw error;
  }
  if (!count) {
    throw new Error("forbidden");
  }
}

async function getScopedEmployeeIds(context: PerformanceContext) {
  if (
    [
      "Super Admin",
      "HR Admin",
      "Payroll Admin",
      "Finance Officer",
      "Auditor",
      "Operator",
      "Manager",
    ].includes(context.profile.role)
  ) {
    return null;
  }

  if (!context.profile.employee_id) {
    return [];
  }

  if (isRobotCafeSharedServiceSupervisor(context.profile)) {
    const { data, error } = await context.supabase
      .from("employees")
      .select("id, department:department_id(name)")
      .eq("company_id", ROBOT_CAFE_COMPANY_ID)
      .in("status", ["Active", "active", "Pending activation"]);

    if (error) {
      throw error;
    }

    const scopedIds = new Set<string>();
    for (const row of (data ?? []) as Array<RecordMap>) {
      const employeeId = safeString(row.id);
      const departmentName = safeString(asRecord(row.department)?.name);
      if (employeeId && (departmentName === "Service" || employeeId === safeString(context.profile.employee_id))) {
        scopedIds.add(employeeId);
      }
    }

    if (context.profile.employee_id) {
      scopedIds.add(safeString(context.profile.employee_id));
    }

    return [...scopedIds];
  }

  if (context.profile.role === "Supervisor") {
    let query = context.supabase
      .from("employees")
      .select("id")
      .or(`id.eq.${context.profile.employee_id},supervisor_employee_id.eq.${context.profile.employee_id}`);

    if (context.profile.company_id) {
      query = query.eq("company_id", context.profile.company_id);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => safeString((row as RecordMap).id)).filter(Boolean);
  }

  return [context.profile.employee_id];
}

function applyScopedEmployeeIds<T extends { eq: (...args: never[]) => T; in: (...args: never[]) => T }>(
  query: T,
  employeeIds: string[] | null,
  column = "employee_id"
) {
  if (employeeIds === null) {
    return query;
  }
  if (employeeIds.length === 0) {
    return query.eq(column as never, "00000000-0000-0000-0000-000000000000" as never);
  }
  if (employeeIds.length === 1) {
    return query.eq(column as never, employeeIds[0] as never);
  }
  return query.in(column as never, employeeIds as never);
}

async function createAuditLog(
  context: PerformanceContext,
  input: {
    moduleKey: string;
    entityType: string;
    entityId?: string | null;
    action: string;
    beforeValue?: RecordMap;
    afterValue?: RecordMap;
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

async function createTask(
  context: PerformanceContext,
  task: {
    module_key: string;
    entity_type: string;
    entity_id?: string | null;
    title: string;
    description: string;
    owner_role: AppRole;
    stage: string;
    metadata?: RecordMap;
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
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("approval_task_create_failed");
  }

  return data as RecordMap;
}

async function getCompanyBranding(context: PerformanceContext) {
  const [companyResult, settingsResult] = await Promise.all([
    context.supabase.from("companies").select("name, slug").eq("id", context.profile.company_id).maybeSingle(),
    context.supabase
      .from("company_settings")
      .select("physical_address, branding, registration_number")
      .eq("company_id", context.profile.company_id)
      .maybeSingle(),
  ]);

  const company = asRecord(companyResult.data);
  const settings = asRecord(settingsResult.data);
  const branding = asRecord(settings?.branding);
  const displayName = safeString(branding?.displayName, safeString(company?.name, "Solva HR Workspace"));
  const address = safeString(settings?.physical_address, "P.O. Box 80402 - 00100, Nairobi, Kenya");
  const addressLines = address.split(",").map((line) => safeString(line)).filter(Boolean);

  return {
    organizationName: displayName,
    organizationIdentifier: safeString(branding?.employerIdentifier, safeString(settings?.registration_number, safeString(company?.slug).toUpperCase())),
    organizationLogoMark: safeString(branding?.logoMark, "RC"),
    organizationLogoPath: safeString(branding?.logoPath),
    platformLogoJpeg: await getBundledSolvaHrLogoJpeg(),
    organizationLogoJpeg: null as Uint8Array | null,
    addressLines,
    reportFooter: safeString(branding?.reportFooter, "Generated by Solva HR - www.solvahr.co.ke"),
  };
}

async function getCompanyAppraisalSignatories(context: PerformanceContext) {
  const [companyResult, managerResult] = await Promise.all([
    context.supabase.from("companies").select("name").eq("id", context.profile.company_id).maybeSingle(),
    context.supabase
      .from("users")
      .select("full_name, email, employee_id")
      .eq("company_id", context.profile.company_id)
      .eq("role", "Manager")
      .eq("status", "active")
      .order("employee_id", { ascending: false }),
  ]);

  if (companyResult.error) {
    throw companyResult.error;
  }
  if (managerResult.error) {
    throw managerResult.error;
  }

  const companyName = safeString(asRecord(companyResult.data)?.name, "the organization");
  const managerRows = (managerResult.data as Array<RecordMap> | null) ?? [];
  const managerRecord =
    managerRows.find((row) => Boolean(safeString(row.employee_id))) ??
    managerRows[0] ??
    null;

  const gmName = managerRecord
    ? safeString(managerRecord.full_name, safeString(managerRecord.email, "General Manager"))
    : "General Manager";

  return {
    companyName,
    authorized: {
      name: gmName,
      title: getDefaultExecutiveSignatoryTitle(companyName),
      initials: getInitialsFromName(gmName),
    },
  };
}

async function createSignedStorageUrl(bucket: string, path: string) {
  if (!path) {
    return null;
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 5);
  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

async function downloadImageBytes(url: string | null) {
  if (!url) {
    return null;
  }
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function getBrandingImages(context: PerformanceContext) {
  const branding = await getCompanyBranding(context);
  const organizationLogoUrl = await createSignedStorageUrl("payroll-documents", branding.organizationLogoPath);

  return {
    ...branding,
    organizationLogoJpeg: await downloadImageBytes(organizationLogoUrl),
    platformLogoJpeg: null,
  };
}

async function ensurePerformanceSettings(context: PerformanceContext) {
  const defaults = {
    company_id: context.profile.company_id,
    payroll_admin_visibility_enabled: true,
    payroll_admin_action_enabled: false,
    kpi_categories: [...PERFORMANCE_KPI_CATEGORIES],
    rating_scale: [...PERFORMANCE_RATING_SCALE],
    help_content: {
      howToSetKpi:
        "Set one measurable outcome, define a clear unit, assign a realistic weight, and keep the owner and period explicit.",
      howScoringWorks:
        "Achievement percentage is actual divided by target. Weighted contribution multiplies that percentage by the KPI weight.",
      workflow:
        "Employee self-review moves to supervisor evaluation, then GM calibration and finalization before the report is released.",
    },
  };

  const { data, error } = await context.supabase
    .from("performance_settings")
    .upsert(defaults, { onConflict: "company_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("performance_settings_unavailable");
  }
  return data as RecordMap;
}

async function listScopedEmployees(context: PerformanceContext) {
  let query = context.supabase
    .from("employees")
    .select(
      "id, employee_number, first_name, last_name, salary, employment_type, hire_date, status, supervisor_employee_id, department:department_id(id, name), branch:branch_id(id, name), designation:designation_id(id, title)"
    )
    .order("employee_number", { ascending: true });

  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }

  const scopedEmployeeIds = await getScopedEmployeeIds(context);
  query = applyScopedEmployeeIds(query as never, scopedEmployeeIds, "id") as typeof query;

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<RecordMap>).map((row) => ({
    id: safeString(row.id),
    employeeNumber: safeString(row.employee_number),
    fullName: `${safeString(row.first_name)} ${safeString(row.last_name)}`.trim(),
    salary: safeNumber(row.salary),
    employmentType: safeString(row.employment_type),
    hireDate: safeString(row.hire_date),
    status: safeString(row.status),
    supervisorEmployeeId: safeString(row.supervisor_employee_id),
    departmentId: safeString(asRecord(row.department)?.id),
    department: safeString(asRecord(row.department)?.name, "Unassigned"),
    branchId: safeString(asRecord(row.branch)?.id),
    branch: safeString(asRecord(row.branch)?.name, "Unassigned"),
    designation: safeString(asRecord(row.designation)?.title, "-"),
  }));
}

async function listEmployeesByCompany(context: PerformanceContext, filters?: { departmentIds?: string[]; roleTitles?: string[] }) {
  let query = context.supabase
    .from("employees")
    .select("id, employee_number, first_name, last_name, salary, employment_type, hire_date, status, supervisor_employee_id, department_id, designation_id, designation:designation_id(title)")
    .eq("company_id", context.profile.company_id)
    .in("status", ["Active", "active", "Pending activation"]);

  if (filters?.departmentIds?.length) {
    query = query.in("department_id", filters.departmentIds);
  }

  const { data, error } = await query.order("employee_number", { ascending: true });
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<RecordMap>;
  const roleTitles = (filters?.roleTitles ?? []).map((value) => value.toLowerCase());
  return rows.filter((row) => {
    if (!roleTitles.length) return true;
    const designationName = safeString(asRecord(row.designation)?.title).toLowerCase();
    return roleTitles.includes(designationName);
  });
}

async function listScopedRows(
  context: PerformanceContext,
  table: string,
  select: string,
  employeeColumn = "employee_id"
) {
  const employeeIds = await getScopedEmployeeIds(context);
  let query = context.supabase.from(table).select(select).order("created_at", { ascending: false });
  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }
  query = applyScopedEmployeeIds(query as never, employeeIds, employeeColumn) as typeof query;
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return ((data ?? []) as unknown[]) as Array<RecordMap>;
}

function computeItemPercent(item: RecordMap, stage: "self" | "supervisor" | "gm" | "final") {
  const targetValue = safeNumber(item.target_value ?? item.targetValue);
  const actualValue = safeNumber(item.actual_value ?? item.actualValue);
  if (targetValue > 0 && actualValue > 0) {
    return Number(((actualValue / targetValue) * 100).toFixed(2));
  }

  const sourceScore =
    stage === "self"
      ? safeNumber(item.self_score)
      : stage === "supervisor"
        ? safeNumber(item.supervisor_score)
        : stage === "gm"
          ? safeNumber(item.gm_score)
          : safeNumber(item.final_score || item.gm_score || item.supervisor_score || item.self_score);

  return sourceScore > 0 ? qualitativeScoreToPercent(sourceScore) : safeNumber(item.achievement_percent);
}

function computeReviewTotals(items: Array<RecordMap>) {
  const isSimpleRobotCafeReview =
    items.length > 0 &&
    items.every(
      (item) =>
        safeString(item.item_type) === "simple_area" ||
        safeString(item.section_name) === "Core Performance Areas"
    );
  let selfTotal = 0;
  let supervisorTotal = 0;
  let gmTotal = 0;
  let finalTotal = 0;
  let totalWeight = 0;

  items.forEach((item) => {
    const weight = safeNumber(item.weight_percent);
    totalWeight += weight;
    selfTotal += computeItemPercent(item, "self") * (weight / 100);
    supervisorTotal += computeItemPercent(item, "supervisor") * (weight / 100);
    gmTotal += computeItemPercent(item, "gm") * (weight / 100);
    finalTotal += computeItemPercent(item, "final") * (weight / 100);
  });

  if (totalWeight <= 0 && items.length > 0) {
    const selfAverage = items.reduce((sum, item) => sum + computeItemPercent(item, "self"), 0) / items.length;
    const supervisorAverage = items.reduce((sum, item) => sum + computeItemPercent(item, "supervisor"), 0) / items.length;
    const gmAverage = items.reduce((sum, item) => sum + computeItemPercent(item, "gm"), 0) / items.length;
    const average = items.reduce((sum, item) => sum + computeItemPercent(item, "final"), 0) / items.length;

    if (isSimpleRobotCafeReview) {
      const scaledSelf = Number(((selfAverage / 100) * SIMPLE_ROBOT_CAFE_SELF_SHARE).toFixed(2));
      const scaledSupervisor = Number(
        ((supervisorAverage / 100) * SIMPLE_ROBOT_CAFE_SUPERVISOR_SHARE).toFixed(2)
      );
      const scaledGm = Number(((gmAverage / 100) * SIMPLE_ROBOT_CAFE_GM_SHARE).toFixed(2));
      const scaledFinal = Number(
        Math.min(scaledSelf + scaledSupervisor + scaledGm, SIMPLE_ROBOT_CAFE_TOTAL_SHARE).toFixed(2)
      );
      const normalizedFinal = Number(((scaledFinal / SIMPLE_ROBOT_CAFE_TOTAL_SHARE) * 100).toFixed(2));
      return {
        selfScore: scaledSelf,
        supervisorScore: scaledSupervisor,
        gmScore: scaledGm,
        finalScore: scaledFinal,
        ratingBand: deriveRatingBand(normalizedFinal),
      };
    }

    return {
      selfScore: Number(selfAverage.toFixed(2)),
      supervisorScore: Number(supervisorAverage.toFixed(2)),
      gmScore: Number(gmAverage.toFixed(2)),
      finalScore: Number(average.toFixed(2)),
      ratingBand: deriveRatingBand(average),
    };
  }

  if (isSimpleRobotCafeReview) {
    const scaledSelf = Number(((selfTotal / 100) * SIMPLE_ROBOT_CAFE_SELF_SHARE).toFixed(2));
    const scaledSupervisor = Number(
      ((supervisorTotal / 100) * SIMPLE_ROBOT_CAFE_SUPERVISOR_SHARE).toFixed(2)
    );
    const scaledGm = Number(((gmTotal / 100) * SIMPLE_ROBOT_CAFE_GM_SHARE).toFixed(2));
    const scaledFinal = Number(
      Math.min(scaledSelf + scaledSupervisor + scaledGm, SIMPLE_ROBOT_CAFE_TOTAL_SHARE).toFixed(2)
    );
    const normalizedFinal = Number(((scaledFinal / SIMPLE_ROBOT_CAFE_TOTAL_SHARE) * 100).toFixed(2));
    return {
      selfScore: scaledSelf,
      supervisorScore: scaledSupervisor,
      gmScore: scaledGm,
      finalScore: scaledFinal,
      ratingBand: deriveRatingBand(normalizedFinal),
    };
  }

  return {
    selfScore: Number(selfTotal.toFixed(2)),
    supervisorScore: Number(supervisorTotal.toFixed(2)),
    gmScore: Number(gmTotal.toFixed(2)),
    finalScore: Number(finalTotal.toFixed(2)),
    ratingBand: deriveRatingBand(finalTotal),
  };
}

function buildSimpleRobotCafeReviewItems(companyId: string | null | undefined, reviewId: string) {
  return SIMPLE_ROBOT_CAFE_APPRAISAL_AREAS.map((area, index) => ({
    company_id: companyId,
    review_id: reviewId,
    item_order: index + 1,
    section_name: "Core Performance Areas",
    item_type: "simple_area",
    title: area.title,
    performance_indicator: area.performanceIndicator,
    target_text: area.expectedOutput,
    expected_output: area.expectedOutput,
    qualitative_allowed: true,
    weight_percent: 20,
  }));
}

function mapReviewRow(row: RecordMap) {
  const employee = asRecord(row.employee);
  const cycle = asRecord(row.cycle);
  return {
    id: safeString(row.id),
    cycleId: safeString(row.cycle_id),
    title: safeString(cycle?.title, safeString(row.title, "Appraisal Review")),
    cycleType: safeString(cycle?.cycle_type),
    periodStart: safeString(cycle?.period_start),
    periodEnd: safeString(cycle?.period_end),
    reviewPeriodLabel: `${formatDateLabel(safeString(cycle?.period_start))} - ${formatDateLabel(safeString(cycle?.period_end))}`,
    employeeId: safeString(row.employee_id),
    employeeName: `${safeString(employee?.employee_number)} ${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
    employeeNumber: safeString(employee?.employee_number),
    department: safeString(asRecord(employee?.department)?.name, "Unassigned"),
    designation: safeString(asRecord(employee?.designation)?.title, "-"),
    status: safeString(row.status),
    selfScore: safeNumber(row.self_score),
    supervisorScore: safeNumber(row.supervisor_score),
    gmScore: safeNumber(row.gm_score),
    finalScore: safeNumber(row.final_score),
    ratingBand: safeString(row.rating_band),
    potentialRating: safeString(row.potential_rating),
    finalDecision: safeString(row.final_decision),
    selfComments: safeString(row.self_comments),
    supervisorComments: safeString(row.supervisor_comments),
    gmComments: safeString(row.gm_comments),
    hrComments: safeString(row.hr_comments),
    challengesSummary: safeString(row.challenges_summary),
    supportRequired: safeString(row.support_required),
    correctiveAction: safeString(row.corrective_action),
    nextQuarterActions: safeString(row.next_quarter_actions),
    supervisorContributionComments: safeString(row.supervisor_contribution_comments),
    rewardRecommendation: safeString(row.reward_recommendation),
    sanctionRecommendation: safeString(row.sanction_recommendation),
    trainingRecommendation: safeString(row.training_recommendation),
    pipRecommendation: Boolean(row.pip_recommendation),
    promotionRecommendation: Boolean(row.promotion_recommendation),
    indicator: deriveIndicator(safeNumber(row.final_score || row.supervisor_score || row.self_score)),
    createdAt: safeString(row.created_at),
    selfSubmittedAt: safeString(row.self_submitted_at),
    supervisorSubmittedAt: safeString(row.supervisor_submitted_at),
    gmFinalizedAt: safeString(row.gm_finalized_at),
    finalizedAt: safeString(row.finalized_at),
  };
}

async function listAppraisalReviewsWithItems(context: PerformanceContext) {
  const employeeIds = await getScopedEmployeeIds(context);
  let query = context.supabase
    .from("appraisal_reviews")
    .select(
      "*, cycle:cycle_id(id, title, cycle_type, period_start, period_end, payroll_admin_action_enabled), employee:employee_id(employee_number, first_name, last_name, department:department_id(name), designation:designation_id(title))"
    )
    .order("created_at", { ascending: false });
  if (context.profile.company_id) {
    query = query.eq("company_id", context.profile.company_id);
  }
  query = applyScopedEmployeeIds(query as never, employeeIds) as typeof query;
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as Array<RecordMap>;
  const reviewIds = rows.map((row) => safeString(row.id)).filter(Boolean);
  const itemRows =
    reviewIds.length === 0
      ? []
      : (
          await context.supabase
            .from("appraisal_review_items")
            .select("*")
            .in("review_id", reviewIds)
            .order("item_order", { ascending: true })
        ).data ?? [];
  const itemsByReview = new Map<string, Array<RecordMap>>();
  (itemRows as Array<RecordMap>).forEach((item) => {
    const reviewId = safeString(item.review_id);
    const list = itemsByReview.get(reviewId) ?? [];
    list.push(item);
    itemsByReview.set(reviewId, list);
  });
  return rows.map((row) => ({
    ...mapReviewRow(row),
    items: itemsByReview.get(safeString(row.id)) ?? [],
    cycle: asRecord(row.cycle),
  }));
}

function canPayrollAdminAct(profile: AuthUserProfile, cycle: RecordMap | null) {
  return profile.role === "Payroll Admin" && Boolean(cycle?.payroll_admin_action_enabled);
}

function buildPerformanceSummary(data: {
  reviews: Array<ReturnType<typeof mapReviewRow> & { items: Array<RecordMap>; cycle: RecordMap | null }>;
  pips: Array<RecordMap>;
  promotionCases: Array<RecordMap>;
  successionRoles: Array<RecordMap>;
  successionCandidates: Array<RecordMap>;
}) {
  const totalReviews = data.reviews.length;
  const finalizedReviews = data.reviews.filter((review) => review.status === "finalized").length;
  const q2Reviews = data.reviews.filter((review) => review.cycleType.toLowerCase().includes("quarter") || safeString(review.title).toLowerCase().includes("q2"));
  const q2Completion = q2Reviews.length ? Number(((q2Reviews.filter((review) => review.status === "finalized").length / q2Reviews.length) * 100).toFixed(1)) : null;
  const pendingSupervisorReviews = data.reviews.filter((review) => review.status === "supervisor_review_pending").length;
  const pendingGmRatings = data.reviews.filter((review) => review.status === "gm_review_pending").length;
  const performanceDistribution = {
    excellent: data.reviews.filter((review) => review.ratingBand === "Excellent").length,
    good: data.reviews.filter((review) => review.ratingBand === "Good").length,
    fair: data.reviews.filter((review) => review.ratingBand === "Fair").length,
    poor: data.reviews.filter((review) => review.ratingBand === "Poor").length,
    veryPoor: data.reviews.filter((review) => review.ratingBand === "Very Poor").length,
  };
  const topPerformers = data.reviews
    .filter((review) => review.finalScore > 0)
    .sort((left, right) => right.finalScore - left.finalScore)
    .slice(0, 5)
    .map((review) => ({ name: review.employeeName, score: review.finalScore, ratingBand: review.ratingBand }));
  const atRiskStaff = data.reviews
    .filter((review) => ["Poor", "Very Poor"].includes(review.ratingBand))
    .slice(0, 5)
    .map((review) => ({ name: review.employeeName, score: review.finalScore, ratingBand: review.ratingBand }));
  const criticalRoles = data.successionRoles.filter((role) => safeString(role.criticality).toLowerCase() === "high");
  const coveredRoleIds = new Set(
    data.successionCandidates.map((candidate) => safeString(candidate.succession_role_id)).filter(Boolean)
  );
  const successorCoverage = criticalRoles.length
    ? Number(((criticalRoles.filter((role) => coveredRoleIds.has(safeString(role.id))).length / criticalRoles.length) * 100).toFixed(1))
    : null;

  return {
    totalReviews,
    completedReviews: finalizedReviews,
    q2Completion,
    reviewsInProgress: totalReviews - finalizedReviews,
    activePips: data.pips.filter((row) => safeString(row.status).toLowerCase() === "active").length,
    promotionCases: data.promotionCases.length,
    promotionCasesAwaitingCalibration: data.promotionCases.filter((row) => safeString(row.status).includes("calibration")).length,
    successorCoverage,
    performanceDistribution,
    topPerformers,
    atRiskStaff,
    pendingSupervisorReviews,
    pendingGmRatings,
  };
}

export async function getPerformanceWorkspace() {
  const context = await getPerformanceContext();
  if (!roleCanAccessModule(context.profile.role, "performance")) {
    throw new Error("forbidden");
  }
  const isSimpleRobotCafeWorkflow = isRobotCafePerformanceWorkflow(context.profile.company_id);

  const settings = await ensurePerformanceSettings(context);
  const [employees, kpis, goals, workPlans, cycles, reviews, pips, promotionCases, successionRoles, successionCandidates, talentAssessments, additionalAssignments] =
    await Promise.all([
      listScopedEmployees(context),
      listScopedRows(
        context,
        "performance_kpis",
        "*, employee:employee_id(employee_number, first_name, last_name), department:department_id(name), designation:designation_id(title), supervisor:supervisor_employee_id(first_name, last_name)"
      ),
      listScopedRows(
        context,
        "performance_goals",
        "*, employee:employee_id(employee_number, first_name, last_name), supervisor:supervisor_employee_id(first_name, last_name)"
      ),
      listScopedRows(
        context,
        "performance_work_plans",
        "*, employee:employee_id(employee_number, first_name, last_name), supervisor:supervisor_employee_id(first_name, last_name)"
      ),
      (async () => {
        let query = context.supabase.from("appraisal_cycles").select("*").order("created_at", { ascending: false });
        if (context.profile.company_id) {
          query = query.eq("company_id", context.profile.company_id);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as Array<RecordMap>;
      })(),
      listAppraisalReviewsWithItems(context),
      listScopedRows(
        context,
        "performance_pips",
        "*, employee:employee_id(employee_number, first_name, last_name), supervisor:supervisor_employee_id(first_name, last_name)"
      ),
      listScopedRows(
        context,
        "promotion_cases",
        "*, employee:employee_id(employee_number, first_name, last_name)"
      ),
      (async () => {
        let query = context.supabase
          .from("succession_roles")
          .select("*, department:department_id(name), incumbent:incumbent_employee_id(employee_number, first_name, last_name)")
          .order("created_at", { ascending: false });
        if (context.profile.company_id) query = query.eq("company_id", context.profile.company_id);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as Array<RecordMap>;
      })(),
      (async () => {
        let query = context.supabase
          .from("succession_candidates")
          .select("*, employee:employee_id(employee_number, first_name, last_name)")
          .order("created_at", { ascending: false });
        if (context.profile.company_id) query = query.eq("company_id", context.profile.company_id);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as Array<RecordMap>;
      })(),
      listScopedRows(
        context,
        "talent_assessments",
        "*, employee:employee_id(employee_number, first_name, last_name)"
      ),
      listScopedRows(
        context,
        "performance_additional_assignments",
        "*, employee:employee_id(employee_number, first_name, last_name)"
      ),
    ]);

  const summary = buildPerformanceSummary({
    reviews,
    pips,
    promotionCases,
    successionRoles,
    successionCandidates,
  });

  return {
    viewerRole: context.profile.role,
    workflowMode: isSimpleRobotCafeWorkflow ? "robot_cafe_simple" : "standard",
    summary,
    settings: {
      ...settings,
      categories: Array.isArray(settings.kpi_categories) ? settings.kpi_categories : PERFORMANCE_KPI_CATEGORIES,
      ratingScale: Array.isArray(settings.rating_scale) ? settings.rating_scale : PERFORMANCE_RATING_SCALE,
      helpContent: asRecord(settings.help_content),
      examples: PERFORMANCE_ROLE_EXAMPLES,
    },
    simpleWorkflow:
      isSimpleRobotCafeWorkflow
        ? {
            steps: [
              "Employee self-review",
              "Supervisor review",
              "General Manager final review",
              "Employee acknowledgement",
              "Download final appraisal form",
            ],
            areas: SIMPLE_ROBOT_CAFE_APPRAISAL_AREAS,
            finalOutcomes: [...SIMPLE_ROBOT_CAFE_FINAL_OUTCOMES],
          }
        : null,
    employees: employees.map((employee) => ({
      id: employee.id,
      label: `${employee.employeeNumber} ${employee.fullName}`.trim(),
      department: employee.department,
      branch: employee.branch,
      designation: employee.designation,
      currentSalary: safeNumber(employee.salary),
    })),
    kpis: kpis.map((row) => ({
      id: safeString(row.id),
      title: safeString(row.title),
      category: safeString(row.category),
      employeeId: safeString(row.employee_id),
      employeeName: `${safeString(asRecord(row.employee)?.employee_number)} ${safeString(asRecord(row.employee)?.first_name)} ${safeString(asRecord(row.employee)?.last_name)}`.trim(),
      department: safeString(asRecord(row.department)?.name, "Unassigned"),
      designation: safeString(asRecord(row.designation)?.title, safeString(row.role_title, "-")),
      measurementUnit: safeString(row.measurement_unit),
      targetValue: safeNumber(row.target_value),
      weightPercent: safeNumber(row.weight_percent),
      periodLabel: safeString(row.period_label),
      startDate: safeString(row.start_date),
      endDate: safeString(row.end_date),
      evidenceRequired: Boolean(row.evidence_required),
      status: safeString(row.status),
      assignmentScope: safeString(row.assignment_scope),
      supervisorName: `${safeString(asRecord(row.supervisor)?.first_name)} ${safeString(asRecord(row.supervisor)?.last_name)}`.trim(),
      indicator: deriveIndicator(safeNumber(row.target_value)),
      notes: safeString(row.notes),
    })),
    goals: goals.map((row) => ({
      id: safeString(row.id),
      kpiId: safeString(row.kpi_id),
      employeeId: safeString(row.employee_id),
      employeeName: `${safeString(asRecord(row.employee)?.employee_number)} ${safeString(asRecord(row.employee)?.first_name)} ${safeString(asRecord(row.employee)?.last_name)}`.trim(),
      title: safeString(row.title),
      target: safeString(row.target),
      activities: Array.isArray(row.activities) ? row.activities : [],
      dueDate: safeString(row.due_date),
      progressPercent: safeNumber(row.progress_percent),
      evidenceComments: safeString(row.evidence_comments),
      status: safeString(row.status),
      departmentObjective: safeString(row.department_objective),
      expectedOutput: safeString(row.expected_output),
      performanceIndicator: safeString(row.performance_indicator),
      timeline: safeString(row.timeline),
      weighting: safeNumber(row.weighting),
      responsiblePerson: safeString(row.responsible_person),
      reviewStatus: safeString(row.review_status),
      supervisorName: `${safeString(asRecord(row.supervisor)?.first_name)} ${safeString(asRecord(row.supervisor)?.last_name)}`.trim(),
    })),
    workPlans: workPlans.map((row) => ({
      id: safeString(row.id),
      employeeId: safeString(row.employee_id),
      employeeName: `${safeString(asRecord(row.employee)?.employee_number)} ${safeString(asRecord(row.employee)?.first_name)} ${safeString(asRecord(row.employee)?.last_name)}`.trim(),
      quarterLabel: safeString(row.quarter_label),
      departmentObjective: safeString(row.department_objective),
      individualTarget: safeString(row.individual_target),
      quarterlyActivities: Array.isArray(row.quarterly_activities) ? row.quarterly_activities : [],
      expectedOutput: safeString(row.expected_output),
      performanceIndicator: safeString(row.performance_indicator),
      timeline: safeString(row.timeline),
      weighting: safeNumber(row.weighting),
      responsiblePerson: safeString(row.responsible_person),
      reviewStatus: safeString(row.review_status),
      supervisorName: `${safeString(asRecord(row.supervisor)?.first_name)} ${safeString(asRecord(row.supervisor)?.last_name)}`.trim(),
    })),
    cycles: cycles.map((row) => ({
      id: safeString(row.id),
      title: safeString(row.title),
      cycleType: safeString(row.cycle_type),
      periodStart: safeString(row.period_start),
      periodEnd: safeString(row.period_end),
      scoringModel: safeString(row.scoring_model),
      selfEvaluationEnabled: Boolean(row.self_evaluation_enabled),
      supervisorEvaluationEnabled: Boolean(row.supervisor_evaluation_enabled),
      gmEvaluationEnabled: Boolean(row.gm_evaluation_enabled),
      payrollAdminVisibilityEnabled: Boolean(row.payroll_admin_visibility_enabled),
      payrollAdminActionEnabled: Boolean(row.payroll_admin_action_enabled),
      status: safeString(row.status),
    })),
    reviews: reviews.map((row) => ({
      ...row,
      itemCount: row.items.length,
      provisionalStatus: row.status === "finalized" ? "FINAL" : "PROVISIONAL",
      items: row.items.map((item) => ({
        id: safeString(item.id),
        reviewId: safeString(item.review_id),
        sectionName: safeString(item.section_name),
        itemType: safeString(item.item_type),
        title: safeString(item.title),
        performanceIndicator: safeString(item.performance_indicator),
        targetText: safeString(item.target_text),
        targetValue: safeNumber(item.target_value),
        actualText: safeString(item.actual_text),
        actualValue: safeNumber(item.actual_value),
        measurementUnit: safeString(item.measurement_unit),
        weightPercent: safeNumber(item.weight_percent),
        selfScore: safeNumber(item.self_score),
        supervisorScore: safeNumber(item.supervisor_score),
        gmScore: safeNumber(item.gm_score),
        finalScore: safeNumber(item.final_score),
        achievementPercent: safeNumber(item.achievement_percent),
        ratingBand: safeString(item.rating_band),
        expectedOutput: safeString(item.expected_output),
        timeline: safeString(item.timeline),
        evidenceNotes: safeString(item.evidence_notes),
        evaluatorComments: safeString(item.evaluator_comments),
      })),
    })),
    pips: pips.map((row) => ({
      id: safeString(row.id),
      employeeName: `${safeString(asRecord(row.employee)?.employee_number)} ${safeString(asRecord(row.employee)?.first_name)} ${safeString(asRecord(row.employee)?.last_name)}`.trim(),
      issue: safeString(row.issue),
      improvementTarget: safeString(row.improvement_target),
      supportRequired: safeString(row.support_required),
      reviewDate: safeString(row.review_date),
      supervisorName: `${safeString(asRecord(row.supervisor)?.first_name)} ${safeString(asRecord(row.supervisor)?.last_name)}`.trim(),
      status: safeString(row.status),
      outcome: safeString(row.outcome),
    })),
    promotionCases: promotionCases.map((row) => ({
      id: safeString(row.id),
      employeeId: safeString(row.employee_id),
      employeeName: `${safeString(asRecord(row.employee)?.employee_number)} ${safeString(asRecord(row.employee)?.first_name)} ${safeString(asRecord(row.employee)?.last_name)}`.trim(),
      currentRole: safeString(row.current_role_title),
      proposedRole: safeString(row.proposed_role_title),
      currentSalary: safeNumber(row.current_salary),
      proposedSalary: safeNumber(row.proposed_salary),
      performanceJustification: safeString(row.performance_justification),
      supervisorRecommendation: safeString(row.supervisor_recommendation),
      gmEndorsement: safeString(row.gm_endorsement),
      hrReview: safeString(row.hr_review),
      payrollImpactFlag: Boolean(row.payroll_impact_flag),
      status: safeString(row.status),
      linkedSalaryRequestTaskId: safeString(row.linked_salary_request_task_id),
    })),
    successionRoles: successionRoles.map((row) => ({
      id: safeString(row.id),
      roleTitle: safeString(row.role_title),
      criticality: safeString(row.criticality),
      riskLevel: safeString(row.risk_level),
      department: safeString(asRecord(row.department)?.name, "Unassigned"),
      incumbentName: `${safeString(asRecord(row.incumbent)?.employee_number)} ${safeString(asRecord(row.incumbent)?.first_name)} ${safeString(asRecord(row.incumbent)?.last_name)}`.trim(),
      notes: safeString(row.notes),
    })),
    successionCandidates: successionCandidates.map((row) => ({
      id: safeString(row.id),
      successionRoleId: safeString(row.succession_role_id),
      employeeId: safeString(row.employee_id),
      employeeName: `${safeString(asRecord(row.employee)?.employee_number)} ${safeString(asRecord(row.employee)?.first_name)} ${safeString(asRecord(row.employee)?.last_name)}`.trim(),
      readinessLevel: safeString(row.readiness_level),
      developmentActions: safeString(row.development_actions),
      gmComments: safeString(row.gm_comments),
      riskLevel: safeString(row.risk_level),
      status: safeString(row.status),
    })),
    talentAssessments: talentAssessments.map((row) => ({
      id: safeString(row.id),
      employeeId: safeString(row.employee_id),
      employeeName: `${safeString(asRecord(row.employee)?.employee_number)} ${safeString(asRecord(row.employee)?.first_name)} ${safeString(asRecord(row.employee)?.last_name)}`.trim(),
      performanceBand: safeString(row.performance_band),
      potentialRating: safeString(row.potential_rating),
      matrixBox: safeString(row.matrix_box),
      notes: safeString(row.notes),
    })),
    additionalAssignments: additionalAssignments.map((row) => ({
      id: safeString(row.id),
      employeeId: safeString(row.employee_id),
      employeeName: `${safeString(asRecord(row.employee)?.employee_number)} ${safeString(asRecord(row.employee)?.first_name)} ${safeString(asRecord(row.employee)?.last_name)}`.trim(),
      reviewId: safeString(row.review_id),
      assignmentTitle: safeString(row.assignment_title),
      dateAssigned: safeString(row.date_assigned),
      assignedBy: safeString(row.assigned_by),
      endDate: safeString(row.end_date),
      progressStatus: safeString(row.progress_status),
      comments: safeString(row.comments),
    })),
    aiAssist: {
      employee: ["Explain payslip-linked performance impacts", "Explain rating bands", "Help me draft self-evaluation comments"],
      supervisor: ["Suggest KPI wording", "Draft supervisor comments", "Suggest a PIP plan"],
      gm: ["Summarize appraisal outcomes", "Suggest promotion justification", "Highlight talent risks"],
      hr: ["Identify incomplete records", "Summarize PIP cases", "Suggest training plans"],
    },
  };
}

export async function createPerformanceKpi(input: {
  title: string;
  category: string;
  employeeId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  supervisorEmployeeId?: string | null;
  assignmentScope?: string;
  roleTitle?: string;
  measurementUnit?: string;
  targetValue?: number;
  weightPercent?: number;
  periodLabel: string;
  startDate: string;
  endDate: string;
  evidenceRequired?: boolean;
  status?: string;
  notes?: string;
}) {
  const context = await getPerformanceContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Payroll Admin", "Manager", "Supervisor"]);
  if (input.employeeId) {
    await assertEmployeeScope(context, input.employeeId);
  }
  const payload = {
    company_id: context.profile.company_id,
    employee_id: input.employeeId ?? null,
    department_id: input.departmentId ?? null,
    designation_id: input.designationId ?? null,
    supervisor_employee_id: input.supervisorEmployeeId ?? context.profile.employee_id,
    title: input.title,
    category: input.category,
    assignment_scope: input.assignmentScope ?? "individual",
    role_title: input.roleTitle ?? null,
    measurement_unit: input.measurementUnit ?? "percentage",
    target_value: input.targetValue ?? null,
    weight_percent: input.weightPercent ?? 0,
    period_label: input.periodLabel,
    start_date: input.startDate,
    end_date: input.endDate,
    evidence_required: input.evidenceRequired ?? false,
    status: input.status ?? "active",
    notes: input.notes ?? null,
    created_by: context.profile.id,
  };
  const { data, error } = await context.supabase.from("performance_kpis").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("performance_kpi_create_failed");
  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "performance_kpi",
    entityId: safeString(data.id),
    action: "created_performance_kpi",
    afterValue: payload,
  });
  return data;
}

export async function createPerformanceGoal(input: {
  kpiId?: string | null;
  employeeId: string;
  title: string;
  target: string;
  activities?: Array<RecordMap>;
  dueDate?: string;
  progressPercent?: number;
  evidenceComments?: string;
  status?: string;
  departmentObjective?: string;
  expectedOutput?: string;
  performanceIndicator?: string;
  timeline?: string;
  weighting?: number;
  responsiblePerson?: string;
  reviewStatus?: string;
}) {
  const context = await getPerformanceContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Payroll Admin", "Manager", "Supervisor"]);
  await assertEmployeeScope(context, input.employeeId);
  const payload = {
    company_id: context.profile.company_id,
    kpi_id: input.kpiId ?? null,
    employee_id: input.employeeId,
    supervisor_employee_id: context.profile.employee_id,
    title: input.title,
    target: input.target,
    activities: input.activities ?? [],
    due_date: input.dueDate ?? null,
    progress_percent: input.progressPercent ?? 0,
    evidence_comments: input.evidenceComments ?? null,
    status: input.status ?? "active",
    department_objective: input.departmentObjective ?? null,
    expected_output: input.expectedOutput ?? null,
    performance_indicator: input.performanceIndicator ?? null,
    timeline: input.timeline ?? null,
    weighting: input.weighting ?? 0,
    responsible_person: input.responsiblePerson ?? null,
    review_status: input.reviewStatus ?? "not_started",
    created_by: context.profile.id,
  };
  const { data, error } = await context.supabase.from("performance_goals").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("performance_goal_create_failed");
  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "performance_goal",
    entityId: safeString(data.id),
    action: "created_performance_goal",
    afterValue: payload,
  });
  return data;
}

export async function createPerformanceWorkPlan(input: {
  employeeId: string;
  goalId?: string | null;
  quarterLabel: string;
  departmentObjective: string;
  individualTarget: string;
  quarterlyActivities?: Array<RecordMap>;
  expectedOutput?: string;
  performanceIndicator?: string;
  timeline?: string;
  weighting?: number;
  responsiblePerson?: string;
  reviewStatus?: string;
}) {
  const context = await getPerformanceContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Payroll Admin", "Manager", "Supervisor"]);
  await assertEmployeeScope(context, input.employeeId);
  const payload = {
    company_id: context.profile.company_id,
    employee_id: input.employeeId,
    supervisor_employee_id: context.profile.employee_id,
    goal_id: input.goalId ?? null,
    quarter_label: input.quarterLabel,
    department_objective: input.departmentObjective,
    individual_target: input.individualTarget,
    quarterly_activities: input.quarterlyActivities ?? [],
    expected_output: input.expectedOutput ?? null,
    performance_indicator: input.performanceIndicator ?? null,
    timeline: input.timeline ?? null,
    weighting: input.weighting ?? 0,
    responsible_person: input.responsiblePerson ?? null,
    review_status: input.reviewStatus ?? "not_started",
    created_by: context.profile.id,
  };
  const { data, error } = await context.supabase.from("performance_work_plans").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("performance_work_plan_create_failed");
  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "performance_work_plan",
    entityId: safeString(data.id),
    action: "created_performance_work_plan",
    afterValue: payload,
  });
  return data;
}

export async function createAppraisalCycle(input: {
  title: string;
  cycleType: string;
  periodStart: string;
  periodEnd: string;
  departmentIds?: string[];
  roleTitles?: string[];
  employeeIds?: string[];
  scoringModel?: string;
  selfEvaluationEnabled?: boolean;
  supervisorEvaluationEnabled?: boolean;
  gmEvaluationEnabled?: boolean;
  payrollAdminVisibilityEnabled?: boolean;
  payrollAdminActionEnabled?: boolean;
  status?: string;
}) {
  const context = await getPerformanceContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Manager"]);
  const isSimpleRobotCafeWorkflow = isRobotCafePerformanceWorkflow(context.profile.company_id);
  const cyclePayload = {
    company_id: context.profile.company_id,
    title: input.title,
    cycle_type: input.cycleType,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    scoped_department_ids: input.departmentIds ?? [],
    scoped_role_titles: input.roleTitles ?? [],
    scoring_model: input.scoringModel ?? (isSimpleRobotCafeWorkflow ? "simple_qualitative" : "weighted_kpi"),
    self_evaluation_enabled: input.selfEvaluationEnabled ?? true,
    supervisor_evaluation_enabled: input.supervisorEvaluationEnabled ?? true,
    gm_evaluation_enabled: input.gmEvaluationEnabled ?? true,
    payroll_admin_visibility_enabled: input.payrollAdminVisibilityEnabled ?? true,
    payroll_admin_action_enabled: input.payrollAdminActionEnabled ?? false,
    status: input.status ?? "active",
    launched_by: context.profile.id,
  };
  const { data: cycle, error: cycleError } = await context.supabase
    .from("appraisal_cycles")
    .insert(cyclePayload)
    .select("*")
    .single();
  if (cycleError || !cycle) throw cycleError ?? new Error("appraisal_cycle_create_failed");

  const scopeEmployees = input.employeeIds?.length
    ? await Promise.all(
        input.employeeIds.map(async (employeeId) => {
          await assertEmployeeScope(context, employeeId);
          const { data } = await context.supabase.from("employees").select("id, supervisor_employee_id").eq("id", employeeId).maybeSingle();
          return data as RecordMap | null;
        })
      ).then((rows) => rows.filter(Boolean) as Array<RecordMap>)
    : await listEmployeesByCompany(context, {
        departmentIds: input.departmentIds,
        roleTitles: input.roleTitles,
      });

  const scopedIds = await getScopedEmployeeIds(context);
  const allowedEmployeeIds = scopedIds === null ? null : new Set(scopedIds);
  const finalEmployees = scopeEmployees.filter((employee) => {
    const employeeId = safeString(employee.id);
    return allowedEmployeeIds === null ? true : allowedEmployeeIds.has(employeeId);
  });

  const employeeIds = finalEmployees.map((row) => safeString(row.id)).filter(Boolean);
  const [kpisResult, goalsResult, plansResult] = isSimpleRobotCafeWorkflow
    ? [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ]
    : await Promise.all([
    employeeIds.length
      ? context.supabase
          .from("performance_kpis")
          .select("*")
          .eq("company_id", context.profile.company_id)
          .in("employee_id", employeeIds)
          .in("status", ["active", "draft"])
      : Promise.resolve({ data: [], error: null }),
    employeeIds.length
      ? context.supabase
          .from("performance_goals")
          .select("*")
          .eq("company_id", context.profile.company_id)
          .in("employee_id", employeeIds)
          .in("status", ["active", "in_progress"])
      : Promise.resolve({ data: [], error: null }),
    employeeIds.length
      ? context.supabase
          .from("performance_work_plans")
          .select("*")
          .eq("company_id", context.profile.company_id)
          .in("employee_id", employeeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (kpisResult.error) throw kpisResult.error;
  if (goalsResult.error) throw goalsResult.error;
  if (plansResult.error) throw plansResult.error;

  const kpis = (kpisResult.data ?? []) as Array<RecordMap>;
  const goals = (goalsResult.data ?? []) as Array<RecordMap>;
  const plans = (plansResult.data ?? []) as Array<RecordMap>;

  const reviewPayloads = finalEmployees.map((employee) => ({
    company_id: context.profile.company_id,
    cycle_id: safeString(cycle.id),
    employee_id: safeString(employee.id),
    supervisor_employee_id: safeString(employee.supervisor_employee_id) || null,
    terms_of_service: safeString(employee.employment_type),
    status: "self_review_pending",
    created_by: context.profile.id,
  }));

  let reviews: Array<RecordMap> = [];
  if (reviewPayloads.length) {
    const { data, error } = await context.supabase
      .from("appraisal_reviews")
      .insert(reviewPayloads)
      .select("*");
    if (error) throw error;
    reviews = (data ?? []) as Array<RecordMap>;
  }

  const reviewIdsByEmployee = new Map(
    reviews.map((row) => [safeString(row.employee_id), safeString(row.id)])
  );

  const itemPayloads: Array<RecordMap> = [];
  if (isSimpleRobotCafeWorkflow) {
    reviews.forEach((review) => {
      const reviewId = safeString(review.id);
      if (!reviewId) {
        return;
      }
      itemPayloads.push(...buildSimpleRobotCafeReviewItems(context.profile.company_id, reviewId));
    });
  } else {
    kpis.forEach((kpi, index) => {
      const reviewId = reviewIdsByEmployee.get(safeString(kpi.employee_id));
      if (!reviewId) return;
      itemPayloads.push({
        company_id: context.profile.company_id,
        review_id: reviewId,
        kpi_id: safeString(kpi.id),
        item_order: index + 1,
        section_name: "Individual Performance Targets",
        item_type: "kpi",
        title: safeString(kpi.title),
        performance_indicator: safeString(kpi.measurement_unit),
        target_value: safeNumber(kpi.target_value),
        measurement_unit: safeString(kpi.measurement_unit),
        weight_percent: safeNumber(kpi.weight_percent),
        target_text: `${safeNumber(kpi.target_value)} ${safeString(kpi.measurement_unit)}`.trim(),
      });
    });
    goals.forEach((goal, index) => {
      const reviewId = reviewIdsByEmployee.get(safeString(goal.employee_id));
      if (!reviewId) return;
      itemPayloads.push({
        company_id: context.profile.company_id,
        review_id: reviewId,
        goal_id: safeString(goal.id),
        item_order: 100 + index + 1,
        section_name: "Individual Performance Targets",
        item_type: "goal",
        title: safeString(goal.title),
        performance_indicator: safeString(goal.performance_indicator),
        target_text: safeString(goal.target),
        weight_percent: safeNumber(goal.weighting),
        expected_output: safeString(goal.expected_output),
        timeline: safeString(goal.timeline),
      });
    });
    plans.forEach((plan, index) => {
      const reviewId = reviewIdsByEmployee.get(safeString(plan.employee_id));
      if (!reviewId) return;
      itemPayloads.push({
        company_id: context.profile.company_id,
        review_id: reviewId,
        work_plan_id: safeString(plan.id),
        item_order: 200 + index + 1,
        section_name: "Quarterly Activities / Work Plan",
        item_type: "work_plan",
        title: safeString(plan.individual_target),
        performance_indicator: safeString(plan.performance_indicator),
        target_text: safeString(plan.department_objective),
        weight_percent: safeNumber(plan.weighting),
        expected_output: safeString(plan.expected_output),
        timeline: safeString(plan.timeline),
      });
    });
  }

  if (itemPayloads.length) {
    const { error } = await context.supabase.from("appraisal_review_items").insert(itemPayloads);
    if (error) throw error;
  }

  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "appraisal_cycle",
    entityId: safeString(cycle.id),
    action: "created_appraisal_cycle",
    afterValue: {
      ...cyclePayload,
      reviewCount: reviews.length,
    },
  });

  return {
    cycle,
    reviewsCreated: reviews.length,
  };
}

export async function updateAppraisalReview(
  reviewId: string,
  input: {
    stage: "self" | "supervisor" | "gm";
    submit?: boolean;
    selfComments?: string;
    supervisorComments?: string;
    gmComments?: string;
    hrComments?: string;
    performanceDiscussionHeld?: boolean;
    discussionHelped?: boolean;
    supervisorContributionComments?: string;
    challengesSummary?: string;
    issuesAffectingPerformance?: string;
    correctiveAction?: string;
    nextQuarterActions?: string;
    developmentNeeds?: string;
    supportRequired?: string;
    rewardRecommendation?: string;
    sanctionRecommendation?: string;
    trainingRecommendation?: string;
    pipRecommendation?: boolean;
    promotionRecommendation?: boolean;
    gmEndorsement?: string;
    potentialRating?: string;
    finalDecision?: string;
    probationOutcome?: string;
    itemUpdates?: Array<{
      id: string;
      actualText?: string;
      actualValue?: number;
      selfScore?: number;
      supervisorScore?: number;
      gmScore?: number;
      evidenceNotes?: string;
      evaluatorComments?: string;
    }>;
  }
) {
  const context = await getPerformanceContext();
  const { data: reviewRow, error: reviewError } = await context.supabase
    .from("appraisal_reviews")
    .select("*, cycle:cycle_id(id, payroll_admin_action_enabled)")
    .eq("id", reviewId)
    .single();

  if (reviewError || !reviewRow) {
    throw reviewError ?? new Error("appraisal_review_not_found");
  }

  const review = reviewRow as RecordMap;
  const cycle = asRecord(review.cycle);
  await assertEmployeeScope(context, safeString(review.employee_id));

  if (input.stage === "self") {
    if (context.profile.role !== "Employee" || safeString(context.profile.employee_id) !== safeString(review.employee_id)) {
      throw new Error("forbidden");
    }
    if (
      isRobotCafePerformanceWorkflow(context.profile.company_id) &&
      !canEmployeeEditSimpleSelfReview(safeString(review.status))
    ) {
      throw new Error("This appraisal can no longer be edited from the employee side.");
    }
  }

  if (input.stage === "supervisor") {
    const allowed = ["Supervisor", "Manager", "HR Admin", "Super Admin"].includes(context.profile.role) || canPayrollAdminAct(context.profile, cycle);
    if (!allowed) {
      throw new Error("forbidden");
    }
  }

  if (input.stage === "gm") {
    ensureRole(context.profile, ["Manager", "HR Admin", "Super Admin"]);
  }

  const before = review;
  if (input.itemUpdates?.length) {
    for (const itemUpdate of input.itemUpdates) {
      const existingResult = await context.supabase
        .from("appraisal_review_items")
        .select("*")
        .eq("id", itemUpdate.id)
        .eq("review_id", reviewId)
        .single();
      if (existingResult.error || !existingResult.data) {
        throw existingResult.error ?? new Error("appraisal_review_item_not_found");
      }
      const existing = existingResult.data as RecordMap;
      const updatePayload: RecordMap = {};
      if (itemUpdate.actualText !== undefined) updatePayload.actual_text = itemUpdate.actualText;
      if (itemUpdate.actualValue !== undefined) updatePayload.actual_value = itemUpdate.actualValue;
      if (itemUpdate.evidenceNotes !== undefined) updatePayload.evidence_notes = itemUpdate.evidenceNotes;
      if (itemUpdate.evaluatorComments !== undefined) updatePayload.evaluator_comments = itemUpdate.evaluatorComments;
      if (input.stage === "self" && itemUpdate.selfScore !== undefined) updatePayload.self_score = itemUpdate.selfScore;
      if (input.stage === "supervisor" && itemUpdate.supervisorScore !== undefined) updatePayload.supervisor_score = itemUpdate.supervisorScore;
      if (input.stage === "gm" && itemUpdate.gmScore !== undefined) updatePayload.gm_score = itemUpdate.gmScore;

      const achieved = computeItemPercent(
        {
          ...existing,
          ...updatePayload,
          final_score:
            input.stage === "gm"
              ? itemUpdate.gmScore ?? existing.gm_score
              : input.stage === "supervisor"
                ? itemUpdate.supervisorScore ?? existing.supervisor_score
                : itemUpdate.selfScore ?? existing.self_score,
        },
        input.stage === "gm" ? "gm" : input.stage
      );
      updatePayload.achievement_percent = achieved;
      updatePayload.rating_band = deriveRatingBand(achieved);
      if (input.stage === "gm") {
        if (safeString(existing.item_type) === "simple_area") {
          const simpleScores = [
            safeNumber(itemUpdate.selfScore ?? existing.self_score),
            safeNumber(itemUpdate.supervisorScore ?? existing.supervisor_score),
            safeNumber(itemUpdate.gmScore ?? existing.gm_score),
          ].filter((value) => value > 0);
          updatePayload.final_score = simpleScores.length
            ? Number((simpleScores.reduce((sum, value) => sum + value, 0) / simpleScores.length).toFixed(2))
            : 0;
        } else {
          updatePayload.final_score = itemUpdate.gmScore ?? existing.gm_score ?? existing.supervisor_score ?? existing.self_score ?? 0;
        }
      }

      const { error } = await context.supabase
        .from("appraisal_review_items")
        .update(updatePayload)
        .eq("id", itemUpdate.id);
      if (error) throw error;
    }
  }

  const { data: itemRows, error: itemsError } = await context.supabase
    .from("appraisal_review_items")
    .select("*")
    .eq("review_id", reviewId)
    .order("item_order", { ascending: true });
  if (itemsError) throw itemsError;
  const totals = computeReviewTotals((itemRows ?? []) as Array<RecordMap>);

  const updatePayload: RecordMap = {
    self_score: totals.selfScore,
    supervisor_score: totals.supervisorScore,
    gm_score: totals.gmScore,
    final_score: totals.finalScore,
    rating_band: totals.ratingBand,
  };

  if (input.stage === "self") {
    if (input.selfComments !== undefined) updatePayload.self_comments = input.selfComments;
    if (input.challengesSummary !== undefined) updatePayload.challenges_summary = input.challengesSummary;
    if (input.supportRequired !== undefined) updatePayload.support_required = input.supportRequired;
    if (input.performanceDiscussionHeld !== undefined) updatePayload.performance_discussion_held = input.performanceDiscussionHeld;
    if (input.discussionHelped !== undefined) updatePayload.discussion_helped = input.discussionHelped;
    if (input.supervisorContributionComments !== undefined) updatePayload.supervisor_contribution_comments = input.supervisorContributionComments;
    if (input.submit) {
      updatePayload.status = SIMPLE_ROBOT_CAFE_REVIEW_STATUSES.supervisor;
      updatePayload.self_submitted_at = new Date().toISOString();
    }
  }

  if (input.stage === "supervisor") {
    if (input.supervisorComments !== undefined) updatePayload.supervisor_comments = input.supervisorComments;
    if (input.challengesSummary !== undefined) updatePayload.challenges_summary = input.challengesSummary;
    if (input.issuesAffectingPerformance !== undefined) updatePayload.issues_affecting_performance = input.issuesAffectingPerformance;
    if (input.correctiveAction !== undefined) updatePayload.corrective_action = input.correctiveAction;
    if (input.nextQuarterActions !== undefined) updatePayload.next_quarter_actions = input.nextQuarterActions;
    if (input.rewardRecommendation !== undefined) updatePayload.reward_recommendation = input.rewardRecommendation;
    if (input.sanctionRecommendation !== undefined) updatePayload.sanction_recommendation = input.sanctionRecommendation;
    if (input.trainingRecommendation !== undefined) updatePayload.training_recommendation = input.trainingRecommendation;
    if (input.pipRecommendation !== undefined) updatePayload.pip_recommendation = input.pipRecommendation;
    if (input.promotionRecommendation !== undefined) updatePayload.promotion_recommendation = input.promotionRecommendation;
    if (input.submit) {
      updatePayload.status = "gm_review_pending";
      updatePayload.supervisor_submitted_at = new Date().toISOString();
    }
  }

  if (input.stage === "gm") {
    if (input.gmComments !== undefined) updatePayload.gm_comments = input.gmComments;
    if (input.hrComments !== undefined) updatePayload.hr_comments = input.hrComments;
    if (input.developmentNeeds !== undefined) updatePayload.development_needs = input.developmentNeeds;
    if (input.supportRequired !== undefined) updatePayload.support_required = input.supportRequired;
    if (input.gmEndorsement !== undefined) updatePayload.gm_endorsement = input.gmEndorsement;
    if (input.potentialRating !== undefined) {
      updatePayload.potential_rating = input.potentialRating;
    }
    if (input.finalDecision !== undefined) updatePayload.final_decision = input.finalDecision;
    if (input.probationOutcome !== undefined) updatePayload.probation_outcome = input.probationOutcome;
    if (input.submit) {
      updatePayload.status = "finalized";
      updatePayload.gm_finalized_at = new Date().toISOString();
      updatePayload.finalized_at = new Date().toISOString();
    }
  }

  const { data: updated, error: updateError } = await context.supabase
    .from("appraisal_reviews")
    .update(updatePayload)
    .eq("id", reviewId)
    .select("*")
    .single();
  if (updateError || !updated) throw updateError ?? new Error("appraisal_review_update_failed");

  const commentBody =
    input.stage === "self"
      ? input.selfComments
      : input.stage === "supervisor"
        ? input.supervisorComments
        : input.gmComments;
  if (commentBody) {
    await context.supabase.from("appraisal_comments").insert({
      company_id: context.profile.company_id,
      review_id: reviewId,
      author_user_id: context.profile.id,
      author_role: context.profile.role,
      stage: input.stage,
      visibility: "internal",
      comment_body: commentBody,
    });
  }

  if (input.stage === "gm" && input.submit) {
    if (Boolean(updated.pip_recommendation) || ["Poor", "Very Poor"].includes(safeString(updated.rating_band))) {
      const { data: existingPip } = await context.supabase
        .from("performance_pips")
        .select("id")
        .eq("company_id", context.profile.company_id)
        .eq("review_id", reviewId)
        .maybeSingle();
      if (!existingPip?.id) {
        await context.supabase.from("performance_pips").insert({
          company_id: context.profile.company_id,
          employee_id: safeString(updated.employee_id),
          review_id: reviewId,
          issue: safeString(updated.challenges_summary, "Performance below expectation"),
          improvement_target: safeString(updated.corrective_action, "Improve against the agreed KPIs"),
          support_required: safeString(updated.support_required, safeString(updated.development_needs)),
          review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          supervisor_employee_id: safeString(updated.supervisor_employee_id),
          status: "active",
          created_by: context.profile.id,
        });
      }
    }

    if (safeString(updated.training_recommendation)) {
      await createPerformanceTrainingRequest({
        context,
        employeeId: safeString(updated.employee_id),
        programName: safeString(updated.training_recommendation),
        schedule: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        notes: `Training need raised from appraisal review ${reviewId}`,
      });
    }
  }

  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "appraisal_review",
    entityId: reviewId,
    action: `updated_appraisal_review_${input.stage}`,
    beforeValue: before,
    afterValue: updated as RecordMap,
  });

  return updated;
}

async function createPerformanceTrainingRequest(input: {
  context: PerformanceContext;
  employeeId: string;
  programName: string;
  schedule: string;
  notes: string;
}) {
  const { context } = input;
  const { data: employee, error: employeeError } = await context.supabase
    .from("employees")
    .select("first_name, last_name")
    .eq("id", input.employeeId)
    .single();
  if (employeeError || !employee) return null;
  const employeeName = `${safeString(employee.first_name)} ${safeString(employee.last_name)}`.trim();
  const { data, error } = await context.supabase
    .from("training_requests")
    .insert({
      company_id: context.profile.company_id,
      employee_id: input.employeeId,
      program_name: input.programName,
      schedule: input.schedule,
      budget: 0,
      notes: input.notes,
      status: "pending",
      created_by: context.profile.id,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  const task = await createTask(context, {
    module_key: "training",
    entity_type: "training_request",
    entity_id: safeString(data.id),
    title: `Approve ${input.programName}`,
    description: `${employeeName} | ${input.schedule} | Budget KES 0`,
    owner_role: "HR Admin",
    stage: "HR training review",
    metadata: { final_status: "approved" },
  });
  await context.supabase.from("training_requests").update({ approval_task_id: safeString(task.id) }).eq("id", data.id);
  return data;
}

export async function createPerformancePip(input: {
  employeeId: string;
  reviewId?: string | null;
  issue: string;
  improvementTarget: string;
  supportRequired?: string;
  reviewDate?: string;
  status?: string;
  outcome?: string;
}) {
  const context = await getPerformanceContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Manager", "Supervisor"]);
  await assertEmployeeScope(context, input.employeeId);
  const payload = {
    company_id: context.profile.company_id,
    employee_id: input.employeeId,
    review_id: input.reviewId ?? null,
    issue: input.issue,
    improvement_target: input.improvementTarget,
    support_required: input.supportRequired ?? null,
    review_date: input.reviewDate ?? null,
    supervisor_employee_id: context.profile.employee_id,
    status: input.status ?? "active",
    outcome: input.outcome ?? null,
    created_by: context.profile.id,
  };
  const { data, error } = await context.supabase.from("performance_pips").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("performance_pip_create_failed");
  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "performance_pip",
    entityId: safeString(data.id),
    action: "created_performance_pip",
    afterValue: payload,
  });
  return data;
}

export async function createPromotionCase(input: {
  employeeId: string;
  reviewId?: string | null;
  currentRole: string;
  proposedRole: string;
  currentSalary: number;
  proposedSalary?: number | null;
  performanceJustification: string;
  supervisorRecommendation?: string;
  gmEndorsement?: string;
  hrReview?: string;
  payrollImpactFlag?: boolean;
  createSalaryRequest?: boolean;
  effectiveDate?: string;
}) {
  const context = await getPerformanceContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Manager", "Supervisor"]);
  await assertEmployeeScope(context, input.employeeId);
  let linkedSalaryRequestTaskId: string | null = null;
  const directPromotionApproval = ["Super Admin", "HR Admin", "Manager"].includes(context.profile.role);

  if (input.createSalaryRequest && input.proposedSalary && input.effectiveDate) {
    const { data: employee, error } = await context.supabase
      .from("employees")
      .select("employee_number, first_name, last_name")
      .eq("id", input.employeeId)
      .single();
    if (!error && employee) {
      const employeeName = `${safeString(employee.first_name)} ${safeString(employee.last_name)}`.trim();
      if (directPromotionApproval) {
        await context.supabase.from("employees").update({ salary: input.proposedSalary }).eq("id", input.employeeId);
      } else {
        const task = await createTask(context, {
          module_key: "performance",
          entity_type: "salary_change_request",
          entity_id: input.employeeId,
          title: `Salary change request for ${employeeName}`,
          description: input.performanceJustification,
          owner_role: "Payroll Admin",
          stage: "Payroll Admin review",
          metadata: {
            employeeId: input.employeeId,
            employeeName,
            employeeNumber: safeString(employee.employee_number),
            currentSalary: input.currentSalary,
            proposedSalary: input.proposedSalary,
            effectiveDate: input.effectiveDate,
            reason: `Promotion to ${input.proposedRole}`,
            supportingComments: input.performanceJustification,
            requestedBySupervisorEmployeeId: safeString(context.profile.employee_id),
            requestedByRole: context.profile.role,
            allowed_approver_roles: ["Payroll Admin", "Manager", "Super Admin"],
            final_status: "approved",
          },
        });
        linkedSalaryRequestTaskId = safeString(task.id);
      }
    }
  }

  const payload = {
    company_id: context.profile.company_id,
    employee_id: input.employeeId,
    review_id: input.reviewId ?? null,
    current_role_title: input.currentRole,
    proposed_role_title: input.proposedRole,
    current_salary: input.currentSalary,
    proposed_salary: input.proposedSalary ?? null,
    performance_justification: input.performanceJustification,
    supervisor_recommendation: input.supervisorRecommendation ?? null,
    gm_endorsement: input.gmEndorsement ?? null,
    hr_review: input.hrReview ?? null,
    payroll_impact_flag: input.payrollImpactFlag ?? Boolean(input.proposedSalary),
    linked_salary_request_task_id: linkedSalaryRequestTaskId,
    status: directPromotionApproval ? "approved" : "pending_calibration",
    created_by: context.profile.id,
  };
  const { data, error } = await context.supabase.from("promotion_cases").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("promotion_case_create_failed");
  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "promotion_case",
    entityId: safeString(data.id),
    action: "created_promotion_case",
    afterValue: payload,
  });
  return data;
}

export async function createSuccessionRole(input: {
  roleTitle: string;
  departmentId?: string | null;
  incumbentEmployeeId?: string | null;
  criticality?: string;
  riskLevel?: string;
  notes?: string;
}) {
  const context = await getPerformanceContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Manager"]);
  const payload = {
    company_id: context.profile.company_id,
    role_title: input.roleTitle,
    department_id: input.departmentId ?? null,
    incumbent_employee_id: input.incumbentEmployeeId ?? null,
    criticality: input.criticality ?? "medium",
    risk_level: input.riskLevel ?? "medium",
    notes: input.notes ?? null,
    created_by: context.profile.id,
  };
  const { data, error } = await context.supabase.from("succession_roles").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("succession_role_create_failed");
  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "succession_role",
    entityId: safeString(data.id),
    action: "created_succession_role",
    afterValue: payload,
  });
  return data;
}

export async function createSuccessionCandidate(input: {
  successionRoleId: string;
  employeeId: string;
  readinessLevel: string;
  developmentActions?: string;
  gmComments?: string;
  riskLevel?: string;
  status?: string;
}) {
  const context = await getPerformanceContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Manager"]);
  await assertEmployeeScope(context, input.employeeId);
  const payload = {
    company_id: context.profile.company_id,
    succession_role_id: input.successionRoleId,
    employee_id: input.employeeId,
    readiness_level: input.readinessLevel,
    development_actions: input.developmentActions ?? null,
    gm_comments: input.gmComments ?? null,
    risk_level: input.riskLevel ?? "medium",
    status: input.status ?? "active",
  };
  const { data, error } = await context.supabase.from("succession_candidates").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("succession_candidate_create_failed");
  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "succession_candidate",
    entityId: safeString(data.id),
    action: "created_succession_candidate",
    afterValue: payload,
  });
  return data;
}

export async function createTalentAssessment(input: {
  employeeId: string;
  reviewId?: string | null;
  performanceBand: string;
  potentialRating: string;
  notes?: string;
}) {
  const context = await getPerformanceContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Manager"]);
  await assertEmployeeScope(context, input.employeeId);
  const payload = {
    company_id: context.profile.company_id,
    employee_id: input.employeeId,
    review_id: input.reviewId ?? null,
    performance_band: input.performanceBand,
    potential_rating: input.potentialRating,
    matrix_box: deriveMatrixBox(input.performanceBand, input.potentialRating),
    notes: input.notes ?? null,
    assessed_by: context.profile.id,
  };
  const { data, error } = await context.supabase.from("talent_assessments").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("talent_assessment_create_failed");
  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "talent_assessment",
    entityId: safeString(data.id),
    action: "created_talent_assessment",
    afterValue: payload,
  });
  return data;
}

export async function updatePerformanceSettings(input: {
  payrollAdminVisibilityEnabled?: boolean;
  payrollAdminActionEnabled?: boolean;
  kpiCategories?: string[];
  helpContent?: RecordMap;
}) {
  const context = await getPerformanceContext();
  ensureRole(context.profile, ["Super Admin", "HR Admin", "Manager"]);
  const current = await ensurePerformanceSettings(context);
  const payload = {
    payroll_admin_visibility_enabled:
      input.payrollAdminVisibilityEnabled ?? Boolean(current.payroll_admin_visibility_enabled),
    payroll_admin_action_enabled:
      input.payrollAdminActionEnabled ?? Boolean(current.payroll_admin_action_enabled),
    kpi_categories:
      input.kpiCategories && input.kpiCategories.length
        ? input.kpiCategories
        : asStringArray(current.kpi_categories).length
          ? asStringArray(current.kpi_categories)
          : [...PERFORMANCE_KPI_CATEGORIES],
    help_content: input.helpContent ?? asRecord(current.help_content) ?? {},
  };
  const { data, error } = await context.supabase
    .from("performance_settings")
    .update(payload)
    .eq("company_id", context.profile.company_id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("performance_settings_update_failed");
  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "performance_settings",
    entityId: safeString(context.profile.company_id),
    action: "updated_performance_settings",
    beforeValue: current,
    afterValue: data as RecordMap,
  });
  return data;
}

export async function listPerformanceReports() {
  const context = await getPerformanceContext();
  if (!roleCanAccessModule(context.profile.role, "performance")) {
    throw new Error("forbidden");
  }
  const reviews = await listAppraisalReviewsWithItems(context);
  return reviews.map((review) => ({
    reviewId: review.id,
    employeeName: review.employeeName,
    employeeNumber: review.employeeNumber,
    cycleTitle: review.title,
    status: review.status === "finalized" ? "FINAL" : "PROVISIONAL",
    finalScore: review.finalScore,
    ratingBand: review.ratingBand,
  }));
}

function mapLegacyPerformanceRecord(row: RecordMap) {
  const kpis = asRecordArray(row.kpis);
  const primary = kpis[0] ?? {};
  const targetValue = safeNumber(primary.targetValue ?? primary.target ?? primary.weeklyTarget);
  const actualValue = safeNumber(primary.actualValue ?? primary.actual ?? primary.weeklyActual);
  const achievementPercent =
    targetValue > 0
      ? Number(((actualValue / targetValue) * 100).toFixed(2))
      : safeNumber(primary.achievementPercent ?? row.score);
  return {
    id: safeString(row.id),
    reviewCycle: safeString(row.review_cycle, "Legacy Review"),
    reviewPeriod: safeString(row.review_period),
    status: safeString(row.status),
    supervisorComments: safeString(row.supervisor_comments),
    hrComments: safeString(row.hr_comments),
    promotionRecommendation: safeString(row.promotion_recommendation),
    pipStatus: safeString(row.pip_status),
    createdAt: safeString(row.created_at),
    score: safeNumber(row.score),
    metricLabel: safeString(primary.metricLabel, safeString(row.review_cycle, "Legacy KPI")),
    targetValue,
    actualValue,
    achievementPercent,
    indicator: deriveIndicator(achievementPercent),
    weekLabel: safeString(primary.weekLabel, safeString(row.review_period)),
    managerRating: safeString(primary.managerRating),
    provisionalStatus: "LEGACY",
    canDownloadReport: false,
  };
}

export async function listEssPerformanceAppraisals() {
  const context = await getPerformanceContext();
  if (!context.profile.employee_id) {
    return [];
  }
  const isSimpleRobotCafeWorkflow = isRobotCafePerformanceWorkflow(context.profile.company_id);

  const [newReviewsResult, legacyResult] = await Promise.all([
    context.supabase
      .from("appraisal_reviews")
      .select("*, cycle:cycle_id(title, cycle_type, period_start, period_end)")
      .eq("employee_id", context.profile.employee_id)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("performance_reviews")
      .select("id, review_cycle, review_period, score, status, supervisor_comments, hr_comments, promotion_recommendation, pip_status, goals, kpis, created_at")
      .eq("employee_id", context.profile.employee_id)
      .order("review_period", { ascending: false }),
  ]);

  if (newReviewsResult.error) throw newReviewsResult.error;
  if (legacyResult.error) throw legacyResult.error;
  const reviewRows = (newReviewsResult.data ?? []) as Array<RecordMap>;
  const reviewIds = reviewRows.map((row) => safeString(row.id)).filter(Boolean);
  const { data: itemRows, error: itemError } =
    reviewIds.length === 0
      ? { data: [], error: null }
      : await context.supabase
          .from("appraisal_review_items")
          .select("id, review_id, title, performance_indicator, expected_output, target_text, self_score, supervisor_score, gm_score, final_score, evaluator_comments, item_order")
          .in("review_id", reviewIds)
          .order("item_order", { ascending: true });
  if (itemError) throw itemError;

  const itemsByReview = new Map<string, Array<RecordMap>>();
  ((itemRows ?? []) as Array<RecordMap>).forEach((item) => {
    const reviewId = safeString(item.review_id);
    const list = itemsByReview.get(reviewId) ?? [];
    list.push(item);
    itemsByReview.set(reviewId, list);
  });

  const newReviews = reviewRows.map((row) => {
    const cycle = asRecord(row.cycle);
    const items = itemsByReview.get(safeString(row.id)) ?? [];
    return {
      id: safeString(row.id),
      reviewCycle: safeString(cycle?.title, safeString(cycle?.cycle_type, "Appraisal")),
      reviewPeriod:
        `${formatDateLabel(safeString(cycle?.period_start))} - ${formatDateLabel(safeString(cycle?.period_end))}`,
      status: safeString(row.status),
      supervisorComments: safeString(row.supervisor_comments),
      hrComments: safeString(row.hr_comments),
      promotionRecommendation: Boolean(row.promotion_recommendation) ? "Yes" : "No",
      pipStatus: Boolean(row.pip_recommendation) ? "recommended" : "none",
      createdAt: safeString(row.created_at),
      score: safeNumber(row.final_score),
      metricLabel: safeString(cycle?.title, "Appraisal"),
      targetValue: 0,
      actualValue: 0,
      achievementPercent: safeNumber(row.final_score),
      indicator: deriveIndicator(safeNumber(row.final_score)),
      weekLabel: safeString(cycle?.cycle_type),
      managerRating: safeString(row.potential_rating),
      provisionalStatus: safeString(row.status) === "finalized" ? "FINAL" : "PROVISIONAL",
      canDownloadReport: true,
      selfComments: safeString(row.self_comments),
      challengesSummary: safeString(row.challenges_summary),
      supportRequired: safeString(row.support_required),
      gmComments: safeString(row.gm_comments),
      finalDecision: safeString(row.final_decision),
      canSelfReview:
        canEmployeeEditSimpleSelfReview(safeString(row.status)) &&
        isSimpleRobotCafeWorkflow,
      workflowMode: isSimpleRobotCafeWorkflow ? "robot_cafe_simple" : "standard",
      areas: items.map((item) => ({
        id: safeString(item.id),
        title: safeString(item.title),
        performanceIndicator: safeString(item.performance_indicator),
        expectedOutput: safeString(item.expected_output, safeString(item.target_text)),
        selfScore: safeNumber(item.self_score),
        supervisorScore: safeNumber(item.supervisor_score),
        gmScore: safeNumber(item.gm_score),
        finalScore: safeNumber(item.final_score),
        evaluatorComments: safeString(item.evaluator_comments),
      })),
    };
  });

  const legacyRows = ((legacyResult.data ?? []) as Array<RecordMap>).map(mapLegacyPerformanceRecord);
  return [...newReviews, ...legacyRows];
}

async function getReviewWithRelations(context: PerformanceContext, reviewId: string) {
  const { data: reviewRow, error: reviewError } = await context.supabase
    .from("appraisal_reviews")
    .select(
      "*, cycle:cycle_id(*), employee:employee_id(employee_number, first_name, last_name, employment_type, hire_date, salary, national_id, kra_pin, shif_number, nssf_number, department:department_id(name), designation:designation_id(title), supervisor:supervisor_employee_id(employee_number, first_name, last_name))"
    )
    .eq("id", reviewId)
    .single();
  if (reviewError || !reviewRow) {
    throw reviewError ?? new Error("appraisal_review_not_found");
  }
  const review = reviewRow as RecordMap;
  await assertEmployeeScope(context, safeString(review.employee_id));

  const [itemsResult, assignmentsResult, commentsResult] = await Promise.all([
    context.supabase.from("appraisal_review_items").select("*").eq("review_id", reviewId).order("item_order", { ascending: true }),
    context.supabase.from("performance_additional_assignments").select("*").eq("review_id", reviewId).order("date_assigned", { ascending: true }),
    context.supabase.from("appraisal_comments").select("*").eq("review_id", reviewId).order("created_at", { ascending: true }),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (commentsResult.error) throw commentsResult.error;

  return {
    review,
    items: (itemsResult.data ?? []) as Array<RecordMap>,
    assignments: (assignmentsResult.data ?? []) as Array<RecordMap>,
    comments: (commentsResult.data ?? []) as Array<RecordMap>,
  };
}

export async function getPerformanceReportFile(
  reviewId: string,
  options?: { disposition?: "inline" | "attachment" }
): Promise<PerformanceAppraisalPdfFile> {
  const context = await getPerformanceContext();
  if (!roleCanAccessModule(context.profile.role, "performance") && context.profile.role !== "Employee") {
    throw new Error("forbidden");
  }
  const { review, items, assignments } = await getReviewWithRelations(context, reviewId);
  const employee = asRecord(review.employee);
  const cycle = asRecord(review.cycle);
  const isSimpleRobotCafeWorkflow = isRobotCafePerformanceWorkflow(context.profile.company_id);
  const branding = await getBrandingImages(context);
  const signatories = await getCompanyAppraisalSignatories(context);
  const departmentObjectives = Array.from(
    new Set(
      items
        .map((item) => safeString(item.target_text))
        .filter(Boolean)
    )
  );

  const dataset: PerformanceAppraisalPdfDataset = {
    organizationName: branding.organizationName,
    organizationIdentifier: branding.organizationIdentifier,
    organizationLogoMark: branding.organizationLogoMark,
    organizationLogoJpeg: branding.organizationLogoJpeg,
    platformLogoJpeg: branding.platformLogoJpeg,
    organizationAddressLines: branding.addressLines,
    reportFooter: branding.reportFooter,
    reportTitle: "STAFF PERFORMANCE APPRAISAL REPORT",
    workflowMode: isSimpleRobotCafeWorkflow ? "robot_cafe_simple" : "standard",
    appraisalPeriodLabel: `${formatDateLabel(safeString(cycle?.period_start))} - ${formatDateLabel(safeString(cycle?.period_end))}`,
    generatedAtLabel: new Date().toLocaleString("en-KE"),
    generatedBy: context.profile.full_name,
    statusLabel: safeString(review.status) === "finalized" ? "FINAL" : "PROVISIONAL",
    personalParticulars: {
      name: `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
      staffNumber: safeString(employee?.employee_number),
      department: safeString(asRecord(employee?.department)?.name, "Unassigned"),
      designation: safeString(asRecord(employee?.designation)?.title, "-"),
      termsOfService: safeString(review.terms_of_service, safeString(employee?.employment_type, "-")),
      supervisorName: `${safeString(asRecord(employee?.supervisor)?.first_name)} ${safeString(asRecord(employee?.supervisor)?.last_name)}`.trim() || "General Manager",
      appraisalPeriod: `${formatDateLabel(safeString(cycle?.period_start))} - ${formatDateLabel(safeString(cycle?.period_end))}`,
    },
    departmentalObjectives: departmentObjectives.length ? departmentObjectives : ["No departmental objectives captured yet."],
    performanceTargets: items
      .filter((item) => safeString(item.section_name) === "Individual Performance Targets")
      .map((item) => ({
        agreedTarget: safeString(item.title),
        performanceIndicator: safeString(item.performance_indicator),
        targetValue: safeString(item.target_text, safeNumber(item.target_value).toString()),
        resultsAchieved: safeString(item.actual_text, safeNumber(item.actual_value).toString()),
        selfScore: safeNumber(item.self_score),
        supervisorScore: safeNumber(item.supervisor_score),
        gmScore: safeNumber(item.gm_score),
        finalScore: safeNumber(item.final_score || item.gm_score || item.supervisor_score || item.self_score),
      })),
    workPlans: items
      .filter((item) => safeString(item.section_name) === "Quarterly Activities / Work Plan")
      .map((item) => ({
        activity: safeString(item.title),
        expectedOutput: safeString(item.expected_output),
        timeline: safeString(item.timeline),
        progress: `${safeNumber(item.achievement_percent).toFixed(2)}%`,
        comments: safeString(item.evaluator_comments),
      })),
    scoreSummary: {
      totalScore: safeNumber(review.final_score),
      meanScore: safeNumber(review.final_score),
      ratingBand: safeString(review.rating_band, deriveRatingBand(safeNumber(review.final_score))),
    },
    ratingScale: PERFORMANCE_RATING_SCALE.map((item) => ({
      label: item.label,
      rangeLabel:
        item.label === "Excellent"
          ? "101%+"
          : item.label === "Good"
            ? "100%"
            : item.label === "Fair"
              ? "80-99%"
              : item.label === "Poor"
                ? "70-79%"
                : "Below 70%",
    })),
    additionalAssignments: assignments.map((item) => ({
      assignment: safeString(item.assignment_title),
      dateAssigned: formatDateLabel(safeString(item.date_assigned)),
      assignedBy: safeString(item.assigned_by),
      endDate: formatDateLabel(safeString(item.end_date)),
      progressStatus: safeString(item.progress_status),
    })),
    supervisorEvaluation: {
      score: safeNumber(review.supervisor_score),
      comments: safeString(review.supervisor_comments),
      recommendation: [
        safeString(review.reward_recommendation),
        Boolean(review.promotion_recommendation) ? "Promotion recommended" : "",
        Boolean(review.pip_recommendation) ? "PIP recommended" : "",
      ]
        .filter(Boolean)
        .join(" | ") || "-",
    },
    appraiseeEvaluation: {
      score: safeNumber(review.self_score),
      comments: safeString(review.self_comments),
      discussionHeld: review.performance_discussion_held === null ? "-" : review.performance_discussion_held ? "Yes" : "No",
      discussionHelped: review.discussion_helped === null ? "-" : review.discussion_helped ? "Yes" : "No",
      supervisorContribution: safeString(review.supervisor_contribution_comments),
    },
    gmEvaluation: {
      score: safeNumber(review.gm_score),
      comments: safeString(review.gm_comments),
      finalRating: safeString(review.rating_band),
      finalDecision: safeString(review.final_decision),
    },
    developmentNeeds: {
      training: safeString(review.training_recommendation),
      supportRequired: safeString(review.support_required),
      timeline: "Next review cycle",
    },
    actions: {
      rewardRecommendation: safeString(review.reward_recommendation),
      pipRecommendation: Boolean(review.pip_recommendation) ? "Recommended" : "Not recommended",
      promotionRecommendation: Boolean(review.promotion_recommendation) ? "Recommended" : "Not recommended",
      sanctionRecommendation: safeString(review.sanction_recommendation),
      finalAction: safeString(review.final_decision),
    },
    signatures: {
      appraisee: `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
      supervisor: `${safeString(asRecord(employee?.supervisor)?.first_name)} ${safeString(asRecord(employee?.supervisor)?.last_name)}`.trim() || "General Manager",
      gm: signatories.authorized.name,
      hr: "HR/Admin",
    },
    simpleWorkflow: isSimpleRobotCafeWorkflow
      ? {
          employeeSelfReview: {
            whatWentWell: safeString(review.self_comments),
            challenges: safeString(review.challenges_summary),
            supportNeeded: safeString(review.support_required),
          },
          reviewAreas: items.map((item) => ({
            title: safeString(item.title),
            performanceIndicator: safeString(item.performance_indicator),
            expectedOutput: safeString(item.expected_output, safeString(item.target_text)),
            selfScore: safeNumber(item.self_score),
            supervisorScore: safeNumber(item.supervisor_score),
            gmScore: safeNumber(item.gm_score),
            finalScore: safeNumber(item.final_score || item.gm_score || item.supervisor_score),
            evaluatorComments: safeString(item.evaluator_comments),
          })),
          supervisorReview: {
            strengths: safeString(review.supervisor_comments),
            improvements: safeString(review.corrective_action),
            recommendation:
              safeString(review.training_recommendation) ||
              safeString(review.next_quarter_actions) ||
              safeString(review.reward_recommendation),
          },
          gmReview: {
            managementRemark: safeString(review.gm_comments),
            finalOutcome: safeString(review.final_decision),
            nextAction:
              safeString(review.next_quarter_actions) ||
              safeString(review.training_recommendation) ||
              safeString(review.support_required),
          },
          acknowledgementText:
            "I confirm that I have reviewed the contents of this appraisal and that the outcome and comments have been shared with me.",
          signatories: {
            appraisee: {
              name: `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim() || "Employee",
              title: "Employee",
              initials: getInitialsFromName(`${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim() || "Employee"),
              signedAt: formatDateLabel(safeString(review.self_submitted_at)),
            },
            supervisor: {
              name:
                `${safeString(asRecord(employee?.supervisor)?.first_name)} ${safeString(asRecord(employee?.supervisor)?.last_name)}`.trim() ||
                "Supervisor",
              title: "Supervisor",
              initials: getInitialsFromName(
                `${safeString(asRecord(employee?.supervisor)?.first_name)} ${safeString(asRecord(employee?.supervisor)?.last_name)}`.trim() ||
                  "Supervisor"
              ),
              signedAt: formatDateLabel(safeString(review.supervisor_submitted_at)),
            },
            gm: {
              name: signatories.authorized.name,
              title: signatories.authorized.title,
              initials: signatories.authorized.initials,
              signedAt: formatDateLabel(safeString(review.gm_finalized_at || review.finalized_at)),
            },
          },
        }
      : undefined,
  };

  const file = buildPerformanceAppraisalReportPdf(dataset);

  await context.supabase.from("performance_report_exports").insert({
    company_id: context.profile.company_id,
    review_id: reviewId,
    status_label: dataset.statusLabel,
    file_name: file.fileName,
    content_type: file.contentType,
    generated_by: context.profile.id,
  });

  await createAuditLog(context, {
    moduleKey: "performance",
    entityType: "performance_report",
    entityId: reviewId,
    action: options?.disposition === "inline" ? "previewed_performance_report" : "downloaded_performance_report",
  });

  return file;
}

export async function getPerformanceReportsSnapshot() {
  const context = await getPerformanceContext();
  if (!roleCanAccessModule(context.profile.role, "performance") && context.profile.role !== "Employee") {
    throw new Error("forbidden");
  }
  const reviews = await listAppraisalReviewsWithItems(context);
  const summary = buildPerformanceSummary({
    reviews,
    pips: [],
    promotionCases: [],
    successionRoles: [],
    successionCandidates: [],
  });
  return {
    cards: {
      appraisals: reviews.length,
      topPerformers: summary.topPerformers.length,
      pipCases: summary.activePips,
      promotionRecommendations: reviews.filter((review) => review.promotionRecommendation).length,
    },
    distribution: [
      { label: "Excellent", value: summary.performanceDistribution.excellent },
      { label: "Good", value: summary.performanceDistribution.good },
      { label: "Fair", value: summary.performanceDistribution.fair },
      { label: "Poor", value: summary.performanceDistribution.poor },
      { label: "Very Poor", value: summary.performanceDistribution.veryPoor },
    ],
    reviews,
  };
}
