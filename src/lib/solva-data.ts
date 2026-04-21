export type ThemeMode = "light" | "dark";

export type Metric = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "positive" | "warning" | "critical";
};

export type ChartDatum = {
  label: string;
  value: number;
  display: string;
};

export type TableColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export type TableRow = Record<string, string>;

export type TableSpec = {
  title: string;
  description: string;
  columns: TableColumn[];
  rows: TableRow[];
};

export type PageSpec = {
  title: string;
  description: string;
  metrics: Metric[];
  quickActions: string[];
  filters: string[];
  highlights: string[];
  chartTitle: string;
  chartData: ChartDatum[];
  table: TableSpec;
};

export type ModuleSpec = {
  key: string;
  title: string;
  shortTitle: string;
  icon: string;
  summary: string;
  tagline: string;
  items: string[];
  heroStats: Metric[];
  quickActions: string[];
  highlights: string[];
  chartTitle: string;
  chartData: ChartDatum[];
};

export type ApprovalTask = {
  id: string;
  kind:
    | "employee_activation"
    | "payroll_approval"
    | "leave_request"
    | "requisition_approval"
    | "profile_update"
    | "training_request"
    | "asset_request";
  moduleKey: string;
  title: string;
  description: string;
  ownerRole: string;
  requestedBy: string;
  requestedByRole: string;
  status: "pending" | "approved" | "rejected";
  stage: string;
  due: string;
  updatedAt: string;
};

export type AuditEvent = {
  id: string;
  moduleKey: string;
  category: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  subject: string;
  outcome: string;
  timestamp: string;
};

export type EmployeeRecord = {
  id: string;
  employeeNumber: string;
  fullName: string;
  department: string;
  branch: string;
  employmentType: string;
  status: string;
};

export type PayrollPackage = {
  period: string;
  status: string;
  employeeCount: string;
  grossPay: string;
  netPay: string;
  paye: string;
  shif: string;
  nssf: string;
  housingLevy: string;
};

export type EmployeeProfile = EmployeeRecord & {
  phoneNumber: string;
  companyEmail: string;
  supervisor: string;
  costCenter: string;
  kraPin: string;
  shifNumber: string;
  nssfNumber: string;
  bankName: string;
  bankAccount: string;
  hireDate: string;
  profileSections: Array<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }>;
  documentSummary: Array<{
    name: string;
    category: string;
    status: string;
    expiry: string;
  }>;
  movementHistory: Array<{
    title: string;
    detail: string;
    date: string;
  }>;
};

export type PayrollVarianceItem = {
  label: string;
  current: string;
  previous: string;
  movement: string;
  tone: "default" | "positive" | "warning" | "critical";
};

export type PayrollValidationIssue = {
  id: string;
  title: string;
  detail: string;
  severity: "positive" | "warning" | "critical";
  owner: string;
  status: string;
};

export type PayrollApprovalStage = {
  id: string;
  label: string;
  owner: string;
  status: string;
  comment: string;
  date: string;
};

export type PayrollRunHistoryItem = {
  period: string;
  payrollType: string;
  status: string;
  grossPay: string;
  netPay: string;
  processedAt: string;
};

export type PayrollExportHistoryItem = {
  id: string;
  label: string;
  actor: string;
  status: string;
  generatedAt: string;
};

export type PayrollProcessData = {
  validations: PayrollValidationIssue[];
  approvals: PayrollApprovalStage[];
  history: PayrollRunHistoryItem[];
  exports: PayrollExportHistoryItem[];
};

export type PlatformSnapshot = {
  generatedAt: string;
  loginProfiles: typeof loginProfiles;
  modules: ModuleSpec[];
  featured: {
    title: string;
    summary: string;
    approvals: Array<{ item: string; owner: string; status: string; due: string }>;
    announcements: Array<{ title: string; audience: string; time: string }>;
  };
};

export const loginProfiles = [
  { role: "Super Admin", email: "superadmin@solvahr.app" },
  { role: "Operator", email: "operator@solvahr.app" },
  { role: "Supervisor", email: "supervisor@solvahr.app" },
  { role: "HR Admin", email: "hradmin@solvahr.app" },
  { role: "Payroll Admin", email: "payrolladmin@solvahr.app" },
  { role: "Manager", email: "manager@solvahr.app" },
  { role: "Finance Officer", email: "finance@solvahr.app" },
  { role: "Employee", email: "employee@solvahr.app" },
];

