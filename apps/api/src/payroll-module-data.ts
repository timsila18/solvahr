import { buildDemoPayslips, buildDemoPayrollRun, demoAuditLogs } from "./demo-data.js";

function moneyRange(min: number, max: number) {
  return `KES ${min.toLocaleString("en-KE")} - ${max.toLocaleString("en-KE")}`;
}

export function buildPayrollModulePayload() {
  const run = buildDemoPayrollRun();
  const payslips = buildDemoPayslips();

  const periods = [
    { id: "per-2026-04-full", month: "April 2026", payrollType: "Full Month", status: "Pending Approval", payDate: "2026-04-30", employeeCount: 248, grossPay: 18450000 },
    { id: "per-2026-04-half-1", month: "April 2026", payrollType: "Half Month", status: "Approved", payDate: "2026-04-15", employeeCount: 248, grossPay: 8120000 },
    { id: "per-2026-03-full", month: "March 2026", payrollType: "Full Month", status: "Closed", payDate: "2026-03-31", employeeCount: 244, grossPay: 17880000 },
    { id: "per-2026-02-bonus", month: "February 2026", payrollType: "Bonus Payroll", status: "Closed", payDate: "2026-02-28", employeeCount: 57, grossPay: 2960000 },
    { id: "per-2026-01-offcycle", month: "January 2026", payrollType: "Off-Cycle", status: "Closed", payDate: "2026-01-24", employeeCount: 12, grossPay: 620000 }
  ];

  const employeePayrollData = [
    {
      id: "emp-pay-001",
      employeeNumber: "E-001",
      fullName: "Amina Otieno",
      department: "People Operations",
      designation: "HR Manager",
      employmentType: "Permanent",
      payrollGroup: "Monthly HQ",
      bankName: "KCB Bank Kenya",
      bankBranch: "Westlands",
      bankAccountNumber: "1148592001",
      kraPin: "A001458920P",
      shifNumber: "SHA-001-4589",
      nssfNumber: "NSSF-001-4589",
      housingLevyEligibility: "Eligible",
      pensionScheme: "Umbrella Pension",
      unionMembership: "No",
      saccoMembership: "Solva Staff Sacco",
      loanBalances: "Car Loan KES 240,000",
      salaryStructure: "Basic + House + Commuter",
      costCenter: "HR-001",
      payrollStatus: "Active",
      effectiveDateHistory: "2026-01-01, 2025-07-01",
      lastUpdatedBy: "Grace Wanjiku"
    },
    {
      id: "emp-pay-002",
      employeeNumber: "E-002",
      fullName: "Brian Mwangi",
      department: "Manufacturing",
      designation: "Shift Supervisor",
      employmentType: "Permanent",
      payrollGroup: "Monthly Plant",
      bankName: "Equity Bank",
      bankBranch: "Mombasa",
      bankAccountNumber: "0045128012",
      kraPin: "A009845120J",
      shifNumber: "SHA-002-8451",
      nssfNumber: "NSSF-002-8451",
      housingLevyEligibility: "Eligible",
      pensionScheme: "Umbrella Pension",
      unionMembership: "Yes",
      saccoMembership: "Coast Workers Sacco",
      loanBalances: "Salary Advance KES 18,000",
      salaryStructure: "Basic + Shift + Overtime",
      costCenter: "OPS-014",
      payrollStatus: "Active",
      effectiveDateHistory: "2026-02-01",
      lastUpdatedBy: "Peter Odhiambo"
    },
    {
      id: "emp-pay-003",
      employeeNumber: "E-017",
      fullName: "Mary Njeri",
      department: "Finance",
      designation: "Finance Officer",
      employmentType: "Permanent",
      payrollGroup: "Monthly HQ",
      bankName: "NCBA",
      bankBranch: "Upper Hill",
      bankAccountNumber: "2201894300",
      kraPin: "A001774301C",
      shifNumber: "SHA-017-7430",
      nssfNumber: "NSSF-017-7430",
      housingLevyEligibility: "Eligible",
      pensionScheme: "Finance Provident Fund",
      unionMembership: "No",
      saccoMembership: "No",
      loanBalances: "None",
      salaryStructure: "Basic + House + Airtime",
      costCenter: "FIN-002",
      payrollStatus: "Active",
      effectiveDateHistory: "2025-12-01, 2025-03-01",
      lastUpdatedBy: "Mercy Akinyi"
    },
    {
      id: "emp-pay-004",
      employeeNumber: "E-031",
      fullName: "Daniel Kiptoo",
      department: "Customer Success",
      designation: "Implementation Analyst",
      employmentType: "Contract",
      payrollGroup: "Monthly Outsourcing",
      bankName: "Co-operative Bank",
      bankBranch: "Nakuru",
      bankAccountNumber: "3321407801",
      kraPin: "A003321407M",
      shifNumber: "SHA-031-2140",
      nssfNumber: "NSSF-031-2140",
      housingLevyEligibility: "Eligible",
      pensionScheme: "No",
      unionMembership: "No",
      saccoMembership: "No",
      loanBalances: "Laptop Recovery KES 12,500",
      salaryStructure: "Basic + Responsibility",
      costCenter: "CS-005",
      payrollStatus: "Active",
      effectiveDateHistory: "2026-03-01",
      lastUpdatedBy: "Amina Otieno"
    }
  ];

  const earnings = [
    { id: "earn-001", code: "BASIC", name: "Basic Salary", taxable: "Taxable", pensionable: "Pensionable", calculation: "Fixed Amount", recurrence: "Recurring", effectiveDate: "2024-01-01", expiryDate: "Open", applicability: "All Departments" },
    { id: "earn-002", code: "HOUSE", name: "House Allowance", taxable: "Taxable", pensionable: "Non-Pensionable", calculation: "Fixed Amount", recurrence: "Recurring", effectiveDate: "2024-01-01", expiryDate: "Open", applicability: "HQ Departments" },
    { id: "earn-003", code: "COMM", name: "Commuter Allowance", taxable: "Taxable", pensionable: "Non-Pensionable", calculation: "Fixed Amount", recurrence: "Recurring", effectiveDate: "2024-06-01", expiryDate: "Open", applicability: "All Departments" },
    { id: "earn-004", code: "OT", name: "Overtime", taxable: "Taxable", pensionable: "Non-Pensionable", calculation: "Formula Based", recurrence: "One-Time", effectiveDate: "2025-01-01", expiryDate: "Open", applicability: "Manufacturing" },
    { id: "earn-005", code: "ACT", name: "Acting Allowance", taxable: "Taxable", pensionable: "Non-Pensionable", calculation: "Formula Based", recurrence: "One-Time", effectiveDate: "2025-04-01", expiryDate: "Open", applicability: "People Operations" },
    { id: "earn-006", code: "BON", name: "Bonus", taxable: "Taxable", pensionable: "Non-Pensionable", calculation: "Fixed Amount", recurrence: "One-Time", effectiveDate: "2025-12-01", expiryDate: "2026-12-31", applicability: "Performance Program" }
  ];

  const deductions = [
    { id: "ded-001", code: "PAYE", type: "Statutory", employeeContribution: "Kenya Tax Bands", employerContribution: "N/A", formulaLogic: "Band + Relief", cap: "Per statutory table", startDate: "2024-01-01", endDate: "Open", statutory: "Yes", priority: 1 },
    { id: "ded-002", code: "SHIF", type: "Statutory", employeeContribution: "2.75% of gross pay", employerContribution: "0%", formulaLogic: "Percentage", cap: "Minimum KES 300", startDate: "2024-10-01", endDate: "Open", statutory: "Yes", priority: 2 },
    { id: "ded-003", code: "AHL", type: "Statutory", employeeContribution: "1.5%", employerContribution: "1.5%", formulaLogic: "Percentage", cap: "No cap", startDate: "2024-03-01", endDate: "Open", statutory: "Yes", priority: 3 },
    { id: "ded-004", code: "NSSF", type: "Statutory", employeeContribution: "KES 1,080", employerContribution: "KES 1,080", formulaLogic: "Tiered", cap: "KES 1,080", startDate: "2024-02-01", endDate: "Open", statutory: "Yes", priority: 4 },
    { id: "ded-005", code: "PENS", type: "Pension", employeeContribution: "5%", employerContribution: "5%", formulaLogic: "Percentage", cap: "Scheme Rules", startDate: "2024-01-01", endDate: "Open", statutory: "No", priority: 5 },
    { id: "ded-006", code: "LOAN", type: "Loan", employeeContribution: "Variable", employerContribution: "0%", formulaLogic: "Schedule Based", cap: "Outstanding Balance", startDate: "2025-01-01", endDate: "Open", statutory: "No", priority: 6 }
  ];

  const variableInputs = [
    { id: "var-001", inputType: "Overtime", employeeNumber: "E-002", employeeName: "Brian Mwangi", period: "April 2026", amount: 14500, source: "Timesheet Import", status: "Pending Approval", validation: "Valid", batch: "OT-APR-01" },
    { id: "var-002", inputType: "Arrears", employeeNumber: "E-031", employeeName: "Daniel Kiptoo", period: "April 2026", amount: 18000, source: "Manual Adjustment", status: "Approved", validation: "Valid", batch: "ARR-APR-01" },
    { id: "var-003", inputType: "Bonus", employeeNumber: "E-017", employeeName: "Mary Njeri", period: "April 2026", amount: 25000, source: "Performance Bonus", status: "Pending Approval", validation: "Missing Approval Note", batch: "BON-APR-02" },
    { id: "var-004", inputType: "Loan Adjustment", employeeNumber: "E-001", employeeName: "Amina Otieno", period: "April 2026", amount: -8000, source: "Finance Memo", status: "Draft", validation: "Valid", batch: "LN-APR-01" }
  ];

  const processingChecks = [
    { label: "Missing payroll data", count: 3, severity: "warning", detail: "Three employees missing updated bank branch codes." },
    { label: "Missing statutory numbers", count: 2, severity: "high", detail: "Two employees missing SHIF numbers for April filing." },
    { label: "Negative net pay", count: 1, severity: "high", detail: "One employee exceeded net pay because of loan recovery." },
    { label: "Duplicate employees", count: 0, severity: "clear", detail: "No duplicate payroll profiles found." },
    { label: "Exited employees", count: 1, severity: "warning", detail: "One employee remains in draft run after exit processing." }
  ];

  const processingPreview = [
    { id: "proc-001", employee: "Amina Otieno", grossPay: 152000, deductions: 41380, netPay: 110620, status: "Ready" },
    { id: "proc-002", employee: "Brian Mwangi", grossPay: 107500, deductions: 24730, netPay: 82770, status: "Ready" },
    { id: "proc-003", employee: "Mary Njeri", grossPay: 134000, deductions: 36490, netPay: 97510, status: "Validation Warning" },
    { id: "proc-004", employee: "Daniel Kiptoo", grossPay: 96500, deductions: 52200, netPay: 44300, status: "Review Needed" }
  ];

  const reviewRegister = [
    { id: "rev-001", employee: "Amina Otieno", previousGross: 148000, currentGross: 152000, previousNet: 108200, currentNet: 110620, variance: "+2.2%", note: "House allowance adjustment" },
    { id: "rev-002", employee: "Brian Mwangi", previousGross: 92500, currentGross: 107500, previousNet: 73580, currentNet: 82770, variance: "+16.2%", note: "Overtime spike" },
    { id: "rev-003", employee: "Mary Njeri", previousGross: 128000, currentGross: 134000, previousNet: 95810, currentNet: 97510, variance: "+1.8%", note: "Airtime allowance revision" },
    { id: "rev-004", employee: "Daniel Kiptoo", previousGross: 96500, currentGross: 96500, previousNet: 56400, currentNet: 44300, variance: "-21.5%", note: "Loan recovery" }
  ];

  const netToBank = [
    { id: "bank-001", bank: "KCB Bank Kenya", bankCode: "01", branchCode: "110", accountNumber: "1148592001", employee: "Amina Otieno", payrollMonth: "April 2026", netPay: 110620, validation: "Valid" },
    { id: "bank-002", bank: "Equity Bank", bankCode: "68", branchCode: "006", accountNumber: "0045128012", employee: "Brian Mwangi", payrollMonth: "April 2026", netPay: 82770, validation: "Valid" },
    { id: "bank-003", bank: "NCBA", bankCode: "07", branchCode: "201", accountNumber: "2201894300", employee: "Mary Njeri", payrollMonth: "April 2026", netPay: 97510, validation: "Valid" },
    { id: "bank-004", bank: "Co-operative Bank", bankCode: "11", branchCode: "015", accountNumber: "", employee: "Daniel Kiptoo", payrollMonth: "April 2026", netPay: 44300, validation: "Missing Bank Details" }
  ];

  const statutoryRows = [
    { id: "stat-001", report: "PAYE", month: "April 2026", employees: 248, amount: 4210000, filingStatus: "Ready", dueDate: "2026-05-09" },
    { id: "stat-002", report: "SHIF", month: "April 2026", employees: 248, amount: 507375, filingStatus: "Ready", dueDate: "2026-05-09" },
    { id: "stat-003", report: "Housing Levy", month: "April 2026", employees: 248, amount: 276750, filingStatus: "Ready", dueDate: "2026-05-09" },
    { id: "stat-004", report: "NSSF", month: "April 2026", employees: 248, amount: 535680, filingStatus: "Ready", dueDate: "2026-05-15" },
    { id: "stat-005", report: "Pension", month: "April 2026", employees: 94, amount: 690000, filingStatus: "Draft", dueDate: "2026-05-10" }
  ];

  const reportCatalogue = [
    { id: "rep-001", report: "Payroll Register", category: "Core Payroll", lastRun: "2026-04-20 09:15", format: "Excel, CSV, PDF", owner: "Payroll Team" },
    { id: "rep-002", report: "Wage Bill Summary", category: "Management", lastRun: "2026-04-20 09:18", format: "Excel, PDF", owner: "Finance" },
    { id: "rep-003", report: "Department Payroll Summary", category: "Management", lastRun: "2026-04-20 09:21", format: "Excel, CSV", owner: "HR" },
    { id: "rep-004", report: "Employer Cost Summary", category: "Costing", lastRun: "2026-04-20 09:24", format: "Excel, PDF", owner: "Finance" },
    { id: "rep-005", report: "Third-Party Deductions", category: "Deductions", lastRun: "2026-04-20 09:30", format: "Excel, CSV", owner: "Payroll" },
    { id: "rep-006", report: "Custom Report Builder", category: "Builder", lastRun: "2026-04-20 09:40", format: "Excel, CSV, PDF", owner: "Company Admin" }
  ];

  const auditTrail = [
    ...demoAuditLogs.filter((item) => item.module === "payroll" || item.action.startsWith("payroll.")),
    {
      id: "audit-pay-007",
      actorName: "Grace Wanjiku",
      actorEmail: "grace@solvahr.app",
      action: "payroll.bank_details.update",
      entityType: "employee",
      entityId: "emp-031",
      module: "payroll",
      riskLevel: "high",
      summary: "Updated Daniel Kiptoo bank details after failed bank validation.",
      createdAt: "2026-04-20T08:22:00.000Z",
      ipAddress: "102.68.14.22"
    },
    {
      id: "audit-pay-008",
      actorName: "Peter Odhiambo",
      actorEmail: "peter@solvahr.app",
      action: "payroll.overtime.add",
      entityType: "variable_input",
      entityId: "var-001",
      module: "payroll",
      riskLevel: "medium",
      summary: "Uploaded overtime batch OT-APR-01 for manufacturing staff.",
      createdAt: "2026-04-20T08:41:00.000Z",
      ipAddress: "102.68.14.15"
    }
  ];

  return {
    overview: {
      month: "April 2026",
      status: "Pending Approval",
      activeEmployees: 248,
      grossPay: 18450000,
      netPay: 13944000,
      totalDeductions: 4506000,
      employerCost: 19872000,
      shifTotal: 507375,
      housingLevyTotal: 276750,
      nssfTotal: 535680,
      payeTotal: 4210000,
      pendingApprovals: 6,
      failedValidations: 7,
      recentRuns: periods,
      quickActions: [
        "Open Payroll Period",
        "Upload Variable Inputs",
        "Process Payroll",
        "Generate Payslips",
        "Export Net-to-Bank",
        "Export Statutory Reports"
      ],
      charts: {
        wageBillTrend: [
          { label: "Nov", value: 16500000 },
          { label: "Dec", value: 17100000 },
          { label: "Jan", value: 17480000 },
          { label: "Feb", value: 17620000 },
          { label: "Mar", value: 17880000 },
          { label: "Apr", value: 18450000 }
        ],
        employerCostBreakdown: [
          { label: "Gross Pay", value: 18450000, accent: "#0f4fd9" },
          { label: "NSSF Employer", value: 267840, accent: "#14b8a6" },
          { label: "Housing Levy Employer", value: 276750, accent: "#111827" },
          { label: "Pension Employer", value: 877410, accent: "#60a5fa" }
        ],
        payrollCostByDepartment: [
          { label: "Manufacturing", value: 6840000 },
          { label: "Finance", value: 3210000 },
          { label: "People Ops", value: 2810000 },
          { label: "Customer Success", value: 2360000 },
          { label: "Sales", value: 3230000 }
        ],
        deductionDistribution: [
          { label: "PAYE", value: 4210000, accent: "#0f4fd9" },
          { label: "SHIF", value: 507375, accent: "#14b8a6" },
          { label: "Housing Levy", value: 276750, accent: "#111827" },
          { label: "NSSF", value: 267840, accent: "#60a5fa" }
        ]
      }
    },
    periods,
    employeePayrollData,
    earnings,
    deductions,
    variableInputs,
    processing: {
      tracker: [
        { step: "Open Payroll Period", status: "done" },
        { step: "Load Snapshot", status: "done" },
        { step: "Validate Inputs", status: "current" },
        { step: "Run Calculations", status: "pending" },
        { step: "Review & Approve", status: "pending" },
        { step: "Release Payslips", status: "pending" }
      ],
      checks: processingChecks,
      failedTransactions: [
        { id: "fail-001", employee: "Daniel Kiptoo", issue: "Missing account number", action: "Update bank details" },
        { id: "fail-002", employee: "Mary Njeri", issue: "Unapproved bonus input", action: "Route for approval" }
      ],
      preview: processingPreview
    },
    review: {
      preparedBy: "Amina Otieno",
      reviewedBy: "Grace Wanjiku",
      approvedBy: "Pending Company Approval",
      approvalComments: "Variance within tolerance except overtime and loan recovery exceptions.",
      approvalDate: "Pending",
      summary: {
        grossVariance: "+3.2%",
        netVariance: "+2.7%",
        newEmployees: 4,
        exits: 1,
        salaryChanges: 6,
        overtimeSpikes: 3,
        deductionSpikes: 2,
        zeroNetEmployees: 0,
        negativeNetEmployees: 1
      },
      register: reviewRegister
    },
    payslips: {
      branding: "Solva HR",
      passwordRule: "Employee number + payroll month",
      items: payslips.map((item) => ({
        id: item.payslipId,
        employeeName: item.employee.displayName,
        employeeNumber: item.employee.employeeNumber,
        payrollMonth: item.period.label,
        email: `${item.employee.displayName.toLowerCase().replaceAll(" ", ".")}@solvahr.app`,
        netPay: item.totals.netPay,
        status: item.releasedAt ? "Released" : "Draft"
      }))
    },
    netToBank,
    statutoryReports: {
      summary: [
        { label: "PAYE", value: 4210000 },
        { label: "SHIF", value: 507375 },
        { label: "Housing Levy", value: 276750 },
        { label: "NSSF", value: 535680 }
      ],
      rows: statutoryRows
    },
    payrollReports: {
      catalogue: reportCatalogue,
      builderFilters: {
        months: ["January 2026", "February 2026", "March 2026", "April 2026"],
        departments: ["People Operations", "Finance", "Manufacturing", "Sales", "Customer Success"],
        branches: ["Nairobi HQ", "Mombasa Plant", "Kisumu Sales"],
        payrollGroups: ["Monthly HQ", "Monthly Plant", "Monthly Outsourcing"]
      }
    },
    auditTrail: auditTrail.map((item) => ({
      id: item.id,
      actor: item.actorName,
      email: item.actorEmail,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      summary: item.summary,
      beforeAfter: item.action.includes("update") ? "Before and after captured" : "After value logged",
      timestamp: item.createdAt,
      ipAddress: item.ipAddress
    })),
    settings: {
      payrollFrequency: "Monthly with half-month support",
      cutOffDate: "Every 24th",
      approvalWorkflowLevels: "Payroll Admin -> Finance -> Company Admin",
      companyBankDetails: "Solva HR Collection Account / KCB / 1100012244",
      payslipBranding: "Solva HR blue-and-white template",
      statutorySettings: "Kenya PAYE, SHIF, NSSF, Housing Levy active",
      taxBands: "2026 Kenya tax bands configured",
      pensionSettings: "5% employee / 5% employer default",
      defaultCurrency: "KES",
      defaultPayrollFormulas: "Proration, half-month split, unpaid leave deduction",
      emailSettings: "SMTP enabled for payslip dispatch",
      notificationSettings: "Approval reminders at 24h and 48h"
    },
    liveRun: {
      id: run.id,
      period: run.period,
      status: run.status,
      employeeCount: run.employeeCount,
      grossPay: run.totals.grossPay,
      netPay: run.totals.netPay
    },
    helperData: {
      filters: {
        statuses: ["Open", "Processing", "Pending Approval", "Approved", "Closed", "Draft"],
        payrollTypes: ["Full Month", "Half Month", "Off-Cycle", "Bonus Payroll"],
        departments: ["People Operations", "Finance", "Manufacturing", "Sales", "Customer Success"],
        employeeTypes: ["Permanent", "Contract", "Probation"],
        months: ["January 2026", "February 2026", "March 2026", "April 2026"]
      },
      quickStats: [
        { label: "Validation Success Rate", value: "97.2%" },
        { label: "Average Net Pay", value: "KES 56,226" },
        { label: "Payroll Employees", value: "248" },
        { label: "Bank File Completeness", value: "99.1%" }
      ]
    }
  };
}

export type PayrollModulePayload = ReturnType<typeof buildPayrollModulePayload>;
