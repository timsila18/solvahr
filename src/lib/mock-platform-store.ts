import {
  getPlatformSnapshot as getStaticSnapshot,
  type ApprovalTask,
  type AuditEvent,
  type EmployeeRecord,
  type PayrollPackage,
  type PlatformSnapshot,
} from "@/lib/solva-data";

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

type ProfileUpdatePayload = {
  employeeName: string;
  fieldName: string;
  newValue: string;
  actorEmail: string;
  actorRole: string;
};

type TrainingRequestPayload = {
  employeeName: string;
  programName: string;
  schedule: string;
  budget: string;
  actorEmail: string;
  actorRole: string;
};

type AssetRequestPayload = {
  employeeName: string;
  assetName: string;
  requestType: string;
  branch: string;
  actorEmail: string;
  actorRole: string;
};

type EmployeeRecordPayload = {
  fullName: string;
  department: string;
  branch: string;
  employmentType: string;
  actorEmail: string;
  actorRole: string;
};

type PayrollExportPayload = {
  exportType: "net_to_bank" | "paye_report" | "payroll_register" | "p9_forms";
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
  {
    id: "task-005",
    kind: "training_request",
    moduleKey: "training",
    title: "Approve forklift safety refresher",
    description: "Requested for Daniel Oloo | Budget KES 28,000 | Schedule 2026-05-02",
    ownerRole: "HR Admin",
    requestedBy: "manager@solvahr.app",
    requestedByRole: "Manager",
    status: "pending",
    stage: "HR training review",
    due: "Tomorrow 12:00",
    updatedAt: "2026-04-21 09:22",
  },
  {
    id: "task-006",
    kind: "asset_request",
    moduleKey: "assets",
    title: "Assign Dell Latitude laptop",
    description: "Requested for Lucy Atieno | Nairobi HQ | New issue",
    ownerRole: "HR Admin",
    requestedBy: "operator@solvahr.app",
    requestedByRole: "Operator",
    status: "pending",
    stage: "Asset approval",
    due: "Today 17:30",
    updatedAt: "2026-04-21 09:25",
  },
  {
    id: "task-007",
    kind: "profile_update",
    moduleKey: "ess",
    title: "Approve profile change for Brian Mwangi",
    description: "Update company phone number to 0712 555 901",
    ownerRole: "HR Admin",
    requestedBy: "employee@solvahr.app",
    requestedByRole: "Employee",
    status: "pending",
    stage: "HR validation",
    due: "Today 16:45",
    updatedAt: "2026-04-21 09:28",
  },
];

const auditEvents: AuditEvent[] = [
  {
    id: "audit-001",
    moduleKey: "payroll",
    category: "approval",
    action: "submitted_payroll_package",
    actorEmail: "payrolladmin@solvahr.app",
    actorRole: "Payroll Admin",
    subject: "Apr 2026 payroll package",
    outcome: "sent to Finance Officer",
    timestamp: "2026-04-21 09:05",
  },
  {
    id: "audit-002",
    moduleKey: "people",
    category: "employee",
    action: "submitted_employee_activation",
    actorEmail: "operator@solvahr.app",
    actorRole: "Operator",
    subject: "Mercy Njeri",
    outcome: "awaiting Supervisor review",
    timestamp: "2026-04-21 08:40",
  },
  {
    id: "audit-003",
    moduleKey: "audit",
    category: "access",
    action: "login_success",
    actorEmail: "superadmin@solvahr.app",
    actorRole: "Super Admin",
    subject: "Solva HR admin session",
    outcome: "granted",
    timestamp: "2026-04-21 08:10",
  },
];

const employeeRecords: EmployeeRecord[] = [
  {
    id: "emp-001",
    employeeNumber: "SOL-001",
    fullName: "Amina Otieno",
    department: "People Operations",
    branch: "Nairobi HQ",
    employmentType: "Permanent",
    status: "Active",
  },
  {
    id: "emp-018",
    employeeNumber: "SOL-018",
    fullName: "Brian Mwangi",
    department: "Distribution",
    branch: "Mombasa",
    employmentType: "Probation",
    status: "Review due",
  },
  {
    id: "emp-044",
    employeeNumber: "SOL-044",
    fullName: "Mercy Njeri",
    department: "Finance",
    branch: "Nairobi HQ",
    employmentType: "Permanent",
    status: "Pending activation",
  },
];