export const modules: ModuleSpec[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    shortTitle: "Home",
    icon: "DB",
    summary:
      "Executive command center for workforce health, approvals, compliance, payroll readiness, and consultancy alerts.",
    tagline: "Everything important in HR and payroll, visible before the day gets messy.",
    items: [
      "Overview",
      "Notifications",
      "Pending Approvals",
      "Tasks",
      "Announcements",
      "Reports Snapshot",
    ],
    heroStats: [
      { label: "Client companies", value: "18", hint: "Mix of SME, NGO, hospitality, and manufacturing" },
      { label: "Pending approvals", value: "42", hint: "Payroll, leave, onboarding, and requisitions", tone: "warning" },
      { label: "Payroll alerts", value: "6", hint: "Validation and compliance checks", tone: "critical" },
      { label: "Board reports due", value: "3", hint: "This week across consultancy clients" },
    ],
    quickActions: ["Open payroll period", "Review approvals", "Send announcement", "Export board pack"],
    highlights: [
      "The dashboard is designed to answer what needs action first.",
      "Approval queues keep operator, supervisor, and finance responsibilities clearly separated.",
      "The consultancy layer keeps multiple client companies visible without flattening everything into one list.",
    ],
    chartTitle: "Operational activity mix",
    chartData: [
      { label: "Payroll", value: 88, display: "88 payroll actions" },
      { label: "People", value: 64, display: "64 employee updates" },
      { label: "Leave", value: 52, display: "52 leave actions" },
      { label: "Recruitment", value: 37, display: "37 hiring actions" },
    ],
  },
  {
    key: "people",
    title: "People",
    shortTitle: "People",
    icon: "PE",
    summary:
      "Digital employee records, movement history, structure management, document control, and lifecycle operations.",
    tagline: "A complete employee file, not a pile of disconnected HR screens.",
    items: [
      "Employee Directory",
      "Employee Profiles",
      "Departments",
      "Branches",
      "Designations",
      "Job Grades",
      "Employment History",
      "Dependants",
      "Emergency Contacts",
      "Documents",
      "Disciplinary Records",
      "Promotions",
      "Transfers",
      "Confirmations",
      "Contract Renewals",
      "Offboarding",
      "Exit Interviews",
      "Clearance Management",
    ],
    heroStats: [
      { label: "Employees", value: "1,248", hint: "Across 11 branches and 74 departments" },
      { label: "Documents missing", value: "31", hint: "IDs, contracts, and statutory forms", tone: "warning" },
      { label: "Renewals due", value: "17", hint: "Within the next 45 days" },
      { label: "Transfers in progress", value: "6", hint: "Cross-branch and cost center changes" },
    ],
    quickActions: ["Add employee", "Import records", "Approve profile change", "Run document expiry report"],
    highlights: [
      "Employee records are built for auditability and supervisor verification.",
      "The people module links directly into payroll, leave, performance, and offboarding.",
      "Movement history should be visible enough that HR does not need a spreadsheet to remember changes.",
    ],
    chartTitle: "Workforce composition",
    chartData: [
      { label: "Permanent", value: 58, display: "58% permanent" },
      { label: "Contract", value: 23, display: "23% contract" },
      { label: "Casual", value: 13, display: "13% casual" },
      { label: "Interns", value: 6, display: "6% interns" },
    ],
  },
  {
    key: "payroll",
    title: "Payroll",
    shortTitle: "Payroll",
    icon: "PY",
    summary:
      "Kenyan payroll engine with statutory logic, flexible exports, approvals, payslips, P9/P10 outputs, and audit trails.",
    tagline: "Built for real payroll operations, not just salary calculation screens.",
    items: [
      "Payroll Dashboard",
      "Payroll Periods",
      "Employee Payroll Data",
      "Earnings",
      "Deductions",
      "Variable Inputs",
      "Process Payroll",
      "Review & Approval",
      "Payslips",
      "P9 Forms",
      "Net to Bank",
      "Statutory Reports",
      "Loan & Checkoff Management",
      "Casual Payroll",
      "Payroll Reports",
      "Payroll Audit Trail",
      "Payroll Settings",
    ],
    heroStats: [
      { label: "Payroll month", value: "Apr 2026", hint: "Status: Pending approval" },
      { label: "Gross pay", value: "KES 18.45M", hint: "1,044 active payroll employees" },
      { label: "Employer cost", value: "KES 19.77M", hint: "Includes NSSF and Housing Levy" },
      { label: "Validation issues", value: "7", hint: "Bank and statutory gaps", tone: "warning" },
    ],
    quickActions: ["Open payroll period", "Upload variable inputs", "Run payroll", "Generate payslips"],
    highlights: [
      "Payroll includes monthly, half-month, weekly, casual, off-cycle, and final dues processing.",
      "Kenyan statutory logic is built around SHIF, PAYE, NSSF, Housing Levy, pension relief, and custom deductions.",
      "Outputs are built for payroll teams, finance teams, banks, statutory filing, and consultancy reporting.",
    ],
    chartTitle: "Payroll cost structure",
    chartData: [
      { label: "Basic", value: 64, display: "KES 11.8M" },
      { label: "Allowances", value: 18, display: "KES 3.3M" },
      { label: "Statutory", value: 11, display: "KES 2.0M" },
      { label: "Other deductions", value: 7, display: "KES 1.3M" },
    ],
  },
  {
    key: "leave",
    title: "Leave & Attendance",
    shortTitle: "Leave",
    icon: "LV",
    summary:
      "Leave workflows, calendar planning, shift management, attendance, biometrics readiness, timesheets, and overtime.",
    tagline: "Time, availability, and workforce presence managed in one place.",
    items: [
      "Leave Dashboard",
      "Leave Requests",
      "Leave Calendar",
      "Leave Policies",
      "Leave Balances",
      "Attendance",
      "Biometrics",
      "Shift Scheduling",
      "Timesheets",
      "Overtime",
      "Holidays",
      "Weekend Rules",
    ],
    heroStats: [
      { label: "Leave requests", value: "26", hint: "8 awaiting supervisor approval" },
      { label: "Leave liability", value: "KES 6.8M", hint: "Annual leave obligation" },
      { label: "Attendance exceptions", value: "19", hint: "Late, absent, incomplete logs", tone: "warning" },
      { label: "Overtime claims", value: "28", hint: "Queued for payroll validation" },
    ],
    quickActions: ["Apply leave", "Approve overtime", "Import attendance", "Publish holiday list"],
    highlights: [
      "Leave policies support accrual, carry forward, encashment, and unpaid leave deductions.",
      "Attendance is designed to feed payroll for overtime, absence deductions, and attendance exceptions.",
      "Managers need planning tools, not just approval buttons.",
    ],
    chartTitle: "Leave and attendance signals",
    chartData: [
      { label: "Annual leave", value: 42, display: "42 annual leave items" },
      { label: "Sick leave", value: 15, display: "15 sick leave items" },
      { label: "Overtime", value: 28, display: "28 overtime claims" },
      { label: "Exceptions", value: 19, display: "19 attendance exceptions" },
    ],
  },
  {
    key: "recruitment",
    title: "Recruitment",
    shortTitle: "Hire",
    icon: "RC",
    summary:
      "Hiring workflow from requisition to onboarding with vacancy control, applicant tracking, interviews, offers, and rejections.",
    tagline: "A proper ATS with HR and business accountability built in.",
    items: [
      "Job Requisitions",
      "Vacancies",
      "Applicants",
      "CV Bank",
      "Shortlisting",
      "Interviews",
      "Interview Scorecards",
      "Offer Letters",
      "Rejections",
      "Onboarding Tasks",
    ],
    heroStats: [
      { label: "Open requisitions", value: "23", hint: "7 need finance approval" },
      { label: "Vacancies", value: "16", hint: "12 active, 4 draft" },
      { label: "Applicants", value: "418", hint: "Across all active roles" },
      { label: "Offers in workflow", value: "5", hint: "Awaiting approval and onboarding" },
    ],
    quickActions: ["Create requisition", "Publish vacancy", "Schedule interview", "Approve offer"],
    highlights: [
      "Recruitment keeps demand, budget, pipeline, and onboarding connected.",
      "Shortlisting, scorecards, and offer workflows are visible enough to manage hiring without side spreadsheets.",
      "Offer decisions should feed directly into onboarding and payroll setup.",
    ],
    chartTitle: "Recruitment funnel",
    chartData: [
      { label: "Applied", value: 100, display: "418 applicants" },
      { label: "Shortlisted", value: 41, display: "171 shortlisted" },
      { label: "Interviewed", value: 18, display: "76 interviewed" },
      { label: "Offered", value: 5, display: "22 offers" },
    ],
  },
  {
    key: "performance",
    title: "Performance",
    shortTitle: "Performance",
    icon: "PF",
    summary:
      "KPIs, goals, appraisals, reviews, promotion cases, succession planning, and talent matrix visibility.",
    tagline: "Performance management that supports real business decisions, not annual paperwork.",
    items: [
      "KPIs",
      "Appraisals",
      "Goals",
      "Performance Reviews",
      "Performance Improvement Plans",
      "Promotions",
      "Succession Planning",
      "Talent Matrix",
    ],
    heroStats: [
      { label: "Q2 completion", value: "73%", hint: "Reviews and appraisals in progress" },
      { label: "PIPs active", value: "11", hint: "Needs HR follow-through", tone: "warning" },
      { label: "Promotion cases", value: "9", hint: "Awaiting calibration" },
      { label: "Successor coverage", value: "68%", hint: "Critical-role coverage" },
    ],
    quickActions: ["Launch appraisal cycle", "Create KPI", "Open talent matrix", "Review promotion case"],
    highlights: [
      "Performance should link to probation, promotions, training, and succession readiness.",
      "Managers need clear progress, not a vague annual form buried in settings.",
      "The design supports both structured appraisal cycles and practical day-to-day goal tracking.",
    ],
    chartTitle: "Performance distribution",
    chartData: [
      { label: "Exceeding", value: 22, display: "22% top performers" },
      { label: "Strong", value: 41, display: "41% strong performers" },
      { label: "Stable", value: 28, display: "28% stable performers" },
      { label: "At risk", value: 9, display: "9% at risk" },
    ],
  },
  {
    key: "training",
    title: "Training",
    shortTitle: "Training",
    icon: "TR",
    summary:
      "Training calendar, requests, learning history, certifications, compliance learning, and workforce development.",
    tagline: "Training that connects skills, compliance, and career growth.",
    items: [
      "Training Calendar",
      "Training Requests",
      "Training Programs",
      "Certifications",
      "Learning History",
      "Training Reports",
    ],
    heroStats: [
      { label: "Programs live", value: "18", hint: "Safety, technical, systems, leadership" },
      { label: "Requests pending", value: "12", hint: "Awaiting approval" },
      { label: "Certification compliance", value: "91%", hint: "Current expiry coverage" },
      { label: "Spend YTD", value: "KES 3.2M", hint: "Against a KES 4.0M budget" },
    ],
    quickActions: ["Schedule training", "Approve request", "Upload certificate", "Export learning history"],
    highlights: [
      "Training is tied to performance gaps, compliance needs, and employee requests.",
      "Certification tracking matters just as much as attendance tracking for regulated teams.",
      "The module is built for both internal and external learning records.",
    ],
    chartTitle: "Learning mix",
    chartData: [
      { label: "Mandatory", value: 39, display: "39% mandatory" },
      { label: "Technical", value: 31, display: "31% technical" },
      { label: "Leadership", value: 17, display: "17% leadership" },
      { label: "External", value: 13, display: "13% external" },
    ],
  },
  {
    key: "assets",
    title: "Assets",
    shortTitle: "Assets",
    icon: "AS",
    summary:
      "Track company assets, allocations, returns, maintenance, and history across the employee lifecycle.",
    tagline: "Assets become accountable, visible, and recoverable across branches.",
    items: [
      "Company Assets",
      "Asset Allocation",
      "Asset Returns",
      "Asset Maintenance",
      "Asset History",
    ],
    heroStats: [
      { label: "Tracked assets", value: "2,406", hint: "Devices, tools, fleet, and office items" },
      { label: "Assigned today", value: "6", hint: "Mostly onboarding kits" },
      { label: "Overdue returns", value: "14", hint: "Linked to offboarding cases", tone: "warning" },
      { label: "Maintenance due", value: "21", hint: "Fleet and IT assets" },
    ],
    quickActions: ["Register asset", "Assign asset", "Log return", "Schedule maintenance"],
    highlights: [
      "Assets should not be forgotten during onboarding, transfer, or clearance.",
      "A visible asset trail reduces losses and makes branch accountability clearer.",
      "This module is intentionally simple to use but detailed enough for audits.",
    ],
    chartTitle: "Asset categories",
    chartData: [
      { label: "IT", value: 48, display: "48% IT devices" },
      { label: "Fleet", value: 19, display: "19% fleet" },
      { label: "Tools", value: 23, display: "23% operational tools" },
      { label: "Office", value: 10, display: "10% office assets" },
    ],
  },
  {
    key: "ess",
    title: "Employee Self Service",
    shortTitle: "ESS",
    icon: "ES",
    summary:
      "Personal employee workspace for payslips, leave, attendance, appraisals, assets, documents, and requests.",
    tagline: "Self service should feel useful, fast, and trustworthy on phone or desktop.",
    items: [
      "My Dashboard",
      "My Profile",
      "My Payslips",
      "My P9 Forms",
      "My Leave",
      "My Attendance",
      "My Requests",
      "My Documents",
      "My Assets",
      "My Loans",
      "My Appraisals",
      "My Training",
      "My Notifications",
    ],
    heroStats: [
      { label: "Portal adoption", value: "87%", hint: "Monthly active employee usage" },
      { label: "Profile changes", value: "94", hint: "Awaiting verification where needed" },
      { label: "Payslip views", value: "1,204", hint: "Current month" },
      { label: "Unread notices", value: "312", hint: "Announcements and workflow messages" },
    ],
    quickActions: ["Download payslip", "Apply leave", "Update profile", "View appraisal"],
    highlights: [
      "Employees can view payslips, P9 forms, leave balances, attendance, loans, assets, and learning records.",
      "Self service should reduce manual HR work, not create more clarification calls.",
      "The design prioritizes the actions employees actually use every month.",
    ],
    chartTitle: "Portal activity",
    chartData: [
      { label: "Payslips", value: 36, display: "36% payslip activity" },
      { label: "Leave", value: 24, display: "24% leave activity" },
      { label: "Profile", value: 18, display: "18% profile actions" },
      { label: "Other", value: 22, display: "22% other actions" },
    ],
  },
  {
    key: "reports",
    title: "Reports",
    shortTitle: "Reports",
    icon: "RP",
    summary:
      "Cross-module reporting, analytics, board packs, compliance output, and custom report building.",
    tagline: "One reporting layer for HR, payroll, operations, and consultancy work.",
    items: [
      "HR Reports",
      "Payroll Reports",
      "Leave Reports",
      "Recruitment Reports",
      "Performance Reports",
      "Training Reports",
      "Assets Reports",
      "Compliance Reports",
      "Executive Reports",
      "Custom Report Builder",
    ],
    heroStats: [
      { label: "Saved templates", value: "42", hint: "Reusable report definitions" },
      { label: "Scheduled exports", value: "16", hint: "Daily, weekly, and monthly packs" },
      { label: "Exports today", value: "27", hint: "CSV, Excel, and PDF" },
      { label: "Board packs", value: "3", hint: "Ready for this week" },
    ],
    quickActions: ["Run report", "Schedule export", "Open builder", "Download board pack"],
    highlights: [
      "The report builder is one of Solva HR's strongest commercial features.",
      "Reporting spans payroll, headcount, leave, recruitment, compliance, and consultancy dashboards.",
      "Executives, HR, finance, and auditors should all get what they need without engineering tickets.",
    ],
    chartTitle: "Report usage",
    chartData: [
      { label: "Payroll", value: 44, display: "44% payroll reports" },
      { label: "HR", value: 22, display: "22% HR reports" },
      { label: "Compliance", value: 18, display: "18% compliance reports" },
      { label: "Executive", value: 16, display: "16% executive reports" },
    ],
  },
  {
    key: "settings",
    title: "Settings",
    shortTitle: "Settings",
    icon: "ST",
    summary:
      "Company setup, rules, workflows, roles, branding, notifications, integrations, and security management.",
    tagline: "The control plane behind the HR and payroll operating model.",
    items: [
      "Company Settings",
      "Branches",
      "Departments",
      "Job Grades",
      "Payroll Rules",
      "Leave Rules",
      "User Roles",
      "Permissions",
      "Approval Workflows",
      "Email Notifications",
      "SMS Notifications",
      "Branding",
      "Integrations",
      "Backup Settings",
      "Security Settings",
    ],
    heroStats: [
      { label: "Roles configured", value: "28", hint: "Granular permission sets" },
      { label: "Approval workflows", value: "14", hint: "Payroll, leave, people, hiring" },
      { label: "2FA coverage", value: "92%", hint: "Admin and supervisor accounts" },
      { label: "Recent config changes", value: "8", hint: "All audited" },
    ],
    quickActions: ["Create role", "Edit workflow", "Update branding", "Review security settings"],
    highlights: [
      "Operator and supervisor approvals are first-class workflow settings, not hidden assumptions.",
      "Payroll and leave rules are meant to be configurable enough for different client policies.",
      "Security and branding should both be strong because this is a commercial SaaS product.",
    ],
    chartTitle: "Settings focus",
    chartData: [
      { label: "Structure", value: 26, display: "26% structure" },
      { label: "Payroll rules", value: 29, display: "29% payroll rules" },
      { label: "Security", value: 25, display: "25% security" },
      { label: "Messaging", value: 20, display: "20% messaging" },
    ],
  },
  {
    key: "audit",
    title: "Audit Trail",
    shortTitle: "Audit",
    icon: "AU",
    summary:
      "Searchable accountability layer for user actions, payroll changes, salary changes, login events, approvals, and exports.",
    tagline: "If something changed, approved, reopened, or got downloaded, it should be visible here.",
    items: [
      "User Activities",
      "Payroll Changes",
      "Salary Changes",
      "Employee Record Changes",
      "Login History",
      "Approval History",
      "Report Downloads",
      "Export Logs",
    ],
    heroStats: [
      { label: "Events today", value: "1,284", hint: "Across all major modules" },
      { label: "Sensitive changes", value: "17", hint: "Salary and bank edits", tone: "warning" },
      { label: "Export logs", value: "63", hint: "Payroll and compliance heavy" },
      { label: "Failed logins", value: "4", hint: "Blocked and logged", tone: "critical" },
    ],
    quickActions: ["Search logs", "Review salary changes", "Audit approvals", "Export trail"],
    highlights: [
      "Audit trails are core to accountability, especially in payroll and employee master data.",
      "Before and after values matter for salary, bank, tax, and workflow changes.",
      "Download and export logging is part of compliance, not an extra.",
    ],
    chartTitle: "Audit event mix",
    chartData: [
      { label: "Approvals", value: 34, display: "34% approvals" },
      { label: "Edits", value: 27, display: "27% record changes" },
      { label: "Exports", value: 21, display: "21% exports" },
      { label: "Access", value: 18, display: "18% access events" },
    ],
  },
  {
    key: "integrations",
    title: "Integrations",
    shortTitle: "Links",
    icon: "IN",
    summary:
      "External connections for KRA, SHIF, NSSF, Housing Levy, banks, SACCOs, pension, biometrics, accounting, email, and SMS.",
    tagline: "Real business operations need clean external connections and configurable export formats.",
    items: [
      "KRA",
      "SHIF",
      "NSSF",
      "Housing Levy",
      "Banks",
      "SACCOs",
      "Pension Providers",
      "Biometric Devices",
      "Accounting Software",
      "Email Services",
      "SMS Services",
    ],
    heroStats: [
      { label: "Connected services", value: "9", hint: "Across statutory, banking, and messaging" },
      { label: "Mapped templates", value: "22", hint: "Bank and statutory export formats" },
      { label: "Sync issues", value: "2", hint: "Need support attention", tone: "warning" },
      { label: "Last successful export", value: "08:24", hint: "Today" },
    ],
    quickActions: ["Configure integration", "Test connection", "Map fields", "Review sync log"],
    highlights: [
      "Bank and statutory templates should be configurable because formats change.",
      "Biometric readiness matters even before full device integration is live.",
      "Integrations are operational products and should be visible enough to manage properly.",
    ],
    chartTitle: "Integration readiness",
    chartData: [
      { label: "Statutory", value: 29, display: "29% statutory" },
      { label: "Banking", value: 24, display: "24% banking" },
      { label: "Attendance", value: 19, display: "19% attendance" },
      { label: "Messaging", value: 28, display: "28% messaging" },
    ],
  },
  {
    key: "consultancy",
    title: "Consultancy Dashboard",
    shortTitle: "Advisory",
    icon: "CD",
    summary:
      "Multi-company command center for Solva HR Consultancy with portfolio reporting, payroll alerts, comparison dashboards, and board packs.",
    tagline: "This is where Solva HR becomes a real consultancy operating system.",
    items: [
      "Multi-company Dashboard",
      "Company Comparison Reports",
      "Wage Bill Analysis",
      "Employee Turnover Analysis",
      "Payroll Error Alerts",
      "Compliance Tracker",
      "Branch Comparison Reports",
      "Board Reports",
      "Custom Consultancy Reports",
    ],
    heroStats: [
      { label: "Client companies", value: "18", hint: "Enterprise, SME, NGO, and hospitality mix" },
      { label: "Payroll exceptions", value: "11", hint: "Across 4 client payrolls", tone: "warning" },
      { label: "Compliance score", value: "94%", hint: "Weighted across client portfolio" },
      { label: "Turnover hotspots", value: "3", hint: "Need advisory attention" },
    ],
    quickActions: ["Open client profile", "Run comparison", "Export board report", "Review compliance tracker"],
    highlights: [
      "The consultancy dashboard is a major differentiator for outsourced HR and payroll operations.",
      "Cross-client wage bill, branch, and turnover views create real advisory value.",
      "Portfolio alerts should surface before a client raises the issue first.",
    ],
    chartTitle: "Client portfolio health",
    chartData: [
      { label: "Healthy", value: 61, display: "11 healthy clients" },
      { label: "Watchlist", value: 22, display: "4 watchlist clients" },
      { label: "Compliance risk", value: 11, display: "2 at risk" },
      { label: "Escalated", value: 6, display: "1 escalated" },
    ],
  },
];

