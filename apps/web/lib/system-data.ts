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

export type TableBlock = {
  title: string;
  description: string;
  columns: TableColumn[];
  rows: TableRow[];
};

export type WorkspacePage = {
  title: string;
  description: string;
  metrics: Metric[];
  quickActions: string[];
  filters: string[];
  highlights: string[];
  chartTitle: string;
  chartData: ChartDatum[];
  table: TableBlock;
};

export type ModuleDefinition = {
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

export const systemModules: ModuleDefinition[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    shortTitle: "Dash",
    icon: "DB",
    summary: "Executive control room for approvals, workforce movements, payroll health, and action queues.",
    tagline: "One place to understand the state of every company, workflow, and exception.",
    items: ["Overview", "Notifications", "Pending Approvals", "Tasks", "Announcements", "Reports Snapshot"],
    heroStats: [
      { label: "Active companies", value: "18", hint: "6 payroll outsourcing clients" },
      { label: "Pending approvals", value: "42", hint: "Payroll, leave, onboarding", tone: "warning" },
      { label: "Tasks due today", value: "19", hint: "Across all departments" },
      { label: "Payroll risk alerts", value: "3", hint: "Validation and compliance checks", tone: "critical" }
    ],
    quickActions: ["Open payroll period", "Review pending approvals", "Export board pack", "Publish announcement"],
    highlights: [
      "Finance is waiting on April payroll final approval for Nairobi Distribution.",
      "Three probation reviews are overdue and linked to confirmation decisions.",
      "Leave liability has increased 6.2% after quarter-end carry-forward."
    ],
    chartTitle: "Cross-module activity",
    chartData: [
      { label: "Payroll", value: 88, display: "88 workflow events" },
      { label: "People", value: 61, display: "61 employee updates" },
      { label: "Leave", value: 74, display: "74 leave actions" },
      { label: "Recruitment", value: 49, display: "49 hiring steps" }
    ]
  },
  {
    key: "people",
    title: "People",
    shortTitle: "People",
    icon: "PE",
    summary: "Digital employee file, organization structure, movement history, and lifecycle operations.",
    tagline: "Everything about the workforce, from hiring to clearance, in one governed record.",
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
      "Clearance Management"
    ],
    heroStats: [
      { label: "Employees", value: "1,248", hint: "Across 11 branches" },
      { label: "Documents missing", value: "31", hint: "IDs, contracts, statutory forms", tone: "warning" },
      { label: "Renewals due", value: "17", hint: "Within the next 45 days" },
      { label: "Transfers this quarter", value: "14", hint: "Mostly field operations" }
    ],
    quickActions: ["Add employee", "Import records", "Approve profile changes", "Run document expiry report"],
    highlights: [
      "Three employees are awaiting supervisor approval before record activation.",
      "Seven contract renewals require HR and finance review this week.",
      "Emergency contact coverage is at 94%, leaving 73 employees incomplete."
    ],
    chartTitle: "Workforce composition",
    chartData: [
      { label: "Permanent", value: 56, display: "56% permanent" },
      { label: "Contract", value: 24, display: "24% contract" },
      { label: "Casual", value: 14, display: "14% casual" },
      { label: "Interns", value: 6, display: "6% interns" }
    ]
  },
  {
    key: "payroll",
    title: "Payroll",
    shortTitle: "Payroll",
    icon: "PY",
    summary: "Kenya-ready payroll engine with approvals, statutory schedules, exports, payslips, and auditability.",
    tagline: "A full payroll command center built for compliance, approvals, and consultancy operations.",
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
      "Payroll Settings"
    ],
    heroStats: [
      { label: "Current payroll month", value: "Apr 2026", hint: "Pending final approval" },
      { label: "Gross pay", value: "KES 18.45M", hint: "1,044 active payroll employees" },
      { label: "Employer cost", value: "KES 19.77M", hint: "Incl. NSSF and levy" },
      { label: "Validation errors", value: "7", hint: "Missing bank and tax records", tone: "warning" }
    ],
    quickActions: ["Open payroll period", "Upload variable inputs", "Run payroll", "Generate payslips", "Export net-to-bank"],
    highlights: [
      "Two employees still have missing SHIF numbers before final release.",
      "Payroll variance is +4.3% versus March due to new hires and overtime.",
      "The finance review queue is waiting on one off-cycle payroll."
    ],
    chartTitle: "Payroll cost drivers",
    chartData: [
      { label: "Basic pay", value: 64, display: "KES 11.8M" },
      { label: "Allowances", value: 18, display: "KES 3.3M" },
      { label: "Statutory", value: 11, display: "KES 2.0M" },
      { label: "Other deductions", value: 7, display: "KES 1.3M" }
    ]
  },
  {
    key: "leave",
    title: "Leave & Attendance",
    shortTitle: "Leave",
    icon: "LV",
    summary: "Leave, rosters, attendance, timesheets, overtime, and payroll-linked exception handling.",
    tagline: "A connected operations hub for availability, time, and workforce presence.",
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
      "Weekend Rules"
    ],
    heroStats: [
      { label: "Leave requests", value: "26", hint: "8 pending supervisor action" },
      { label: "Absenteeism", value: "2.8%", hint: "Down from 3.4% last month" },
      { label: "Overtime hours", value: "412", hint: "Awaiting payroll sync" },
      { label: "Unpaid leave impact", value: "KES 124K", hint: "Queued for April payroll" }
    ],
    quickActions: ["Apply leave", "Approve overtime", "Import attendance", "Publish holiday calendar"],
    highlights: [
      "Three branch rosters are missing weekend rule assignments.",
      "Attendance exceptions are highest in distribution and field service teams.",
      "Nine overtime claims are waiting for supervisor verification."
    ],
    chartTitle: "Time and leave signals",
    chartData: [
      { label: "Annual leave", value: 42, display: "42 approved" },
      { label: "Sick leave", value: 15, display: "15 cases" },
      { label: "Overtime", value: 28, display: "28 active claims" },
      { label: "Exceptions", value: 15, display: "15 unresolved" }
    ]
  },
  {
    key: "recruitment",
    title: "Recruitment",
    shortTitle: "Hire",
    icon: "RC",
    summary: "ATS workflows for requisitions, vacancies, applicants, interviews, offers, and onboarding handoff.",
    tagline: "From manpower request to accepted offer, with clear stages and accountability.",
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
      "Onboarding Tasks"
    ],
    heroStats: [
      { label: "Open requisitions", value: "23", hint: "7 waiting finance approval" },
      { label: "Applicants", value: "418", hint: "Across 16 live vacancies" },
      { label: "Interviews this week", value: "12", hint: "Panel packs ready" },
      { label: "Offers in workflow", value: "5", hint: "2 pending payroll review" }
    ],
    quickActions: ["Create requisition", "Post vacancy", "Schedule interview", "Approve offer letter"],
    highlights: [
      "Time-to-hire is down to 24 days for operations roles.",
      "The CV bank has 63 pre-screened candidates ready for shortlisting.",
      "One offer is stalled because salary mapping is missing in payroll."
    ],
    chartTitle: "Hiring funnel",
    chartData: [
      { label: "Applied", value: 100, display: "418 applicants" },
      { label: "Shortlisted", value: 41, display: "171 shortlisted" },
      { label: "Interviewed", value: 18, display: "76 interviewed" },
      { label: "Offered", value: 5, display: "22 offers" }
    ]
  },
  {
    key: "performance",
    title: "Performance",
    shortTitle: "Perform",
    icon: "PF",
    summary: "Goals, reviews, appraisals, succession, and growth planning across teams and cycles.",
    tagline: "A more structured performance engine with visible cycles, talent signals, and action plans.",
    items: [
      "KPIs",
      "Appraisals",
      "Goals",
      "Performance Reviews",
      "Performance Improvement Plans",
      "Promotions",
      "Succession Planning",
      "Talent Matrix"
    ],
    heroStats: [
      { label: "Q2 completion", value: "73%", hint: "Review submissions in progress" },
      { label: "PIPs active", value: "11", hint: "6 need HR follow-up", tone: "warning" },
      { label: "Successor coverage", value: "68%", hint: "For critical roles" },
      { label: "Promotion cases", value: "9", hint: "Awaiting calibration" }
    ],
    quickActions: ["Launch appraisal cycle", "Create PIP", "Review talent matrix", "Approve promotion case"],
    highlights: [
      "Field operations still trail the business in appraisal completion.",
      "Three key roles have no ready-now successor identified.",
      "Goal quality is strongest where managers use weighted scorecards."
    ],
    chartTitle: "Performance distribution",
    chartData: [
      { label: "Exceeding", value: 22, display: "22% top performers" },
      { label: "Strong", value: 41, display: "41% strong performers" },
      { label: "Stable", value: 28, display: "28% stable performers" },
      { label: "At risk", value: 9, display: "9% at risk" }
    ]
  },
  {
    key: "training",
    title: "Training",
    shortTitle: "Train",
    icon: "TR",
    summary: "Training demand, programme delivery, certifications, and learning evidence.",
    tagline: "Practical workforce development tied back to performance and compliance.",
    items: [
      "Training Calendar",
      "Training Requests",
      "Training Programs",
      "Certifications",
      "Learning History",
      "Training Reports"
    ],
    heroStats: [
      { label: "Requests", value: "34", hint: "12 pending approval" },
      { label: "Programs live", value: "18", hint: "Safety, sales, systems" },
      { label: "Compliance certs", value: "91%", hint: "Current certification rate" },
      { label: "Spend YTD", value: "KES 3.2M", hint: "Against KES 4.0M budget" }
    ],
    quickActions: ["Create program", "Approve request", "Upload certificate", "Export training register"],
    highlights: [
      "Mandatory safety recertification is due for 27 plant staff next month.",
      "Two managers have linked training actions directly to appraisal gaps.",
      "Learning budget burn is strongest in customer-facing teams."
    ],
    chartTitle: "Learning mix",
    chartData: [
      { label: "Mandatory", value: 39, display: "39% mandatory" },
      { label: "Technical", value: 31, display: "31% technical" },
      { label: "Leadership", value: 17, display: "17% leadership" },
      { label: "External", value: 13, display: "13% external" }
    ]
  },
  {
    key: "assets",
    title: "Assets",
    shortTitle: "Assets",
    icon: "AS",
    summary: "Track company assets, assignments, maintenance, recovery, and employee accountability.",
    tagline: "A clean asset trail that supports onboarding, transfers, and offboarding.",
    items: ["Company Assets", "Asset Allocation", "Asset Returns", "Asset Maintenance", "Asset History"],
    heroStats: [
      { label: "Tracked assets", value: "2,406", hint: "Devices, tools, vehicles, furniture" },
      { label: "Overdue returns", value: "14", hint: "Mostly offboarding cases", tone: "warning" },
      { label: "Maintenance due", value: "21", hint: "Fleet and IT equipment" },
      { label: "Unassigned stock", value: "128", hint: "Ready for deployment" }
    ],
    quickActions: ["Assign asset", "Log return", "Schedule maintenance", "Export asset register"],
    highlights: [
      "Three terminated employees still have open asset recovery steps.",
      "Vehicle service compliance is strongest in Mombasa and Kisumu.",
      "Laptop assignment SLA for new hires is currently 96%."
    ],
    chartTitle: "Asset categories",
    chartData: [
      { label: "IT devices", value: 48, display: "48% IT devices" },
      { label: "Fleet", value: 19, display: "19% fleet" },
      { label: "Tools", value: 23, display: "23% tools" },
      { label: "Office", value: 10, display: "10% office" }
    ]
  },
  {
    key: "self-service",
    title: "Employee Self Service",
    shortTitle: "ESS",
    icon: "ES",
    summary: "Personal workspace for requests, payslips, attendance, documents, training, and communication.",
    tagline: "A clear employee portal that feels useful, not buried under admin menus.",
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
      "My Notifications"
    ],
    heroStats: [
      { label: "Portal adoption", value: "87%", hint: "Monthly active employees" },
      { label: "Self-service changes", value: "94", hint: "Pending verification" },
      { label: "Payslip views", value: "1,204", hint: "This month" },
      { label: "Unread notifications", value: "312", hint: "Announcements and approvals" }
    ],
    quickActions: ["View payslip", "Apply leave", "Update profile", "Check training history"],
    highlights: [
      "Most self-service traffic is on payroll release days and leave approvals.",
      "Employees are actively updating personal data when verification is clearly shown.",
      "Mobile usage is strongest among branch and field staff."
    ],
    chartTitle: "Employee portal usage",
    chartData: [
      { label: "Payslips", value: 36, display: "36% payslip activity" },
      { label: "Leave", value: 24, display: "24% leave activity" },
      { label: "Profile", value: 18, display: "18% profile actions" },
      { label: "Training", value: 22, display: "22% other actions" }
    ]
  },
  {
    key: "reports",
    title: "Reports",
    shortTitle: "Reports",
    icon: "RP",
    summary: "Cross-module reporting, exports, analytics, board packs, and custom report design.",
    tagline: "A universal reporting layer that turns operations into decision-ready output.",
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
      "Custom Report Builder"
    ],
    heroStats: [
      { label: "Saved templates", value: "42", hint: "Role-based access enabled" },
      { label: "Scheduled reports", value: "16", hint: "Executive, payroll, compliance" },
      { label: "Exports today", value: "27", hint: "CSV, Excel, PDF" },
      { label: "Board pack status", value: "Ready", hint: "April executive snapshot" }
    ],
    quickActions: ["Run report", "Schedule export", "Build custom template", "Download board pack"],
    highlights: [
      "Payroll and compliance exports remain the most frequently used outputs.",
      "The strongest consultancy differentiator is custom report building without engineering work.",
      "Branch comparisons are requested most by multi-site clients."
    ],
    chartTitle: "Report usage",
    chartData: [
      { label: "Payroll", value: 44, display: "44% payroll reports" },
      { label: "HR", value: 22, display: "22% HR reports" },
      { label: "Compliance", value: 18, display: "18% compliance reports" },
      { label: "Executive", value: 16, display: "16% executive reports" }
    ]
  },
  {
    key: "settings",
    title: "Settings",
    shortTitle: "Settings",
    icon: "ST",
    summary: "Company setup, rules, workflows, permissions, branding, and security controls.",
    tagline: "The operating model behind the product, with less hidden setup and more clarity.",
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
      "Security Settings"
    ],
    heroStats: [
      { label: "Active roles", value: "27", hint: "Granular permission bundles" },
      { label: "Workflow templates", value: "14", hint: "Payroll, leave, recruitment, HR ops" },
      { label: "2FA adoption", value: "92%", hint: "Admin accounts only" },
      { label: "Configuration changes", value: "8", hint: "This week, all audited" }
    ],
    quickActions: ["Create role", "Edit workflow", "Update branding", "Review security policies"],
    highlights: [
      "Approval workflow design must keep operator and supervisor duties separate.",
      "Security controls now surface timeout, MFA, and export permissions together.",
      "Branding and notification setup can be company-specific in consultancy mode."
    ],
    chartTitle: "Configuration coverage",
    chartData: [
      { label: "People setup", value: 24, display: "24% people setup" },
      { label: "Payroll rules", value: 31, display: "31% payroll rules" },
      { label: "Security", value: 25, display: "25% security" },
      { label: "Messaging", value: 20, display: "20% messaging" }
    ]
  },
  {
    key: "audit",
    title: "Audit Trail",
    shortTitle: "Audit",
    icon: "AU",
    summary: "Accountability layer for user actions, approvals, payroll changes, downloads, and access history.",
    tagline: "If something changed, reopened, exported, or got approved, this is where it should be visible.",
    items: [
      "User Activities",
      "Payroll Changes",
      "Salary Changes",
      "Employee Record Changes",
      "Login History",
      "Approval History",
      "Report Downloads",
      "Export Logs"
    ],
    heroStats: [
      { label: "Events today", value: "1,284", hint: "Filtered across all modules" },
      { label: "Sensitive changes", value: "17", hint: "Salary and bank detail updates", tone: "warning" },
      { label: "Failed logins", value: "4", hint: "All blocked after retry limit" },
      { label: "Exports logged", value: "63", hint: "Payroll and compliance heavy" }
    ],
    quickActions: ["Search activities", "Review salary changes", "Audit report downloads", "Export audit extract"],
    highlights: [
      "Audit design is central to operator-supervisor separation and consultancy accountability.",
      "Payroll reopen events are isolated for quick reviewer attention.",
      "Download logging helps prove compliance on sensitive exports."
    ],
    chartTitle: "Audit event mix",
    chartData: [
      { label: "Approvals", value: 34, display: "34% approvals" },
      { label: "Edits", value: 27, display: "27% data changes" },
      { label: "Exports", value: 21, display: "21% exports" },
      { label: "Access", value: 18, display: "18% access events" }
    ]
  },
  {
    key: "integrations",
    title: "Integrations",
    shortTitle: "Links",
    icon: "IN",
    summary: "External connections for statutory filing, banks, biometrics, accounting, messaging, and providers.",
    tagline: "Built to connect with the real outside world, not stay trapped inside the HRIS.",
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
      "SMS Services"
    ],
    heroStats: [
      { label: "Connected services", value: "9", hint: "Across banking, tax, and messaging" },
      { label: "Templates mapped", value: "22", hint: "Bank and statutory formats" },
      { label: "Sync failures", value: "2", hint: "One biometric, one SMS", tone: "warning" },
      { label: "Last successful export", value: "08:24", hint: "KRA support schedule" }
    ],
    quickActions: ["Configure integration", "Download template", "Review sync log", "Test connection"],
    highlights: [
      "Bank-specific export formats should be configurable, not coded one-by-one forever.",
      "Biometric readiness matters even before device integration is live.",
      "Consultancy users need visibility into client compliance connectors."
    ],
    chartTitle: "Integration readiness",
    chartData: [
      { label: "Statutory", value: 29, display: "29% statutory" },
      { label: "Banking", value: 24, display: "24% banking" },
      { label: "Time", value: 19, display: "19% attendance" },
      { label: "Messaging", value: 28, display: "28% messaging" }
    ]
  },
  {
    key: "consultancy",
    title: "Consultancy Dashboard",
    shortTitle: "Advisory",
    icon: "CD",
    summary: "Multi-company oversight for Solva HR Consultancy with comparisons, alerts, and board-ready insight.",
    tagline: "See every client operation clearly, compare them intelligently, and intervene where it matters.",
    items: [
      "Multi-company Dashboard",
      "Company Comparison Reports",
      "Wage Bill Analysis",
      "Employee Turnover Analysis",
      "Payroll Error Alerts",
      "Compliance Tracker",
      "Branch Comparison Reports",
      "Board Reports",
      "Custom Consultancy Reports"
    ],
    heroStats: [
      { label: "Client companies", value: "18", hint: "7 enterprise, 6 SME, 5 NGO" },
      { label: "Payroll exceptions", value: "11", hint: "Across 4 clients", tone: "warning" },
      { label: "Compliance status", value: "94%", hint: "Weighted across filings" },
      { label: "Turnover hotspots", value: "3", hint: "Need consultancy attention" }
    ],
    quickActions: ["Open client view", "Run comparison", "Export board report", "Review compliance tracker"],
    highlights: [
      "This is where Solva HR becomes a commercial consultancy operating system, not just software.",
      "Cross-client wage bill analysis is especially useful for outsourced payroll service delivery.",
      "Error alerts should surface before clients call support."
    ],
    chartTitle: "Client portfolio view",
    chartData: [
      { label: "Healthy", value: 61, display: "11 companies healthy" },
      { label: "Watchlist", value: 22, display: "4 companies watchlist" },
      { label: "Compliance risk", value: 11, display: "2 companies at risk" },
      { label: "Escalated", value: 6, display: "1 escalated" }
    ]
  }
];

