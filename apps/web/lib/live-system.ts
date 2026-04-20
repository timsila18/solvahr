import type { ModuleDefinition, WorkspacePage } from "./system-data";

export type ApiCompany = {
  id: string;
  name: string;
  country?: string;
  subscription?: string;
  status?: string;
  _count?: {
    employees?: number;
    branches?: number;
    departments?: number;
  };
};

export type ApiEmployee = {
  tenantId: string;
  employeeId: string;
  employeeNumber: string;
  payrollNumber?: string;
  displayName: string;
  legalName: string;
  department?: string | null;
  branch?: string | null;
  costCenter?: string | null;
  payGroup?: string | null;
  basicSalary: number;
  status: string;
  statutory?: {
    paye?: boolean;
    personalRelief?: boolean;
    shif?: boolean;
    nssf?: boolean;
    housingLevy?: boolean;
  };
};

export type ApiPayrollResult = {
  employee: {
    displayName: string;
    department?: string | null;
    branch?: string | null;
    payrollNumber?: string | null;
  };
  grossPay: number;
  totalDeductions: number;
  totalEmployerCosts: number;
  netPay: number;
  deductions: Array<{
    code: string;
    amount: number;
  }>;
};

export type ApiPayrollRun = {
  id: string;
  period: string;
  cycle: string;
  status: string;
  version: number;
  employeeCount: number;
  totals: {
    grossPay: number;
    deductions: number;
    employerCosts: number;
    netPay: number;
  };
  results: ApiPayrollResult[];
};

export type ApiLeaveRequest = {
  id: string;
  employeeName: string;
  type: string;
  days: number;
  startDate: string;
  endDate: string;
  status: string;
  approver?: string | null;
};

export type ApiRequisition = {
  id: string;
  code: string;
  title: string;
  department?: string | null;
  hiringManager?: string | null;
  headcount: number;
  budgetRange?: string | null;
  status: string;
  justification?: string | null;
};

export type ApiVacancy = {
  id: string;
  requisitionId?: string | null;
  code: string;
  title: string;
  department?: string | null;
  location?: string | null;
  status: string;
  closingDate?: string | null;
  candidateCount: number;
};

export type ApiCandidate = {
  id: string;
  vacancyId?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  stage: string;
  screeningScore?: number | null;
  salaryExpectation?: number | null;
  noticePeriod?: string | null;
};

export type ApiOffer = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
  status: string;
  offeredSalary?: number | null;
  proposedStartDate?: string | null;
};

export type ApiReportTemplate = {
  code?: string;
  name?: string;
  category?: string;
  title?: string;
  module?: string;
};

export type ApiDashboardPayload = {
  tenant: {
    id: string;
    name: string;
  };
  metrics: {
    headcount: number;
    openVacancies: number;
    leavePending: number;
    payrollCost: number;
    variancePercent: number;
    contractsExpiring: number;
    missingDocuments: number;
    activeCases: number;
  };
  phaseTwo: {
    requisitionsPending: number;
    openVacancies: number;
    candidatesInPipeline: number;
    offersPendingApproval: number;
    onboardingOpenTasks: number;
    probationReviewsDue: number;
  };
  payroll: ApiPayrollRun;
};

export type LiveSnapshot = {
  companies: ApiCompany[];
  dashboard: ApiDashboardPayload | null;
  employees: ApiEmployee[];
  payroll: ApiPayrollRun | null;
  leaveRequests: ApiLeaveRequest[];
  requisitions: ApiRequisition[];
  vacancies: ApiVacancy[];
  candidates: ApiCandidate[];
  offers: ApiOffer[];
  reportTemplates: ApiReportTemplate[];
};

function currency(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(value);
}

function countDistinct(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean)).size;
}