export function getPlatformSnapshot(): PlatformSnapshot {
  return {
    generatedAt: "2026-04-21T09:00:00+03:00",
    loginProfiles,
    modules,
    featured: {
      title: "Solva HR Operating Snapshot",
      summary:
        "Shared view across HR, payroll, approvals, compliance, and consultancy activity for Kenyan multi-company operations.",
      approvals: [
        { item: "April payroll sign-off", owner: "Company Admin", status: "Pending final approval", due: "Today 14:00" },
        { item: "Employee activation batch", owner: "Supervisor", status: "Awaiting review", due: "Today 11:30" },
        { item: "Training request cycle", owner: "HR Admin", status: "Pending validation", due: "Tomorrow" },
      ],
      announcements: [
        { title: "SHIF compliance review pack ready", audience: "Payroll and Finance", time: "08:10" },
        { title: "Q2 appraisal window opens Monday", audience: "All managers", time: "Yesterday" },
        { title: "Mombasa biometric sync scheduled", audience: "Operations and HR", time: "Yesterday" },
      ],
    },
  };
}

export function getModuleByKey(key: string): ModuleSpec | undefined {
  return modules.find((module) => module.key === key);
}

const payrollTable: TableSpec = {
  title: "April payroll register",
  description: "Current payroll month with Kenyan statutory visibility and approval status.",
  columns: [
    { key: "employee", label: "Employee" },
    { key: "gross", label: "Gross Pay", align: "right" },
    { key: "deductions", label: "Deductions", align: "right" },
    { key: "net", label: "Net Pay", align: "right" },
    { key: "status", label: "Status" },
  ],
  rows: [
    { employee: "SOL-001 Amina Otieno", gross: "KES 130,000", deductions: "KES 31,240", net: "KES 98,760", status: "Ready" },
    { employee: "SOL-018 Brian Mwangi", gross: "KES 92,000", deductions: "KES 19,780", net: "KES 72,220", status: "Validated" },
    { employee: "SOL-044 Mercy Njeri", gross: "KES 164,500", deductions: "KES 44,500", net: "KES 120,000", status: "Pending approval" },
    { employee: "SOL-067 Daniel Oloo", gross: "KES 78,000", deductions: "KES 14,810", net: "KES 63,190", status: "Missing bank details" },
  ],
};

