import {
  activeRulesForDate,
  calculatePayroll,
  createWorkflowInstance,
  defaultReportTemplates,
  kenyaStatutoryRules2026,
  phaseTwoWorkflowDefinitions,
  rolePermissionMatrix
} from "@solva/shared";

export const demoTenant = {
  id: "tenant-solva-demo",
  name: "Solva Demo Manufacturing",
  country: "KE",
  subscription: "enterprise",
  employeeCount: 248,
  branches: ["Nairobi HQ", "Mombasa Plant", "Kisumu Sales"],
  departments: ["People Operations", "Finance", "Manufacturing", "Sales", "Customer Success"]
};

export const demoEmployees = [
  {
    tenantId: demoTenant.id,
    employeeId: "emp-001",
    employeeNumber: "E-001",
    payrollNumber: "SOL-001",
    displayName: "Amina Otieno",
    legalName: "Amina Achieng Otieno",
    department: "People Operations",
    branch: "Nairobi HQ",
    costCenter: "HR-001",
    payGroup: "monthly",
    basicSalary: 120000,
    status: "active",
    statutory: {
      paye: true,
      personalRelief: true,
      shif: true,
      nssf: true,
      housingLevy: true
    }
  },
  {
    tenantId: demoTenant.id,
    employeeId: "emp-002",
    employeeNumber: "E-002",
    payrollNumber: "SOL-002",
    displayName: "Brian Mwangi",
    legalName: "Brian Kariuki Mwangi",
    department: "Manufacturing",
    branch: "Mombasa Plant",
    costCenter: "OPS-014",
    payGroup: "monthly",
    basicSalary: 85000,
    status: "probation",
    statutory: {
      paye: true,
      personalRelief: true,
      shif: true,
      nssf: true,
      housingLevy: true
    }
  }
] as const;

export const demoLeaveRequests = [
  {
    id: "leave-001",
    employeeName: "Amina Otieno",
    type: "Annual Leave",
    days: 5,
    startDate: "2026-04-20",
    endDate: "2026-04-24",
    status: "submitted",
    approver: "Grace Wanjiku"
  },
  {
    id: "leave-002",
    employeeName: "Brian Mwangi",
    type: "Sick Leave",
    days: 2,
    startDate: "2026-04-10",
    endDate: "2026-04-11",
    status: "approved",
    approver: "Peter Odhiambo"
  }
];

export const demoLeaveBalances = [
  {
    id: "leave-balance-001",
    employeeId: "emp-001",
    employeeName: "Amina Otieno",
    employeeNumber: "E-001",
    leaveTypeCode: "ANNUAL",
    leaveTypeName: "Annual Leave",
    periodYear: 2026,
    opening: 4,
    accrued: 7,
    taken: 5,
    adjusted: 0,
    closing: 6
  },
  {
    id: "leave-balance-002",
    employeeId: "emp-001",
    employeeName: "Amina Otieno",
    employeeNumber: "E-001",
    leaveTypeCode: "SICK",
    leaveTypeName: "Sick Leave",
    periodYear: 2026,
    opening: 0,
    accrued: 14,
    taken: 0,
    adjusted: 0,
    closing: 14
  },
  {
    id: "leave-balance-003",
    employeeId: "emp-002",
    employeeName: "Brian Mwangi",
    employeeNumber: "E-002",
    leaveTypeCode: "ANNUAL",
    leaveTypeName: "Annual Leave",
    periodYear: 2026,
    opening: 0,
    accrued: 6,
    taken: 2,
    adjusted: 0,
    closing: 4
  }
];

export const demoRequisitions = [
  {
    id: "req-001",
    code: "REQ-2026-014",
    title: "Payroll Implementation Specialist",
    department: "People Operations",
    hiringManager: "Amina Otieno",
    headcount: 1,
    budgetRange: "KES 140,000 - 180,000",
    status: "approved",
    justification: "Support payroll outsourcing clients and statutory export implementation."
  },
  {
    id: "req-002",
    code: "REQ-2026-015",
    title: "Employee Relations Officer",
    department: "People Operations",
    hiringManager: "Grace Wanjiku",
    headcount: 1,
    budgetRange: "KES 95,000 - 120,000",
    status: "submitted",
    justification: "Strengthen welfare, grievance, and discipline case turnaround."
  }
];

