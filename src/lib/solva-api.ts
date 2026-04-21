import type { ApprovalTask, ModuleSpec, PageSpec, PlatformSnapshot } from "@/lib/solva-data";

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
