import { getPlatformSnapshot as getStaticSnapshot, type ApprovalTask, type PlatformSnapshot } from "@/lib/solva-data";

type EmployeeActivationPayload = {
  employeeName: string;
  department: string;
  branch: string;
  employmentType: string;
  actorEmail: string;
  actorRole: string;
};

type PayrollApprovalPayload = {
  period: string;
  grossPay: string;
  netPay: string;
  employeeCount: string;
  actorEmail: string;
  actorRole: string;
};

type LeaveRequestPayload = {
  employeeName: string;
  leaveType: string;
  days: string;
  startDate: string;
  actorEmail: string;
  actorRole: string;
};

type RequisitionApprovalPayload = {
  roleTitle: string;
  department: string;
  branch: string;
  headcount: string;
  actorEmail: string;
  actorRole: string;
};

const approvalTasks: ApprovalTask[] = [
  {
    id: "task-001",
    kind: "employee_activation",
    moduleKey: "people",
    title: "Activate Mercy Njeri",
    description: "New finance employee prepared by operator, waiting for supervisor verification.",
    ownerRole: "Supervisor",
    requestedBy: "operator@solvahr.app",
    requestedByRole: "Operator",
    status: "pending",
    stage: "Supervisor review",
    due: "Today 12:30",
    updatedAt: "2026-04-21 08:40",
  },
  {
    id: "task-002",
    kind: "payroll_approval",
    moduleKey: "payroll",
    title: "Approve Apr 2026 payroll package",
    description: "Payroll draft passed validation and is waiting for finance review.",
    ownerRole: "Finance Officer",
    requestedBy: "payrolladmin@solvahr.app",
    requestedByRole: "Payroll Admin",
    status: "pending",
    stage: "Finance review",
    due: "Today 15:00",
    updatedAt: "2026-04-21 09:05",
  },
  {
    id: "task-003",
    kind: "leave_request",
    moduleKey: "leave",
    title: "Approve annual leave for Brian Mwangi",
    description: "4 days annual leave starting 2026-04-28.",
    ownerRole: "Supervisor",
    requestedBy: "employee@solvahr.app",
    requestedByRole: "Employee",
    status: "pending",
    stage: "Supervisor review",
    due: "Today 16:00",
    updatedAt: "2026-04-21 09:12",
  },
  {
    id: "task-004",
    kind: "requisition_approval",
    moduleKey: "recruitment",
    title: "Approve Payroll Analyst requisition",
    description: "Finance department requisition for Nairobi HQ, headcount 1.",
    ownerRole: "Finance Officer",
    requestedBy: "manager@solvahr.app",
    requestedByRole: "Manager",
    status: "pending",
    stage: "Finance review",
    due: "Tomorrow 09:30",
    updatedAt: "2026-04-21 09:18",
  },
];

function nowLabel() {
  return "2026-04-21 09:30";
}

function taskDue(label: "people" | "payroll" | "leave" | "recruitment") {
  if (label === "people") {
    return "Today 17:00";
  }

  if (label === "leave") {
    return "Today 16:30";
  }

  if (label === "recruitment") {
    return "Tomorrow 11:00";
  }

  return "Tomorrow 10:00";
}