export const demoVacancies = [
  {
    id: "vac-001",
    requisitionId: "req-001",
    code: "VAC-2026-009",
    title: "Payroll Implementation Specialist",
    department: "People Operations",
    location: "Nairobi HQ",
    status: "open",
    closingDate: "2026-04-30",
    candidateCount: 7
  },
  {
    id: "vac-002",
    requisitionId: "req-002",
    code: "VAC-2026-010",
    title: "Employee Relations Officer",
    department: "People Operations",
    location: "Nairobi HQ",
    status: "draft",
    closingDate: "2026-05-08",
    candidateCount: 0
  }
];

export const demoCandidates = [
  {
    id: "cand-001",
    vacancyId: "vac-001",
    fullName: "Mercy Njeri",
    email: "mercy.njeri@example.com",
    phone: "+254700100200",
    source: "LinkedIn",
    stage: "interview",
    screeningScore: 87,
    salaryExpectation: 165000,
    noticePeriod: "30 days"
  },
  {
    id: "cand-002",
    vacancyId: "vac-001",
    fullName: "Daniel Otieno",
    email: "daniel.otieno@example.com",
    phone: "+254700100201",
    source: "Referral",
    stage: "shortlisted",
    screeningScore: 81,
    salaryExpectation: 150000,
    noticePeriod: "Immediate"
  },
  {
    id: "cand-003",
    vacancyId: "vac-001",
    fullName: "Faith Wambui",
    email: "faith.wambui@example.com",
    phone: "+254700100202",
    source: "Careers Page",
    stage: "offer",
    screeningScore: 91,
    salaryExpectation: 175000,
    noticePeriod: "45 days"
  }
] as const;

export const demoInterviews = [
  {
    id: "int-001",
    candidateName: "Mercy Njeri",
    vacancyTitle: "Payroll Implementation Specialist",
    interviewType: "Panel Interview",
    scheduledAt: "2026-04-16T10:00:00+03:00",
    status: "scheduled",
    panel: ["Amina Otieno", "Peter Odhiambo", "Grace Wanjiku"]
  }
];

const offerApprovalWorkflow = phaseTwoWorkflowDefinitions.find((workflow) => workflow.code === "offer-approval");
const probationWorkflow = phaseTwoWorkflowDefinitions.find((workflow) => workflow.code === "probation-confirmation");

if (!offerApprovalWorkflow || !probationWorkflow) {
  throw new Error("Missing Phase 2 workflow definitions");
}

export const demoOffers = [
  {
    id: "offer-001",
    candidateName: "Faith Wambui",
    vacancyTitle: "Payroll Implementation Specialist",
    status: "pending_approval",
    offeredSalary: 170000,
    proposedStartDate: "2026-05-06",
    workflow: createWorkflowInstance(offerApprovalWorkflow, "job_offer", "offer-001")
  }
];

export const demoOnboardingTasks = [
  {
    id: "task-001",
    personName: "Faith Wambui",
    category: "Pre-boarding",
    title: "Submit KRA PIN, SHA, NSSF, and bank details",
    ownerRole: "candidate",
    dueDate: "2026-04-25",
    status: "in_progress"
  },
  {
    id: "task-002",
    personName: "Faith Wambui",
    category: "IT",
    title: "Prepare laptop, email, and HRIS employee account",
    ownerRole: "admin_officer",
    dueDate: "2026-05-02",
    status: "not_started"
  },
  {
    id: "task-003",
    personName: "Brian Mwangi",
    category: "Probation",
    title: "Complete 90-day probation review",
    ownerRole: "manager",
    dueDate: "2026-04-18",
    status: "in_progress"
  }
];

export const demoProbationReviews = [
  {
    id: "prob-001",
    employeeName: "Brian Mwangi",
    reviewDate: "2026-04-18",
    manager: "Peter Odhiambo",
    score: 78,
    recommendation: "extend_probation",
    status: "submitted",
    workflow: createWorkflowInstance(probationWorkflow, "probation_review", "prob-001")
  }
];

