type EmployeeCreationInput = {
  employeeNumber: string;
  legalName: string;
  companyEmail?: string | undefined;
  hireDate: string;
};

export type EmployeeApprovalRequest = {
  id: string;
  tenantId: string;
  requestedByUserId: string;
  requestedByEmail: string;
  requestedByName: string;
  status: "pending_approval" | "approved" | "rejected";
  approverRole: string;
  createdAt: string;
  decidedAt: string | null;
  decisionComments: string | null;
  payload: EmployeeCreationInput;
};

const employeeApprovalRequests: EmployeeApprovalRequest[] = [];

function requestId() {
  return `emp-req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listEmployeeApprovalRequests() {
  return [...employeeApprovalRequests].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createEmployeeApprovalRequest(input: Omit<EmployeeApprovalRequest, "id" | "createdAt" | "decidedAt" | "decisionComments" | "status">) {
  const request: EmployeeApprovalRequest = {
    id: requestId(),
    tenantId: input.tenantId,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.requestedByEmail,
    requestedByName: input.requestedByName,
    approverRole: input.approverRole,
    payload: input.payload,
    status: "pending_approval",
    createdAt: new Date().toISOString(),
    decidedAt: null,
    decisionComments: null
  };

  employeeApprovalRequests.unshift(request);
  return request;
}

export function findEmployeeApprovalRequest(id: string) {
  return employeeApprovalRequests.find((item) => item.id === id) ?? null;
}

export function decideEmployeeApprovalRequest(id: string, decision: "approved" | "rejected", comments?: string) {
  const request = employeeApprovalRequests.find((item) => item.id === id);

  if (!request) {
    return null;
  }

  request.status = decision;
  request.decidedAt = new Date().toISOString();
  request.decisionComments = comments ?? null;

  return request;
}