const payrollPackage: PayrollPackage = {
  period: "Apr 2026",
  status: "Pending approval",
  employeeCount: "1044",
  grossPay: "KES 18.45M",
  netPay: "KES 13.94M",
  paye: "KES 2.48M",
  shif: "KES 507,375",
  nssf: "KES 1,127,520",
  housingLevy: "KES 276,750",
};

function nowLabel() {
  return "2026-04-21 09:30";
}

function logAuditEvent(input: Omit<AuditEvent, "id">) {
  const event: AuditEvent = {
    id: `audit-${String(auditEvents.length + 1).padStart(3, "0")}`,
    ...input,
  };

  auditEvents.unshift(event);
  return event;
}

function taskDue(
  label: "people" | "payroll" | "leave" | "recruitment" | "training" | "assets" | "ess"
) {
  if (label === "people") {
    return "Today 17:00";
  }

  if (label === "leave") {
    return "Today 16:30";
  }

  if (label === "recruitment") {
    return "Tomorrow 11:00";
  }

  if (label === "training") {
    return "Tomorrow 14:00";
  }

  if (label === "assets") {
    return "Today 17:30";
  }

  if (label === "ess") {
    return "Today 16:45";
  }

  return "Tomorrow 10:00";
}

export function listApprovalTasks() {
  return [...approvalTasks].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function listAuditEvents() {
  return [...auditEvents].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function listEmployeeRecords() {
  return [...employeeRecords];
}

export function getPayrollPackage() {
  return { ...payrollPackage };
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
  logAuditEvent({
    moduleKey: "people",
    category: "employee",
    action: "submitted_employee_activation",
    actorEmail: payload.actorEmail,
    actorRole: payload.actorRole,
    subject: payload.employeeName,
    outcome: "awaiting Supervisor review",
    timestamp: task.updatedAt,
  });
  return task;
}

export function createEmployeeRecord(payload: EmployeeRecordPayload) {
  const record: EmployeeRecord = {
    id: `emp-${String(employeeRecords.length + 1).padStart(3, "0")}`,
    employeeNumber: `SOL-${String(employeeRecords.length + 1).padStart(3, "0")}`,
    fullName: payload.fullName,
    department: payload.department,
    branch: payload.branch,
    employmentType: payload.employmentType,
    status: "Pending activation",
  };

  employeeRecords.unshift(record);
  logAuditEvent({
    moduleKey: "people",
    category: "employee",
    action: "created_employee_record",
    actorEmail: payload.actorEmail,
    actorRole: payload.actorRole,
    subject: payload.fullName,
    outcome: "employee master record added",
    timestamp: nowLabel(),
  });
  return record;
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
  logAuditEvent({
    moduleKey: "payroll",
    category: "approval",
    action: "submitted_payroll_package",
    actorEmail: payload.actorEmail,
    actorRole: payload.actorRole,
    subject: payload.period,
    outcome: "sent to Finance Officer",
    timestamp: task.updatedAt,
  });
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
  logAuditEvent({
    moduleKey: "leave",
    category: "leave",
    action: "submitted_leave_request",
    actorEmail: payload.actorEmail,
    actorRole: payload.actorRole,
    subject: `${payload.employeeName} ${payload.leaveType}`,
    outcome: "awaiting Supervisor review",
    timestamp: task.updatedAt,
  });
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
  logAuditEvent({
    moduleKey: "recruitment",
    category: "recruitment",
    action: "submitted_requisition",
    actorEmail: payload.actorEmail,
    actorRole: payload.actorRole,
    subject: payload.roleTitle,
    outcome: "sent to Finance Officer",
    timestamp: task.updatedAt,
  });
  return task;
}

export function createProfileUpdateRequest(payload: ProfileUpdatePayload) {
  const task: ApprovalTask = {
    id: `task-${approvalTasks.length + 1}`.padStart(8, "0"),
    kind: "profile_update",
    moduleKey: "ess",
    title: `Approve profile change for ${payload.employeeName}`,
    description: `${payload.fieldName} -> ${payload.newValue}`,
    ownerRole: "HR Admin",
    requestedBy: payload.actorEmail,
    requestedByRole: payload.actorRole,
    status: "pending",
    stage: "HR validation",
    due: taskDue("ess"),
    updatedAt: nowLabel(),
  };

  approvalTasks.unshift(task);
  logAuditEvent({
    moduleKey: "ess",
    category: "profile",
    action: "submitted_profile_update",
    actorEmail: payload.actorEmail,
    actorRole: payload.actorRole,
    subject: payload.employeeName,
    outcome: "awaiting HR validation",
    timestamp: task.updatedAt,
  });
  return task;
}

export function createTrainingRequest(payload: TrainingRequestPayload) {
  const task: ApprovalTask = {
    id: `task-${approvalTasks.length + 1}`.padStart(8, "0"),
    kind: "training_request",
    moduleKey: "training",
    title: `Approve ${payload.programName}`,
    description: `${payload.employeeName} | ${payload.schedule} | Budget ${payload.budget}`,
    ownerRole: "HR Admin",
    requestedBy: payload.actorEmail,
    requestedByRole: payload.actorRole,
    status: "pending",
    stage: "HR training review",
    due: taskDue("training"),
    updatedAt: nowLabel(),
  };

  approvalTasks.unshift(task);
  logAuditEvent({
    moduleKey: "training",
    category: "training",
    action: "submitted_training_request",
    actorEmail: payload.actorEmail,
    actorRole: payload.actorRole,
    subject: payload.programName,
    outcome: "awaiting HR training review",
    timestamp: task.updatedAt,
  });
  return task;
}

export function createAssetRequest(payload: AssetRequestPayload) {
  const task: ApprovalTask = {
    id: `task-${approvalTasks.length + 1}`.padStart(8, "0"),
    kind: "asset_request",
    moduleKey: "assets",
    title: `${payload.requestType} ${payload.assetName}`,
    description: `${payload.employeeName} | ${payload.branch}`,
    ownerRole: "HR Admin",
    requestedBy: payload.actorEmail,
    requestedByRole: payload.actorRole,
    status: "pending",
    stage: "Asset approval",
    due: taskDue("assets"),
    updatedAt: nowLabel(),
  };

  approvalTasks.unshift(task);
  logAuditEvent({
    moduleKey: "assets",
    category: "assets",
    action: "submitted_asset_request",
    actorEmail: payload.actorEmail,
    actorRole: payload.actorRole,
    subject: payload.assetName,
    outcome: "awaiting HR approval",
    timestamp: task.updatedAt,
  });
  return task;
}

export function recordPayrollExport(payload: PayrollExportPayload) {
  const exportLabels: Record<PayrollExportPayload["exportType"], string> = {
    net_to_bank: "Net-to-bank export",
    paye_report: "PAYE support schedule",
    payroll_register: "Payroll register",
    p9_forms: "P9 forms bundle",
  };

  logAuditEvent({
    moduleKey: "payroll",
    category: "export",
    action: "generated_payroll_export",
    actorEmail: payload.actorEmail,
    actorRole: payload.actorRole,
    subject: exportLabels[payload.exportType],
    outcome: `generated for ${payrollPackage.period}`,
    timestamp: nowLabel(),
  });

  return {
    exportType: payload.exportType,
    label: exportLabels[payload.exportType],
    period: payrollPackage.period,
    status: "ready",
  };
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
    logAuditEvent({
      moduleKey: task.moduleKey,
      category: "approval",
      action: "rejected_request",
      actorEmail,
      actorRole,
      subject: task.title,
      outcome: `returned to ${task.requestedByRole}`,
      timestamp: task.updatedAt,
    });
    return task;
  }

  if (task.kind === "employee_activation") {
    task.status = "approved";
    task.stage = "Activated";
    task.ownerRole = "Completed";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Approved by ${actorEmail}`;
    logAuditEvent({
      moduleKey: "people",
      category: "approval",
      action: "approved_employee_activation",
      actorEmail,
      actorRole,
      subject: task.title,
      outcome: "employee activated",
      timestamp: task.updatedAt,
    });
    return task;
  }

  if (task.kind === "leave_request") {
    task.status = "approved";
    task.stage = "Leave approved";
    task.ownerRole = "Completed";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Approved by ${actorEmail}`;
    logAuditEvent({
      moduleKey: "leave",
      category: "approval",
      action: "approved_leave_request",
      actorEmail,
      actorRole,
      subject: task.title,
      outcome: "leave approved",
      timestamp: task.updatedAt,
    });
    return task;
  }

  if (task.kind === "requisition_approval" && task.ownerRole === "Finance Officer") {
    task.stage = "HR release";
    task.ownerRole = "HR Admin";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Budget reviewed by ${actorEmail}`;
    logAuditEvent({
      moduleKey: "recruitment",
      category: "approval",
      action: "finance_reviewed_requisition",
      actorEmail,
      actorRole,
      subject: task.title,
      outcome: "sent to HR Admin",
      timestamp: task.updatedAt,
    });
    return task;
  }

  if (task.kind === "requisition_approval") {
    task.status = "approved";
    task.stage = "Vacancy ready";
    task.ownerRole = "Completed";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Released by ${actorEmail}`;
    logAuditEvent({
      moduleKey: "recruitment",
      category: "approval",
      action: "approved_requisition",
      actorEmail,
      actorRole,
      subject: task.title,
      outcome: "vacancy ready",
      timestamp: task.updatedAt,
    });
    return task;
  }

  if (task.kind === "profile_update") {
    task.status = "approved";
    task.stage = "Profile updated";
    task.ownerRole = "Completed";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Validated by ${actorEmail}`;
    logAuditEvent({
      moduleKey: "ess",
      category: "approval",
      action: "approved_profile_update",
      actorEmail,
      actorRole,
      subject: task.title,
      outcome: "profile updated",
      timestamp: task.updatedAt,
    });
    return task;
  }

  if (task.kind === "training_request") {
    task.status = "approved";
    task.stage = "Training approved";
    task.ownerRole = "Completed";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Approved by ${actorEmail}`;
    logAuditEvent({
      moduleKey: "training",
      category: "approval",
      action: "approved_training_request",
      actorEmail,
      actorRole,
      subject: task.title,
      outcome: "training approved",
      timestamp: task.updatedAt,
    });
    return task;
  }

  if (task.kind === "asset_request") {
    task.status = "approved";
    task.stage = "Asset released";
    task.ownerRole = "Completed";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Approved by ${actorEmail}`;
    logAuditEvent({
      moduleKey: "assets",
      category: "approval",
      action: "approved_asset_request",
      actorEmail,
      actorRole,
      subject: task.title,
      outcome: "asset released",
      timestamp: task.updatedAt,
    });
    return task;
  }

  if (task.kind === "payroll_approval" && task.ownerRole === "Finance Officer") {
    task.stage = "Executive sign-off";
    task.ownerRole = "Super Admin";
    task.updatedAt = nowLabel();
    task.description = `${task.description} | Finance reviewed by ${actorEmail}`;
    logAuditEvent({
      moduleKey: "payroll",
      category: "approval",
      action: "finance_reviewed_payroll",
      actorEmail,
      actorRole,
      subject: task.title,
      outcome: "sent to Super Admin",
      timestamp: task.updatedAt,
    });
    return task;
  }

  task.status = "approved";
  task.stage = "Payroll approved";
  task.ownerRole = "Completed";
  task.updatedAt = nowLabel();
  task.description = `${task.description} | Final approval by ${actorEmail}`;
  logAuditEvent({
    moduleKey: "payroll",
    category: "approval",
    action: "approved_payroll",
    actorEmail,
    actorRole,
    subject: task.title,
    outcome: "payroll approved",
    timestamp: task.updatedAt,
  });
  return task;
}