export const demoDocumentTemplates = [
  {
    id: "tpl-001",
    code: "offer-letter-ke",
    name: "Kenya Offer Letter",
    category: "recruitment",
    status: "active",
    mergeFields: ["candidate.fullName", "company.name", "offer.offeredSalary", "offer.proposedStartDate"]
  },
  {
    id: "tpl-002",
    code: "probation-confirmation",
    name: "Probation Confirmation Letter",
    category: "probation",
    status: "draft",
    mergeFields: ["employee.legalName", "employee.position", "review.recommendation"]
  }
];

export const demoGeneratedDocuments = [
  {
    id: "doc-gen-001",
    templateCode: "offer-letter-ke",
    entityType: "job_offer",
    entityId: "offer-001",
    status: "draft",
    preview: "Dear Faith Wambui, we are pleased to offer you the role of Payroll Implementation Specialist."
  }
];

export const demoEmployeeDocuments = [
  {
    id: "emp-doc-001",
    employeeId: "emp-001",
    employeeName: "Amina Otieno",
    category: "Contract",
    name: "Signed Employment Contract",
    restricted: false,
    expiresAt: null,
    version: 1
  },
  {
    id: "emp-doc-002",
    employeeId: "emp-001",
    employeeName: "Amina Otieno",
    category: "Statutory",
    name: "KRA PIN Certificate",
    restricted: false,
    expiresAt: null,
    version: 1
  },
  {
    id: "emp-doc-003",
    employeeId: "emp-002",
    employeeName: "Brian Mwangi",
    category: "Identity",
    name: "National ID Copy",
    restricted: false,
    expiresAt: null,
    version: 1
  },
  {
    id: "emp-doc-004",
    employeeId: "emp-002",
    employeeName: "Brian Mwangi",
    category: "Medical",
    name: "Occupational Health Clearance",
    restricted: true,
    expiresAt: "2026-12-31",
    version: 2
  }
];

export const demoPerformanceCycles = [
  {
    id: "perf-cycle-2026-q2",
    code: "Q2-2026",
    name: "Q2 2026 Performance Cycle",
    reviewType: "quarterly",
    status: "in_progress",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    completionRate: 68
  },
  {
    id: "perf-cycle-2026-probation",
    code: "PROB-2026",
    name: "2026 Probation Reviews",
    reviewType: "probation",
    status: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    completionRate: 54
  }
];

export const demoPerformanceGoals = [
  {
    id: "goal-001",
    employeeName: "Amina Otieno",
    department: "People Operations",
    title: "Reduce payroll exception rate to below 1.5%",
    category: "Operational Excellence",
    weight: 35,
    progress: 72,
    status: "on_track"
  },
  {
    id: "goal-002",
    employeeName: "Brian Mwangi",
    department: "Manufacturing",
    title: "Improve shift attendance compliance to 98%",
    category: "Attendance",
    weight: 30,
    progress: 61,
    status: "watch"
  },
  {
    id: "goal-003",
    employeeName: "Faith Wambui",
    department: "People Operations",
    title: "Launch recruitment SLA dashboard for client accounts",
    category: "Delivery",
    weight: 35,
    progress: 84,
    status: "ahead"
  }
];

export const demoPerformanceReviews = [
  {
    id: "review-001",
    employeeName: "Amina Otieno",
    reviewer: "Grace Wanjiku",
    cycle: "Q2 2026 Performance Cycle",
    score: 4.4,
    recommendation: "high_performer",
    status: "manager_review"
  },
  {
    id: "review-002",
    employeeName: "Brian Mwangi",
    reviewer: "Peter Odhiambo",
    cycle: "2026 Probation Reviews",
    score: 3.2,
    recommendation: "extend_probation",
    status: "calibration"
  },
  {
    id: "review-003",
    employeeName: "Faith Wambui",
    reviewer: "Amina Otieno",
    cycle: "Q2 2026 Performance Cycle",
    score: 4.6,
    recommendation: "promote_readiness",
    status: "completed"
  }
];

export const demoPerformancePlans = [
  {
    id: "plan-001",
    employeeName: "Brian Mwangi",
    planType: "pip",
    owner: "Peter Odhiambo",
    status: "active",
    dueDate: "2026-05-20",
    focusArea: "Attendance and output consistency"
  },
  {
    id: "plan-002",
    employeeName: "Amina Otieno",
    planType: "development",
    owner: "Grace Wanjiku",
    status: "active",
    dueDate: "2026-06-15",
    focusArea: "Manager coaching and team leadership"
  }
];

