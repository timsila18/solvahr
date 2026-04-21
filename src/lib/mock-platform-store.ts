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
];

function nowLabel() {
  return "2026-04-21 09:30";
}

function taskDue(label: "people" | "payroll") {
  return label === "people" ? "Today 17:00" : "Tomorrow 10:00";
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