const defaultColumns: TableColumn[] = [
  { key: "item", label: "Item" },
  { key: "owner", label: "Owner" },
  { key: "status", label: "Status" },
  { key: "updated", label: "Updated" }
];

const defaultRows: TableRow[] = [
  { item: "Configuration review", owner: "HR Admin", status: "In progress", updated: "Today, 08:30" },
  { item: "Supervisor approval", owner: "Supervisor", status: "Waiting", updated: "Today, 10:14" },
  { item: "Export package", owner: "Finance Officer", status: "Ready", updated: "Yesterday" }
];

const customPageData: Record<string, Omit<WorkspacePage, "title">> = {
  "dashboard:overview": {
    description: "Command center for approvals, workforce movement, payroll readiness, and what needs attention first.",
    metrics: [
      { label: "Unread notifications", value: "23", hint: "Payroll, approvals, and client updates" },
      { label: "Approvals due", value: "42", hint: "Operator-supervisor maker-checker queues" },
      { label: "Open tasks", value: "19", hint: "Today across all modules" },
      { label: "Reports ready", value: "8", hint: "Board and management packs" }
    ],
    quickActions: ["View alerts", "Approve requests", "Open daily checklist", "Run executive snapshot"],
    filters: ["Today", "This week", "All companies", "High priority"],
    highlights: [
      "Payroll is the highest-risk operational area and should stay near the top of the dashboard.",
      "Pending approvals should clearly separate who prepared, reviewed, and approved each step.",
      "The dashboard is designed to answer what needs attention before the user hunts through menus."
    ],
    chartTitle: "Daily workload mix",
    chartData: [
      { label: "Approvals", value: 41, display: "41% approvals" },
      { label: "Payroll work", value: 26, display: "26% payroll work" },
      { label: "People updates", value: 18, display: "18% people updates" },
      { label: "Reporting", value: 15, display: "15% reporting" }
    ],
    table: {
      title: "Priority queue",
      description: "Everything that needs action first, with owner and latest movement.",
      columns: [
        { key: "item", label: "Queue item" },
        { key: "owner", label: "Next owner" },
        { key: "status", label: "Status" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { item: "April payroll final approval", owner: "Company Admin", status: "Pending final sign-off", updated: "Today, 09:12" },
        { item: "New employee record request", owner: "Supervisor", status: "Waiting supervisor approval", updated: "Today, 08:45" },
        { item: "Branch leave roster conflict", owner: "HR Admin", status: "Needs rescheduling", updated: "Today, 07:58" },
        { item: "Client compliance tracker pack", owner: "Consultancy Lead", status: "Ready for export", updated: "Yesterday" }
      ]
    }
  },
  "people:employee-directory": {
    description: "Live workforce register with employment, branch, supervisor, and compliance visibility.",
    metrics: [
      { label: "Directory records", value: "1,248", hint: "11 branches and 73 departments" },
      { label: "Awaiting approval", value: "4", hint: "Created by operator, waiting supervisor" },
      { label: "Missing IDs", value: "12", hint: "Critical for payroll onboarding", tone: "warning" },
      { label: "Transfers pending", value: "6", hint: "Branch and cost center changes" }
    ],
    quickActions: ["Add employee", "Import batch", "Approve new record", "Export staff list"],
    filters: ["All branches", "Active", "Permanent", "Missing docs"],
    highlights: [
      "A junior operator can prepare a record, but the supervisor should always activate it.",
      "Directory filters should make branch, department, job grade, and employment type easy to combine.",
      "Auditability matters most around changes to salary, bank, and statutory data."
    ],
    chartTitle: "Headcount by branch",
    chartData: [
      { label: "Nairobi", value: 44, display: "552 employees" },
      { label: "Mombasa", value: 21, display: "264 employees" },
      { label: "Kisumu", value: 18, display: "221 employees" },
      { label: "Field", value: 17, display: "211 employees" }
    ],
    table: {
      title: "Employee directory",
      description: "Current staff with the fields HR and payroll use every day.",
      columns: [
        { key: "employee", label: "Employee" },
        { key: "department", label: "Department" },
        { key: "branch", label: "Branch" },
        { key: "status", label: "Status" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { employee: "SOL-001 Amina Otieno", department: "People Operations", branch: "Nairobi HQ", status: "Active", updated: "Today" },
        { employee: "SOL-018 Brian Mwangi", department: "Distribution", branch: "Mombasa", status: "Probation", updated: "Yesterday" },
        { employee: "SOL-044 Mercy Njeri", department: "Finance", branch: "Nairobi HQ", status: "Pending supervisor approval", updated: "Today, 08:45" },
        { employee: "SOL-067 Daniel Oloo", department: "Field Service", branch: "Kisumu", status: "Transfer in progress", updated: "Yesterday" }
      ]
    }
  },
  "payroll:payroll-dashboard": {
    description: "End-to-end Kenyan payroll workspace with period status, validation, statutory view, and release controls.",
    metrics: [
      { label: "Payroll month", value: "Apr 2026", hint: "Status: Pending Approval" },
      { label: "Active payroll employees", value: "1,044", hint: "Across 4 payroll groups" },
      { label: "Net pay", value: "KES 13.94M", hint: "Ready for bank export" },
      { label: "PAYE total", value: "KES 2.48M", hint: "After reliefs and exemptions" }
    ],
    quickActions: ["Open period", "Run validation", "Process payroll", "Generate payslips", "Export statutorys"],
    filters: ["Apr 2026", "Monthly", "All branches", "All payroll groups"],
    highlights: [
      "Payroll should feel like a command room, not a single table buried in a generic module.",
      "Kenyan statutory outputs need to be visible before users export them, not hidden at the end.",
      "Variance and audit visibility must be one click away during review."
    ],
    chartTitle: "Wage bill trend",
    chartData: [
      { label: "Jan", value: 71, display: "KES 17.1M" },
      { label: "Feb", value: 74, display: "KES 17.8M" },
      { label: "Mar", value: 77, display: "KES 18.2M" },
      { label: "Apr", value: 80, display: "KES 18.45M" }
    ],
    table: {
      title: "Recent payroll runs",
      description: "Operational snapshot of processed, pending, and reopened periods.",
      columns: [
        { key: "period", label: "Period" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "owner", label: "Owner" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { period: "Apr 2026", type: "Full month", status: "Pending approval", owner: "Payroll Admin", updated: "Today" },
        { period: "Apr 2026 Mid", type: "Half month", status: "Approved", owner: "Finance Officer", updated: "5 days ago" },
        { period: "Mar 2026", type: "Full month", status: "Closed", owner: "Company Admin", updated: "31 Mar" },
        { period: "Mar Bonus", type: "Bonus payroll", status: "Closed", owner: "Payroll Admin", updated: "28 Mar" }
      ]
    }
  },
  "leave:leave-dashboard": {
    description: "Operational picture of leave demand, attendance compliance, roster pressure, and overtime exposure.",
    metrics: [
      { label: "Open leave requests", value: "26", hint: "8 need supervisor action" },
      { label: "Leave liability", value: "KES 6.8M", hint: "Annual leave liability" },
      { label: "Attendance exceptions", value: "19", hint: "Late, absent, incomplete logs" },
      { label: "Overtime claims", value: "28", hint: "Pending validation and approval" }
    ],
    quickActions: ["Submit leave", "Approve queue", "Import attendance", "Publish roster"],
    filters: ["This month", "All leave types", "All branches", "Pending only"],
    highlights: [
      "Leave and attendance are linked because unpaid leave and overtime directly influence payroll.",
      "Calendar visibility matters for line managers more than generic report lists.",
      "The cleanest design keeps requests, balances, and attendance exceptions in one operational flow."
    ],
    chartTitle: "Leave mix",
    chartData: [
      { label: "Annual", value: 48, display: "48% annual" },
      { label: "Sick", value: 21, display: "21% sick" },
      { label: "Compassionate", value: 11, display: "11% compassionate" },
      { label: "Other", value: 20, display: "20% other" }
    ],
    table: {
      title: "Current exception queue",
      description: "The items most likely to affect staffing and payroll in the current period.",
      columns: [
        { key: "item", label: "Case" },
        { key: "owner", label: "Owner" },
        { key: "status", label: "Status" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { item: "Annual leave request - Nairobi Sales", owner: "Supervisor", status: "Awaiting approval", updated: "Today" },
        { item: "Missing clock-out - Kisumu Branch", owner: "Attendance Officer", status: "Needs correction", updated: "Today" },
        { item: "Overtime claim - Distribution", owner: "Payroll Admin", status: "Validated for payroll", updated: "Yesterday" },
        { item: "Unpaid leave deduction review", owner: "HR Admin", status: "Queued for payroll", updated: "Yesterday" }
      ]
    }
  },
  "recruitment:job-requisitions": {
    description: "Hiring demand control with headcount need, budget tagging, and approval accountability.",
    metrics: [
      { label: "Open requisitions", value: "23", hint: "7 waiting finance sign-off" },
      { label: "Budget tagged", value: "91%", hint: "Coverage on approved requisitions" },
      { label: "Approval breaches", value: "2", hint: "SLA exceeded", tone: "warning" },
      { label: "Time to approve", value: "2.4 days", hint: "Average" }
    ],
    quickActions: ["Create requisition", "Approve request", "View vacancies", "Export pipeline"],
    filters: ["Open", "This quarter", "All branches", "Budget tagged"],
    highlights: [
      "Requisitions should pass through manager, HR, and finance where the policy requires it.",
      "The best recruitment UX shows demand, budget, and pipeline together.",
      "Offer letters must link back into onboarding and payroll setup."
    ],
    chartTitle: "Requisition status",
    chartData: [
      { label: "Draft", value: 17, display: "4 drafts" },
      { label: "Pending", value: 39, display: "9 pending" },
      { label: "Approved", value: 31, display: "7 approved" },
      { label: "Filled", value: 13, display: "3 filled" }
    ],
    table: {
      title: "Requisition queue",
      description: "Approved, pending, and escalated hiring requests.",
      columns: [
        { key: "role", label: "Role" },
        { key: "department", label: "Department" },
        { key: "status", label: "Status" },
        { key: "owner", label: "Next owner" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { role: "Payroll Analyst", department: "Finance", status: "Pending finance approval", owner: "Finance Officer", updated: "Today" },
        { role: "Sales Supervisor", department: "Commercial", status: "Approved", owner: "Recruiter", updated: "Yesterday" },
        { role: "HR Assistant", department: "People", status: "Draft", owner: "HR Admin", updated: "Today" },
        { role: "Warehouse Clerk", department: "Operations", status: "Escalated", owner: "HR Lead", updated: "Yesterday" }
      ]
    }
  },
  "performance:kpis": {
    description: "Visible performance engine for KPIs, cycles, appraisals, and growth actions.",
    metrics: [
      { label: "Active KPIs", value: "186", hint: "Cascaded across teams" },
      { label: "Review completion", value: "73%", hint: "Q2 in progress" },
      { label: "High-potential pool", value: "41", hint: "Mapped in talent matrix" },
      { label: "PIPs active", value: "11", hint: "Need HR follow-through", tone: "warning" }
    ],
    quickActions: ["Create KPI", "Launch review", "Open talent matrix", "Record calibration decision"],
    filters: ["Q2 2026", "All departments", "All grades", "Active only"],
    highlights: [
      "Solva HR should feel stronger than legacy HR systems by making performance work visible and navigable.",
      "Promotion and succession decisions belong near performance, not hidden in disconnected admin forms.",
      "Managers need progress visibility without losing structure and auditability."
    ],
    chartTitle: "Cycle progress",
    chartData: [
      { label: "Not started", value: 11, display: "11% not started" },
      { label: "In progress", value: 36, display: "36% in progress" },
      { label: "Manager review", value: 29, display: "29% manager review" },
      { label: "Completed", value: 24, display: "24% completed" }
    ],
    table: {
      title: "Performance watchlist",
      description: "Items that need action before the cycle closes.",
      columns: [
        { key: "item", label: "Employee or case" },
        { key: "owner", label: "Owner" },
        { key: "status", label: "Status" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { item: "Brian Mwangi probation review", owner: "Line Manager", status: "Awaiting recommendation", updated: "Today" },
        { item: "Commercial team calibration", owner: "HR Admin", status: "Scheduled", updated: "Tomorrow" },
        { item: "PIP follow-up - Support Team", owner: "People Partner", status: "In progress", updated: "Yesterday" },
        { item: "Succession gap - Plant Manager", owner: "HR Director", status: "At risk", updated: "Yesterday" }
      ]
    }
  },
  "training:training-calendar": {
    description: "Training operations workspace linking requests, compliance, and learning records.",
    metrics: [
      { label: "Sessions this month", value: "18", hint: "Internal and external" },
      { label: "Requests pending", value: "12", hint: "Awaiting approval" },
      { label: "Certification renewals", value: "27", hint: "Next 30 days", tone: "warning" },
      { label: "Completion rate", value: "89%", hint: "Current period" }
    ],
    quickActions: ["Schedule training", "Approve request", "Upload certificate", "Export learning report"],
    filters: ["This quarter", "Mandatory", "All departments", "Budgeted"],
    highlights: [
      "Training should pull from skill gaps, compliance needs, and employee requests together.",
      "The strongest training view shows both calendar operations and evidence of completion.",
      "Certification expiry deserves the same visibility as document expiry."
    ],
    chartTitle: "Training allocation",
    chartData: [
      { label: "Safety", value: 33, display: "33% safety" },
      { label: "Systems", value: 24, display: "24% systems" },
      { label: "Leadership", value: 19, display: "19% leadership" },
      { label: "Sales", value: 24, display: "24% sales" }
    ],
    table: {
      title: "Training plan",
      description: "Near-term sessions and approvals.",
      columns: [
        { key: "program", label: "Program" },
        { key: "owner", label: "Owner" },
        { key: "status", label: "Status" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { program: "Safety refresher", owner: "L&D Officer", status: "Scheduled", updated: "Today" },
        { program: "ERP onboarding", owner: "IT Trainer", status: "Open for enrollment", updated: "Yesterday" },
        { program: "Leadership bootcamp", owner: "HR Admin", status: "Pending approval", updated: "Today" },
        { program: "Forklift certification", owner: "Operations Lead", status: "Renewal required", updated: "Yesterday" }
      ]
    }
  },
  "assets:company-assets": {
    description: "Asset accountability workspace for assignment, maintenance, return, and traceability.",
    metrics: [
      { label: "Assets in service", value: "2,278", hint: "Active assignments and stock" },
      { label: "Allocated today", value: "6", hint: "Mostly onboarding kits" },
      { label: "Returns overdue", value: "14", hint: "Open recovery action", tone: "warning" },
      { label: "Maintenance due", value: "21", hint: "Fleet and devices" }
    ],
    quickActions: ["Register asset", "Assign asset", "Log return", "Schedule maintenance"],
    filters: ["All asset types", "Active", "All branches", "Overdue"],
    highlights: [
      "Assets should tie into onboarding and offboarding so accountability is never manual.",
      "Maintenance and return history is part of the commercial strength for multi-branch clients.",
      "The UI should keep operational status visible without forcing users into spreadsheet exports."
    ],
    chartTitle: "Asset exposure",
    chartData: [
      { label: "Assigned", value: 73, display: "73% assigned" },
      { label: "In stock", value: 14, display: "14% in stock" },
      { label: "Maintenance", value: 8, display: "8% maintenance" },
      { label: "Recovery", value: 5, display: "5% recovery" }
    ],
    table: {
      title: "Asset register highlights",
      description: "High-priority items from the asset book.",
      columns: [
        { key: "asset", label: "Asset" },
        { key: "owner", label: "Assigned to" },
        { key: "status", label: "Status" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { asset: "Laptop LT-219", owner: "Faith Wambui", status: "Ready for onboarding", updated: "Today" },
        { asset: "Vehicle KBX 412Z", owner: "Distribution Team", status: "Maintenance due", updated: "Tomorrow" },
        { asset: "Mobile handset MH-083", owner: "Exited employee", status: "Return overdue", updated: "3 days ago" },
        { asset: "Printer PR-114", owner: "Kisumu Branch", status: "In service", updated: "Yesterday" }
      ]
    }
  },
  "self-service:my-dashboard": {
    description: "Employee-first workspace for payslips, requests, attendance, documents, and personal actions.",
    metrics: [
      { label: "My requests", value: "4", hint: "2 awaiting approval" },
      { label: "Leave balance", value: "17.5 days", hint: "Annual leave balance" },
      { label: "Latest payslip", value: "Apr 2026", hint: "Released" },
      { label: "Unread notices", value: "3", hint: "Team and company announcements" }
    ],
    quickActions: ["Download payslip", "Apply leave", "Update profile", "View appraisal"],
    filters: ["Current month", "My records", "My approvals", "Unread"],
    highlights: [
      "Self-service should feel like a clear personal workspace, not a cut-down admin screen.",
      "The most-used actions should be one or two taps away on mobile and desktop.",
      "Payslips, leave, and requests drive the bulk of employee portal engagement."
    ],
    chartTitle: "Personal activity",
    chartData: [
      { label: "Payroll", value: 32, display: "32% payroll" },
      { label: "Leave", value: 29, display: "29% leave" },
      { label: "Profile", value: 18, display: "18% profile" },
      { label: "Training", value: 21, display: "21% training and other" }
    ],
    table: {
      title: "My recent actions",
      description: "Requests and updates from the employee point of view.",
      columns: [
        { key: "item", label: "Request or item" },
        { key: "owner", label: "Current owner" },
        { key: "status", label: "Status" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { item: "Annual leave request", owner: "Supervisor", status: "Pending approval", updated: "Today" },
        { item: "Profile phone update", owner: "HR Admin", status: "Verification in progress", updated: "Yesterday" },
        { item: "April payslip", owner: "Payroll", status: "Released", updated: "2 days ago" },
        { item: "Safety training certificate", owner: "L&D Officer", status: "Recorded", updated: "Last week" }
      ]
    }
  },
  "reports:hr-reports": {
    description: "Cross-functional reporting workspace with filters, scheduled exports, and custom report design.",
    metrics: [
      { label: "Templates available", value: "42", hint: "Reusable report definitions" },
      { label: "Scheduled jobs", value: "16", hint: "Daily, weekly, monthly" },
      { label: "Exports today", value: "27", hint: "PDF, Excel, CSV" },
      { label: "Role restrictions", value: "Enabled", hint: "Controlled access and download logs" }
    ],
    quickActions: ["Run report", "Schedule export", "Clone template", "Open report builder"],
    filters: ["This month", "All branches", "PDF and Excel", "Role-based"],
    highlights: [
      "The report layer is one of Solva HR's clearest commercial differentiators.",
      "Users should be able to mix filters, columns, and grouping without asking engineering for help.",
      "Export logging must stay visible because payroll and compliance reports are sensitive."
    ],
    chartTitle: "Scheduled report mix",
    chartData: [
      { label: "Payroll", value: 35, display: "35% payroll" },
      { label: "Compliance", value: 23, display: "23% compliance" },
      { label: "HR", value: 24, display: "24% HR" },
      { label: "Executive", value: 18, display: "18% executive" }
    ],
    table: {
      title: "Active report templates",
      description: "Frequently used report definitions and exports.",
      columns: [
        { key: "report", label: "Report" },
        { key: "owner", label: "Owner" },
        { key: "status", label: "Access" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { report: "Payroll register", owner: "Payroll Admin", status: "Restricted", updated: "Today" },
        { report: "Headcount by branch", owner: "HR Admin", status: "Shared", updated: "Yesterday" },
        { report: "Compliance tracker", owner: "Auditor", status: "Restricted", updated: "Today" },
        { report: "Board pack", owner: "Consultancy Lead", status: "Executive only", updated: "Yesterday" }
      ]
    }
  },
  "settings:company-settings": {
    description: "Core system configuration for rules, access, workflow, branding, and operational defaults.",
    metrics: [
      { label: "Companies configured", value: "18", hint: "Multi-tenant ready" },
      { label: "Workflow templates", value: "14", hint: "HR and payroll flows" },
      { label: "Permissions", value: "148", hint: "Granular action controls" },
      { label: "MFA coverage", value: "92%", hint: "Admin and supervisor personas" }
    ],
    quickActions: ["Create role", "Edit permission", "Update workflow", "Review security"],
    filters: ["All companies", "Active settings", "Security critical", "Recently changed"],
    highlights: [
      "Maker-checker design belongs in settings and workflow logic, not in informal team habit.",
      "A supervisor must be able to approve what an operator prepared, but not the reverse.",
      "The cleanest settings UX keeps company structure, rules, and permissions understandable."
    ],
    chartTitle: "Settings focus",
    chartData: [
      { label: "Structure", value: 26, display: "26% structure" },
      { label: "Payroll", value: 28, display: "28% payroll" },
      { label: "Security", value: 24, display: "24% security" },
      { label: "Messaging", value: 22, display: "22% messaging" }
    ],
    table: {
      title: "Recent configuration changes",
      description: "High-impact configuration items with accountability.",
      columns: [
        { key: "item", label: "Configuration item" },
        { key: "owner", label: "Changed by" },
        { key: "status", label: "Status" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { item: "Approval workflow - employee creation", owner: "Super Admin", status: "Active", updated: "Today" },
        { item: "Payroll rule - SHIF mapping", owner: "Payroll Admin", status: "Updated", updated: "Yesterday" },
        { item: "Role profile - Supervisor", owner: "Security Admin", status: "Reviewed", updated: "Yesterday" },
        { item: "Branding - client portal", owner: "Company Admin", status: "Pending publish", updated: "Today" }
      ]
    }
  },
  "audit:user-activities": {
    description: "Searchable action history for every sensitive update, approval, export, and access attempt.",
    metrics: [
      { label: "Events today", value: "1,284", hint: "Across all tenants" },
      { label: "Salary changes", value: "6", hint: "All supervisor-reviewed" },
      { label: "Bank edits", value: "4", hint: "Awaiting audit sign-off", tone: "warning" },
      { label: "Login anomalies", value: "2", hint: "Blocked and logged" }
    ],
    quickActions: ["Search logs", "Filter payroll changes", "Review approvals", "Export trail"],
    filters: ["Today", "High risk", "All users", "All modules"],
    highlights: [
      "The audit trail should make accountability feel obvious, not forensic.",
      "Before-and-after values matter most for salary, bank, statutory, and workflow changes.",
      "Download logs are part of security, not a nice-to-have."
    ],
    chartTitle: "Sensitive activity mix",
    chartData: [
      { label: "Payroll changes", value: 29, display: "29% payroll" },
      { label: "Profile edits", value: 27, display: "27% employee records" },
      { label: "Approvals", value: 25, display: "25% approvals" },
      { label: "Exports", value: 19, display: "19% exports" }
    ],
    table: {
      title: "Latest audit events",
      description: "Recent accountable actions across the system.",
      columns: [
        { key: "item", label: "Action" },
        { key: "owner", label: "User" },
        { key: "status", label: "Outcome" },
        { key: "updated", label: "Timestamp" }
      ],
      rows: [
        { item: "Approved employee record activation", owner: "supervisor@solvahr.app", status: "Success", updated: "Today, 09:14" },
        { item: "Updated bank details", owner: "hradmin@solvahr.app", status: "Awaiting review", updated: "Today, 08:41" },
        { item: "Reopened payroll period", owner: "payrolladmin@solvahr.app", status: "Logged", updated: "Yesterday, 17:06" },
        { item: "Downloaded SHIF schedule", owner: "finance@solvahr.app", status: "Logged", updated: "Yesterday, 15:22" }
      ]
    }
  },
  "integrations:kra": {
    description: "Connectivity layer for statutory bodies, banks, providers, and operational systems.",
    metrics: [
      { label: "Mapped templates", value: "22", hint: "Exports and support schedules" },
      { label: "Connections healthy", value: "9", hint: "Across all configured endpoints" },
      { label: "Sync retries", value: "2", hint: "Need support review", tone: "warning" },
      { label: "Last validation", value: "08:24", hint: "Today" }
    ],
    quickActions: ["Test endpoint", "Download format", "Map fields", "Review sync log"],
    filters: ["All integrations", "Healthy", "Requires action", "Recently changed"],
    highlights: [
      "Integrations need to be managed as operational products, not just credentials in a hidden form.",
      "Field mapping and export template configuration matter more than flashy labels here.",
      "Banks and statutory schedules should support changing formats without code rewrites each time."
    ],
    chartTitle: "Integration health",
    chartData: [
      { label: "Healthy", value: 73, display: "73% healthy" },
      { label: "Watching", value: 18, display: "18% watchlist" },
      { label: "Retrying", value: 6, display: "6% retrying" },
      { label: "Paused", value: 3, display: "3% paused" }
    ],
    table: {
      title: "Connection map",
      description: "External services and their current state.",
      columns: [
        { key: "item", label: "Integration" },
        { key: "owner", label: "Owner" },
        { key: "status", label: "Health" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { item: "KRA PAYE support schedule", owner: "Payroll Admin", status: "Healthy", updated: "Today" },
        { item: "SHIF contribution export", owner: "Finance Officer", status: "Healthy", updated: "Today" },
        { item: "Co-op bank EFT template", owner: "Payroll Admin", status: "Needs validation", updated: "Yesterday" },
        { item: "Biometric device sync", owner: "IT Support", status: "Retrying", updated: "Today" }
      ]
    }
  },
  "consultancy:multi-company-dashboard": {
    description: "Portfolio control room for Solva HR Consultancy across client payroll, people, compliance, and risk.",
    metrics: [
      { label: "Client companies", value: "18", hint: "With shared operating standards" },
      { label: "Watchlist clients", value: "4", hint: "Need close operational follow-up", tone: "warning" },
      { label: "Payroll alerts", value: "11", hint: "Across 4 client runs" },
      { label: "Board packs due", value: "3", hint: "This week" }
    ],
    quickActions: ["Open client profile", "Run comparison", "Review compliance tracker", "Export board pack"],
    filters: ["All clients", "This month", "At risk", "Multi-branch only"],
    highlights: [
      "This is the consultancy lens that makes Solva HR commercially stronger than basic HRIS tools.",
      "Cross-company wage bill and turnover comparison gives Solva HR Consultancy a real advisory edge.",
      "The best design keeps portfolio health visible without flattening every client into one blur."
    ],
    chartTitle: "Client portfolio health",
    chartData: [
      { label: "Healthy", value: 61, display: "11 healthy" },
      { label: "Watchlist", value: 22, display: "4 watchlist" },
      { label: "Compliance risk", value: 11, display: "2 at risk" },
      { label: "Escalated", value: 6, display: "1 escalated" }
    ],
    table: {
      title: "Client operations snapshot",
      description: "Priority portfolio items for the consultancy team.",
      columns: [
        { key: "item", label: "Client or report" },
        { key: "owner", label: "Lead" },
        { key: "status", label: "Status" },
        { key: "updated", label: "Updated" }
      ],
      rows: [
        { item: "Solva Demo Manufacturing payroll review", owner: "Payroll Lead", status: "Pending final approval", updated: "Today" },
        { item: "Blue Ridge Schools compliance pack", owner: "HR Consultant", status: "Ready for export", updated: "Today" },
        { item: "Mara Hospitality turnover analysis", owner: "People Analyst", status: "In progress", updated: "Yesterday" },
        { item: "Lakeview NGO board report", owner: "Consultancy Director", status: "Due tomorrow", updated: "Today" }
      ]
    }
  }
};

function fallbackRows(module: ModuleDefinition, item: string): TableRow[] {
  return defaultRows.map((row, index) => ({
    item: `${item} ${index + 1}`,
    owner: row.owner ?? "",
    status: row.status ?? "",
    updated: row.updated ?? ""
  }));
}

function titleForItem(item: string) {
  return item;
}

export function getWorkspacePage(module: ModuleDefinition, item: string): WorkspacePage {
  const key = `${module.key}:${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const custom = customPageData[key];

  if (custom) {
    return {
      title: titleForItem(item),
      ...custom
    };
  }

  const description = `${item} for ${module.title}, designed with clear ownership, quick filters, exports, and approval-aware operations.`;

  return {
    title: titleForItem(item),
    description,
    metrics: module.heroStats,
    quickActions: module.quickActions,
    filters: ["All records", "This month", "Active only", "Export-ready"],
    highlights: [
      `${item} follows the same clean Solva HR operating pattern: visible actions, filters, and auditability.`,
      `This view sits inside the larger ${module.title} module so users do not lose context while working.`,
      "The structure is intentionally built to scale into API-backed data and workflows without redesign."
    ],
    chartTitle: module.chartTitle,
    chartData: module.chartData,
    table: {
      title: `${item} register`,
      description: `Operational snapshot for ${item.toLowerCase()}.`,
      columns: defaultColumns,
      rows: fallbackRows(module, item)
    }
  };
}

export const loginPersonas = [
  { role: "Operator", email: "operator@solvahr.app" },
  { role: "Supervisor", email: "supervisor@solvahr.app" },
  { role: "HR Admin", email: "hradmin@solvahr.app" },
  { role: "Payroll Admin", email: "payrolladmin@solvahr.app" },
  { role: "Finance Officer", email: "finance@solvahr.app" },
  { role: "Company Admin", email: "companyadmin@solvahr.app" }
];