export const demoWelfareCases = [
  {
    id: "wel-001",
    employeeName: "Jane Atieno",
    category: "medical_support",
    location: "Mombasa Plant",
    severity: "high",
    status: "active",
    caseOwner: "Mercy Akinyi",
    openedAt: "2026-04-12",
    nextActionDue: "2026-04-18",
    notes: "Employee recovering after workplace injury and requires transport support."
  },
  {
    id: "wel-002",
    employeeName: "Daniel Kiptoo",
    category: "bereavement",
    location: "Nairobi HQ",
    severity: "medium",
    status: "follow_up",
    caseOwner: "Grace Wanjiku",
    openedAt: "2026-04-09",
    nextActionDue: "2026-04-20",
    notes: "Bereavement assistance approved and counseling follow-up scheduled."
  },
  {
    id: "wel-003",
    employeeName: "Amina Otieno",
    category: "counselling_referral",
    location: "Nairobi HQ",
    severity: "low",
    status: "closed",
    caseOwner: "Mercy Akinyi",
    openedAt: "2026-03-28",
    nextActionDue: "2026-04-08",
    notes: "Support intervention completed with no further escalation."
  }
];

export const demoGrievances = [
  {
    id: "grv-001",
    employeeName: "Brian Mwangi",
    category: "supervisor_conduct",
    channel: "manager_escalation",
    priority: "high",
    status: "investigation",
    assignedTo: "Peter Odhiambo",
    filedAt: "2026-04-11",
    lastUpdatedAt: "2026-04-15",
    summary: "Employee raised concern about repeated shift allocation without notice."
  },
  {
    id: "grv-002",
    employeeName: "Faith Wambui",
    category: "harassment",
    channel: "confidential_form",
    priority: "critical",
    status: "hearing_preparation",
    assignedTo: "Grace Wanjiku",
    filedAt: "2026-04-13",
    lastUpdatedAt: "2026-04-16",
    summary: "Confidential complaint escalated for formal hearing preparation."
  },
  {
    id: "grv-003",
    employeeName: "Joseph Ouma",
    category: "pay_query",
    channel: "self_service",
    priority: "medium",
    status: "resolved",
    assignedTo: "Amina Otieno",
    filedAt: "2026-04-07",
    lastUpdatedAt: "2026-04-10",
    summary: "Overtime query resolved after payroll review and communication."
  }
];

export const demoDisciplinaryCases = [
  {
    id: "disc-001",
    employeeName: "Kevin Mutua",
    allegation: "Persistent lateness and roster breach",
    stage: "show_cause",
    owner: "Grace Wanjiku",
    hearingDate: "2026-04-22",
    status: "active",
    outcome: "pending",
    evidenceCount: 4
  },
  {
    id: "disc-002",
    employeeName: "Mary Njeri",
    allegation: "Safety procedure non-compliance",
    stage: "hearing",
    owner: "Peter Odhiambo",
    hearingDate: "2026-04-19",
    status: "active",
    outcome: "pending",
    evidenceCount: 6
  },
  {
    id: "disc-003",
    employeeName: "John Odhiambo",
    allegation: "Unauthorized absence",
    stage: "outcome_recorded",
    owner: "Grace Wanjiku",
    hearingDate: "2026-04-05",
    status: "closed",
    outcome: "final_warning",
    evidenceCount: 3
  }
];

