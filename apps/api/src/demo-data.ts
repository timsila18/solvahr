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