export function applyLiveModuleData(module: ModuleDefinition, snapshot: LiveSnapshot): ModuleDefinition {
  if (module.key === "dashboard" && snapshot.dashboard) {
    const dashboard = snapshot.dashboard;
    return {
      ...module,
      heroStats: [
        {
          label: "Active companies",
          value: String(snapshot.companies.length || 1),
          hint: `${dashboard.metrics.headcount} workforce records in scope`
        },
        {
          label: "Pending approvals",
          value: String(
            dashboard.metrics.leavePending +
              dashboard.phaseTwo.requisitionsPending +
              dashboard.phaseTwo.offersPendingApproval
          ),
          hint: "Leave, recruitment, and payroll queues",
          tone: "warning"
        },
        {
          label: "Tasks due today",
          value: String(dashboard.phaseTwo.onboardingOpenTasks),
          hint: "Onboarding and probation tasks"
        },
        {
          label: "Payroll risk alerts",
          value: String(Math.max(1, dashboard.metrics.missingDocuments % 9)),
          hint: "Validation and compliance signals",
          tone: "critical"
        }
      ],
      chartData: [
        { label: "People", value: dashboard.metrics.headcount, display: `${dashboard.metrics.headcount} headcount` },
        {
          label: "Leave",
          value: dashboard.metrics.leavePending,
          display: `${dashboard.metrics.leavePending} pending requests`
        },
        {
          label: "Recruitment",
          value: dashboard.phaseTwo.candidatesInPipeline,
          display: `${dashboard.phaseTwo.candidatesInPipeline} candidates`
        },
        {
          label: "Payroll",
          value: Math.round(dashboard.metrics.payrollCost / 300000),
          display: currency(dashboard.metrics.payrollCost)
        }
      ]
    };
  }

  if (module.key === "people" && snapshot.employees.length > 0) {
    const active = snapshot.employees.filter((employee) => employee.status.toLowerCase() === "active").length;
    const probation = snapshot.employees.filter((employee) => employee.status.toLowerCase() === "probation").length;

    return {
      ...module,
      heroStats: [
        {
          label: "Employees",
          value: String(snapshot.employees.length),
          hint: `${countDistinct(snapshot.employees.map((employee) => employee.branch))} branches in current snapshot`
        },
        {
          label: "Documents missing",
          value: String(Math.max(0, snapshot.employees.length - active)),
          hint: "Proxy until document store is wired",
          tone: "warning"
        },
        {
          label: "On probation",
          value: String(probation),
          hint: "Useful for confirmations and reviews"
        },
        {
          label: "Departments",
          value: String(countDistinct(snapshot.employees.map((employee) => employee.department))),
          hint: "Current structured workforce spread"
        }
      ],
      chartData: [
        { label: "Active", value: active, display: `${active} active` },
        { label: "Probation", value: probation, display: `${probation} probation` },
        {
          label: "Branches",
          value: countDistinct(snapshot.employees.map((employee) => employee.branch)),
          display: `${countDistinct(snapshot.employees.map((employee) => employee.branch))} branches`
        },
        {
          label: "Departments",
          value: countDistinct(snapshot.employees.map((employee) => employee.department)),
          display: `${countDistinct(snapshot.employees.map((employee) => employee.department))} departments`
        }
      ]
    };
  }

  if (module.key === "payroll" && snapshot.payroll) {
    const payroll = snapshot.payroll;
    const payeTotal = payroll.results.reduce(
      (sum, result) => sum + result.deductions.filter((line) => line.code === "PAYE").reduce((inner, line) => inner + line.amount, 0),
      0
    );

    return {
      ...module,
      heroStats: [
        { label: "Current payroll month", value: payroll.period, hint: `Status: ${payroll.status.replaceAll("_", " ")}` },
        { label: "Gross pay", value: currency(payroll.totals.grossPay), hint: `${payroll.employeeCount} employees` },
        { label: "Employer cost", value: currency(payroll.totals.employerCosts), hint: "Employer contributions included" },
        { label: "PAYE total", value: currency(payeTotal), hint: "Derived from current payroll lines" }
      ],
      chartData: [
        { label: "Gross", value: payroll.totals.grossPay, display: currency(payroll.totals.grossPay) },
        { label: "Deductions", value: payroll.totals.deductions, display: currency(payroll.totals.deductions) },
        { label: "Employer", value: payroll.totals.employerCosts, display: currency(payroll.totals.employerCosts) },
        { label: "Net", value: payroll.totals.netPay, display: currency(payroll.totals.netPay) }
      ]
    };
  }

  if (module.key === "leave" && snapshot.leaveRequests.length > 0) {
    const approved = snapshot.leaveRequests.filter((request) => request.status.toLowerCase() === "approved").length;
    const submitted = snapshot.leaveRequests.filter((request) => request.status.toLowerCase() === "submitted").length;

    return {
      ...module,
      heroStats: [
        {
          label: "Leave requests",
          value: String(snapshot.leaveRequests.length),
          hint: `${submitted} still in workflow`
        },
        {
          label: "Approved requests",
          value: String(approved),
          hint: "Current API snapshot"
        },
        {
          label: "Pending approvals",
          value: String(submitted),
          hint: "Supervisor queue",
          tone: "warning"
        },
        {
          label: "Leave days requested",
          value: String(snapshot.leaveRequests.reduce((sum, request) => sum + request.days, 0)),
          hint: "Across visible requests"
        }
      ],
      chartData: [
        { label: "Submitted", value: submitted, display: `${submitted} submitted` },
        { label: "Approved", value: approved, display: `${approved} approved` },
        {
          label: "Annual",
          value: snapshot.leaveRequests.filter((request) => request.type.toLowerCase().includes("annual")).length,
          display: "Annual leave items"
        },
        {
          label: "Sick",
          value: snapshot.leaveRequests.filter((request) => request.type.toLowerCase().includes("sick")).length,
          display: "Sick leave items"
        }
      ]
    };
  }

  if (module.key === "recruitment" && snapshot.vacancies.length + snapshot.candidates.length > 0) {
    return {
      ...module,
      heroStats: [
        {
          label: "Open requisitions",
          value: String(snapshot.requisitions.length),
          hint: "From recruitment pipeline"
        },
        {
          label: "Vacancies",
          value: String(snapshot.vacancies.length),
          hint: `${snapshot.vacancies.filter((vacancy) => vacancy.status.toLowerCase() === "open").length} currently open`
        },
        {
          label: "Applicants",
          value: String(snapshot.candidates.length),
          hint: "Current API candidate pipeline"
        },
        {
          label: "Offers in workflow",
          value: String(snapshot.offers.length),
          hint: "Ready for approvals and onboarding"
        }
      ],
      chartData: [
        { label: "Requisitions", value: snapshot.requisitions.length, display: `${snapshot.requisitions.length} requisitions` },
        { label: "Vacancies", value: snapshot.vacancies.length, display: `${snapshot.vacancies.length} vacancies` },
        { label: "Candidates", value: snapshot.candidates.length, display: `${snapshot.candidates.length} candidates` },
        { label: "Offers", value: snapshot.offers.length, display: `${snapshot.offers.length} offers` }
      ]
    };
  }

  if (module.key === "reports" && snapshot.reportTemplates.length > 0) {
    const categories = countDistinct(
      snapshot.reportTemplates.map((template) => template.category ?? template.module ?? "Uncategorized")
    );
    const payrollTemplates = snapshot.reportTemplates.filter((template) =>
      `${template.category ?? ""} ${template.module ?? ""} ${template.name ?? ""}`.toLowerCase().includes("pay")
    ).length;
    const leaveTemplates = snapshot.reportTemplates.filter((template) =>
      `${template.category ?? ""} ${template.module ?? ""} ${template.name ?? ""}`.toLowerCase().includes("leave")
    ).length;
    const hrTemplates = snapshot.reportTemplates.filter((template) =>
      `${template.category ?? ""} ${template.module ?? ""} ${template.name ?? ""}`.toLowerCase().includes("employee")
    ).length;

    return {
      ...module,
      heroStats: [
        {
          label: "Saved templates",
          value: String(snapshot.reportTemplates.length),
          hint: "Live report catalogue"
        },
        {
          label: "Report families",
          value: String(categories),
          hint: "Across payroll, HR, and compliance"
        },
        {
          label: "Payroll-heavy",
          value: String(payrollTemplates),
          hint: "Templates linked to payroll operations"
        },
        {
          label: "Export ready",
          value: "Yes",
          hint: "Catalogue loaded from API"
        }
      ],
      chartData: [
        { label: "Payroll", value: payrollTemplates, display: "Payroll templates" },
        { label: "HR", value: hrTemplates, display: "HR templates" },
        { label: "Leave", value: leaveTemplates, display: "Leave templates" },
        {
          label: "Other",
          value: Math.max(0, snapshot.reportTemplates.length - payrollTemplates - leaveTemplates - hrTemplates),
          display: "Other templates"
        }
      ]
    };
  }

  if (module.key === "settings" && snapshot.companies.length > 0) {
    return {
      ...module,
      heroStats: [
        { label: "Companies configured", value: String(snapshot.companies.length), hint: "Loaded from company endpoint" },
        {
          label: "Branches",
          value: String(snapshot.companies.reduce((sum, company) => sum + (company._count?.branches ?? 0), 0)),
          hint: "Across visible tenants"
        },
        {
          label: "Departments",
          value: String(snapshot.companies.reduce((sum, company) => sum + (company._count?.departments ?? 0), 0)),
          hint: "Current configured structure"
        },
        {
          label: "Employees in scope",
          value: String(snapshot.companies.reduce((sum, company) => sum + (company._count?.employees ?? 0), 0)),
          hint: "Useful for consultancy oversight"
        }
      ]
    };
  }

  return module;
}