const defaultTable: TableSpec = {
  title: "Operational register",
  description: "A working table with filters, bulk actions, exports, and clear status visibility.",
  columns: [
    { key: "item", label: "Item" },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status" },
    { key: "updated", label: "Updated" },
  ],
  rows: [
    { item: "Supervisor approval queue", owner: "Supervisor", status: "Pending", updated: "Today, 09:15" },
    { item: "Monthly board pack", owner: "HR Admin", status: "Ready", updated: "Today, 08:40" },
    { item: "Compliance export bundle", owner: "Finance Officer", status: "In progress", updated: "Yesterday" },
    { item: "Employee data cleanup", owner: "HR Officer", status: "Queued", updated: "Yesterday" },
  ],
};

const pageOverrides: Record<string, Omit<PageSpec, "title">> = {
  "dashboard:overview": {
    description:
      "Cross-functional command center showing what leadership, HR, payroll, and consultancy teams need to act on first.",
    metrics: [
      { label: "Unread notifications", value: "23", hint: "Payroll, approvals, and advisory updates" },
      { label: "Approvals due", value: "42", hint: "Supervisor, HR, payroll, finance, and admin queues" },
      { label: "Tasks due today", value: "19", hint: "Across all operational modules" },
      { label: "Reports ready", value: "8", hint: "Board packs, payroll packs, and compliance packs" },
    ],
    quickActions: ["Review alerts", "Open approval queue", "Run executive snapshot", "Publish announcement"],
    filters: ["Today", "This week", "All companies", "High priority"],
    highlights: [
      "The overview keeps payroll and approvals visible because that is where operational risk concentrates.",
      "Consultancy work sits beside internal HR operations instead of outside the product.",
      "This page is built to answer what needs action before users start hunting through menus.",
    ],
    chartTitle: "Daily workload mix",
    chartData: [
      { label: "Approvals", value: 41, display: "41% approvals" },
      { label: "Payroll", value: 26, display: "26% payroll work" },
      { label: "People", value: 18, display: "18% people work" },
      { label: "Reporting", value: 15, display: "15% reporting" },
    ],
    table: {
      title: "Priority queue",
      description: "The items leadership and operations teams should tackle first.",
      columns: defaultTable.columns,
      rows: [
        { item: "April payroll final approval", owner: "Company Admin", status: "Pending sign-off", updated: "Today, 09:12" },
        { item: "New employee activation", owner: "Supervisor", status: "Awaiting approval", updated: "Today, 08:51" },
        { item: "Branch leave conflict", owner: "HR Admin", status: "Needs reschedule", updated: "Today, 08:02" },
        { item: "Client compliance tracker pack", owner: "Consultancy Lead", status: "Ready for export", updated: "Yesterday" },
      ],
    },
  },
  "people:employee-directory": {
    description:
      "Complete staff register with department, branch, employment type, payroll linkage, and verification status.",
    metrics: [
      { label: "Directory records", value: "1,248", hint: "Active employee master records" },
      { label: "Awaiting approval", value: "4", hint: "Prepared by operator, pending supervisor" },
      { label: "Payroll gaps", value: "12", hint: "Missing payroll identifiers", tone: "warning" },
      { label: "Branches covered", value: "11", hint: "Live operating footprint" },
    ],
    quickActions: ["Add employee", "Import employees", "Approve activation", "Export staff list"],
    filters: ["All branches", "Active", "Permanent", "Missing documents"],
    highlights: [
      "A junior operator can prepare a record, but a supervisor should approve activation.",
      "The directory is designed to support HR, payroll, audit, and reporting without duplicate entry.",
      "Branch, department, grade, and employment type filters stay near the data table because they matter every day.",
    ],
    chartTitle: "Headcount by branch",
    chartData: [
      { label: "Nairobi", value: 552, display: "552 employees" },
      { label: "Mombasa", value: 264, display: "264 employees" },
      { label: "Kisumu", value: 221, display: "221 employees" },
      { label: "Field", value: 211, display: "211 employees" },
    ],
    table: {
      title: "Employee directory",
      description: "Current workforce with useful HR and payroll context.",
      columns: [
        { key: "employee", label: "Employee" },
        { key: "department", label: "Department" },
        { key: "branch", label: "Branch" },
        { key: "employment", label: "Employment Type" },
        { key: "status", label: "Status" },
      ],
      rows: [
        { employee: "SOL-001 Amina Otieno", department: "People Operations", branch: "Nairobi HQ", employment: "Permanent", status: "Active" },
        { employee: "SOL-018 Brian Mwangi", department: "Distribution", branch: "Mombasa", employment: "Probation", status: "Review due" },
        { employee: "SOL-044 Mercy Njeri", department: "Finance", branch: "Nairobi HQ", employment: "Permanent", status: "Pending supervisor approval" },
        { employee: "SOL-067 Daniel Oloo", department: "Field Service", branch: "Kisumu", employment: "Contract", status: "Transfer in progress" },
      ],
    },
  },
  "payroll:payroll-dashboard": {
    description:
      "Kenyan payroll command center with statutory visibility, payroll status, bank readiness, approval control, and variance signals.",
    metrics: [
      { label: "Current payroll month", value: "Apr 2026", hint: "Pending approval" },
      { label: "Active payroll employees", value: "1,044", hint: "Across 4 payroll groups" },
      { label: "Gross pay", value: "KES 18.45M", hint: "Monthly payroll value" },
      { label: "Net pay", value: "KES 13.94M", hint: "Ready for net-to-bank export" },
      { label: "PAYE total", value: "KES 2.48M", hint: "After reliefs and tax treatment" },
      { label: "SHIF total", value: "KES 507,375", hint: "Employee-only contribution" },
      { label: "Housing Levy", value: "KES 276,750", hint: "Employee contribution, employer matched" },
      { label: "NSSF total", value: "KES 1,127,520", hint: "Employee and employer components" },
      { label: "Pending approvals", value: "3", hint: "Payroll and statutory release queue", tone: "warning" },
      { label: "Validation issues", value: "7", hint: "Bank, tax, and employee setup gaps", tone: "critical" },
    ],
    quickActions: ["Open payroll period", "Upload variable inputs", "Process payroll", "Generate payslips"],
    filters: ["Apr 2026", "Full month", "All payroll groups", "All branches"],
    highlights: [
      "The payroll dashboard is built for Kenyan payroll operations, not just gross-to-net arithmetic.",
      "The module supports monthly, half-month, weekly, casual, bonus, off-cycle, and final dues processing.",
      "Statutory, bank, reporting, and approval outputs sit close to the payroll run because that is how teams actually work.",
    ],
    chartTitle: "Wage bill trend",
    chartData: [
      { label: "Jan", value: 17.1, display: "KES 17.1M" },
      { label: "Feb", value: 17.8, display: "KES 17.8M" },
      { label: "Mar", value: 18.2, display: "KES 18.2M" },
      { label: "Apr", value: 18.45, display: "KES 18.45M" },
    ],
    table: payrollTable,
  },
  "leave:leave-dashboard": {
    description:
      "Operational view of leave demand, balances, calendar pressure, overtime, and payroll-linked attendance exceptions.",
    metrics: [
      { label: "Leave requests", value: "26", hint: "Current month request volume" },
      { label: "Balances flagged", value: "9", hint: "Need HR adjustment or review" },
      { label: "Overtime queue", value: "28", hint: "Waiting validation or approval" },
      { label: "Unpaid leave impact", value: "KES 124K", hint: "Queued for payroll deduction" },
    ],
    quickActions: ["Approve leave", "Publish leave calendar", "Import attendance", "Review overtime"],
    filters: ["This month", "All leave types", "All branches", "Pending only"],
    highlights: [
      "Leave is linked directly to payroll through unpaid leave, absenteeism, and overtime handling.",
      "Managers need a calendar and team planner, not just a request list.",
      "Shift and weekend rules matter because attendance policy varies by business type.",
    ],
    chartTitle: "Leave mix",
    chartData: [
      { label: "Annual", value: 42, display: "42 annual leave items" },
      { label: "Sick", value: 15, display: "15 sick leave items" },
      { label: "Compassionate", value: 6, display: "6 compassionate leave items" },
      { label: "Other", value: 11, display: "11 other leave items" },
    ],
    table: {
      title: "Leave and attendance exceptions",
      description: "High-priority items that affect staffing, payroll, or approval timelines.",
      columns: defaultTable.columns,
      rows: [
        { item: "Annual leave request - Nairobi Sales", owner: "Supervisor", status: "Awaiting approval", updated: "Today" },
        { item: "Missing clock-out - Kisumu Branch", owner: "Attendance Officer", status: "Needs correction", updated: "Today" },
        { item: "Overtime claim - Distribution", owner: "Payroll Admin", status: "Validated for payroll", updated: "Yesterday" },
        { item: "Unpaid leave deduction review", owner: "HR Admin", status: "Queued for payroll", updated: "Yesterday" },
      ],
    },
  },
  "recruitment:job-requisitions": {
    description:
      "Hiring demand control with headcount request, budget tagging, vacancy readiness, and approval accountability.",
    metrics: [
      { label: "Open requisitions", value: "23", hint: "Requests still in motion" },
      { label: "Budget tagged", value: "91%", hint: "Coverage on active requisitions" },
      { label: "Pipeline candidates", value: "418", hint: "Across open vacancies" },
      { label: "Approval breaches", value: "2", hint: "SLA exceeded", tone: "warning" },
    ],
    quickActions: ["Create requisition", "Approve request", "Open vacancy list", "Export funnel report"],
    filters: ["Open", "This quarter", "Budget tagged", "Pending approval"],
    highlights: [
      "Requisitions connect hiring need, business approval, and recruitment execution.",
      "Offer letters and onboarding tasks stay part of the same operating flow.",
      "The strongest recruitment UX keeps requisitions, vacancies, and pipeline visible together.",
    ],
    chartTitle: "Requisition status",
    chartData: [
      { label: "Draft", value: 4, display: "4 drafts" },
      { label: "Pending", value: 9, display: "9 pending" },
      { label: "Approved", value: 7, display: "7 approved" },
      { label: "Filled", value: 3, display: "3 filled" },
    ],
    table: {
      title: "Requisition queue",
      description: "Live hiring demand with clear ownership and status.",
      columns: [
        { key: "role", label: "Role" },
        { key: "department", label: "Department" },
        { key: "status", label: "Status" },
        { key: "owner", label: "Next Owner" },
        { key: "updated", label: "Updated" },
      ],
      rows: [
        { role: "Payroll Analyst", department: "Finance", status: "Pending finance approval", owner: "Finance Officer", updated: "Today" },
        { role: "Sales Supervisor", department: "Commercial", status: "Approved", owner: "Recruiter", updated: "Yesterday" },
        { role: "HR Assistant", department: "People", status: "Draft", owner: "HR Admin", updated: "Today" },
        { role: "Warehouse Clerk", department: "Operations", status: "Escalated", owner: "HR Lead", updated: "Yesterday" },
      ],
    },
  },
  "reports:hr-reports": {
    description:
      "Cross-module reporting with filters, templates, scheduled exports, board packs, and a path toward full custom reporting.",
    metrics: [
      { label: "Templates available", value: "42", hint: "Role-based access supported" },
      { label: "Scheduled jobs", value: "16", hint: "Daily, weekly, and monthly packs" },
      { label: "Exports today", value: "27", hint: "PDF, Excel, and CSV" },
      { label: "Board packs", value: "3", hint: "Prepared for this week" },
    ],
    quickActions: ["Run report", "Schedule export", "Clone template", "Open report builder"],
    filters: ["This month", "All branches", "Shared templates", "Export-ready"],
    highlights: [
      "Reporting should be broad enough for HR, payroll, compliance, and consultancy work.",
      "The custom report builder is a commercial strength because clients always ask for tailored output.",
      "Export logging belongs near reporting because sensitive downloads need accountability.",
    ],
    chartTitle: "Report family usage",
    chartData: [
      { label: "Payroll", value: 18, display: "18 payroll templates" },
      { label: "HR", value: 9, display: "9 HR templates" },
      { label: "Compliance", value: 8, display: "8 compliance templates" },
      { label: "Executive", value: 7, display: "7 executive templates" },
    ],
    table: {
      title: "Popular report templates",
      description: "Templates teams use most often for operations and leadership packs.",
      columns: [
        { key: "report", label: "Report" },
        { key: "owner", label: "Owner" },
        { key: "status", label: "Access" },
        { key: "updated", label: "Updated" },
      ],
      rows: [
        { report: "Payroll register", owner: "Payroll Admin", status: "Restricted", updated: "Today" },
        { report: "Headcount by branch", owner: "HR Admin", status: "Shared", updated: "Yesterday" },
        { report: "Compliance tracker", owner: "Auditor", status: "Restricted", updated: "Today" },
        { report: "Board pack", owner: "Consultancy Lead", status: "Executive only", updated: "Yesterday" },
      ],
    },
  },
  "settings:company-settings": {
    description:
      "Company-level controls for structure, payroll rules, leave policy, permissions, workflows, notifications, and security.",
    metrics: [
      { label: "Companies configured", value: "18", hint: "Current multi-company footprint" },
      { label: "Workflows active", value: "14", hint: "Across payroll, leave, people, and hiring" },
      { label: "Role profiles", value: "28", hint: "Granular permission groups" },
      { label: "Security issues", value: "2", hint: "Need policy review", tone: "warning" },
    ],
    quickActions: ["Create role", "Edit workflow", "Update branding", "Review security"],
    filters: ["All companies", "Recently changed", "Security critical", "Workflow settings"],
    highlights: [
      "This is where operator, supervisor, HR, payroll, and finance responsibilities are defined cleanly.",
      "Payroll and leave rules are configuration-driven enough to support different client policies.",
      "Branding and integrations stay close because this is a commercial multi-company system.",
    ],
    chartTitle: "Settings focus",
    chartData: [
      { label: "Structure", value: 26, display: "26% organization structure" },
      { label: "Payroll rules", value: 29, display: "29% payroll rules" },
      { label: "Security", value: 25, display: "25% security" },
      { label: "Notifications", value: 20, display: "20% messaging and alerts" },
    ],
    table: {
      title: "Recent configuration changes",
      description: "High-impact changes with ownership and traceability.",
      columns: defaultTable.columns,
      rows: [
        { item: "Employee creation approval workflow", owner: "Super Admin", status: "Active", updated: "Today" },
        { item: "Payroll rule set - SHIF mapping", owner: "Payroll Admin", status: "Updated", updated: "Yesterday" },
        { item: "Supervisor role profile", owner: "Security Admin", status: "Reviewed", updated: "Yesterday" },
        { item: "Client portal branding", owner: "Company Admin", status: "Pending publish", updated: "Today" },
      ],
    },
  },
};

export function getPage(module: ModuleSpec, item: string): PageSpec {
  const key = `${module.key}:${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const override = pageOverrides[key];

  if (override) {
    return {
      title: item,
      ...override,
    };
  }

  return {
    title: item,
    description: `${item} inside ${module.title}, designed with filters, exports, mobile-ready layouts, and workflow visibility.`,
    metrics: module.heroStats,
    quickActions: module.quickActions,
    filters: ["All records", "This month", "All branches", "Export-ready"],
    highlights: [
      `${item} follows the same clean Solva HR operating pattern with visible actions and strong readability.`,
      `This screen is built to scale into live API and workflow behavior without changing the layout again.`,
      "The system uses one consistent language of cards, charts, data tables, approvals, and traceability.",
    ],
    chartTitle: module.chartTitle,
    chartData: module.chartData,
    table: defaultTable,
  };
}