export function listApprovalTasks() {
  return [...approvalTasks].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getPlatformSnapshot(): PlatformSnapshot {
  const base = getStaticSnapshot();
  const approvals = listApprovalTasks()
    .filter((task) => task.status === "pending")
    .slice(0, 4)
    .map((task) => ({
      item: task.title,
      owner: task.ownerRole,
      status: task.stage,
      due: task.due,
    }));

  return {
    ...base,
    featured: {
      ...base.featured,
      approvals,
    },
  };
}

export function createEmployeeActivationRequest(payload: EmployeeActivationPayload) {
  const task: ApprovalTask = {
    id: `task-${approvalTasks.length + 1}`.padStart(8, "0"),
    kind: "employee_activation",
    moduleKey: "people",
    title: `Activate ${payload.employeeName}`,
    description: `${payload.employeeName} for ${payload.department}, ${payload.branch} (${payload.employmentType})`,
    ownerRole: "Supervisor",
    requestedBy: payload.actorEmail,
    requestedByRole: payload.actorRole,
    status: "pending",
    stage: "Supervisor review",
    due: taskDue("people"),
    updatedAt: nowLabel(),
  };

  approvalTasks.unshift(task);
  return task;
}

export function createPayrollApprovalRequest(payload: PayrollApprovalPayload) {
  const task: ApprovalTask = {
    id: `task-${approvalTasks.length + 1}`.padStart(8, "0"),
    kind: "payroll_approval",
    moduleKey: "payroll",
    title: `Approve ${payload.period} payroll`,
    description: `${payload.employeeCount} employees | Gross ${payload.grossPay} | Net ${payload.netPay}`,
    ownerRole: "Finance Officer",
    requestedBy: payload.actorEmail,
    requestedByRole: payload.actorRole,
    status: "pending",
    stage: "Finance review",
    due: taskDue("payroll"),
    updatedAt: nowLabel(),
  };

  approvalTasks.unshift(task);
  return task;
}

export function createLeaveRequest(payload: LeaveRequestPayload) {
  const task: ApprovalTask = {
    id: `task-${approvalTasks.length + 1}`.padStart(8, "0"),
    kind: "leave_request",
    moduleKey: "leave",
    title: `${payload.leaveType} request for ${payload.employeeName}`,
    description: `${payload.days} day(s) starting ${payload.startDate}`,
    ownerRole: "Supervisor",
    requestedBy: payload.actorEmail,
    requestedByRole: payload.actorRole,
    status: "pending",
    stage: "Supervisor review",
    due: taskDue("leave"),
    updatedAt: nowLabel(),
  };

  approvalTasks.unshift(task);
  return task;
}

export function createRequisitionApprovalRequest(payload: RequisitionApprovalPayload) {
  const task: ApprovalTask = {
    id: `task-${approvalTasks.length + 1}`.padStart(8, "0"),
    kind: "requisition_approval",
    moduleKey: "recruitment",
    title: `Approve ${payload.roleTitle} requisition`,
    description: `${payload.department} | ${payload.branch} | Headcount ${payload.headcount}`,
    ownerRole: "Finance Officer",
    requestedBy: payload.actorEmail,
    requestedByRole: payload.actorRole,
    status: "pending",
    stage: "Finance review",
    due: taskDue("recruitment"),
    updatedAt: nowLabel(),
  };

  approvalTasks.unshift(task);
  return task;
}

export function updateApprovalTask(taskId: string, action: "approve" | "reject", actorEmail: string, actorRole: string) {
  const task = approvalTasks.find((entry) => entry.id === taskId);

  if (!task) {
    throw new Error("task_not_found");
  }

  if (task.status !== "pending") {
    throw new Error("task_not_pending");
  }

  if (task.ownerRole !== actorRole && actorRole !== "Super Admin") {
    throw new Error("forbidden");
  }

  if (action === "reject") {
    task.status = "rejected";
    task.stage = `Rejected by ${actorRole}`;
    task.ownerRole = task.requestedByRole;
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Rejected by ${actorEmail}`;
    return task;
  }

  if (task.kind === "employee_activation") {
    task.status = "approved";
    task.stage = "Activated";
    task.ownerRole = "Completed";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Approved by ${actorEmail}`;
    return task;
  }

  if (task.kind === "leave_request") {
    task.status = "approved";
    task.stage = "Leave approved";
    task.ownerRole = "Completed";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Approved by ${actorEmail}`;
    return task;
  }

  if (task.kind === "requisition_approval" && task.ownerRole === "Finance Officer") {
    task.stage = "HR release";
    task.ownerRole = "HR Admin";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Budget reviewed by ${actorEmail}`;
    return task;
  }

  if (task.kind === "requisition_approval") {
    task.status = "approved";
    task.stage = "Vacancy ready";
    task.ownerRole = "Completed";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Released by ${actorEmail}`;
    return task;
  }

  if (task.kind === "payroll_approval" && task.ownerRole === "Finance Officer") {
    task.stage = "Executive sign-off";
    task.ownerRole = "Super Admin";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Finance reviewed by ${actorEmail}`;
    return task;
  }

  task.status = "approved";
  task.stage = "Payroll approved";
  task.ownerRole = "Completed";
  task.updatedAt = nowLabel();
  task.description = `${task.description} | Final approval by ${actorEmail}`;
  return task;
}