export const demoAuditLogs = [
  {
    id: "audit-001",
    actorName: "Grace Wanjiku",
    actorEmail: "grace@solvahr.app",
    action: "employees.create",
    entityType: "employee",
    entityId: "emp-005",
    module: "employees",
    riskLevel: "medium",
    summary: "Created employee file for Susan Kemunto and assigned Nairobi HQ.",
    createdAt: "2026-04-17T08:12:00.000Z",
    ipAddress: "102.68.14.22"
  },
  {
    id: "audit-002",
    actorName: "Amina Otieno",
    actorEmail: "amina@solvahr.app",
    action: "payroll.approval.requested",
    entityType: "payroll_run",
    entityId: "run-2026-04-monthly-v1",
    module: "payroll",
    riskLevel: "high",
    summary: "Requested approval for April 2026 payroll run after review.",
    createdAt: "2026-04-17T08:40:00.000Z",
    ipAddress: "102.68.14.30"
  },
  {
    id: "audit-003",
    actorName: "Peter Odhiambo",
    actorEmail: "peter@solvahr.app",
    action: "leave.request.approve",
    entityType: "leave_request",
    entityId: "leave-001",
    module: "leave",
    riskLevel: "medium",
    summary: "Approved annual leave request for Amina Otieno.",
    createdAt: "2026-04-17T09:03:00.000Z",
    ipAddress: "102.68.14.15"
  },
  {
    id: "audit-004",
    actorName: "Grace Wanjiku",
    actorEmail: "grace@solvahr.app",
    action: "recruitment.offer.approve",
    entityType: "job_offer",
    entityId: "offer-001",
    module: "recruitment",
    riskLevel: "high",
    summary: "Approved offer for Faith Wambui at KES 170,000.",
    createdAt: "2026-04-17T09:26:00.000Z",
    ipAddress: "102.68.14.22"
  },
  {
    id: "audit-005",
    actorName: "Mercy Akinyi",
    actorEmail: "mercy@solvahr.app",
    action: "welfare.case.update",
    entityType: "welfare_case",
    entityId: "wel-001",
    module: "relations",
    riskLevel: "high",
    summary: "Updated medical support case with transport assistance follow-up.",
    createdAt: "2026-04-17T10:14:00.000Z",
    ipAddress: "102.68.14.41"
  },
  {
    id: "audit-006",
    actorName: "System Export",
    actorEmail: "noreply@solvahr.app",
    action: "payroll.report.export",
    entityType: "report_export",
    entityId: "payroll-register-april-2026",
    module: "reports",
    riskLevel: "low",
    summary: "Generated Payroll Register CSV for April 2026.",
    createdAt: "2026-04-17T10:45:00.000Z",
    ipAddress: "system"
  }
];

export const demoAttendanceSummary = {
  trackedEmployees: 214,
  presentToday: 198,
  absentToday: 11,
  lateToday: 7,
  overtimeHours: 46.5,
  openExceptions: 9
};

export const demoTimesheets = [
  {
    id: "time-001",
    employeeName: "Brian Mwangi",
    employeeNumber: "E-002",
    project: "Mombasa Plant Shift A",
    costCenter: "OPS-014",
    weekEnding: "2026-04-19",
    hoursWorked: 46,
    overtimeHours: 6,
    status: "submitted"
  },
  {
    id: "time-002",
    employeeName: "Amina Otieno",
    employeeNumber: "E-001",
    project: "Payroll Outsourcing Delivery",
    costCenter: "HR-001",
    weekEnding: "2026-04-19",
    hoursWorked: 42,
    overtimeHours: 2,
    status: "approved"
  },
  {
    id: "time-003",
    employeeName: "Faith Wambui",
    employeeNumber: "E-004",
    project: "Recruitment SLA Rollout",
    costCenter: "HR-001",
    weekEnding: "2026-04-19",
    hoursWorked: 39,
    overtimeHours: 0,
    status: "draft"
  }
];

export const demoOvertimeRequests = [
  {
    id: "ot-001",
    employeeName: "Brian Mwangi",
    employeeNumber: "E-002",
    shiftDate: "2026-04-16",
    hours: 3,
    reason: "Machine restart and production recovery",
    approver: "Peter Odhiambo",
    status: "submitted"
  },
  {
    id: "ot-002",
    employeeName: "Mary Njeri",
    employeeNumber: "E-017",
    shiftDate: "2026-04-15",
    hours: 2.5,
    reason: "Month-end stock reconciliation",
    approver: "Grace Wanjiku",
    status: "approved"
  },
  {
    id: "ot-003",
    employeeName: "Daniel Kiptoo",
    employeeNumber: "E-031",
    shiftDate: "2026-04-14",
    hours: 4,
    reason: "Coverage for absent shift supervisor",
    approver: "Peter Odhiambo",
    status: "submitted"
  }
];

