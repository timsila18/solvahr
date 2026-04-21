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

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`request_failed:${response.status}`);
  }

  return response.json() as Promise<T>;
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
  input: { action: "approve" | "reject"; actorEmail: string; actorRole: string }
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
  return readJson<{ payroll: PayrollPackage }>("/api/payroll/package", {
    cache: "no-store",
  });
}

export function createPayrollExport(input: {
  exportType: "net_to_bank" | "paye_report" | "payroll_register" | "p9_forms";
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

export function fetchPayrollReview() {
  return readJson<{ payroll: PayrollPackage; variance: PayrollVarianceItem[] }>(
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
  exportType: "net_to_bank" | "paye_report" | "payroll_register" | "p9_forms",
  actorEmail: string,
  actorRole: string
) {
  const params = new URLSearchParams({
    actorEmail,
    actorRole,
  });

  return `/api/payroll/exports/${exportType}?${params.toString()}`;
}