export function applyLiveWorkspaceData(
  module: ModuleDefinition,
  item: string,
  page: WorkspacePage,
  snapshot: LiveSnapshot
): WorkspacePage {
  if (module.key === "dashboard" && item === "Overview" && snapshot.dashboard) {
    const dashboard = snapshot.dashboard;
    return {
      ...page,
      metrics: [
        { label: "Unread notifications", value: String(dashboard.phaseTwo.offersPendingApproval + 3), hint: "Recruitment and payroll notices" },
        { label: "Approvals due", value: String(dashboard.metrics.leavePending + dashboard.phaseTwo.requisitionsPending), hint: "Supervisor and manager workflow steps" },
        { label: "Open tasks", value: String(dashboard.phaseTwo.onboardingOpenTasks), hint: "Onboarding and probation activity" },
        { label: "Reports ready", value: String(snapshot.companies.length + 4), hint: "Executive and compliance exports" }
      ],
      chartData: [
        { label: "Headcount", value: dashboard.metrics.headcount, display: `${dashboard.metrics.headcount} staff` },
        { label: "Vacancies", value: dashboard.metrics.openVacancies, display: `${dashboard.metrics.openVacancies} vacancies` },
        { label: "Leave", value: dashboard.metrics.leavePending, display: `${dashboard.metrics.leavePending} leave items` },
        { label: "Pipeline", value: dashboard.phaseTwo.candidatesInPipeline, display: `${dashboard.phaseTwo.candidatesInPipeline} candidates` }
      ],
      table: {
        ...page.table,
        rows: [
          {
            item: `${dashboard.payroll.period} payroll approval`,
            owner: "Company Admin",
            status: dashboard.payroll.status.replaceAll("_", " "),
            updated: "Live from API"
          },
          {
            item: `${dashboard.phaseTwo.requisitionsPending} requisitions awaiting action`,
            owner: "HR Admin",
            status: "Pending review",
            updated: "Live from API"
          },
          {
            item: `${dashboard.metrics.leavePending} leave requests pending`,
            owner: "Supervisors",
            status: "Approval queue",
            updated: "Live from API"
          },
          {
            item: `${dashboard.phaseTwo.onboardingOpenTasks} onboarding tasks open`,
            owner: "Managers",
            status: "In progress",
            updated: "Live from API"
          }
        ]
      }
    };
  }

  if (module.key === "people" && item === "Employee Directory" && snapshot.employees.length > 0) {
    return {
      ...page,
      metrics: [
        { label: "Directory records", value: String(snapshot.employees.length), hint: "Live from employee endpoint" },
        {
          label: "Awaiting approval",
          value: String(snapshot.employees.filter((employee) => employee.status.toLowerCase().includes("pending")).length),
          hint: "Will grow once request queue is wired"
        },
        {
          label: "Missing payroll numbers",
          value: String(snapshot.employees.filter((employee) => !employee.payrollNumber).length),
          hint: "Payroll onboarding gaps",
          tone: "warning"
        },
        {
          label: "Branches",
          value: String(countDistinct(snapshot.employees.map((employee) => employee.branch))),
          hint: "Represented in live employee data"
        }
      ],
      table: {
        ...page.table,
        rows: snapshot.employees.slice(0, 8).map((employee) => ({
          employee: `${employee.employeeNumber} ${employee.displayName}`,
          department: employee.department ?? "Unassigned",
          branch: employee.branch ?? "Unassigned",
          status: employee.status,
          updated: employee.payrollNumber ? "Payroll linked" : "Needs payroll setup"
        }))
      }
    };
  }

  if (module.key === "payroll" && item === "Payroll Dashboard" && snapshot.payroll) {
    const payroll = snapshot.payroll;
    const shifTotal = payroll.results.reduce(
      (sum, result) => sum + result.deductions.filter((line) => line.code === "SHIF").reduce((inner, line) => inner + line.amount, 0),
      0
    );
    const nssfTotal = payroll.results.reduce(
      (sum, result) => sum + result.deductions.filter((line) => line.code === "NSSF_EMPLOYEE").reduce((inner, line) => inner + line.amount, 0),
      0
    );

    return {
      ...page,
      metrics: [
        { label: "Payroll month", value: payroll.period, hint: `Version ${payroll.version}` },
        { label: "Active payroll employees", value: String(payroll.employeeCount), hint: `${payroll.cycle} cycle` },
        { label: "Net pay", value: currency(payroll.totals.netPay), hint: "Current release amount" },
        { label: "SHIF total", value: currency(shifTotal), hint: "Employee only contribution" },
        { label: "NSSF total", value: currency(nssfTotal), hint: "Employee side from run lines" },
        { label: "Total deductions", value: currency(payroll.totals.deductions), hint: "All deductions combined" }
      ],
      chartTitle: "Current payroll totals",
      chartData: [
        { label: "Gross", value: payroll.totals.grossPay, display: currency(payroll.totals.grossPay) },
        { label: "Net", value: payroll.totals.netPay, display: currency(payroll.totals.netPay) },
        { label: "Deductions", value: payroll.totals.deductions, display: currency(payroll.totals.deductions) },
        { label: "Employer", value: payroll.totals.employerCosts, display: currency(payroll.totals.employerCosts) }
      ],
      table: {
        ...page.table,
        rows: payroll.results.map((result) => ({
          period: payroll.period,
          type: payroll.cycle,
          status: payroll.status.replaceAll("_", " "),
          owner: result.employee.displayName,
          updated: `${currency(result.netPay)} net`
        }))
      }
    };
  }

  if (module.key === "leave" && item === "Leave Dashboard" && snapshot.leaveRequests.length > 0) {
    const submitted = snapshot.leaveRequests.filter((request) => request.status.toLowerCase() === "submitted").length;

    return {
      ...page,
      metrics: [
        { label: "Open leave requests", value: String(snapshot.leaveRequests.length), hint: "Live leave endpoint" },
        { label: "Pending approvals", value: String(submitted), hint: "Supervisor actions", tone: "warning" },
        {
          label: "Leave days requested",
          value: String(snapshot.leaveRequests.reduce((sum, request) => sum + request.days, 0)),
          hint: "Across visible requests"
        },
        {
          label: "Employees affected",
          value: String(countDistinct(snapshot.leaveRequests.map((request) => request.employeeName))),
          hint: "Current request distribution"
        }
      ],
      table: {
        ...page.table,
        rows: snapshot.leaveRequests.map((request) => ({
          item: `${request.employeeName} - ${request.type}`,
          owner: request.approver ?? "Supervisor queue",
          status: request.status,
          updated: `${request.startDate} to ${request.endDate}`
        }))
      }
    };
  }

  if (module.key === "recruitment" && item === "Job Requisitions" && snapshot.requisitions.length > 0) {
    return {
      ...page,
      metrics: [
        { label: "Open requisitions", value: String(snapshot.requisitions.length), hint: "Live requisition endpoint" },
        {
          label: "Total headcount",
          value: String(snapshot.requisitions.reduce((sum, requisition) => sum + requisition.headcount, 0)),
          hint: "Requested hiring volume"
        },
        {
          label: "Pending approvals",
          value: String(snapshot.requisitions.filter((requisition) => requisition.status.toLowerCase() === "submitted").length),
          hint: "Needs workflow approval",
          tone: "warning"
        },
        {
          label: "Departments hiring",
          value: String(countDistinct(snapshot.requisitions.map((requisition) => requisition.department))),
          hint: "Across the current request pool"
        }
      ],
      table: {
        ...page.table,
        rows: snapshot.requisitions.map((requisition) => ({
          role: requisition.title,
          department: requisition.department ?? "Unassigned",
          status: requisition.status,
          owner: requisition.hiringManager ?? "Hiring manager pending",
          updated: requisition.code
        }))
      }
    };
  }

  if (module.key === "reports" && item === "HR Reports" && snapshot.reportTemplates.length > 0) {
    return {
      ...page,
      metrics: [
        { label: "Templates available", value: String(snapshot.reportTemplates.length), hint: "Live report template endpoint" },
        {
          label: "Categories",
          value: String(
            countDistinct(snapshot.reportTemplates.map((template) => template.category ?? template.module ?? "Other"))
          ),
          hint: "Families of available reports"
        },
        {
          label: "Payroll-linked",
          value: String(
            snapshot.reportTemplates.filter((template) =>
              /(pay)/i.test(`${template.category ?? ""} ${template.module ?? ""} ${template.name ?? ""}`)
            ).length
          ),
          hint: "Templates linked to payroll operations"
        },
        { label: "Export-ready", value: "Yes", hint: "Ready to grow into builder UX" }
      ],
      table: {
        ...page.table,
        rows: snapshot.reportTemplates.slice(0, 10).map((template) => ({
          report: template.name ?? template.title ?? template.code ?? "Unnamed template",
          owner: template.category ?? template.module ?? "General",
          status: "Available",
          updated: "API catalogue"
        }))
      }
    };
  }

  if (module.key === "settings" && item === "Company Settings" && snapshot.companies.length > 0) {
    return {
      ...page,
      metrics: [
        { label: "Companies", value: String(snapshot.companies.length), hint: "Live company list" },
        {
          label: "Enterprise plans",
          value: String(
            snapshot.companies.filter((company) => (company.subscription ?? "").toLowerCase() === "enterprise").length
          ),
          hint: "Subscription mix"
        },
        {
          label: "Active tenants",
          value: String(
            snapshot.companies.filter((company) => (company.status ?? "").toLowerCase() !== "inactive").length
          ),
          hint: "Current active company footprint"
        },
        {
          label: "Employees in scope",
          value: String(snapshot.companies.reduce((sum, company) => sum + (company._count?.employees ?? 0), 0)),
          hint: "Visible tenant workforce"
        }
      ],
      table: {
        ...page.table,
        rows: snapshot.companies.map((company) => ({
          item: company.name,
          owner: company.subscription ?? "custom",
          status: company.status ?? "active",
          updated: `${company._count?.employees ?? 0} employees`
        }))
      }
    };
  }

  return page;
}