export function buildDemoPayrollRun() {
  const rules = activeRulesForDate(kenyaStatutoryRules2026, "2026-04-30");
  const results = demoEmployees.map((employee) =>
    calculatePayroll({
      tenantId: demoTenant.id,
      country: "KE",
      period: "2026-04",
      cycle: "monthly",
      employee,
      rules,
      components: [
        {
          code: "BASIC",
          name: "Basic Salary",
          kind: "earning",
          amount: employee.basicSalary,
          taxTreatment: "taxable",
          recurring: true
        },
        {
          code: "COMMUTER",
          name: "Commuter Allowance",
          kind: "earning",
          amount: employee.employeeId === "emp-001" ? 10000 : 7000,
          taxTreatment: "taxable",
          recurring: true
        },
        {
          code: "WELFARE",
          name: "Staff Welfare",
          kind: "deduction",
          amount: 500
        }
      ]
    })
  );

  const totals = results.reduce(
    (accumulator, result) => ({
      grossPay: accumulator.grossPay + result.grossPay,
      deductions: accumulator.deductions + result.totalDeductions,
      employerCosts: accumulator.employerCosts + result.totalEmployerCosts,
      netPay: accumulator.netPay + result.netPay
    }),
    { grossPay: 0, deductions: 0, employerCosts: 0, netPay: 0 }
  );

  return {
    id: "run-2026-04-monthly-v1",
    period: "April 2026",
    cycle: "monthly",
    status: "ready_for_review",
    version: 1,
    employeeCount: results.length,
    totals,
    results
  };
}

function maskAccountNumber(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }

  const lastFour = value.slice(-4);
  return `****${lastFour}`;
}

export function buildDemoPayslips() {
  const run = buildDemoPayrollRun();

  return run.results.map((result, index) => {
    const employee = demoEmployees[index] ?? demoEmployees.find((item) => item.employeeId === result.employeeId) ?? demoEmployees[0];
    const generatedAt = new Date("2026-04-14T09:00:00.000Z").toISOString();

    return {
      payslipId: `payslip-${result.employeeId}`,
      runId: run.id,
      runEmployeeId: `run-employee-${result.employeeId}`,
      status: "draft",
      generatedAt,
      releasedAt: null,
      company: {
        name: demoTenant.name,
        country: demoTenant.country
      },
      period: {
        label: run.period,
        code: "2026-04",
        cycle: run.cycle,
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        payDate: "2026-04-30"
      },
      employee: {
        employeeId: result.employeeId,
        displayName: employee.displayName,
        legalName: employee.legalName,
        employeeNumber: employee.employeeNumber,
        payrollNumber: employee.payrollNumber,
        department: employee.department,
        branch: employee.branch,
        paymentMode: "bank",
        bankName: "Pending bank setup",
        accountNumber: maskAccountNumber(null)
      },
      earnings: result.earnings,
      deductions: result.deductions,
      employerCosts: result.employerCosts,
      totals: {
        grossPay: result.grossPay,
        taxablePay: result.taxablePay,
        totalDeductions: result.totalDeductions,
        totalEmployerCosts: result.totalEmployerCosts,
        netPay: result.netPay
      }
    };
  });
}

export const dashboardMetrics = {
  headcount: 248,
  openVacancies: 12,
  leavePending: 18,
  payrollCost: 18450000,
  variancePercent: 3.8,
  contractsExpiring: 7,
  missingDocuments: 31,
  activeCases: 5
};

export const phaseTwoMetrics = {
  requisitionsPending: demoRequisitions.filter((item) => item.status === "submitted").length,
  openVacancies: demoVacancies.filter((item) => item.status === "open").length,
  candidatesInPipeline: demoCandidates.length,
  offersPendingApproval: demoOffers.filter((item) => item.status === "pending_approval").length,
  onboardingOpenTasks: demoOnboardingTasks.filter((item) => item.status !== "completed").length,
  probationReviewsDue: demoProbationReviews.length
};

export const demoCatalogues = {
  rolePermissionMatrix,
  statutoryRules: kenyaStatutoryRules2026,
  reportTemplates: defaultReportTemplates,
  workflowDefinitions: phaseTwoWorkflowDefinitions
};
