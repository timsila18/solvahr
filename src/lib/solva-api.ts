import type {
  ApprovalTask,
  AuditEvent,
  EmployeeRecord,
  EmployeeProfile,
  ModuleSpec,
  PageSpec,
  PayrollPackage,
  PayrollProcessData,
  PayrollVarianceItem,
  PlatformSnapshot,
} from "@/lib/solva-data";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    let message = `request_failed:${response.status}`;

    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error ?? message;
    } catch {
      // Ignore JSON parse failure and keep generic message.
    }

    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

type PayrollExportType =
  | "wagebill_report"
  | "earnings_deductions_analysis"
  | "monthly_deduction_posting_list"
  | "net_to_bank"
  | "net_to_mpesa"
  | "paye_report"
  | "nssf_report"
  | "shif_report"
  | "helb_report"
  | "payroll_register"
  | "p9_forms"
  | "housing_levy_report";

export function fetchPublicPlans() {
  return readJson<{ plans: Array<Record<string, unknown>> }>("/api/public/plans", {
    cache: "no-store",
  });
}

export function createPublicLead(input: {
  leadType: "contact_sales" | "book_demo";
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string;
  employeeCount?: number;
  modules?: string[];
  preferredDate?: string;
  country?: string;
  notes?: string;
}) {
  return readJson<{ lead: { id: string; status: string } }>("/api/public/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchBillingDashboard() {
  return readJson<{ billing: Record<string, unknown> }>("/api/admin/billing", {
    cache: "no-store",
  });
}

export function updateBillingSubscription(input: {
  planId: string;
  billingCycle?: "monthly" | "annual";
  selectedModules?: string[];
}) {
  return readJson<{ billing: Record<string, unknown> }>("/api/admin/billing", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchOnboardingDashboard() {
  return readJson<{ onboarding: Record<string, unknown> }>("/api/admin/onboarding", {
    cache: "no-store",
  });
}

export function updateOnboardingDashboard(input: {
  completedStep?: string;
  currentStep?: string;
}) {
  return readJson<{ onboarding: Record<string, unknown> }>("/api/admin/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchSaasHQDashboard() {
  return readJson<{ hq: Record<string, unknown> }>("/api/admin/saas-hq", {
    cache: "no-store",
  });
}

export function reviewEmployerRegistration(
  companyId: string,
  input: { action: "approve" | "reject"; reason?: string }
) {
  return readJson<{ result: Record<string, unknown> }>(`/api/admin/employer-registrations/${companyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchPlatformSnapshot() {
  return readJson<PlatformSnapshot>("/api/platform", { cache: "no-store" });
}

export function fetchModule(moduleKey: string) {
  return readJson<ModuleSpec>(`/api/modules/${moduleKey}`, { cache: "no-store" });
}

export function fetchPage(moduleKey: string, pageKey: string) {
  return readJson<PageSpec>(`/api/modules/${moduleKey}/pages/${pageKey}`, {
    cache: "no-store",
  });
}

export function fetchApprovalTasks() {
  return readJson<{ tasks: ApprovalTask[] }>("/api/approval-tasks", { cache: "no-store" });
}

export function createEmployeeActivationRequest(input: {
  employeeName: string;
  department: string;
  branch: string;
  employmentType: string;
  actorEmail: string;
  actorRole: string;
}) {
  return readJson<ApprovalTask>("/api/approval-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "employee_activation",
      ...input,
    }),
  });
}

export function createPayrollApprovalRequest(input: {
  period: string;
  grossPay: string;
  netPay: string;
  employeeCount: string;
  actorEmail: string;
  actorRole: string;
}) {
  return readJson<ApprovalTask>("/api/approval-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "payroll_approval",
      ...input,
    }),
  });
}

export function createLeaveRequest(input: {
  employeeName: string;
  leaveType: string;
  days: string;
  startDate: string;
  actorEmail: string;
  actorRole: string;
}) {
  return readJson<ApprovalTask>("/api/approval-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "leave_request",
      ...input,
    }),
  });
}

export function createRequisitionApprovalRequest(input: {
  roleTitle: string;
  department: string;
  branch: string;
  headcount: string;
  actorEmail: string;
  actorRole: string;
}) {
  return readJson<ApprovalTask>("/api/approval-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "requisition_approval",
      ...input,
    }),
  });
}

export function createProfileUpdateRequest(input: {
  employeeName: string;
  fieldName: string;
  newValue: string;
  actorEmail: string;
  actorRole: string;
}) {
  return readJson<ApprovalTask>("/api/approval-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "profile_update",
      ...input,
    }),
  });
}

export function createTrainingRequest(input: {
  employeeName: string;
  programName: string;
  schedule: string;
  budget: string;
  actorEmail: string;
  actorRole: string;
}) {
  return readJson<ApprovalTask>("/api/approval-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "training_request",
      ...input,
    }),
  });
}

export function createAssetRequest(input: {
  employeeName: string;
  assetName: string;
  requestType: string;
  branch: string;
  actorEmail: string;
  actorRole: string;
}) {
  return readJson<ApprovalTask>("/api/approval-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "asset_request",
      ...input,
    }),
  });
}

export function updateApprovalTask(
  taskId: string,
  input: { action: "approve" | "reject"; actorEmail: string; actorRole: string; comment?: string }
) {
  return readJson<ApprovalTask>(`/api/approval-tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchAuditLogs() {
  return readJson<{ events: AuditEvent[] }>("/api/audit-logs", { cache: "no-store" });
}

export function fetchEmployeeRecords() {
  return readJson<{ employees: EmployeeRecord[] }>("/api/people/employees", {
    cache: "no-store",
  });
}

export function createEmployeeRecord(input: {
  fullName: string;
  department: string;
  branch: string;
  employmentType: string;
  actorEmail: string;
  actorRole: string;
}) {
  return readJson<EmployeeRecord>("/api/people/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchPayrollPackage() {
  return readJson<{ payroll: PayrollPackage | null }>("/api/payroll/package", {
    cache: "no-store",
  });
}

export function createPayrollExport(input: {
  exportType: PayrollExportType;
  actorEmail: string;
  actorRole: string;
}) {
  return readJson<{ exportType: string; label: string; period: string; status: string }>(
    "/api/payroll/package",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
}

export function fetchEmployeeProfile(employeeId: string) {
  return readJson<{ employee: EmployeeProfile }>(`/api/people/employees/${employeeId}`, {
    cache: "no-store",
  });
}

export function createEmployeeUserAccount(employeeId: string, role = "Employee") {
  return readJson<{ result: Record<string, unknown> }>(`/api/people/employees/${employeeId}/user-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export function createEmployeeUserAccountsBulk(employeeIds: string[], role = "Employee") {
  return readJson<{ result: Record<string, unknown> }>("/api/people/employees/user-accounts/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeIds, role }),
  });
}

export function runAdminUserLifecycleAction(
  userId: string,
  action:
    | "activate"
    | "suspend"
    | "deactivate"
    | "reactivate"
    | "resend_invite"
    | "reset_password"
    | "set_temporary_password"
    | "revoke_invite"
    | "force_sign_out",
  options?: { temporaryPassword?: string | null }
) {
  return readJson<{ result: Record<string, unknown> }>(`/api/admin/users/${userId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, temporaryPassword: options?.temporaryPassword ?? null }),
  });
}

export function fetchPayrollReview() {
  return readJson<{ payroll: PayrollPackage | null; variance: PayrollVarianceItem[] }>(
    "/api/payroll/review",
    {
      cache: "no-store",
    }
  );
}

export function fetchPayrollProcess() {
  return readJson<{ process: PayrollProcessData }>("/api/payroll/process", {
    cache: "no-store",
  });
}

export function getPayrollExportUrl(
  exportType: PayrollExportType,
  actorEmail: string,
  actorRole: string
) {
  const params = new URLSearchParams({
    actorEmail,
    actorRole,
  });

  return `/api/payroll/exports/${exportType}?${params.toString()}`;
}
