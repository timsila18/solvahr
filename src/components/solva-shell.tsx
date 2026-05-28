"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApiError,
  createAssetRequest,
  createEmployeeActivationRequest,
  createEmployeeUserAccount,
  createEmployeeUserAccountsBulk,
  createLeaveRequest,
  createPayrollApprovalRequest,
  createProfileUpdateRequest,
  createRequisitionApprovalRequest,
  createTrainingRequest,
  fetchAuditLogs,
  fetchApprovalTasks,
  fetchEmployeeRecords,
  fetchEmployeeProfile,
  fetchPage,
  fetchPayrollPackage,
  fetchPayrollProcess,
  fetchPayrollReview,
  fetchPlatformSnapshot,
  runAdminUserLifecycleAction,
  updateApprovalTask,
} from "@/lib/solva-api";
import { EssWorkbench } from "@/components/ess-workbench";
import { LeaveAttendanceWorkbench } from "@/components/leave-attendance-workbench";
import { ReportsWorkbench } from "@/components/reports-workbench";
import { AdminWorkbench } from "@/components/admin-workbench";
import { DashboardWorkbench } from "@/components/dashboard-workbench";
import { OperationsWorkbench } from "@/components/operations-workbench";
import { ERPModulePlaceholder, getERPPlaceholderContent } from "@/components/erp-components";
import { INSTALL_REQUEST_EVENT } from "@/components/pwa-registrar";
import {
  GuidedTour,
  HelpPanel,
  ROLE_GUIDANCE,
  WelcomeExperience,
  type ChecklistItem,
  type GuidanceAction,
  type TourDefinition,
} from "@/components/onboarding-guidance";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  roleCanAccessModule,
  roleCanAccessPayroll,
  roleCanAccessPeople,
  roleShouldUseEssWorkspace,
  type AppRole,
} from "@/lib/auth";
import {
  getPage,
  modules,
  type ApprovalTask,
  type AuditEvent,
  type EmployeeRecord,
  type EmployeeProfile,
  type Metric,
  type ModuleSpec,
  type PageSpec,
  type PayrollPackage,
  type PayrollProcessData,
  type PayrollVarianceItem,
  type PlatformSnapshot,
  type ThemeMode,
} from "@/lib/solva-data";
import { workflowRoutes } from "@/lib/workflow-routes";
import * as XLSX from "xlsx";

const WORKSPACE_GROUPS = [
  { label: "Overview", keys: ["dashboard"] },
  { label: "Solva HR", keys: ["people", "leave", "performance", "training", "ess"] },
  { label: "Payroll", keys: ["payroll"] },
  { label: "Solva Finance", keys: ["finance"] },
  { label: "Expenses", keys: ["expenses"] },
  { label: "Budgeting", keys: ["budgets"] },
  { label: "Procurement", keys: ["procurement"] },
  { label: "Assets", keys: ["assets"] },
  { label: "Banking", keys: ["banking"] },
  { label: "Analytics", keys: ["analytics", "reports", "audit", "consultancy"] },
  { label: "Solva AI", keys: ["ai"] },
  { label: "Communication", keys: ["communication"] },
  { label: "Settings", keys: ["administration", "settings", "integrations"] },
] as const;

const ERP_PLACEHOLDER_MODULE_KEYS = new Set(["finance", "expenses", "budgets", "procurement", "assets", "banking", "analytics", "ai", "communication"]);
const ERP_ROUTE_ITEM_LABELS: Record<string, Record<string, string>> = {
  finance: {
    overview: "Finance Overview",
    "chart-of-accounts": "Chart of Accounts",
    journals: "Journals",
    "general-ledger": "General Ledger",
    "trial-balance": "Trial Balance",
    reports: "Financial Reports",
  },
  expenses: {
    requests: "Expense Requests",
    "payment-vouchers": "Payment Vouchers",
    imprest: "Imprest",
    surrenders: "Surrenders",
  },
  budgets: {
    departments: "Department Budgets",
    allocations: "Budget Allocations",
    variance: "Budget Variance",
  },
  procurement: {
    suppliers: "Suppliers",
    requisitions: "Purchase Requisitions",
    lpos: "LPOs",
    grns: "GRNs",
    invoices: "Supplier Invoices",
  },
  assets: {
    overview: "Asset Overview",
    register: "Asset Register",
    assignments: "Asset Assignments",
    maintenance: "Maintenance",
    depreciation: "Depreciation",
  },
  banking: {
    cashbook: "Cashbook",
    "bank-accounts": "Bank Accounts",
    reconciliation: "Bank Reconciliation",
  },
  analytics: {
    overview: "Analytics Overview",
    reports: "Reports",
    insights: "Insights",
  },
  ai: {
    assistant: "AI Assistant",
    "report-writer": "Report Writer",
    "anomaly-detection": "Anomaly Detection",
  },
  communication: {
    overview: "Communication Overview",
    announcements: "Announcements",
    meetings: "Meetings",
    messages: "Messages",
    "solco-integration": "Solco Integration",
  },
};

function getWorkspaceGroups(role: AppRole) {
  if (usesApprovalsHome(role)) {
    return [
      { label: "Overview", keys: ["dashboard"] },
      { label: "Solva HR", keys: ["people", "leave", "performance", "training", "ess"] },
      { label: "Payroll", keys: ["payroll"] },
      { label: "Solva Finance", keys: ["finance"] },
      { label: "Expenses", keys: ["expenses"] },
      { label: "Budgeting", keys: ["budgets"] },
      { label: "Procurement", keys: ["procurement"] },
      { label: "Assets", keys: ["assets"] },
      { label: "Banking", keys: ["banking"] },
      { label: "Analytics", keys: ["analytics", "reports", "audit", "consultancy"] },
      { label: "Solva AI", keys: ["ai"] },
      { label: "Communication", keys: ["communication"] },
      { label: "Settings", keys: ["administration", "settings", "integrations"] },
    ] as const;
  }

  return WORKSPACE_GROUPS;
}

const MODULE_PRESENTATION: Record<
  string,
  Partial<Pick<ModuleSpec, "title" | "shortTitle" | "summary" | "tagline" | "icon">>
> = {
  dashboard: {
    title: "Dashboard",
    shortTitle: "Dashboard",
    summary: "Operational dashboard for approvals, payroll activity, people actions, and live work.",
    tagline: "Pending work, quick actions, and live signals in one operational space.",
    icon: "HB",
  },
  payroll: {
    title: "Payroll",
    shortTitle: "Payroll",
    tagline: "Run payroll, resolve warnings, release payslips, and export payment files quickly.",
  },
  people: {
    title: "Staff Register",
    shortTitle: "Staff",
    tagline: "Employee records, HR documents, lifecycle actions, and staff files in one workspace.",
  },
  leave: {
    title: "Leave & Attendance",
    shortTitle: "Leave",
    tagline: "Leave, off-days, attendance, overtime, and roster coverage stay together here.",
  },
  performance: {
    title: "Performance",
    shortTitle: "Performance",
    tagline: "KPIs, reviews, appraisals, growth actions, and talent visibility in one flow.",
  },
  administration: {
    title: "Settings / Admin",
    shortTitle: "Admin",
    tagline: "Control roles, organization setup, branding, and operational readiness here.",
  },
  ess: {
    title: "Employee Self Service",
    shortTitle: "ESS",
    tagline: "My work, my documents, my shifts, my pay, and my requests in one personal app.",
  },
  reports: {
    title: "Reports",
    shortTitle: "Reports",
    tagline: "Live dashboards, statutory exports, payroll reports, and workforce insights.",
  },
  finance: {
    title: "Solva Finance",
    shortTitle: "Finance",
    tagline: "Financial periods, chart of accounts, journals, ledgers, and reports.",
  },
  expenses: {
    title: "Expenses",
    shortTitle: "Expenses",
    tagline: "Expense requests, vouchers, imprest, and surrender workflows.",
  },
  budgets: {
    title: "Budgeting",
    shortTitle: "Budgets",
    tagline: "Department budgets, allocations, and variance controls.",
  },
  procurement: {
    title: "Procurement",
    shortTitle: "Procure",
    tagline: "Suppliers, requisitions, LPOs, GRNs, and supplier invoices.",
  },
  banking: {
    title: "Banking",
    shortTitle: "Banking",
    tagline: "Cashbook, bank accounts, and reconciliation preparation.",
  },
  analytics: {
    title: "Analytics",
    shortTitle: "Analytics",
    tagline: "ERP reporting and insights beside the existing HR report layer.",
  },
  ai: {
    title: "Solva AI",
    shortTitle: "Solva AI",
    tagline: "AI assistant, report writer, and anomaly detection planning.",
  },
  communication: {
    title: "Communication",
    shortTitle: "Comms",
    tagline: "Announcements, meetings, messages, and Solco integration.",
  },
};

function usesApprovalsHome(role: AppRole) {
  return [
    "Supervisor",
    "Payroll Admin",
    "HR Admin",
    "Manager",
    "Finance Officer",
    "Finance Manager",
    "Accountant",
    "Procurement Officer",
    "Asset Manager",
    "Budget Holder",
    "Approver",
    "Auditor",
    "Super Admin",
  ].includes(role);
}

function getDashboardHomeItem(role: AppRole) {
  return usesApprovalsHome(role) ? "Pending Approvals" : "Overview";
}

const ROLE_BOTTOM_NAV: Partial<Record<
  AppRole,
  Array<{ label: string; moduleKey: string; item: string }>
>> = {
  Employee: [
    { label: "Home", moduleKey: "ess", item: "My Dashboard" },
    { label: "My Work", moduleKey: "ess", item: "My Attendance" },
    { label: "Payslips", moduleKey: "ess", item: "My Payslips" },
    { label: "Notifications", moduleKey: "ess", item: "My Notifications" },
    { label: "Profile", moduleKey: "ess", item: "My Profile" },
  ],
  Supervisor: [
    { label: "Dashboard", moduleKey: "dashboard", item: "Overview" },
    { label: "Team", moduleKey: "people", item: "Staff Register" },
    { label: "Approvals", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "Reports", moduleKey: "reports", item: "Executive Dashboard" },
    { label: "Profile", moduleKey: "ess", item: "My Profile" },
  ],
  "Payroll Admin": [
    { label: "Tasks", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "Payroll", moduleKey: "payroll", item: "Payroll Dashboard" },
    { label: "Approvals", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "Reports", moduleKey: "reports", item: "Payroll Reports" },
    { label: "Admin", moduleKey: "dashboard", item: "Overview" },
  ],
  Manager: [
    { label: "Tasks", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "People", moduleKey: "people", item: "Staff Register" },
    { label: "Approvals", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "Reports", moduleKey: "reports", item: "Executive Dashboard" },
    { label: "Admin", moduleKey: "dashboard", item: "Overview" },
  ],
  "HR Admin": [
    { label: "Tasks", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "People", moduleKey: "people", item: "Staff Register" },
    { label: "Approvals", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "Reports", moduleKey: "reports", item: "HR Reports" },
    { label: "Admin", moduleKey: "dashboard", item: "Overview" },
  ],
  "Finance Officer": [
    { label: "Dashboard", moduleKey: "dashboard", item: "Overview" },
    { label: "Payroll", moduleKey: "payroll", item: "Payroll Dashboard" },
    { label: "Approvals", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "Reports", moduleKey: "reports", item: "Payroll Reports" },
    { label: "Profile", moduleKey: "ess", item: "My Profile" },
  ],
  "Super Admin": [
    { label: "Dashboard", moduleKey: "dashboard", item: "Overview" },
    { label: "People", moduleKey: "people", item: "Staff Register" },
    { label: "Approvals", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "Reports", moduleKey: "reports", item: "Executive Dashboard" },
    { label: "Profile", moduleKey: "ess", item: "My Profile" },
  ],
  Operator: [
    { label: "Dashboard", moduleKey: "dashboard", item: "Overview" },
    { label: "People", moduleKey: "people", item: "Staff Register" },
    { label: "Approvals", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "Reports", moduleKey: "reports", item: "Executive Dashboard" },
    { label: "Profile", moduleKey: "ess", item: "My Profile" },
  ],
  Recruiter: [
    { label: "Dashboard", moduleKey: "dashboard", item: "Overview" },
    { label: "People", moduleKey: "people", item: "Staff Register" },
    { label: "Approvals", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "Reports", moduleKey: "reports", item: "Executive Dashboard" },
    { label: "Profile", moduleKey: "ess", item: "My Profile" },
  ],
  Auditor: [
    { label: "Dashboard", moduleKey: "dashboard", item: "Overview" },
    { label: "People", moduleKey: "people", item: "Staff Register" },
    { label: "Approvals", moduleKey: "dashboard", item: "Pending Approvals" },
    { label: "Reports", moduleKey: "reports", item: "Executive Dashboard" },
    { label: "Profile", moduleKey: "ess", item: "My Profile" },
  ],
};

type PayrollExportActionType =
  | "wagebill_report"
  | "earnings_deductions_analysis"
  | "monthly_deduction_posting_list"
  | "net_to_bank"
  | "net_to_mpesa"
  | "paye_report"
  | "nssf_report"
  | "shif_report"
  | "helb_report"
  | "payroll_register"
  | "p9_forms"
  | "housing_levy_report";

function parseFileNameFromDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/filename=\"?([^\";]+)\"?/i);
  return match?.[1] ?? null;
}

function formatPayrollRuntimeMessage(message: string) {
  if (!message) {
    return "Something went wrong while preparing that payroll output.";
  }

  if (message === "payroll_run_midmonth_reports_disabled") {
    return "Robot Cafe month-end rules are active. Statutory exports and monthly reports are only available on the approved month-end payroll run.";
  }

  if (message === "payroll_run_not_processed") {
    return "Process payroll first before generating this report.";
  }

  if (message === "payroll_run_not_ready_for_filing_export") {
    return "Approve or close the payroll run before generating filing exports.";
  }

  if (message === "missing_payroll_action_reason") {
    return "A reason is required before reopening or undoing this payroll run.";
  }

  if (message === "payroll_run_locked_reopen_required") {
    return "This payroll run is already locked. Reopen it with a reason before making corrections.";
  }

  if (message === "payroll_export_reconciliation_failed") {
    return "The selected payroll run does not reconcile cleanly yet. Review payroll totals before exporting.";
  }

  if (message === "helb_lines_missing_for_selected_period") {
    return "No HELB deduction lines were found for the selected payroll period.";
  }

  if (message === "housing_levy_lines_missing_for_selected_period") {
    return "No Housing Levy lines were found for the selected payroll period.";
  }

  const employeeFieldPatterns: Array<[RegExp, string]> = [
    [/^bank_details_missing_for_(.+)$/i, "$1 is missing bank details. Payroll can still run if an MPESA phone number exists, but Net to Bank will leave this row out."],
    [/^kra_pin_missing_for_(.+)$/i, "$1 is missing a KRA PIN. The export can still generate, but the KRA PIN column will remain blank."],
    [/^shif_number_missing_for_(.+)$/i, "$1 is missing a SHIF number. The SHIF export can still generate, but the identifier will remain blank."],
    [/^nssf_number_missing_for_(.+)$/i, "$1 is missing an NSSF number. The NSSF export can still generate, but the identifier will remain blank."],
    [/^national_id_missing_for_(.+)$/i, "$1 is missing a national ID number. The export can still generate, but the ID field will remain blank."],
  ];

  for (const [pattern, template] of employeeFieldPatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return template.replace("$1", match[1]);
    }
  }

  if (message.startsWith("payslip_validation_error:")) {
    return message.replace("payslip_validation_error:", "");
  }

  return message
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SectionMessage({ text }: { text: string }) {
  return <p className="section-description">{text}</p>;
}

function isSolvaBusinessGroupWorkspace(workspaceName: string | null | undefined) {
  return (workspaceName ?? "").trim().toLowerCase() === "solva business group";
}

function getPresentedModule(module: ModuleSpec, workspaceName?: string | null): ModuleSpec {
  const overrides = MODULE_PRESENTATION[module.key];
  const presented = overrides
    ? {
        ...module,
        ...overrides,
      }
    : module;

  if (!isSolvaBusinessGroupWorkspace(workspaceName)) {
    return presented;
  }

  if (presented.key === "leave") {
    const hiddenItems = new Set([
      "Shift Scheduling",
      "Shifts",
      "Shift Rosters",
      "Shift Roster Management",
      "Shift Templates",
      "Device Integrations",
    ]);

    return {
      ...presented,
      summary: "Leave workflows, attendance, overtime, holidays, and approvals built around how Solva Business Group operates.",
      tagline: "Leave, presence, and approvals in one cleaner operations flow.",
      items: presented.items.filter((item) => !hiddenItems.has(item)),
      quickActions: presented.quickActions.filter((item) => !/shift/i.test(item)),
      highlights: [
        "This workspace stays focused on leave, attendance, overtime, and approvals without exposing unused shift tools.",
        "Managers can review workforce presence and exceptions without a roster-heavy workflow.",
        "The module stays aligned to how Solva Business Group currently runs operations.",
      ],
    };
  }

  if (presented.key === "ess") {
    return {
      ...presented,
      summary: "Personal employee workspace for payslips, leave, attendance, profile updates, documents, and requests.",
      tagline: "My work, my documents, my pay, and my requests in one personal app.",
      highlights: [
        "Employees can view payslips, leave balances, attendance, loans, documents, and learning records.",
        "Self service stays focused on what Solva Business Group staff actually use day to day.",
        "The experience reduces back-and-forth with HR by keeping the important actions close.",
      ],
    };
  }

  return presented;
}

const TOUR_DEFINITIONS: Record<"dashboard" | "people" | "payroll" | "leave" | "ess", TourDefinition> = {
  dashboard: {
    title: "Dashboard tour",
    steps: [
      { selector: "[data-tour='global-search']", title: "Use search to move fast", body: "Jump to modules, workspaces, and live employee records from the top search bar." },
      { selector: "[data-tour='dashboard-quick-actions']", title: "Start with quick actions", body: "These are the fastest paths into the most common workflows for your role." },
      { selector: "[data-tour='workspace-primary-cta']", title: "Primary actions stay in one place", body: "Each workspace keeps one main action in the header so you always know where to begin." },
      { selector: "[data-tour='approvals-trigger']", title: "Approvals stay visible", body: "Open approvals any time to review what needs your attention next." },
    ],
  },
  people: {
    title: "People tour",
    steps: [
      { selector: "[data-tour='module-menu']", title: "Use the module menu", body: "The left workspace rail keeps related People pages grouped together." },
      { selector: "[data-tour='people-add']", title: "Add employees from here", body: "Start a new employee record from the dedicated full-page workflow." },
      { selector: "[data-tour='people-roster']", title: "Review the live roster", body: "Select an employee to inspect profile details, documents, and movement history." },
      { selector: "[data-tour='workspace-primary-cta']", title: "The header mirrors the main task", body: "You can always come back to the primary CTA at the top of the page." },
    ],
  },
  payroll: {
    title: "Payroll tour",
    steps: [
      { selector: "[data-tour='workspace-primary-cta']", title: "Open payroll periods first", body: "The payroll lifecycle starts by opening a period, then processing and reviewing it." },
      { selector: "[data-tour='payroll-period-create']", title: "Create or review periods here", body: "Use this panel to begin a new payroll run and review recent periods." },
      { selector: "[data-tour='payroll-export-center']", title: "Exports live in one place", body: "Once approvals are complete, generate payroll exports, net-to-bank files, and statutory outputs here." },
      { selector: "[data-tour='notifications-trigger']", title: "Watch for ready-to-act alerts", body: "Notifications help surface payroll approvals and generated outputs." },
    ],
  },
  leave: {
    title: "Leave and attendance tour",
    steps: [
      { selector: "[data-tour='workspace-primary-cta']", title: "Start leave from the primary action", body: "Leave requests begin from the dedicated full-page form so date and policy checks stay clear." },
      { selector: "[data-tour='leave-apply']", title: "Apply and guide teams from here", body: "Use the action panel to start requests or move into calendar and holiday management." },
      { selector: "[data-tour='leave-request-queue']", title: "Track request status in the queue", body: "Pending requests, cancellation options, and approval ownership stay visible together." },
      { selector: "[data-tour='approvals-trigger']", title: "Use approvals for next steps", body: "Approvals keep manager and HR review easy to find." },
    ],
  },
  ess: {
    title: "Employee self service tour",
    steps: [
      { selector: "[data-tour='ess-actions']", title: "Start from the employee action area", body: "Apply leave, download payslips, update your profile, or manage documents from one place." },
      { selector: "[data-tour='notifications-trigger']", title: "Notifications guide you back in", body: "Leave approvals, payslip availability, and request updates all link back to the right place." },
      { selector: "[data-tour='module-menu']", title: "Your ESS pages stay grouped", body: "Profile, payslips, leave, attendance, and requests are all available from the module menu." },
      { selector: "[data-tour='global-search']", title: "Search is there when you need it", body: "Jump to your next task without memorizing where every page lives." },
    ],
  },
};

type GuidanceState = {
  welcomeDismissed: boolean;
  checklistDismissed: boolean;
  completedChecklist: string[];
  completedTours: string[];
};

type SearchSuggestion = {
  key: string;
  label: string;
  detail: string;
  kind: "workspace" | "employee" | "action";
  moduleKey?: string;
  item?: string;
  employeeId?: string;
  actionLabel?: string;
};

type RuntimeRoleProfile = {
  key: string;
  role: AppRole;
  email: string;
};

type AiAssistCard = {
  title: string;
  body: string;
  prompt?: string;
};

function getRoleAwareAiAssist(
  role: AppRole,
  moduleTitle: string,
  activeItem: string,
  context: {
    pendingTaskCount: number;
    employeeCount: number;
    payrollPeriod: string;
    payrollValidationErrors: number;
    workspaceName: string;
  }
): { heading: string; cards: AiAssistCard[] } {
  const moduleContext = `${moduleTitle} · ${activeItem}`;

  switch (role) {
    case "Employee":
      return {
        heading: "Solva AI for your workspace",
        cards: [
          {
            title: "Explain this payslip",
            body: `Use Solva AI to explain the latest payslip, deductions, and net pay in plain language inside ${moduleContext}.`,
          },
          {
            title: "Help me apply leave",
            body: "Get step-by-step help on leave type choice, dates, and what happens after submission.",
          },
          {
            title: "Profile help",
            body: "Ask what details are still missing from your personal record before payroll or approvals are affected.",
          },
        ] satisfies AiAssistCard[],
      };
    case "Supervisor":
      return {
        heading: "Solva AI for team review",
        cards: [
          {
            title: "Summarize team absences",
            body: `Get a quick summary of pending absences, leave activity, and attendance follow-up for ${context.workspaceName}.`,
          },
          {
            title: "Draft approval comments",
            body: "Use Solva AI to draft short, professional leave approval or rejection comments for your team.",
          },
          {
            title: "Flag attendance concerns",
            body: "Ask for a concise risk summary before you approve attendance-linked actions.",
          },
        ] satisfies AiAssistCard[],
      };
    case "Payroll Admin":
    case "Finance Officer":
      return {
        heading: "Solva AI for payroll controls",
        cards: [
          {
            title: "Summarize this payroll run",
            body: `Current period: ${context.payrollPeriod}. Ask for a payroll summary, wagebill explanation, or statutory output check from ${moduleContext}.`,
          },
          {
            title: "Explain export warnings",
            body: "Use Solva AI to interpret missing statutory data, excluded bank rows, and filing caveats before sharing exports.",
          },
          {
            title: "Highlight validation gaps",
            body: `${context.payrollValidationErrors} payroll validation issues are currently visible. Ask for a short action list before approval or release.`,
          },
          {
            title: "Detect payroll anomalies",
            body: "Ask Solva AI to point out unusual deductions, suspicious adjustments, abnormal overtime, and statutory mismatches before approval.",
          },
        ] satisfies AiAssistCard[],
      };
    case "Manager":
      return {
        heading: "Solva AI for leadership decisions",
        cards: [
          {
            title: "Approval risk summary",
            body: `There are ${context.pendingTaskCount} pending approvals in scope. Ask for a short risk summary before you sign off.`,
          },
          {
            title: "Summarize workforce signals",
            body: "Use Solva AI to condense leave, payroll, and performance signals into a manager-readable snapshot.",
          },
          {
            title: "Explain wagebill movement",
            body: "Ask what changed materially in payroll or attendance before approving business-impacting actions.",
          },
          {
            title: "Highlight operational risk",
            body: "Ask Solva AI to summarize unresolved complaints, missing employee data, and process blockers before leadership review.",
          },
        ] satisfies AiAssistCard[],
      };
    case "HR Admin":
      return {
        heading: "Solva AI for HR operations",
        cards: [
          {
            title: "Find missing employee data",
            body: `Ask for a focused list of people-data gaps across the ${context.employeeCount} visible employee records.`,
          },
          {
            title: "Draft HR notes",
            body: "Use Solva AI to draft onboarding, recruitment, performance, and employee-record notes in a professional tone.",
          },
          {
            title: "Guide onboarding steps",
            body: "Ask what setup still blocks clean HR operations before payroll, approvals, or ESS rollout.",
          },
          {
            title: "Surface workforce gaps",
            body: "Use Solva AI to identify incomplete records, expiring contracts, and recurring attendance concerns that need follow-up.",
          },
        ] satisfies AiAssistCard[],
      };
    case "Super Admin":
      return {
        heading: "Solva AI for platform oversight",
        cards: [
          {
            title: "Summarize pending registrations",
            body: "Use Solva AI to review employer signups, activation blockers, and tenant readiness before approval.",
          },
          {
            title: "Flag tenant setup issues",
            body: "Ask for a short platform support summary covering onboarding gaps, payroll export issues, and access risks.",
          },
          {
            title: "Cross-role guidance",
            body: "Use Solva AI to quickly explain what a role should or should not see before making access changes.",
          },
        ] satisfies AiAssistCard[],
      };
    default:
      return {
        heading: "Solva AI",
        cards: [
          {
            title: "Get contextual help",
            body: `Use Solva AI for role-aware guidance inside ${moduleContext} without leaving your current workflow.`,
          },
          {
            title: "Explain next steps",
            body: "Ask for a short explanation of what to do next in the current workspace and why it matters.",
          },
        ] satisfies AiAssistCard[],
      };
  }
}

function getGuidanceStorageKey(email: string) {
  return `solva-hr-guidance:${email}`;
}

function readGuidanceState(email: string): GuidanceState {
  if (typeof window === "undefined") {
    return {
      welcomeDismissed: false,
      checklistDismissed: false,
      completedChecklist: [],
      completedTours: [],
    };
  }

  try {
    const raw = window.localStorage.getItem(getGuidanceStorageKey(email));
    if (!raw) {
      return {
        welcomeDismissed: false,
        checklistDismissed: false,
        completedChecklist: [],
        completedTours: [],
      };
    }

    const parsed = JSON.parse(raw) as Partial<GuidanceState>;
    return {
      welcomeDismissed: Boolean(parsed.welcomeDismissed),
      checklistDismissed: Boolean(parsed.checklistDismissed),
      completedChecklist: Array.isArray(parsed.completedChecklist) ? parsed.completedChecklist : [],
      completedTours: Array.isArray(parsed.completedTours) ? parsed.completedTours : [],
    };
  } catch {
    return {
      welcomeDismissed: false,
      checklistDismissed: false,
      completedChecklist: [],
      completedTours: [],
    };
  }
}

function writeGuidanceState(email: string, state: GuidanceState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getGuidanceStorageKey(email), JSON.stringify(state));
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function describeApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(500, "Unexpected runtime failure");
}

async function readRuntimeJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
  });

  const payload = (await response.json().catch(() => ({ error: "request_failed" }))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? `request_failed:${response.status}`);
  }

  return payload;
}

function WorkspaceLogo({
  logoUrl,
  logoMark,
  name,
}: {
  logoUrl?: string | null;
  logoMark?: string;
  name: string;
}) {
  if (logoUrl) {
    return (
      <div className="solva-logo workspace-logo-image-shell" aria-hidden="true">
        <img alt={`${name} logo`} className="workspace-logo-image" src={logoUrl} />
      </div>
    );
  }

  return (
    <div className="solva-logo" aria-hidden="true">
      <span className="solva-logo-mark">{logoMark || "S"}</span>
      <span className="solva-logo-ring" />
    </div>
  );
}

function TonePill({
  tone = "default",
  children,
}: {
  tone?: Metric["tone"] | "live";
  children: React.ReactNode;
}) {
  return <span className={`tone-pill tone-${tone}`}>{children}</span>;
}

function ChartCard({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; value: number; display: string }>;
}) {
  const max = Math.max(...data.map((entry) => entry.value), 1);

  return (
    <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Visual Summary</p>
            <h3>{title}</h3>
          </div>
        <TonePill tone="live">live metrics</TonePill>
      </div>
      <div className="chart-stack">
        {data.map((entry) => (
          <article className="chart-row" key={entry.label}>
            <div className="chart-row-meta">
              <strong>{entry.label}</strong>
              <span>{entry.display}</span>
            </div>
            <div className="chart-track">
              <div className="chart-fill" style={{ width: `${(entry.value / max) * 100}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DataTable({
  title,
  description,
  columns,
  rows,
}: {
  title: string;
  description: string;
  columns: Array<{ key: string; label: string; align?: "left" | "right" }>;
  rows: Array<Record<string, string>>;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filteredRows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return rows;
    }

    return rows.filter((row) =>
      columns.some((column) => String(row[column.key] ?? "").toLowerCase().includes(trimmed))
    );
  }, [columns, query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasQuery = query.trim().length > 0;

  function handleExportCsv() {
    const header = columns.map((column) => column.label);
    const csvRows = filteredRows.map((row) =>
      columns.map((column) => JSON.stringify(String(row[column.key] ?? ""))).join(",")
    );
    const csv = [header.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(title)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Data Table</p>
          <h3>{title}</h3>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" onClick={handleExportCsv} type="button">
            Export CSV
          </button>
        </div>
      </div>
      <p className="section-description">{description}</p>
      <div className="table-toolbar">
        <label className="search-card">
          <span>Search</span>
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Find by name, branch, code, or status"
            value={query}
          />
        </label>
        <div className="table-toolbar-meta">
          <span className="table-results-copy">
            Showing {pagedRows.length} of {filteredRows.length} records
          </span>
          {hasQuery ? (
            <button className="ghost-button" onClick={() => setQuery("")} type="button">
              Clear search
            </button>
          ) : null}
          <div className="table-pagination">
            <button
              className="ghost-button"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              type="button"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="ghost-button"
              disabled={currentPage === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {pagedRows.length === 0 ? (
        <div className="empty-state-card">
          <strong>No matching records</strong>
          <p>
            {hasQuery
              ? "Try a different search term or clear the current search to see the full list again."
              : "Records will appear here as soon as this workspace has live data."}
          </p>
          {hasQuery ? (
            <button className="primary-button" onClick={() => setQuery("")} type="button">
              Reset search
            </button>
          ) : null}
        </div>
      ) : (
        <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.align === "right" ? "align-right" : undefined}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, index) => (
              <tr key={`${index}-${row[columns[0].key] ?? "row"}`}>
                {columns.map((column) => (
                  <td key={column.key} className={column.align === "right" ? "align-right" : undefined}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </section>
  );
}

function HeroModule({
  module,
  onOpenItem,
}: {
  module: ModuleSpec;
  onOpenItem: (item: string) => void;
}) {
  return (
    <section className="module-overview">
      <div className="hero-panel">
        <div className="hero-copy">
          <p className="section-eyebrow">Module Focus</p>
          <h2>{module.title}</h2>
          <p>{module.summary}</p>
          <p className="hero-supporting-copy">
            Start the main workflow from the workspace header, then use the cards below to move between live workspaces.
          </p>
        </div>
        <div className="hero-side">
          <p className="hero-tagline">{module.tagline}</p>
          <div className="note-list">
            {module.highlights.map((highlight) => (
              <article key={highlight}>
                <span className="note-dot" />
                <p>{highlight}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="metric-grid">
        {module.heroStats.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
            <TonePill tone={metric.tone ?? "live"}>{metric.tone ?? "live"}</TonePill>
          </article>
        ))}
      </div>

      <div className="overview-grid">
        <ChartCard title={module.chartTitle} data={module.chartData} />
        <section className="surface-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Navigation</p>
              <h3>{module.title} workspaces</h3>
            </div>
          </div>
          <div className="subitem-grid">
            {module.items.map((item) => (
              <button className="subitem-card" key={item} onClick={() => onOpenItem(item)} type="button">
                <strong>{item}</strong>
                <span>Open workspace</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function ControlCenter({
  snapshot,
  selectedRole,
}: {
  snapshot: PlatformSnapshot | null;
  selectedRole: RuntimeRoleProfile;
}) {
  const featured = snapshot?.featured;

  return (
    <section className="surface-card control-center">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Control Center</p>
          <h3>{featured?.title ?? "Solva HR Operating Snapshot"}</h3>
        </div>
        <TonePill tone="positive">{selectedRole.role}</TonePill>
      </div>
      <p className="section-description">
        {featured?.summary ??
          "A clean operations rail for approvals, announcements, and the current decision owner."}
      </p>
      <div className="control-grid">
        <section className="mini-panel">
          <h4>Pending Approvals</h4>
          <div className="mini-list">
            {(featured?.approvals ?? []).map((entry) => (
              <article key={entry.item}>
                <strong>{entry.item}</strong>
                <span>{entry.owner}</span>
                <small>
                  {entry.status} | {entry.due}
                </small>
              </article>
            ))}
          </div>
        </section>
        <section className="mini-panel">
          <h4>Announcements</h4>
          <div className="mini-list">
            {(featured?.announcements ?? []).map((entry) => (
              <article key={entry.title}>
                <strong>{entry.title}</strong>
                <span>{entry.audience}</span>
                <small>{entry.time}</small>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function AuditStream({ events }: { events: AuditEvent[] }) {
  return (
    <section className="surface-card action-workbench">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Audit Stream</p>
          <h3>Recent system activity</h3>
        </div>
        <TonePill tone="critical">accountability</TonePill>
      </div>
      <div className="mini-list queue-list">
        {events.slice(0, 8).map((event) => (
          <article key={event.id}>
            <strong>{event.subject}</strong>
            <span>
              {event.actorRole} | {event.actorEmail}
            </span>
            <small>
              {event.action} | {event.outcome} | {event.timestamp}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

function PeopleWorkbench({
  employees,
  selectedEmployee,
  onSelectEmployee,
  selectedRole,
  onRefreshPeople,
  onCreateUserAccount,
  onCreateUserAccountsBulk,
  onRunUserAction,
  onToggleSalaryStop,
  onOpenEmployeeDocument,
  onDownloadEmployeeDocument,
  onDeleteEmployeeDocument,
  onOpenLeaveForm,
  onDownloadLeaveForm,
  onOpenPayrollAddition,
  userAccessRows,
  userAccessLoading,
  onSetTemporaryPassword,
  onForceSignOutUser,
  accountBusyKey,
}: {
  employees: EmployeeRecord[];
  selectedEmployee: EmployeeProfile | null;
  onSelectEmployee: (employeeId: string) => void;
  selectedRole: RuntimeRoleProfile;
  onRefreshPeople: () => Promise<void>;
  onCreateUserAccount: (employeeId: string) => void;
  onCreateUserAccountsBulk: (employeeIds: string[]) => void;
  onRunUserAction: (
    userId: string,
    action:
      | "activate"
      | "suspend"
      | "deactivate"
      | "reactivate"
      | "resend_invite"
      | "reset_password"
  ) => void;
  onToggleSalaryStop: (employeeId: string, shouldStop: boolean, reason?: string) => Promise<void>;
  onOpenEmployeeDocument: (employeeId: string, documentId: string) => Promise<void>;
  onDownloadEmployeeDocument: (employeeId: string, documentId: string) => Promise<void>;
  onDeleteEmployeeDocument: (employeeId: string, documentId: string) => Promise<void>;
  onOpenLeaveForm: (requestId: string) => Promise<void>;
  onDownloadLeaveForm: (requestId: string) => Promise<void>;
  onOpenPayrollAddition: (employeeId: string) => void;
  userAccessRows: Array<Record<string, unknown>>;
  userAccessLoading: boolean;
  onSetTemporaryPassword: (userId: string, userLabel: string) => Promise<void>;
  onForceSignOutUser: (userId: string) => Promise<void>;
  accountBusyKey: string | null;
}) {
  const canManage = ["Operator", "Supervisor", "Manager", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canReviewSalary = ["Manager", "HR Admin", "Payroll Admin", "Super Admin"].includes(selectedRole.role);
  const canRequestStaffChanges = ["Supervisor", "Manager", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canStopSalary = ["Manager", "HR Admin", "Payroll Admin", "Super Admin"].includes(selectedRole.role);
  const canManagePayrollAdditions = ["Supervisor", "Manager", "HR Admin", "Payroll Admin", "Super Admin"].includes(
    selectedRole.role
  );
  const canDeleteDocuments = ["Manager", "HR Admin", "Payroll Admin", "Super Admin"].includes(selectedRole.role);
  const canViewUserAccess = ["Payroll Admin", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canBulkOnboard = ["Manager", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const [peoplePanel, setPeoplePanel] = useState<
    "directory" | "staff-file" | "accounts" | "lifecycle" | "onboarding" | "user-access"
  >("directory");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [staffExitReason, setStaffExitReason] = useState("Resignation");
  const [staffExitComments, setStaffExitComments] = useState("");
  const [staffExitBusy, setStaffExitBusy] = useState(false);
  const [staffExitAssistBusy, setStaffExitAssistBusy] = useState(false);
  const [staffExitMessage, setStaffExitMessage] = useState("");
  const [salaryStopBusy, setSalaryStopBusy] = useState(false);
  const [salaryStopMessage, setSalaryStopMessage] = useState("");
  const [fileBusyKey, setFileBusyKey] = useState("");
  const [bulkImportBusy, setBulkImportBusy] = useState(false);
  const [bulkImportMessage, setBulkImportMessage] = useState("");
  const [bulkImportErrors, setBulkImportErrors] = useState<Array<{ rowNumber: number; fullName: string; message: string }>>([]);
  const [actionThreads, setActionThreads] = useState<Array<Record<string, unknown>>>([]);
  const [actionThreadMessages, setActionThreadMessages] = useState<Array<Record<string, unknown>>>([]);
  const [activeActionThread, setActiveActionThread] = useState<{ entityType: string; entityId: string; title: string } | null>(null);
  const [actionThreadDraft, setActionThreadDraft] = useState("");
  const [actionThreadBusy, setActionThreadBusy] = useState("");

  const staffExitSuggestion = useMemo(() => {
    if (!selectedEmployee) {
      return "";
    }
    return `${selectedEmployee.fullName} is being processed for ${staffExitReason.toLowerCase()}. The exit request should confirm the operational reason, the expected effective date or handover status, and any immediate follow-up needed on access, payroll, or company property.`;
  }, [selectedEmployee, staffExitReason]);

  const staffExitWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!selectedEmployee) return warnings;
    if (!staffExitComments.trim()) warnings.push("Add a short exit note before submitting the request.");
    if (["Dismissal", "Summary Dismissal", "Absconding of Duty", "Desertion"].includes(staffExitReason) && staffExitComments.trim().length < 40) {
      warnings.push("This exit reason usually needs a fuller factual note.");
    }
    return warnings;
  }, [selectedEmployee, staffExitComments, staffExitReason]);

  function toggleSelectedEmployee(employeeId: string) {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId) ? current.filter((value) => value !== employeeId) : [...current, employeeId]
    );
  }

  async function handleStaffExitRequest() {
    if (!selectedEmployee) {
      setStaffExitMessage("Select the staff member first.");
      return;
    }

    setStaffExitBusy(true);
    setStaffExitMessage("");
    try {
      const response = await fetch("/api/people/employees/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "exit",
          employeeId: selectedEmployee.id,
          reason: staffExitReason,
          comments: staffExitComments,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not submit the staff exit request.");
      }
      setStaffExitMessage(
        selectedRole.role === "Manager" || selectedRole.role === "HR Admin"
          ? "Staff exit completed successfully."
          : "Staff exit request submitted to GM for approval."
      );
      setStaffExitComments("");
    } catch (error) {
      setStaffExitMessage(error instanceof Error ? error.message : "Could not submit the staff exit request.");
    } finally {
      setStaffExitBusy(false);
    }
  }

  async function handleStaffExitAssist(variant: "draft" | "review" | "shorter" | "formal" | "factual" = "draft") {
    if (!selectedEmployee) {
      setStaffExitMessage("Select the staff member first.");
      return;
    }

    setStaffExitAssistBusy(true);
    setStaffExitMessage("");
    try {
      const response = await fetch("/api/ai/workflow-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "employee_exit",
          variant,
          employeeName: selectedEmployee.fullName,
          employeeNumber: selectedEmployee.employeeNumber,
          department: selectedEmployee.department,
          branch: selectedEmployee.branch,
          designation:
            selectedEmployee.profileSections
              .flatMap((section) => section.items)
              .find((item) => item.label === "Designation")
              ?.value ?? "",
          supervisorName: selectedEmployee.supervisor,
          employmentType: selectedEmployee.employmentType,
          employeeStatus: selectedEmployee.status,
          costCenter: selectedEmployee.costCenter,
          reason: staffExitReason,
          comments: staffExitComments,
          recentDocumentSummary: (selectedEmployee.documentSummary ?? [])
            .slice(0, 3)
            .map((item) => `${item.category}: ${item.name}`)
            .join(" | "),
          recentMovementSummary: (selectedEmployee.movementHistory ?? [])
            .slice(0, 3)
            .map((item) => `${item.title}: ${item.detail}`)
            .join(" | "),
          recentLeaveSummary: (selectedEmployee.leaveHistory ?? [])
            .slice(0, 3)
            .map((item) => `${item.leaveType} ${item.startDate} to ${item.endDate} (${item.status})`)
            .join(" | "),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        comments?: string;
        summary?: string;
        issues?: string[];
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not prepare exit wording right now.");
      }
      setStaffExitComments(payload?.comments ?? staffExitComments);
      const issues = Array.isArray(payload?.issues) ? payload.issues.filter(Boolean) : [];
      setStaffExitMessage(
        issues.length
          ? `${payload?.summary ?? "A stronger exit note is ready."} Watch-outs: ${issues.slice(0, 3).join(" | ")}`
          : payload?.summary ?? "A stronger exit note is ready. Please review it and keep it true to the case."
      );
    } catch (error) {
      setStaffExitMessage(error instanceof Error ? error.message : "Could not prepare exit wording right now.");
    } finally {
      setStaffExitAssistBusy(false);
    }
  }

  async function handleSalaryStopToggle(shouldStop: boolean) {
    if (!selectedEmployee) {
      setSalaryStopMessage("Select the staff member first.");
      return;
    }

    const reason = shouldStop
      ? window.prompt("Why are you stopping salary for this staff member?", selectedEmployee.salaryStopReason || "") ?? ""
      : window.prompt("Why are you resuming salary for this staff member?", "") ?? "";

    if (!reason.trim()) {
      setSalaryStopMessage("A reason is required before changing salary stop status.");
      return;
    }

    setSalaryStopBusy(true);
    setSalaryStopMessage("");
    try {
      await onToggleSalaryStop(selectedEmployee.id, shouldStop, reason.trim());
      setSalaryStopMessage(shouldStop ? "Salary stopped successfully." : "Salary resumed successfully.");
    } catch (error) {
      setSalaryStopMessage(error instanceof Error ? error.message : "Could not update salary stop status.");
    } finally {
      setSalaryStopBusy(false);
    }
  }

  async function handleEmployeeDocumentAction(documentId: string, mode: "preview" | "download") {
    if (!selectedEmployee) {
      return;
    }
    const busyKey = `document-${documentId}-${mode}`;
    setFileBusyKey(busyKey);
    try {
      if (mode === "preview") {
        await onOpenEmployeeDocument(selectedEmployee.id, documentId);
      } else {
        await onDownloadEmployeeDocument(selectedEmployee.id, documentId);
      }
    } finally {
      setFileBusyKey("");
    }
  }

  async function handleEmployeeDocumentDelete(documentId: string, documentName: string) {
    if (!selectedEmployee || !canDeleteDocuments) {
      return;
    }

    const confirmed = window.confirm(`Remove ${documentName} from ${selectedEmployee.fullName}'s staff file?`);
    if (!confirmed) {
      return;
    }

    const busyKey = `document-${documentId}-delete`;
    setFileBusyKey(busyKey);
    try {
      await onDeleteEmployeeDocument(selectedEmployee.id, documentId);
    } finally {
      setFileBusyKey("");
    }
  }

  async function handleLeaveFormAction(requestId: string, mode: "preview" | "download") {
    const busyKey = `leave-form-${requestId}-${mode}`;
    setFileBusyKey(busyKey);
    try {
      if (mode === "preview") {
        await onOpenLeaveForm(requestId);
      } else {
        await onDownloadLeaveForm(requestId);
      }
    } finally {
      setFileBusyKey("");
    }
  }

  function getDocumentDownloadLabel(document: EmployeeProfile["documentSummary"][number]) {
    const kind = String(document.documentType || document.name || "").replace(/[_-]+/g, " ").trim().toLowerCase();
    return `Download ${kind || "document"}`;
  }

  async function handleSalaryStopToggleForEmployee(employee: EmployeeRecord) {
    const shouldStop = !employee.salaryStopActive;
    const reason = shouldStop
      ? window.prompt("Why are you stopping salary for this staff member?", employee.salaryStopReason || "") ?? ""
      : window.prompt("Why are you resuming salary for this staff member?", "") ?? "";

    if (!reason.trim()) {
      setSalaryStopMessage("A reason is required before changing salary stop status.");
      return;
    }

    setSalaryStopBusy(true);
    setSalaryStopMessage("");
    try {
      await onToggleSalaryStop(employee.id, shouldStop, reason.trim());
      setSalaryStopMessage(shouldStop ? "Salary stopped successfully." : "Salary resumed successfully.");
    } catch (error) {
      setSalaryStopMessage(error instanceof Error ? error.message : "Could not update salary stop status.");
    } finally {
      setSalaryStopBusy(false);
    }
  }

  useEffect(() => {
    if (selectedEmployee) {
      setPeoplePanel("staff-file");
      void loadActionThreads(selectedEmployee.id);
    }
  }, [selectedEmployee]);

  async function loadActionThreads(employeeId: string) {
    try {
      const response = await fetch(`/api/people/employees/${employeeId}/action-messages`, { cache: "no-store" });
      const payload = (await response.json()) as { threads?: Array<Record<string, unknown>>; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load action conversations.");
      }
      setActionThreads(payload.threads ?? []);
    } catch {
      setActionThreads([]);
    }
  }

  async function openActionThread(entityType: string, entityId: string, title: string) {
    if (!selectedEmployee) {
      return;
    }
    setActionThreadBusy(`load:${entityType}:${entityId}`);
    try {
      const query = new URLSearchParams({ entityType, entityId }).toString();
      const response = await fetch(`/api/people/employees/${selectedEmployee.id}/action-messages?${query}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { messages?: Array<Record<string, unknown>>; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load action messages.");
      }
      setActiveActionThread({ entityType, entityId, title });
      setActionThreadMessages(payload.messages ?? []);
    } finally {
      setActionThreadBusy("");
    }
  }

  async function postActionThreadReply() {
    if (!selectedEmployee || !activeActionThread || !actionThreadDraft.trim()) {
      return;
    }
    setActionThreadBusy(`post:${activeActionThread.entityType}:${activeActionThread.entityId}`);
    try {
      const response = await fetch(`/api/people/employees/${selectedEmployee.id}/action-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: activeActionThread.entityType,
          entityId: activeActionThread.entityId,
          message: actionThreadDraft.trim(),
        }),
      });
      const payload = (await response.json()) as { message?: Record<string, unknown>; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not send that reply.");
      }
      setActionThreadDraft("");
      await openActionThread(activeActionThread.entityType, activeActionThread.entityId, activeActionThread.title);
      await loadActionThreads(selectedEmployee.id);
    } finally {
      setActionThreadBusy("");
    }
  }

  function normaliseImportHeader(value: unknown) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");
  }

  function readImportCell(row: Record<string, unknown>, aliases: string[]) {
    const entries = Object.entries(row);
    const normalisedEntries = entries.map(([key, value]) => [normaliseImportHeader(key), value] as const);
    for (const alias of aliases) {
      const match =
        normalisedEntries.find(([key]) => key === alias) ??
        normalisedEntries.find(([key]) => key.includes(alias) || alias.includes(key));
      if (match) {
        const value = match[1];
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          return value.toISOString().slice(0, 10);
        }
        return String(value ?? "").trim();
      }
    }
    return "";
  }

  function downloadBulkEmployeeTemplate() {
    const workbook = XLSX.utils.book_new();
    const staffRows = [
      {
        "Full Name": "Amina Noor",
        "Phone Number": "0712345678",
        "Employment Type": "Permanent",
        "Gross Salary": 32000,
        "Hire Date (YYYY-MM-DD)": "2026-06-01",
        "Branch Name": "Head Office",
        "Department Name": "General Administration",
        "Designation Title": "Sales Representative",
        "Supervisor Employee Number / Title": "",
        "KRA PIN": "",
        "SHIF Number": "",
        "NSSF Number": "",
        "Probation Months": 3,
        "Contract Duration Months": 12,
      },
    ];
    const instructionRows = [
      ["Column", "What to enter"],
      ["Full Name", "Required. Use the staff member's full legal name."],
      ["Phone Number", "Optional, but recommended for payroll and staff records."],
      ["Employment Type", "If left blank, Solva HR will use Permanent."],
      ["Gross Salary", "Required. Enter numbers only, no currency text."],
      ["Hire Date (YYYY-MM-DD)", "Required. Example: 2026-06-01"],
      ["Branch Name", "Optional if everyone belongs to your default branch. Use the exact branch name if filling it."],
      ["Department Name", "Optional if everyone belongs to your default department. Use the exact department name if filling it."],
      ["Designation Title", "Required. Must match an existing designation in this organization."],
      ["Supervisor Employee Number / Title", "Optional. You can use the supervisor's employee number, full name, email, or designation title if numbers have not been issued yet."],
      ["KRA PIN / SHIF Number / NSSF Number", "Optional now, but useful for payroll completeness."],
      ["Probation Months", "Optional. Leave blank to use the normal probation setup."],
      ["Contract Duration Months", "Optional. Leave blank to use the default contract duration."],
    ];
    const staffSheet = XLSX.utils.json_to_sheet(staffRows);
    staffSheet["!cols"] = [
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
    ];
    const instructionSheet = XLSX.utils.aoa_to_sheet(instructionRows);
    instructionSheet["!cols"] = [{ wch: 32 }, { wch: 88 }];
    XLSX.utils.book_append_sheet(workbook, staffSheet, "Staff Upload");
    XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");
    XLSX.writeFile(workbook, "solva-hr-staff-upload-template.xlsx");
  }

  async function handleBulkEmployeeImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBulkImportBusy(true);
    setBulkImportMessage("");
    setBulkImportErrors([]);

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];
      const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
        defval: "",
        raw: false,
        dateNF: "yyyy-mm-dd",
      });
      const rows = sourceRows
        .map((row) => ({
          fullName: readImportCell(row, ["full_name", "employee_name", "staff_name"]),
          phone: readImportCell(row, ["phone_number", "phone", "mobile_number"]),
          employmentType: readImportCell(row, ["employment_type"]),
          salary: readImportCell(row, ["gross_salary", "salary", "basic_salary"]),
          hireDate: readImportCell(row, [
            "hire_date_yyyy_mm_dd",
            "hire_date",
            "date_of_hire",
            "employment_date",
            "joining_date",
            "start_date",
          ]),
          branchName: readImportCell(row, ["branch_name", "branch"]),
          departmentName: readImportCell(row, ["department_name", "department"]),
          designationTitle: readImportCell(row, ["designation_title", "designation", "job_title"]),
          supervisorEmployeeNumber: readImportCell(row, ["supervisor_employee_number", "supervisor_employee_number_title", "supervisor_title", "supervisor_designation_title"]),
          kraPin: readImportCell(row, ["kra_pin"]),
          shifNumber: readImportCell(row, ["shif_number", "nhif_number"]),
          nssfNumber: readImportCell(row, ["nssf_number"]),
          probationMonths: readImportCell(row, ["probation_months"]),
          contractDurationMonths: readImportCell(row, ["contract_duration_months"]),
        }))
        .filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));

      if (!rows.length) {
        throw new Error("The upload file is empty. Fill at least one staff row before uploading.");
      }

      const response = await fetch("/api/people/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            createdCount?: number;
            failedCount?: number;
            errors?: Array<{ rowNumber: number; fullName: string; message: string }>;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not upload those staff records right now.");
      }

      const createdCount = Number(payload?.createdCount ?? 0);
      const failedCount = Number(payload?.failedCount ?? 0);
      const importErrors = Array.isArray(payload?.errors) ? payload.errors : [];

      setBulkImportErrors(importErrors);
      setBulkImportMessage(
        failedCount
          ? `Imported ${createdCount} staff member${createdCount === 1 ? "" : "s"}. ${failedCount} row${failedCount === 1 ? "" : "s"} still need attention below.`
          : `Imported ${createdCount} staff member${createdCount === 1 ? "" : "s"} and they are now ready in Staff Register for payroll setup.`
      );
      await onRefreshPeople();
    } catch (error) {
      setBulkImportMessage(error instanceof Error ? error.message : "Could not upload those staff records right now.");
      setBulkImportErrors([]);
    } finally {
      setBulkImportBusy(false);
      event.target.value = "";
    }
  }

  return (
    <section className="surface-card action-workbench">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Staff Register</p>
          <h3>Staff master records</h3>
        </div>
        <TonePill tone="positive">live records</TonePill>
      </div>
      <div className="workspace-segment-bar">
        {[
          { key: "directory", label: `Directory (${employees.length})` },
          { key: "staff-file", label: "Staff File" },
          { key: "accounts", label: "User Accounts" },
          { key: "lifecycle", label: "Lifecycle" },
          ...(canViewUserAccess ? [{ key: "user-access", label: "User Access" }] : []),
          { key: "onboarding", label: canManage ? "Add Employee" : "Onboarding" },
        ].map((panel) => (
          <button
            key={panel.key}
            className={`workspace-segment-button ${peoplePanel === panel.key ? "is-active" : ""}`}
            onClick={() => setPeoplePanel(panel.key as typeof peoplePanel)}
            type="button"
          >
            {panel.label}
          </button>
        ))}
      </div>
      <div className="workbench-grid">
        <section className={`mini-panel ${peoplePanel === "directory" ? "" : "is-hidden-panel"}`}>
          <div data-tour="people-roster">
          <h4>Current staff roster ({employees.length})</h4>
          {canManage ? (
            <div className="inline-actions" style={{ marginBottom: 12 }}>
              <button
                className="primary-button"
                disabled={!selectedEmployeeIds.length || accountBusyKey === "bulk-create"}
                onClick={() => onCreateUserAccountsBulk(selectedEmployeeIds)}
                type="button"
              >
                {accountBusyKey === "bulk-create"
                  ? "Creating accounts..."
                  : `Create User Accounts (${selectedEmployeeIds.length})`}
              </button>
            </div>
          ) : null}
          <div className="mini-list queue-list">
            {employees.map((employee) => (
              <div className="detail-card-selection" key={employee.id}>
                {canManage ? (
                  <input
                    checked={selectedEmployeeIds.includes(employee.id)}
                    onChange={() => toggleSelectedEmployee(employee.id)}
                    type="checkbox"
                  />
                ) : null}
                <button
                  className="detail-card-button"
                  onClick={() => onSelectEmployee(employee.id)}
                  type="button"
                >
                  <strong>
                    {employee.employeeNumber} {employee.fullName}
                  </strong>
                  <span>
                    {employee.department} | {employee.branch}
                  </span>
                  <small>
                    {employee.employmentType} | {employee.status} | Account {employee.userAccount.status}
                  </small>
                </button>
                {canManage && employee.userAccount.status === "No account" ? (
                  <button
                    className="ghost-button"
                    disabled={accountBusyKey === `create:${employee.id}`}
                    onClick={() => onCreateUserAccount(employee.id)}
                    type="button"
                  >
                    {accountBusyKey === `create:${employee.id}` ? "Creating..." : "Create User Account"}
                  </button>
                ) : null}
                {canReviewSalary ? (
                  <Link
                    className="ghost-button workflow-link-button"
                    href={workflowRoutes.employeeSalaryReview(employee.id)}
                  >
                    Review Salary
                  </Link>
                ) : null}
                {canManagePayrollAdditions ? (
                  <button
                    className="secondary-button"
                    onClick={() => onOpenPayrollAddition(employee.id)}
                    type="button"
                  >
                    Bonus / Incentive
                  </button>
                ) : null}
                {canStopSalary ? (
                  <button
                    className={employee.salaryStopActive ? "secondary-button" : "ghost-button"}
                    disabled={salaryStopBusy}
                    onClick={() => void handleSalaryStopToggleForEmployee(employee)}
                    type="button"
                  >
                    {salaryStopBusy
                      ? "Saving..."
                      : employee.salaryStopActive
                        ? "Resume Salary"
                        : "Stop Salary"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          </div>
        </section>
        <section className={`mini-panel ${peoplePanel === "staff-file" ? "" : "is-hidden-panel"}`}>
          <h4>Employee detail</h4>
          {selectedEmployee ? (
            <div className="profile-detail-stack">
              <article className="mini-list queue-list">
                <article>
                  <strong>{selectedEmployee.fullName}</strong>
                  <span>
                    {selectedEmployee.employeeNumber} | {selectedEmployee.status}
                  </span>
                  <small>
                    {selectedEmployee.department} | {selectedEmployee.branch} |{" "}
                    {selectedEmployee.employmentType}
                  </small>
                  {typeof selectedEmployee.currentGrossPay === "number" ? (
                    <small>Gross pay KES {selectedEmployee.currentGrossPay.toLocaleString()}</small>
                  ) : null}
                </article>
              </article>

              <div className="detail-section-grid">
                <section className="detail-section-card">
                  <h5>User account</h5>
                  <div className="detail-kv-list">
                    <article>
                      <span>Status</span>
                      <strong>{selectedEmployee.userAccountDetail.status}</strong>
                    </article>
                    <article>
                      <span>Role</span>
                      <strong>{selectedEmployee.userAccountDetail.role}</strong>
                    </article>
                    <article>
                      <span>Last login</span>
                      <strong>{selectedEmployee.userAccountDetail.lastLogin}</strong>
                    </article>
                    <article>
                      <span>Activation</span>
                      <strong>{selectedEmployee.userAccountDetail.activationState}</strong>
                    </article>
                  </div>
                  {canManage ? (
                    <div className="inline-actions">
                      {selectedEmployee.userAccountDetail.userId ? (
                        <>
                          {selectedEmployee.userAccountDetail.status === "Invited" ? (
                            <button
                              className="ghost-button"
                              disabled={accountBusyKey === `resend:${selectedEmployee.userAccountDetail.userId}`}
                              onClick={() =>
                                onRunUserAction(selectedEmployee.userAccountDetail.userId!, "resend_invite")
                              }
                              type="button"
                            >
                              Resend Invite
                            </button>
                          ) : null}
                          <button
                            className="ghost-button"
                            disabled={accountBusyKey === `reset:${selectedEmployee.userAccountDetail.userId}`}
                            onClick={() =>
                              onRunUserAction(selectedEmployee.userAccountDetail.userId!, "reset_password")
                            }
                            type="button"
                          >
                            Reset Password
                          </button>
                          {canViewUserAccess ? (
                            <button
                              className="secondary-button"
                              disabled={accountBusyKey === `temp-password:${selectedEmployee.userAccountDetail.userId}`}
                              onClick={() =>
                                void onSetTemporaryPassword(
                                  selectedEmployee.userAccountDetail.userId!,
                                  selectedEmployee.companyEmail !== "-"
                                    ? selectedEmployee.companyEmail
                                    : selectedEmployee.fullName
                                )
                              }
                              type="button"
                            >
                              {accountBusyKey === `temp-password:${selectedEmployee.userAccountDetail.userId}`
                                ? "Saving..."
                                : "Set ESS Password"}
                            </button>
                          ) : null}
                          {selectedEmployee.userAccountDetail.status === "Suspended" ? (
                            <button
                              className="primary-button"
                              disabled={accountBusyKey === `activate:${selectedEmployee.userAccountDetail.userId}`}
                              onClick={() =>
                                onRunUserAction(selectedEmployee.userAccountDetail.userId!, "reactivate")
                              }
                              type="button"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              className="ghost-button"
                              disabled={accountBusyKey === `suspend:${selectedEmployee.userAccountDetail.userId}`}
                              onClick={() =>
                                onRunUserAction(selectedEmployee.userAccountDetail.userId!, "suspend")
                              }
                              type="button"
                            >
                              Suspend Account
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          className="primary-button"
                          disabled={accountBusyKey === `create:${selectedEmployee.id}`}
                          onClick={() => onCreateUserAccount(selectedEmployee.id)}
                          type="button"
                        >
                          {accountBusyKey === `create:${selectedEmployee.id}` ? "Creating..." : "Create User Account"}
                        </button>
                      )}
                    </div>
                  ) : null}
                </section>

                {selectedEmployee.profileSections.map((section) => (
                  <section className="detail-section-card" key={section.title}>
                    <h5>{section.title}</h5>
                    <div className="detail-kv-list">
                      {section.items.map((item) => (
                        <article key={`${section.title}-${item.label}`}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="detail-section-grid">
                <section className="detail-section-card">
                  <h5>Documents</h5>
                  <div className="mini-list queue-list">
                    {selectedEmployee.documentSummary.map((document) => (
                      <article key={`${document.id ?? document.name}-${document.expiry}`}>
                        <strong>{document.name}</strong>
                        <span>
                          {document.category} | {document.documentType ?? document.status}
                        </span>
                        <small>Uploaded {document.uploadedAt ?? document.expiry}</small>
                        {document.id ? (
                          <div className="inline-actions">
                            <button
                              className="ghost-button"
                              disabled={fileBusyKey === `document-${document.id}-preview`}
                              onClick={() => void handleEmployeeDocumentAction(document.id!, "preview")}
                              type="button"
                            >
                              {fileBusyKey === `document-${document.id}-preview` ? "Opening..." : "Open"}
                            </button>
                            <button
                              className="secondary-button"
                              disabled={fileBusyKey === `document-${document.id}-download`}
                              onClick={() => void handleEmployeeDocumentAction(document.id!, "download")}
                              type="button"
                            >
                              {fileBusyKey === `document-${document.id}-download`
                                ? "Downloading..."
                                : getDocumentDownloadLabel(document)}
                            </button>
                            {canDeleteDocuments ? (
                              <button
                                className="ghost-button remove-document-button"
                                disabled={fileBusyKey === `document-${document.id}-delete`}
                                onClick={() => void handleEmployeeDocumentDelete(document.id!, document.name)}
                                type="button"
                              >
                                {fileBusyKey === `document-${document.id}-delete` ? "Removing..." : "Remove letter"}
                              </button>
                            ) : null}
                            <button
                              className="ghost-button"
                              disabled={actionThreadBusy === `load:employee_document:${document.id}`}
                              onClick={() => void openActionThread("employee_document", document.id!, document.name)}
                              type="button"
                            >
                              {actionThreadBusy === `load:employee_document:${document.id}` ? "Opening..." : "Replies"}
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>

                <section className="detail-section-card">
                  <h5>Leave history forms</h5>
                  <div className="mini-list queue-list">
                    {selectedEmployee.leaveHistory.length ? selectedEmployee.leaveHistory.map((request) => (
                      <article key={request.id}>
                        <strong>{request.leaveType}</strong>
                        <span>
                          {request.requestCategory === "off_day" ? "Off Day" : "Leave"} | {request.status}
                        </span>
                        <small>
                          {request.startDate} to {request.endDate} | {request.days} day(s)
                        </small>
                        <div className="inline-actions">
                          <button
                            className="ghost-button"
                            disabled={fileBusyKey === `leave-form-${request.id}-preview`}
                            onClick={() => void handleLeaveFormAction(request.id, "preview")}
                            type="button"
                          >
                            {fileBusyKey === `leave-form-${request.id}-preview` ? "Opening..." : "View form"}
                          </button>
                          <button
                            className="ghost-button compact-download-button"
                            disabled={fileBusyKey === `leave-form-${request.id}-download`}
                            onClick={() => void handleLeaveFormAction(request.id, "download")}
                            type="button"
                          >
                            {fileBusyKey === `leave-form-${request.id}-download` ? "Downloading..." : "Download form"}
                          </button>
                          <button
                            className="ghost-button"
                            disabled={actionThreadBusy === `load:leave_request:${request.id}`}
                            onClick={() => void openActionThread("leave_request", request.id, `${request.leaveType} request`)}
                            type="button"
                          >
                            {actionThreadBusy === `load:leave_request:${request.id}` ? "Opening..." : "Replies"}
                          </button>
                        </div>
                      </article>
                    )) : (
                      <p className="section-description">No leave or off-day history has been filed for this staff member yet.</p>
                    )}
                  </div>
                </section>

                <section className="detail-section-card">
                  <h5>Movement history</h5>
                  <div className="table-wrap">
                    {selectedEmployee.movementHistory.length ? (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Event</th>
                            <th>Details</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEmployee.movementHistory.map((movement) => (
                            <tr key={`${movement.id ?? movement.title}-${movement.date}`}>
                              <td>{movement.title}</td>
                              <td>{movement.detail}</td>
                              <td>{movement.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="section-description">No staff movement history has been captured yet.</p>
                    )}
                  </div>
                </section>

                <section className="detail-section-card">
                  <h5>Action conversations</h5>
                  <div className="mini-list queue-list">
                    {actionThreads.length ? (
                      actionThreads.map((thread) => (
                        <article key={`${String(thread.entityType ?? "")}:${String(thread.entityId ?? "")}`}>
                          <strong>{String(thread.title ?? "Staff action")}</strong>
                          <span>{String(thread.latestAuthor ?? "")}</span>
                          <small>{String(thread.latestMessage ?? "")}</small>
                          <div className="inline-actions">
                            <button
                              className="ghost-button"
                              disabled={actionThreadBusy === `load:${String(thread.entityType ?? "")}:${String(thread.entityId ?? "")}`}
                              onClick={() =>
                                void openActionThread(
                                  String(thread.entityType ?? ""),
                                  String(thread.entityId ?? ""),
                                  String(thread.title ?? "Staff action")
                                )
                              }
                              type="button"
                            >
                              Open thread
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="section-description">No staff action conversations yet.</p>
                    )}
                  </div>
                  {activeActionThread ? (
                    <div className="mini-panel" style={{ marginTop: 12 }}>
                      <h6>{activeActionThread.title}</h6>
                      <div className="mini-list queue-list">
                        {actionThreadMessages.map((message) => (
                          <article key={String(message.id ?? "")}>
                            <strong>{String(message.authorName ?? message.authorRole ?? "")}</strong>
                            <span>{String(message.authorRole ?? "")}</span>
                            <small>{String(message.message ?? "")}</small>
                          </article>
                        ))}
                      </div>
                      <div className="action-form" style={{ marginTop: 12 }}>
                        <label>
                          <span>Reply</span>
                          <textarea
                            onChange={(event) => setActionThreadDraft(event.target.value)}
                            rows={3}
                            value={actionThreadDraft}
                          />
                        </label>
                        <button
                          className="primary-button"
                          disabled={
                            !actionThreadDraft.trim() ||
                            actionThreadBusy === `post:${activeActionThread.entityType}:${activeActionThread.entityId}`
                          }
                          onClick={() => void postActionThreadReply()}
                          type="button"
                        >
                          {actionThreadBusy === `post:${activeActionThread.entityType}:${activeActionThread.entityId}` ? "Sending..." : "Send reply"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>

              {canManage || canReviewSalary || canStopSalary ? (
                <section className="detail-section-card" key={selectedEmployee.id}>
                  <h5>Staff file and letters</h5>
                  <p className="section-description">
                    Open the staff file to update details, review documents, and issue letters using the official Robot Cafe templates.
                  </p>
                  <div className="inline-actions">
                    {canManage ? (
                      <Link className="secondary-button workflow-link-button" href={workflowRoutes.employeeEdit(selectedEmployee.id)}>
                        Open Staff File
                      </Link>
                    ) : null}
                    {canReviewSalary ? (
                      <Link className="ghost-button workflow-link-button" href={workflowRoutes.employeeSalaryReview(selectedEmployee.id)}>
                        Review Salary
                      </Link>
                    ) : null}
                    {canManagePayrollAdditions ? (
                      <button
                        className="secondary-button"
                        onClick={() => onOpenPayrollAddition(selectedEmployee.id)}
                        type="button"
                      >
                        Bonus / Incentive
                      </button>
                    ) : null}
                    {canStopSalary ? (
                      <button
                        className={selectedEmployee.salaryStopActive ? "secondary-button" : "ghost-button"}
                        disabled={salaryStopBusy}
                        onClick={() => void handleSalaryStopToggle(!selectedEmployee.salaryStopActive)}
                        type="button"
                      >
                        {salaryStopBusy
                          ? "Saving..."
                          : selectedEmployee.salaryStopActive
                            ? "Resume Salary"
                            : "Stop Salary"}
                      </button>
                    ) : null}
                    <Link
                      className="primary-button workflow-link-button"
                      href={workflowRoutes.employeeEditWithDocument(selectedEmployee.id, "commendation_letter")}
                    >
                      Issue Commendation Letter
                    </Link>
                  </div>
                  {salaryStopMessage ? <small>{salaryStopMessage}</small> : null}
                </section>
              ) : null}

              {canRequestStaffChanges ? (
                <section className="detail-section-card" key={`${selectedEmployee.id}-exit`}>
                  <h5>Request staff exit</h5>
                  <p className="section-description">
                    Use this when a team member has resigned, deserted duty, or should be separated.
                    {selectedRole.role === "Manager" || selectedRole.role === "HR Admin"
                      ? " This action saves directly and updates the staff register immediately."
                      : " GM will approve or reject it from the central approvals inbox."}
                  </p>
                  <div className="action-form">
                    <label>
                      <span>Reason</span>
                      <select value={staffExitReason} onChange={(event) => setStaffExitReason(event.target.value)}>
                        <option>Resignation</option>
                        <option>Desertion</option>
                        <option>Absconding of Duty</option>
                        <option>Dismissal</option>
                        <option>Summary Dismissal</option>
                        <option>Redundancy</option>
                        <option>Medical Grounds</option>
                        <option>Death</option>
                      </select>
                    </label>
                    <label>
                      <span>Comments</span>
                      <textarea rows={3} value={staffExitComments} onChange={(event) => setStaffExitComments(event.target.value)} />
                    </label>
                    <div className="workflow-readonly-card">
                      <strong>Suggested starting point</strong>
                      <span>{staffExitSuggestion || "Select a staff member to see a context-aware starting point."}</span>
                      <div className="inline-actions">
                        <button
                          className="ghost-button"
                          disabled={!selectedEmployee}
                          onClick={() =>
                            setStaffExitComments((current) => current || staffExitSuggestion)
                          }
                          type="button"
                        >
                          Use suggested note
                        </button>
                      </div>
                      {staffExitWarnings.length ? (
                        <div className="note-list">
                          {staffExitWarnings.map((warning) => (
                            <article key={warning}>
                              <p>{warning}</p>
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="inline-actions">
                      <button className="ghost-button" disabled={staffExitBusy || staffExitAssistBusy} onClick={() => void handleStaffExitAssist()} type="button">
                        {staffExitAssistBusy ? "Drafting..." : "Help me draft this"}
                      </button>
                      <button className="ghost-button" disabled={staffExitBusy || staffExitAssistBusy} onClick={() => void handleStaffExitAssist("formal")} type="button">
                        More formal
                      </button>
                      <button className="ghost-button" disabled={staffExitBusy || staffExitAssistBusy} onClick={() => void handleStaffExitAssist("review")} type="button">
                        Review wording
                      </button>
                      <button className="primary-button" disabled={staffExitBusy} onClick={() => void handleStaffExitRequest()} type="button">
                        {staffExitBusy
                          ? "Submitting..."
                          : selectedRole.role === "Manager" || selectedRole.role === "HR Admin"
                            ? "Complete staff exit"
                            : "Submit exit request"}
                      </button>
                    </div>
                    {staffExitMessage ? <small>{staffExitMessage}</small> : null}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <p className="section-description">Select an employee to inspect their profile detail.</p>
          )}
        </section>
        <section className={`mini-panel ${peoplePanel === "onboarding" ? "" : "is-hidden-panel"}`} data-tour="people-add">
          <h4>Add employee</h4>
          {canManage ? (
            <>
              <p className="section-description">
                Major create workflows now open in their own page so HR teams have enough room for setup and validation.
              </p>
              <small>The page header now carries the single primary Add Employee action for this workspace.</small>
              <div className="inline-actions" style={{ marginTop: 12 }}>
                <Link className="primary-button workflow-link-button" href={workflowRoutes.employeeCreate}>
                  {selectedRole.role === "Supervisor" ? "Submit New Hire" : "Add Employee"}
                </Link>
                {canReviewSalary ? (
                  <Link className="secondary-button workflow-link-button" href={workflowRoutes.performanceWorkspace}>
                    Review Salary
                  </Link>
                ) : null}
              </div>
              {canBulkOnboard ? (
                <div className="detail-section-card" style={{ marginTop: 18 }}>
                  <h5>Bulk staff upload for payroll setup</h5>
                  <p className="section-description">
                    Download the template, fill the new staff rows, then upload it here. Imported staff land in Staff Register immediately and become available for payroll preparation.
                  </p>
                  <div className="inline-actions" style={{ marginTop: 12 }}>
                    <button className="secondary-button" onClick={downloadBulkEmployeeTemplate} type="button">
                      Download upload template
                    </button>
                    <input
                      accept=".xlsx,.xls,.csv"
                      disabled={bulkImportBusy}
                      onChange={(event) => void handleBulkEmployeeImport(event)}
                      type="file"
                    />
                  </div>
                  <small>Use exact branch, department, and designation names where you fill those columns.</small>
                  {bulkImportMessage ? <p className="section-description" style={{ marginTop: 12 }}>{bulkImportMessage}</p> : null}
                  {bulkImportErrors.length ? (
                    <div className="mini-list queue-list" style={{ marginTop: 12 }}>
                      {bulkImportErrors.slice(0, 8).map((issue) => (
                        <article key={`${issue.rowNumber}-${issue.fullName}`}>
                          <strong>
                            Row {issue.rowNumber} - {issue.fullName}
                          </strong>
                          <small>{issue.message}</small>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="section-description">
              Switch to Operator, Supervisor, HR Admin, or Super Admin to manage employee master records.
            </p>
          )}
        </section>
        {canViewUserAccess ? (
          <section className={`mini-panel ${peoplePanel === "user-access" ? "" : "is-hidden-panel"}`}>
            <h4>User access control</h4>
            <p className="section-description">
              Usernames are visible here for control and accountability. Passwords are not stored in readable form, so use temporary password issuance when access must be reset safely.
            </p>
            {userAccessLoading ? (
              <p className="section-description">Loading user access records...</p>
            ) : (
              <div className="mini-list queue-list">
                {userAccessRows.length ? (
                  userAccessRows.map((user) => (
                    <article key={String(user.id ?? user.email ?? Math.random())}>
                      <strong>{String(user.fullName ?? user.email ?? "-")}</strong>
                      <span>
                        {String(user.email ?? "-")} | {String(user.role ?? "-")} | {String(user.status ?? "-")}
                      </span>
                      <small>
                        {String(user.linkedEmployee ?? "Standalone user")} | Last login {String(user.lastLogin ?? "-")}
                      </small>
                      <div className="inline-actions">
                        <TonePill tone={Boolean(user.mustResetPassword) ? "warning" : "positive"}>
                          {Boolean(user.mustResetPassword) ? "reset required" : "active password"}
                        </TonePill>
                        <button
                          className="secondary-button"
                          onClick={() => void onSetTemporaryPassword(String(user.id ?? ""), String(user.email ?? user.fullName ?? "this user"))}
                          type="button"
                        >
                          Set ESS Password
                        </button>
                        <button
                          className="ghost-button"
                          onClick={() => void onForceSignOutUser(String(user.id ?? ""))}
                          type="button"
                        >
                          Force sign out
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="section-description">No user access records are available for this role yet.</p>
                )}
              </div>
            )}
          </section>
        ) : null}
        <section className={`mini-panel ${peoplePanel === "accounts" ? "" : "is-hidden-panel"}`}>
          <h4>User accounts</h4>
          {selectedEmployee ? (
            <div className="mini-list queue-list">
              <article>
                <strong>{selectedEmployee.fullName}</strong>
                <span>{selectedEmployee.userAccountDetail.role} | {selectedEmployee.userAccountDetail.status}</span>
                <small>Last login {selectedEmployee.userAccountDetail.lastLogin}</small>
              </article>
            </div>
          ) : (
            <SectionMessage text="Select a staff member from Directory to manage or inspect their account." />
          )}
        </section>
        <section className={`mini-panel ${peoplePanel === "lifecycle" ? "" : "is-hidden-panel"}`}>
          <h4>Lifecycle actions</h4>
          {selectedEmployee ? (
            <>
              <div className="mini-list queue-list">
                <article>
                  <strong>{selectedEmployee.fullName}</strong>
                  <span>{selectedEmployee.employeeNumber} | {selectedEmployee.status}</span>
                  <small>
                    {selectedEmployee.salaryStopActive
                      ? `Salary stopped${selectedEmployee.salaryStopReason ? ` - ${selectedEmployee.salaryStopReason}` : ""}`
                      : "Salary active"}
                  </small>
                </article>
              </div>
              <div className="inline-actions" style={{ marginTop: 12 }}>
                {canStopSalary ? (
                  <button
                    className={selectedEmployee.salaryStopActive ? "secondary-button" : "ghost-button"}
                    disabled={salaryStopBusy}
                    onClick={() => void handleSalaryStopToggle(!selectedEmployee.salaryStopActive)}
                    type="button"
                  >
                    {salaryStopBusy
                      ? "Saving..."
                      : selectedEmployee.salaryStopActive
                        ? "Resume Salary"
                        : "Stop Salary"}
                  </button>
                ) : null}
                {canRequestStaffChanges ? (
                  <button className="primary-button" disabled={staffExitBusy} onClick={() => void handleStaffExitRequest()} type="button">
                    {staffExitBusy
                      ? "Submitting..."
                      : selectedRole.role === "Manager" || selectedRole.role === "HR Admin"
                        ? "Complete Staff Exit"
                        : "Submit Exit Request"}
                  </button>
                ) : null}
              </div>
              {salaryStopMessage ? <small>{salaryStopMessage}</small> : null}
              {staffExitMessage ? <small>{staffExitMessage}</small> : null}
            </>
          ) : (
            <SectionMessage text="Select a staff member from Directory before using lifecycle actions." />
          )}
        </section>
      </div>
    </section>
  );
}

function PayrollWorkbench({
  activeItem,
  payroll,
  variance,
  process,
  selectedRole,
  onExport,
  onPayslipAction,
  onPayslipBundleAction,
  exportBusy,
  onRefreshPayroll,
  workspaceName,
  lastExportWarningSummary,
  onOpenWarnings,
}: {
  activeItem: string;
  payroll: PayrollPackage | null;
  variance: PayrollVarianceItem[];
  process: PayrollProcessData | null;
  selectedRole: RuntimeRoleProfile;
  onExport: (
    exportType: PayrollExportActionType,
    options?: {
      mode?: "preview" | "download";
      periodId?: string;
    }
  ) => void;
  onPayslipAction: (employeeId: string, options?: { mode?: "preview" | "download" }) => void;
  onPayslipBundleAction: (options?: { mode?: "preview" | "download"; periodId?: string }) => void;
  exportBusy: string | null;
  onRefreshPayroll: () => Promise<void>;
  workspaceName: string;
  lastExportWarningSummary: Record<string, unknown> | null;
  onOpenWarnings: () => void;
}) {
  const canExport = ["Payroll Admin", "Finance Officer", "HR Admin", "Manager", "Super Admin"].includes(selectedRole.role);
  const canOperatePayroll = ["Payroll Admin", "Finance Officer", "HR Admin", "Manager", "Super Admin"].includes(selectedRole.role);
  const canOpenPeriod = canOperatePayroll;
  const canSubmitApproval = ["Payroll Admin", "HR Admin", "Manager", "Super Admin"].includes(selectedRole.role);
  const canManageDayDeductions = ["Payroll Admin", "HR Admin", "Manager", "Super Admin", "Supervisor"].includes(selectedRole.role);
  const canApproveDayDeductions = ["Payroll Admin", "HR Admin", "Manager", "Super Admin"].includes(selectedRole.role);
  const canManagePayrollAdditions = ["Payroll Admin", "HR Admin", "Manager", "Super Admin", "Supervisor"].includes(selectedRole.role);
  const canApprovePayrollAdditions = ["Payroll Admin", "HR Admin", "Manager", "Super Admin"].includes(selectedRole.role);
  const [periods, setPeriods] = useState<Array<Record<string, unknown>>>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [employeeRows, setEmployeeRows] = useState<Array<Record<string, unknown>>>([]);
  const [employeeRowsLoading, setEmployeeRowsLoading] = useState(false);
  const [payrollPickerEmployees, setPayrollPickerEmployees] = useState<
    Array<{ id: string; employeeNumber: string; fullName: string; department: string; status: string }>
  >([]);
  const [payrollPickerEmployeesLoading, setPayrollPickerEmployeesLoading] = useState(false);
  const [payslips, setPayslips] = useState<Array<Record<string, unknown>>>([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [statutoryRows, setStatutoryRows] = useState<Array<Record<string, unknown>>>([]);
  const [statutoryLoading, setStatutoryLoading] = useState(false);
  const [auditRows, setAuditRows] = useState<Array<Record<string, unknown>>>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [dayDeductions, setDayDeductions] = useState<Array<Record<string, unknown>>>([]);
  const [dayDeductionsLoading, setDayDeductionsLoading] = useState(false);
  const [payrollAdditions, setPayrollAdditions] = useState<Array<Record<string, unknown>>>([]);
  const [payrollAdditionsLoading, setPayrollAdditionsLoading] = useState(false);
  const [periodActionMessage, setPeriodActionMessage] = useState("");
  const [periodBusyAction, setPeriodBusyAction] = useState("");
  const [selectedExportPeriodId, setSelectedExportPeriodId] = useState("");
  const [warningFilter, setWarningFilter] = useState("all");
  const [payrollPanel, setPayrollPanel] = useState<
    | "overview"
    | "process"
    | "warnings"
    | "deductions"
    | "additions"
    | "approvals"
    | "periods"
    | "exports"
    | "employee-data"
    | "audit"
  >("overview");
  const [dayDeductionForm, setDayDeductionForm] = useState({
    employeeId: "",
    targetPayrollRunId: "",
    deductionMode: "day_count",
    deductionCategory: "Suspension",
    deductionDays: "1",
    fixedAmount: "",
    startDate: "",
    endDate: "",
    reason: "",
    notes: "",
  });
  const [payrollAdditionForm, setPayrollAdditionForm] = useState({
    employeeId: "",
    targetPayrollRunId: "",
    earningCategory: "Bonus",
    amount: "",
    effectiveDate: "",
    reason: "",
    notes: "",
  });

  const activeRunId = payroll?.runId ?? process?.currentRunId ?? "";
  const selectedPayrollRunId = selectedExportPeriodId || activeRunId;
  const selectedPayrollPeriod = periods.find((period) => String(period.id) === selectedPayrollRunId) ?? null;
  const isSelectedHolidayRun = String(selectedPayrollPeriod?.payroll_type ?? "") === "Holiday Payroll";
  const isMidMonthRun = payroll?.payrollType === "15th Payroll";
  const prefersMpesa =
    process?.paymentMode === "MPESA" || workspaceName.toLowerCase().includes("robot cafe");
  const primaryPaymentExport =
    process?.primaryPaymentExport ?? (prefersMpesa || isMidMonthRun ? "net_to_mpesa" : "net_to_bank");
  const validationIssues = process?.validations ?? [];
  const warningIssues = validationIssues.filter((item) => !item.blocker);
  const blockerIssues = validationIssues.filter((item) => item.blocker);
  const warningSummary = process?.warningSummary ?? {
    missingKraPins: 0,
    missingMpesaPhones: 0,
    missingShifNumbers: 0,
    missingNssfNumbers: 0,
    missingHelbNumbers: 0,
    missingNationalIds: 0,
    missingSalaries: 0,
    missingPaymentDestinations: 0,
  };
  const filteredValidationIssues =
    warningFilter === "all"
      ? validationIssues
      : warningFilter === "blockers"
        ? blockerIssues
        : validationIssues.filter((item) => {
            const filterMatch =
              (warningFilter === "missing-kra" && item.missingField === "KRA PIN") ||
              (warningFilter === "missing-shif" && item.missingField === "SHIF number") ||
              (warningFilter === "missing-nssf" && item.missingField === "NSSF number") ||
              (warningFilter === "missing-helb" && item.missingField === "HELB identifier") ||
              (warningFilter === "missing-mpesa" && item.missingField === "MPESA phone number") ||
              (warningFilter === "missing-id" && item.missingField === "National ID") ||
              (warningFilter === "missing-salary" && item.missingField === "Salary") ||
              (warningFilter === "severity-critical" && item.severity === "critical") ||
              (warningFilter === "severity-warning" && item.severity === "warning");

            return filterMatch;
          });
  const payrollSelectableEmployees = useMemo(() => {
    const deduped = new Map<string, { id: string; employeeNumber: string; fullName: string }>();

    payrollPickerEmployees.forEach((row) => {
      if (!row.id) {
        return;
      }
      deduped.set(row.id, {
        id: row.id,
        employeeNumber: row.employeeNumber,
        fullName: row.fullName,
      });
    });

    employeeRows.forEach((row) => {
      const id = String(row.id ?? "");
      if (!id) {
        return;
      }
      deduped.set(id, {
        id,
        employeeNumber: String(row.employeeNumber ?? "-"),
        fullName: String(row.fullName ?? "-"),
      });
    });

    (process?.employeeRows ?? []).forEach((row) => {
      const id = String(row.id ?? "");
      if (!id || deduped.has(id)) {
        return;
      }
      deduped.set(id, {
        id,
        employeeNumber: String(row.employeeNumber ?? "-"),
        fullName: String(row.fullName ?? "-"),
      });
    });

    return Array.from(deduped.values()).sort((left, right) =>
      `${left.employeeNumber} ${left.fullName}`.localeCompare(`${right.employeeNumber} ${right.fullName}`)
    );
  }, [employeeRows, payrollPickerEmployees, process?.employeeRows]);

  useEffect(() => {
    if (activeRunId && !selectedExportPeriodId) {
      setSelectedExportPeriodId(activeRunId);
    }
  }, [activeRunId, selectedExportPeriodId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const requestedPanel = window.sessionStorage.getItem("solva.payroll.openPanel");
    const requestedEmployeeId = window.sessionStorage.getItem("solva.payroll.additionEmployeeId");
    if (requestedPanel !== "additions" && !requestedEmployeeId) {
      return;
    }

    setPayrollPanel("additions");
    if (requestedEmployeeId) {
      setPayrollAdditionForm((current) => ({
        ...current,
        employeeId: requestedEmployeeId,
      }));
    }

    window.sessionStorage.removeItem("solva.payroll.openPanel");
    window.sessionStorage.removeItem("solva.payroll.additionEmployeeId");
  }, []);

  useEffect(() => {
    const nextPanel:
      | "overview"
      | "process"
      | "warnings"
      | "deductions"
      | "approvals"
      | "periods"
      | "exports"
      | "employee-data"
      | "audit" =
      activeItem === "Payroll Periods"
        ? "periods"
        : activeItem === "Process Payroll"
          ? "process"
          : activeItem === "Review & Approval"
            ? "approvals"
            : activeItem === "Employee Payroll Data"
              ? "employee-data"
              : activeItem === "Payroll Validation Warnings"
                ? "warnings"
                : activeItem === "Payroll Audit Trail"
                  ? "audit"
                  : activeItem === "Payslips" ||
                      activeItem === "Payroll Reports" ||
                      activeItem === "Statutory Reports" ||
                      activeItem === "Net to Bank" ||
                      activeItem === "Net to MPESA" ||
                      activeItem === "P9 Forms"
                    ? "exports"
                    : "overview";

    setPayrollPanel((current) => (current === nextPanel ? current : nextPanel));
  }, [activeItem]);

  useEffect(() => {
    if (!activeRunId) {
      return;
    }

    setDayDeductionForm((current) =>
      current.targetPayrollRunId
        ? current
        : {
            ...current,
            targetPayrollRunId: activeRunId,
          }
    );
    setPayrollAdditionForm((current) =>
      current.targetPayrollRunId
        ? current
        : {
            ...current,
            targetPayrollRunId: activeRunId,
          }
    );
  }, [activeRunId]);

  useEffect(() => {
    if (!periods.length) {
      return;
    }

    const firstPeriodId = String(periods[0]?.id ?? "");
    const hasCurrentSelection = periods.some((period) => String(period.id) === selectedExportPeriodId);
    if (!selectedExportPeriodId || !hasCurrentSelection) {
      setSelectedExportPeriodId(firstPeriodId);
    }
  }, [periods, selectedExportPeriodId]);

  async function loadPeriods() {
    setPeriodsLoading(true);
    try {
      const payload = await readRuntimeJson<{ periods: Array<Record<string, unknown>> }>("/api/payroll/periods");
      setPeriods(payload.periods);
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not load payroll periods."
        )
      );
    } finally {
      setPeriodsLoading(false);
    }
  }

  async function loadEmployeeRows() {
    setEmployeeRowsLoading(true);
    try {
      const params = new URLSearchParams();
      const periodId = selectedExportPeriodId || activeRunId;
      if (periodId) {
        params.set("periodId", periodId);
      }
      const payload = await readRuntimeJson<{ rows: Array<Record<string, unknown>> }>(
        `/api/payroll/employee-data${params.toString() ? `?${params.toString()}` : ""}`
      );
      setEmployeeRows(payload.rows);
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not load employee payroll data."
        )
      );
    } finally {
      setEmployeeRowsLoading(false);
    }
  }

  async function loadPayrollPickerEmployees() {
    if (!canManageDayDeductions) {
      return;
    }

    setPayrollPickerEmployeesLoading(true);
    try {
      const payload = await readRuntimeJson<{
        employees: Array<{
          id: string;
          employeeNumber: string;
          fullName: string;
          department?: string;
          status?: string;
        }>;
      }>("/api/people/employees");
      setPayrollPickerEmployees(
        (payload.employees ?? [])
          .filter((employee) => employee.status !== "Separated" && employee.status !== "Offboarded")
          .map((employee) => ({
            id: String(employee.id ?? ""),
            employeeNumber: String(employee.employeeNumber ?? "-"),
            fullName: String(employee.fullName ?? "-"),
            department: String(employee.department ?? "-"),
            status: String(employee.status ?? "-"),
          }))
      );
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not load the payroll employee picker."
        )
      );
    } finally {
      setPayrollPickerEmployeesLoading(false);
    }
  }

  async function loadPayslips() {
    setPayslipsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedExportPeriodId) {
        params.set("periodId", selectedExportPeriodId);
      }
      const payload = await readRuntimeJson<{ payslips: Array<Record<string, unknown>> }>(
        `/api/payroll/payslips${params.toString() ? `?${params.toString()}` : ""}`
      );
      setPayslips(payload.payslips);
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(error instanceof Error ? error.message : "Could not load payslips.")
      );
    } finally {
      setPayslipsLoading(false);
    }
  }

  async function loadStatutoryRows() {
    setStatutoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedExportPeriodId) {
        params.set("periodId", selectedExportPeriodId);
      }
      const payload = await readRuntimeJson<{ reports: Array<Record<string, unknown>> }>(
        `/api/payroll/statutory-reports${params.toString() ? `?${params.toString()}` : ""}`
      );
      setStatutoryRows(payload.reports);
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not load statutory totals."
        )
      );
    } finally {
      setStatutoryLoading(false);
    }
  }

  async function loadAuditRows() {
    setAuditLoading(true);
    try {
      const payload = await readRuntimeJson<{ events: Array<Record<string, unknown>> }>("/api/payroll/audit-trail");
      setAuditRows(payload.events);
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not load payroll audit trail."
        )
      );
    } finally {
      setAuditLoading(false);
    }
  }

  async function loadDayDeductions() {
    if (!canManageDayDeductions) {
      return;
    }

    setDayDeductionsLoading(true);
    try {
      const payload = await readRuntimeJson<{ deductions: Array<Record<string, unknown>> }>(
        "/api/payroll/day-deductions"
      );
      setDayDeductions(payload.deductions);
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not load payroll day deductions."
        )
      );
    } finally {
      setDayDeductionsLoading(false);
    }
  }

  async function loadPayrollAdditions() {
    if (!canManagePayrollAdditions) {
      return;
    }

    setPayrollAdditionsLoading(true);
    try {
      const payload = await readRuntimeJson<{ additions: Array<Record<string, unknown>> }>("/api/payroll/additions");
      setPayrollAdditions(payload.additions);
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not load payroll additions."
        )
      );
    } finally {
      setPayrollAdditionsLoading(false);
    }
  }

  function downloadRowsCsv(
    fileName: string,
    rows: Array<Record<string, unknown>>,
    preferredHeaders?: string[]
  ) {
    if (!rows.length) {
      setPeriodActionMessage("There is no data to export yet.");
      return;
    }

    const headers = preferredHeaders?.length
      ? preferredHeaders
      : Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const raw = row[header];
            const value =
              raw == null
                ? ""
                : typeof raw === "object"
                  ? JSON.stringify(raw)
                  : String(raw);
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  function downloadRowsXlsx(fileName: string, sheetName: string, rows: Array<Record<string, unknown>>) {
    if (!rows.length) {
      setPeriodActionMessage("There is no data to export yet.");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  }

  function buildPayrollPreviewRows() {
    const processEmployeeMap = new Map(
      (process?.employeeRows ?? []).map((row) => [
        String(row.id ?? row.employeeNumber ?? ""),
        row,
      ])
    );

    const sourceRows =
      employeeRows.length > 0
        ? employeeRows
        : (process?.employeeRows as Array<Record<string, unknown>> | undefined) ?? [];

    return sourceRows.map((row) => {
      const processRow =
        processEmployeeMap.get(String(row.id ?? row.employeeNumber ?? "")) ??
        processEmployeeMap.get(String(row.employeeNumber ?? "")) ??
        null;
      const allowances = (row.allowances as Record<string, unknown> | null) ?? {};
      const deductions = (row.deductions as Record<string, unknown> | null) ?? {};
      const employeeNumber = String(row.employeeNumber ?? "");
      const matchingDayDeductions = dayDeductions.filter(
        (deduction) =>
          String(deduction.employeeNumber ?? "") === employeeNumber &&
          (!activeRunId || String(deduction.targetPayrollRunId ?? "") === activeRunId) &&
          String(deduction.status ?? "").toLowerCase() !== "voided"
      );
      const matchingAdditions = payrollAdditions.filter(
        (addition) =>
          String(addition.employeeNumber ?? "") === employeeNumber &&
          (!activeRunId || String(addition.targetPayrollRunId ?? "") === activeRunId) &&
          String(addition.status ?? "").toLowerCase() !== "voided"
      );

      return {
        "Staff Name": String(row.fullName ?? ""),
        "Staff Number": employeeNumber,
        "Phone Number": String(row.phone ?? ""),
        Employer: "Robot Cafe & Bistro",
        PayMonth: String(payroll?.period ?? payroll?.status ?? "Current Payroll"),
        Designation: String(row.designation ?? ""),
        Department: String(row.department ?? ""),
        Branch: String(row.branch ?? ""),
        "Employment Type": String(row.employmentType ?? ""),
        "Gross Monthly Pay Would Have Been": String(
          row.grossMonthlyPayWouldHaveBeen ??
            processRow?.grossMonthlyPayWouldHaveBeen ??
            ""
        ),
        "Actual Total Gross Month Pay": String(
          row.actualTotalGrossMonthPay ??
            processRow?.actualTotalGrossMonthPay ??
            ""
        ),
        "30th Net Pay Would Have Been": String(
          row.thirtiethNetPayWouldHaveBeen ??
            processRow?.thirtiethNetPayWouldHaveBeen ??
            ""
        ),
        "Actual 30th Net Pay": String(
          row.actualThirtiethNetPay ??
            processRow?.actualThirtiethNetPay ??
            row.netPay ??
            processRow?.netPay ??
            ""
        ),
        "Gross Salary": String(row.basicSalary ?? ""),
        "Taxable Income": String(row.taxableIncome ?? ""),
        "Gross Pay": String(row.grossPay ?? ""),
        "Net Pay": String(row.netPay ?? ""),
        PAYE: String(deductions.PAYE ?? deductions.paye ?? ""),
        SHIF: String(deductions.SHIF ?? deductions.shif ?? ""),
        NSSF: String(deductions.NSSF ?? deductions.nssf ?? ""),
        "Housing Levy": String(deductions["Housing Levy"] ?? deductions.housing_levy ?? ""),
        Pension: String(deductions.Pension ?? deductions.pension ?? ""),
        HELB: String(deductions.HELB ?? deductions.helb ?? ""),
        Earnings: Object.entries(allowances)
          .map(([key, value]) => `${key}: ${value}`)
          .join(" | "),
        Deductions: Object.entries(deductions)
          .map(([key, value]) => `${key}: ${value}`)
          .join(" | "),
        "Employer Contributions": [
          `Employer NSSF: ${Number(String(row.grossPay ?? "0").replace(/[^\d.-]/g, "") || "0") > 0 ? "KES 1,080" : "KES 0"}`,
          `Employer Housing Levy: ${String(
            (
              Number(String(row.grossPay ?? "0").replace(/[^\d.-]/g, "") || "0") * 0.015
            ).toLocaleString("en-KE", { maximumFractionDigits: 2 })
          )}`,
        ].join(" | "),
        "Salary Reductions": matchingDayDeductions
          .map((deduction) =>
            String(deduction.deductionMode ?? "day_count") === "incident_amount"
              ? `${String(deduction.deductionCategory ?? "incident")} | KES ${Number(
                  deduction.fixedAmount ?? 0
                ).toLocaleString()} | ${String(deduction.reason ?? "")}`
              : `${String(deduction.deductionCategory ?? "unworked days")} | ${String(
                  deduction.deductionDays ?? 0
                )} day(s) | ${String(deduction.startDate ?? "")} to ${String(
                  deduction.endDate ?? deduction.startDate ?? ""
                )} | ${String(deduction.reason ?? "")}`
          )
          .join(" || "),
        "Bonus / Incentives": matchingAdditions
          .map(
            (addition) =>
              `${String(addition.earningType ?? "Addition")} | KES ${Number(addition.amount ?? 0).toLocaleString()} | ${String(
                addition.reason ?? ""
              )}`
          )
          .join(" || "),
      };
    });
  }

  async function handlePeriodAction(periodId: string, action: "process" | "preview" | "close" | "reopen" | "undo") {
    setPeriodBusyAction(`${action}-${periodId}`);
    setPeriodActionMessage("");
    try {
      if (
        action === "process" &&
        process &&
        process.summary.warnings > 0 &&
        !window.confirm(
          "This payroll has missing data warnings. Do you want to proceed? Missing statutory identifiers will be left blank in exports and can be updated later."
        )
      ) {
        setPeriodBusyAction("");
        return;
      }

      const reason =
        action === "reopen" || action === "undo"
          ? window.prompt(
              action === "reopen"
                ? "Why are you reopening this payroll run?"
                : "Why are you undoing this payroll run?",
              ""
            ) ?? ""
          : "";

      const payload = await readRuntimeJson<{ period?: Record<string, unknown> }>(`/api/payroll/periods/${periodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });

      if (payload?.period && typeof payload.period === "object") {
        setPeriods((current) => {
          const next = current.map((period) =>
            String(period.id) === periodId
              ? {
                  ...period,
                  ...payload.period,
                }
              : period
          );
          return next;
        });
      }

      setPeriodActionMessage(
        action === "process"
          ? process?.summary.warnings
            ? "Payroll run recalculated and moved into processing with warnings. Missing statutory identifiers can still be updated later."
            : "Payroll run recalculated and moved into processing."
          : action === "preview"
            ? "Payroll preview refreshed. Review the employee calculations and export the preview before running payroll."
          : action === "close"
            ? "Payroll run closed successfully."
            : action === "undo"
              ? "Payroll run reset to open state for rework."
              : "Payroll run reopened for corrections."
      );

      void (async () => {
        await Promise.allSettled([onRefreshPayroll(), loadPeriods()]);
        if (activeItem === "Employee Payroll Data" || payrollPanel === "employee-data" || action === "preview") {
          await loadEmployeeRows().catch(() => undefined);
        }
        if (action === "preview" || payrollPanel === "additions") {
          await loadPayrollAdditions().catch(() => undefined);
        }
        if (activeItem === "Payroll Audit Trail") {
          await loadAuditRows().catch(() => undefined);
        }
      })();
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not update the payroll period."
        )
      );
    } finally {
      setPeriodBusyAction("");
    }
  }

  function downloadWarningsCsv() {
    if (!validationIssues.length) {
      setPeriodActionMessage("There are no warning rows to export right now.");
      return;
    }

    const rows = validationIssues.map((item) => ({
      "Employee Name": item.employeeName ?? "",
      "Staff Number": item.employeeNumber ?? "",
      Department: item.department ?? "",
      Branch: item.branch ?? "",
      "Missing Field": item.missingField ?? item.title,
      "Affected Report": item.affectedReport ?? "",
      Severity: item.severity,
      "Suggested Action": item.suggestedAction ?? "",
      Status: item.status,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Missing Data");
    XLSX.writeFile(
      workbook,
      `payroll-missing-data-${(payroll?.period ?? "current-period").replaceAll(" ", "-").toLowerCase()}.xlsx`
    );
    setPeriodActionMessage("Missing data list exported to Excel successfully.");
  }

  async function handleSubmitForApproval() {
    setPeriodBusyAction("submit-for-approval");
    setPeriodActionMessage("");
    try {
      await readRuntimeJson("/api/payroll/review", { method: "POST" });
      await Promise.all([onRefreshPayroll(), loadPeriods()]);
      setPeriodActionMessage("Payroll package submitted into the approval chain.");
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not submit payroll for approval."
        )
      );
    } finally {
      setPeriodBusyAction("");
    }
  }

  async function handleDayDeductionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageDayDeductions) {
      return;
    }

    setPeriodBusyAction("save-day-deduction");
    setPeriodActionMessage("");
    try {
      await readRuntimeJson("/api/payroll/day-deductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: dayDeductionForm.employeeId,
          targetPayrollRunId: dayDeductionForm.targetPayrollRunId || undefined,
          targetPayrollLabel:
            periods.find((period) => String(period.id) === dayDeductionForm.targetPayrollRunId)?.period_label ??
            undefined,
          deductionMode: dayDeductionForm.deductionMode,
          deductionCategory: dayDeductionForm.deductionCategory,
          deductionDays:
            dayDeductionForm.deductionMode === "day_count" ? Number(dayDeductionForm.deductionDays || 0) : undefined,
          fixedAmount:
            dayDeductionForm.deductionMode === "incident_amount"
              ? Number(dayDeductionForm.fixedAmount || 0)
              : undefined,
          startDate: dayDeductionForm.startDate,
          endDate:
            dayDeductionForm.deductionMode === "day_count" ? dayDeductionForm.endDate || undefined : undefined,
          reason: dayDeductionForm.reason,
          notes: dayDeductionForm.notes,
        }),
      });

      await Promise.all([loadDayDeductions(), onRefreshPayroll()]);
      if (activeItem === "Employee Payroll Data" || activeItem === "Payroll Reports") {
        await loadEmployeeRows();
      }

      setDayDeductionForm((current) => ({
        ...current,
        deductionDays: current.deductionMode === "day_count" ? current.deductionDays : "1",
        fixedAmount: "",
        reason: "",
        notes: "",
      }));
      setPeriodActionMessage(
        dayDeductionForm.deductionMode === "incident_amount"
          ? "Incident deduction saved. Undo and rerun the payroll if the current run had already been processed."
          : "Day-based salary deduction saved. Undo and rerun the payroll if the current run had already been processed."
      );
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not save the payroll day deduction."
        )
      );
    } finally {
      setPeriodBusyAction("");
    }
  }

  async function handleVoidDayDeduction(deductionId: string) {
    if (!canManageDayDeductions) {
      return;
    }

    const reason = window.prompt("Why are you voiding this payroll day deduction?", "") ?? "";
    if (!reason.trim()) {
      setPeriodActionMessage("A reason is required before voiding a payroll day deduction.");
      return;
    }

    setPeriodBusyAction(`void-day-deduction-${deductionId}`);
    setPeriodActionMessage("");
    try {
      await readRuntimeJson(`/api/payroll/day-deductions/${deductionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void", reason }),
      });
      await Promise.all([loadDayDeductions(), onRefreshPayroll()]);
      setPeriodActionMessage("Payroll day deduction voided successfully.");
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not void the payroll day deduction."
        )
      );
    } finally {
      setPeriodBusyAction("");
    }
  }

  async function handleApproveDayDeduction(deductionId: string) {
    if (!canApproveDayDeductions) {
      return;
    }

    const comments = window.prompt("Optional note for approving this salary deduction recommendation.", "") ?? "";
    setPeriodBusyAction(`approve-day-deduction-${deductionId}`);
    setPeriodActionMessage("");
    try {
      await readRuntimeJson(`/api/payroll/day-deductions/${deductionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", comments }),
      });
      await Promise.all([loadDayDeductions(), onRefreshPayroll()]);
      setPeriodActionMessage("Salary deduction recommendation approved successfully.");
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not approve the payroll day deduction."
        )
      );
    } finally {
      setPeriodBusyAction("");
    }
  }

  async function handlePayrollAdditionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManagePayrollAdditions) {
      return;
    }

    setPeriodBusyAction("save-payroll-addition");
    setPeriodActionMessage("");
    try {
      await readRuntimeJson("/api/payroll/additions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payrollAdditionForm),
      });
      await Promise.all([loadPayrollAdditions(), onRefreshPayroll()]);
      if (activeItem === "Employee Payroll Data" || payrollPanel === "employee-data") {
        await loadEmployeeRows().catch(() => undefined);
      }
      setPayrollAdditionForm((current) => ({
        ...current,
        amount: "",
        reason: "",
        notes: "",
      }));
      setPeriodActionMessage(
        selectedRole.role === "Supervisor"
          ? "Payroll addition recommendation saved for approval."
          : "Payroll addition saved and will flow into the next targeted payroll run."
      );
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not save the payroll addition."
        )
      );
    } finally {
      setPeriodBusyAction("");
    }
  }

  async function handleApprovePayrollAddition(additionId: string) {
    if (!canApprovePayrollAdditions) {
      return;
    }

    const comments = window.prompt("Optional note for approving this bonus or incentive.", "") ?? "";
    setPeriodBusyAction(`approve-payroll-addition-${additionId}`);
    setPeriodActionMessage("");
    try {
      await readRuntimeJson(`/api/payroll/additions/${additionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", comments }),
      });
      await Promise.all([loadPayrollAdditions(), onRefreshPayroll()]);
      setPeriodActionMessage("Payroll addition approved successfully.");
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not approve the payroll addition."
        )
      );
    } finally {
      setPeriodBusyAction("");
    }
  }

  async function handleVoidPayrollAddition(additionId: string) {
    if (!canManagePayrollAdditions) {
      return;
    }

    const reason = window.prompt("Why are you voiding this payroll addition?", "") ?? "";
    if (!reason.trim()) {
      setPeriodActionMessage("A reason is required before voiding a payroll addition.");
      return;
    }

    setPeriodBusyAction(`void-payroll-addition-${additionId}`);
    setPeriodActionMessage("");
    try {
      await readRuntimeJson(`/api/payroll/additions/${additionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void", reason }),
      });
      await Promise.all([loadPayrollAdditions(), onRefreshPayroll()]);
      setPeriodActionMessage("Payroll addition voided successfully.");
    } catch (error) {
      setPeriodActionMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not void the payroll addition."
        )
      );
    } finally {
      setPeriodBusyAction("");
    }
  }

  useEffect(() => {
    if (canManageDayDeductions) {
      void loadDayDeductions();
      void loadEmployeeRows();
      void loadPayrollPickerEmployees();
      void loadPeriods();
    }
    if (canManagePayrollAdditions) {
      void loadPayrollAdditions();
    }
    if (activeItem === "Payroll Periods" || payrollPanel === "periods") {
      void loadPeriods();
    }
    if (
      activeItem === "Employee Payroll Data" ||
      activeItem === "Payroll Reports" ||
      payrollPanel === "employee-data"
    ) {
      void loadEmployeeRows();
    }
    if (activeItem === "Payslips" || payrollPanel === "exports") {
      void loadPayslips();
    }
    if (
      activeItem === "Statutory Reports" ||
      activeItem === "Net to Bank" ||
      activeItem === "Net to MPESA" ||
      activeItem === "P9 Forms" ||
      payrollPanel === "exports"
    ) {
      void loadStatutoryRows();
    }
    if (activeItem === "Payroll Audit Trail" || payrollPanel === "audit") {
      void loadAuditRows();
    }
    if (
      activeItem === "Payroll Reports" ||
      activeItem === "Statutory Reports" ||
      activeItem === "Net to Bank" ||
      activeItem === "Net to MPESA" ||
      activeItem === "P9 Forms" ||
      payrollPanel === "exports"
    ) {
      void loadPeriods();
    }
  }, [activeItem, canManageDayDeductions, canManagePayrollAdditions, payrollPanel, selectedExportPeriodId]);

  useEffect(() => {
    if (dayDeductionForm.employeeId || !payrollSelectableEmployees.length) {
      return;
    }

    setDayDeductionForm((current) => ({
      ...current,
      employeeId: String(payrollSelectableEmployees[0]?.id ?? ""),
    }));
  }, [dayDeductionForm.employeeId, payrollSelectableEmployees]);

  useEffect(() => {
    if (payrollAdditionForm.employeeId || !payrollSelectableEmployees.length) {
      return;
    }

    setPayrollAdditionForm((current) => ({
      ...current,
      employeeId: String(payrollSelectableEmployees[0]?.id ?? ""),
      effectiveDate: current.effectiveDate || new Date().toISOString().slice(0, 10),
    }));
  }, [payrollAdditionForm.employeeId, payrollSelectableEmployees]);

  return (
    <section className="surface-card action-workbench">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Payroll Workspace</p>
          <h3>
            {activeItem === "Payroll Periods"
              ? "Open payroll periods"
              : activeItem === "Process Payroll"
                ? "Process and validate payroll"
                : activeItem === "Review & Approval"
                  ? "Review payroll before sign-off"
                  : "Payroll package and exports"}
          </h3>
        </div>
        <TonePill tone={payroll?.validationErrors ? "warning" : "positive"}>
          {payroll?.status ?? "Live payroll"}
        </TonePill>
      </div>
      {periodActionMessage ? <p className="section-description">{periodActionMessage}</p> : null}
      <div className="workspace-segment-bar" style={{ marginBottom: 16 }}>
        {[
          ["overview", "Overview"],
          ["process", "Run Payroll"],
          ["warnings", "Warnings"],
          ["deductions", "Day Deductions"],
          ["additions", "Bonus & Incentives"],
          ["approvals", "Approvals"],
          ["periods", "Payroll Periods"],
          ["exports", "Exports"],
          ["employee-data", "Employee Data"],
          ["audit", "Audit Trail"],
        ]
          .filter(([value]) =>
            value === "deductions"
              ? canManageDayDeductions
              : value === "additions"
                ? canManagePayrollAdditions
                : true
          )
          .map(([value, label]) => (
            <button
              className={`workspace-segment-button ${payrollPanel === value ? "is-active" : ""}`}
              key={value}
              onClick={() =>
                setPayrollPanel(
                  value as
                    | "overview"
                    | "process"
                    | "warnings"
                    | "deductions"
                    | "additions"
                    | "approvals"
                    | "periods"
                    | "exports"
                    | "employee-data"
                    | "audit"
                )
              }
              type="button"
            >
              {label}
            </button>
          ))}
      </div>
      <div className="workbench-grid payroll-workbench-grid">
        <div className={payrollPanel === "periods" ? "" : "is-hidden-panel"}>
          <>
            <section className="mini-panel" data-tour="payroll-period-create">
              <h4>Open payroll period</h4>
              {canOpenPeriod ? (
                <>
                  <p className="section-description">
                    Open new periods from the dedicated workflow page so month, type, and validation all sit in one place.
                  </p>
                  <small>The page header now holds the single primary Open Payroll Period action.</small>
                </>
              ) : (
                <p className="section-description">
                  Switch to Payroll, HR, finance, or GM control roles to open a payroll period.
                </p>
              )}
            </section>
            <section className="mini-panel">
              <h4>Recent periods</h4>
              {periodsLoading ? (
                <p className="section-description">Loading payroll periods...</p>
              ) : (
                <div className="mini-list queue-list">
                  {periods.length ? (
                    periods.slice(0, 8).map((period) => (
                      <article key={String(period.id)}>
                        <strong>{String(period.period_label ?? "-")}</strong>
                        <span>
                          {String(period.payroll_type ?? "-")} | {String(period.status ?? "-")}
                        </span>
                        <small>
                          Gross KES {Number(period.gross_pay ?? 0).toLocaleString()} | Net KES{" "}
                          {Number(period.net_pay ?? 0).toLocaleString()} | Validation{" "}
                          {Number(period.validation_errors ?? 0)}
                        </small>
                        {String(period.payroll_type ?? "") === "Holiday Payroll" ? (
                          <small>
                            {String(period.holidayName ?? "Holiday payroll")} | {String(period.holidayDate ?? "-")} |{" "}
                            {String(period.holidayPayMode ?? "One-day gross pay")}
                          </small>
                        ) : null}
                        <div className="queue-actions">
                          {(Array.isArray(period.allowedActions) ? period.allowedActions : []).map((action) => (
                            <button
                              className={action === "process" || action === "undo" ? "primary-button" : "ghost-button"}
                              disabled={periodBusyAction === `${String(action)}-${String(period.id)}` || !canOperatePayroll}
                              key={`${String(period.id)}-${String(action)}`}
                              onClick={() =>
                                void handlePeriodAction(
                                  String(period.id),
                                  action as "process" | "close" | "reopen" | "undo"
                                )
                              }
                              type="button"
                            >
                              {periodBusyAction === `${String(action)}-${String(period.id)}`
                                ? "Working..."
                                : action === "process"
                                  ? "Process"
                                  : action === "close"
                                    ? "Close"
                                    : action === "undo"
                                      ? "Undo Payroll"
                                      : "Reopen"}
                            </button>
                          ))}
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="section-description">No payroll periods have been opened yet.</p>
                  )}
                </div>
              )}
            </section>
          </>
        </div>
        <section className={`mini-panel ${payrollPanel === "overview" ? "" : "is-hidden-panel"}`}>
          <h4>Current payroll package</h4>
          {payroll ? (
            <div className="mini-list queue-list">
              <article>
                <strong>{payroll.period}</strong>
                <span>
                  {payroll.status} | {payroll.payrollType} | {payroll.employeeCount} employees
                </span>
                <small>
                  Gross {payroll.grossPay} | Net {payroll.netPay} | Deductions {payroll.totalDeductions}
                </small>
              </article>
              <article>
                <strong>Statutory totals</strong>
                <span>
                  PAYE {payroll.paye} | SHIF {payroll.shif}
                </span>
                <small>
                  NSSF {payroll.nssf} | Housing Levy {payroll.housingLevy} | Pension {payroll.pension}
                </small>
              </article>
              <article>
                <strong>Control totals</strong>
                <span>
                  Employer cost {payroll.employerCost} | Pending approvals {payroll.pendingApprovals}
                </span>
                <small>
                  Blocking issues {process?.summary.blockers ?? payroll.validationErrors} | Warning rows {process?.summary.warnings ?? 0}
                </small>
              </article>
            </div>
          ) : (
            <p className="section-description">Payroll summary is loading.</p>
          )}
        </section>
        <section className={`mini-panel ${payrollPanel === "overview" ? "" : "is-hidden-panel"}`}>
          <h4>Variance review</h4>
          <div className="mini-list queue-list">
            {variance.map((item) => (
              <article key={item.label}>
                <strong>{item.label}</strong>
                <span>
                  Current {item.current} | Previous {item.previous}
                </span>
                <small>{item.movement}</small>
                <TonePill tone={item.tone}>{item.tone}</TonePill>
              </article>
            ))}
          </div>
        </section>
        <section className={`mini-panel ${payrollPanel === "warnings" ? "" : "is-hidden-panel"}`}>
          <h4>Payroll data warnings</h4>
          {process ? (
            <div className="mini-list queue-list">
              {validationIssues.length ? (
                <>
                  <article>
                    <strong>Warnings stay grouped here</strong>
                    <span>
                      {process.summary.blockers} blocker{process.summary.blockers === 1 ? "" : "s"} | {process.summary.warnings} warning{process.summary.warnings === 1 ? "" : "s"}
                    </span>
                    <small>
                      Payroll can be processed with incomplete statutory identifiers. Missing identifiers will appear blank in exports and can be updated later.
                    </small>
                  </article>
                  <article>
                    <strong>Missing KRA PINs</strong>
                    <span>{warningSummary.missingKraPins}</span>
                    <small>Affects PAYE, P9, and Housing Levy identity columns.</small>
                  </article>
                  <article>
                    <strong>Missing MPESA phone numbers</strong>
                    <span>{warningSummary.missingMpesaPhones}</span>
                    <small>Needed for Robot Cafe Net-to-MPESA payouts.</small>
                  </article>
                  <article>
                    <strong>Missing SHIF / NSSF numbers</strong>
                    <span>{warningSummary.missingShifNumbers} / {warningSummary.missingNssfNumbers}</span>
                    <small>Exports still generate and leave missing identifiers blank.</small>
                  </article>
                  <div className="inline-actions">
                    <button className="primary-button" onClick={onOpenWarnings} type="button">
                      View All Warnings
                    </button>
                  </div>
                </>
              ) : (
                <p className="section-description">No warnings are crowding payroll right now. The dashboard stays clean until something needs attention.</p>
              )}
            </div>
          ) : (
            <p className="section-description">Validation checks are loading.</p>
          )}
        </section>
        {canManageDayDeductions ? (
          <section className={`mini-panel ${payrollPanel === "deductions" ? "" : "is-hidden-panel"}`}>
            <div className="section-heading">
              <div>
                <h4>Day-based salary deductions</h4>
                <p className="section-description">
                  Capture unpaid days for suspension, desertion, misconduct, unpaid leave, and other unworked days so the next payroll run deducts them accurately.
                </p>
              </div>
              <TonePill tone="warning">Affects payroll</TonePill>
            </div>
            <form className="action-form" onSubmit={handleDayDeductionSubmit}>
              <label className="field-stack">
                <span>Employee</span>
                <select
                  onChange={(event) =>
                    setDayDeductionForm((current) => ({ ...current, employeeId: event.target.value }))
                  }
                  required
                  value={dayDeductionForm.employeeId}
                >
                  <option value="">Select employee</option>
                  {payrollSelectableEmployees.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.employeeNumber} | {row.fullName}
                    </option>
                  ))}
                </select>
                {payrollPickerEmployeesLoading ? (
                  <small>Loading staff register for payroll deductions...</small>
                ) : null}
              </label>
              <label className="field-stack">
                <span>Deduction basis</span>
                <select
                  onChange={(event) =>
                    setDayDeductionForm((current) => ({
                      ...current,
                      deductionMode: event.target.value === "incident_amount" ? "incident_amount" : "day_count",
                      deductionCategory:
                        event.target.value === "incident_amount"
                          ? "Incident Deduction"
                          : current.deductionCategory === "Incident Deduction"
                            ? "Suspension"
                            : current.deductionCategory,
                    }))
                  }
                  value={dayDeductionForm.deductionMode}
                >
                  <option value="day_count">Deduct salaried working days</option>
                  <option value="incident_amount">Deduct due to incident / breakage / billing issue</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Target payroll run</span>
                <select
                  onChange={(event) =>
                    setDayDeductionForm((current) => ({ ...current, targetPayrollRunId: event.target.value }))
                  }
                  required
                  value={dayDeductionForm.targetPayrollRunId}
                >
                  <option value="">Select payroll run</option>
                  {periods.map((period) => (
                    <option key={String(period.id)} value={String(period.id)}>
                      {String(period.period_label ?? "-")} | {String(period.payroll_type ?? "-")} | {String(period.status ?? "-")}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-row">
                <label className="field-stack">
                  <span>Deduction category</span>
                  <select
                    onChange={(event) =>
                      setDayDeductionForm((current) => ({
                        ...current,
                        deductionCategory: event.target.value,
                      }))
                    }
                    value={dayDeductionForm.deductionCategory}
                  >
                    {(dayDeductionForm.deductionMode === "incident_amount"
                      ? ["Incident Deduction", "Breakages", "Wrong Billing", "Cash Shortage", "Other Incident"]
                      : ["Suspension", "Desertion", "Misconduct", "Unpaid Leave", "Unworked Days", "Absenteeism"]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span>{dayDeductionForm.deductionMode === "incident_amount" ? "Effective date" : "Start date"}</span>
                  <input
                    onChange={(event) =>
                      setDayDeductionForm((current) => ({ ...current, startDate: event.target.value }))
                    }
                    required
                    type="date"
                    value={dayDeductionForm.startDate}
                  />
                </label>
                {dayDeductionForm.deductionMode === "day_count" ? (
                  <>
                    <label className="field-stack">
                      <span>End date</span>
                      <input
                        onChange={(event) =>
                          setDayDeductionForm((current) => ({ ...current, endDate: event.target.value }))
                        }
                        type="date"
                        value={dayDeductionForm.endDate}
                      />
                    </label>
                    <label className="field-stack">
                      <span>How many day(s) to deduct</span>
                      <input
                        min="0.5"
                        onChange={(event) =>
                          setDayDeductionForm((current) => ({ ...current, deductionDays: event.target.value }))
                        }
                        required
                        step="0.5"
                        type="number"
                        value={dayDeductionForm.deductionDays}
                      />
                    </label>
                  </>
                ) : (
                  <label className="field-stack">
                    <span>Amount to deduct (KES)</span>
                    <input
                      min="1"
                      onChange={(event) =>
                        setDayDeductionForm((current) => ({ ...current, fixedAmount: event.target.value }))
                      }
                      required
                      step="0.01"
                      type="number"
                      value={dayDeductionForm.fixedAmount}
                    />
                  </label>
                )}
              </div>
              <label className="field-stack">
                <span>Reason</span>
                <input
                  onChange={(event) =>
                    setDayDeductionForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Short reason that should appear in audit and payroll history"
                  required
                  value={dayDeductionForm.reason}
                />
              </label>
              <label className="field-stack">
                <span>Comments</span>
                <textarea
                  onChange={(event) =>
                    setDayDeductionForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Optional supporting detail for payroll, GM, or HR records"
                  rows={3}
                  value={dayDeductionForm.notes}
                />
              </label>
              <div className="inline-actions">
                <button
                  className="primary-button"
                  disabled={
                    periodBusyAction === "save-day-deduction" ||
                    employeeRowsLoading ||
                    payrollPickerEmployeesLoading ||
                    periodsLoading
                  }
                  type="submit"
                >
                  {periodBusyAction === "save-day-deduction"
                    ? "Saving..."
                    : selectedRole.role === "Supervisor"
                      ? "Recommend deduction"
                      : "Save deduction"}
                </button>
              </div>
              <small className="section-description">
                {selectedRole.role === "Supervisor"
                  ? "Supervisor recommendations stay pending until GM, HR Admin, or Payroll Operator approves them."
                  : dayDeductionForm.deductionMode === "incident_amount"
                    ? "Incident deductions post into the next payroll as a fixed deduction line and will show in reports and payslips."
                    : "These records feed payroll as unpaid days. If May 2026 15th payroll was already run, undo it and rerun so updated gross salaries and deductions are recalculated together."}
              </small>
            </form>
            {dayDeductionsLoading ? (
              <p className="section-description">Loading saved day deductions...</p>
            ) : (
              <div className="mini-list queue-list">
                {dayDeductions.length ? (
                  dayDeductions.slice(0, 12).map((row) => {
                    const deductionId = String(row.id ?? "");
                    const status = String(row.status ?? "-");
                    const canVoid = status !== "voided" && status !== "rejected";
                    const canApprove = canApproveDayDeductions && status === "pending";

                    return (
                      <article key={deductionId}>
                        <strong>{String(row.employeeName ?? "Employee")}</strong>
                        <span>
                          {String(row.employeeNumber ?? "-")} | {String(row.deductionCategory ?? "-")} |{" "}
                          {String(row.deductionMode ?? "day_count") === "incident_amount"
                            ? `KES ${Number(row.fixedAmount ?? 0).toLocaleString()}`
                            : `${String(row.deductionDays ?? 0)} day(s)`}
                        </span>
                        <small>
                          {String(row.startDate ?? "-")} to {String(row.endDate ?? row.startDate ?? "-")} | {String(row.reason ?? "-")}
                        </small>
                        {String(row.targetPayrollLabel ?? "") ? (
                          <small>Targets {String(row.targetPayrollLabel)} {String(row.targetPayrollRunId ?? "") ? `| Run ${String(row.targetPayrollRunId).slice(0, 8)}` : ""}</small>
                        ) : null}
                        {String(row.createdByRole ?? "") ? (
                          <small>Raised by {String(row.createdByRole)}</small>
                        ) : null}
                        <div className="inline-actions">
                          <TonePill tone={status === "voided" ? "critical" : "warning"}>{status}</TonePill>
                          {canApprove ? (
                            <button
                              className="primary-button"
                              disabled={periodBusyAction === `approve-day-deduction-${deductionId}`}
                              onClick={() => void handleApproveDayDeduction(deductionId)}
                              type="button"
                            >
                              {periodBusyAction === `approve-day-deduction-${deductionId}` ? "Approving..." : "Approve recommendation"}
                            </button>
                          ) : null}
                          {canVoid ? (
                            <button
                              className="ghost-button"
                              disabled={periodBusyAction === `void-day-deduction-${deductionId}`}
                              onClick={() => void handleVoidDayDeduction(deductionId)}
                              type="button"
                            >
                              {periodBusyAction === `void-day-deduction-${deductionId}` ? "Voiding..." : "Void deduction"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="section-description">No payroll day deductions have been captured yet.</p>
                )}
              </div>
            )}
          </section>
        ) : null}
        <section className={`mini-panel ${payrollPanel === "approvals" ? "" : "is-hidden-panel"}`}>
          <h4>Approval chain</h4>
          {process ? (
            <div className="mini-list queue-list">
              {process.approvals.map((item) => (
                <article key={item.id}>
                  <strong>{item.label}</strong>
                  <span>
                    {item.owner} | {item.status}
                  </span>
                  <small>
                    {item.comment} | {item.date}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p className="section-description">Approval trail is loading.</p>
          )}
        </section>
        <section className={`mini-panel ${payrollPanel === "overview" ? "" : "is-hidden-panel"}`}>
          <h4>Payroll close checklist</h4>
          {process ? (
            <div className="mini-list queue-list">
              {process.closeChecklist?.length ? (
                process.closeChecklist.map((item) => (
                  <article key={item.key}>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                    <TonePill tone={item.status === "ready" ? "positive" : item.status === "attention" ? "warning" : "default"}>
                      {item.status}
                    </TonePill>
                  </article>
                ))
              ) : (
                <p className="section-description">Close readiness will appear after payroll processing begins.</p>
              )}
              {process.closeReadiness ? (
                <article>
                  <strong>Close readiness</strong>
                  <span>{process.closeReadiness.summary}</span>
                  <TonePill tone={process.closeReadiness.ready ? "positive" : "warning"}>
                    {process.closeReadiness.ready ? "ready" : "hold"}
                  </TonePill>
                </article>
              ) : null}
            </div>
          ) : (
            <p className="section-description">Close readiness is loading.</p>
          )}
        </section>
        {payrollPanel === "process" ? (
          <>
            <section className="mini-panel">
              <h4>Processing controls</h4>
              {process ? (
                <div className="action-form">
                  <div className="inline-actions">
                    <button
                      className="secondary-button"
                      disabled={
                        !selectedPayrollRunId ||
                        !canOperatePayroll ||
                        periodBusyAction === `preview-${selectedPayrollRunId}`
                      }
                      onClick={() => void handlePeriodAction(selectedPayrollRunId, "preview")}
                      type="button"
                    >
                      {periodBusyAction === `preview-${selectedPayrollRunId}`
                        ? "Refreshing..."
                        : "Preview / refresh payroll"}
                    </button>
                    <button
                      className="primary-button"
                      disabled={
                        !selectedPayrollRunId ||
                        !canOperatePayroll ||
                        periodBusyAction === `process-${selectedPayrollRunId}`
                      }
                      onClick={() => void handlePeriodAction(selectedPayrollRunId, "process")}
                      type="button"
                    >
                      {periodBusyAction === `process-${selectedPayrollRunId}` ? "Processing..." : "Run payroll"}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={employeeRowsLoading || !employeeRows.length}
                      onClick={() =>
                        downloadRowsXlsx(
                          `payroll-preview-${String(payroll?.period ?? "current").replace(/\s+/g, "-").toLowerCase()}.xlsx`,
                          "Payroll Preview",
                          buildPayrollPreviewRows()
                        )
                      }
                      type="button"
                    >
                      Download preview Excel
                    </button>
                  </div>
                  <small className="section-description">
                    Refresh the preview first, correct bonuses, deductions, or staff data, then run payroll once the numbers look right.
                  </small>
                  {selectedPayrollPeriod ? (
                    <small className="section-description">
                      Working on {String(selectedPayrollPeriod.period_label ?? "-")} |{" "}
                      {String(selectedPayrollPeriod.payroll_type ?? "-")} | {String(selectedPayrollPeriod.status ?? "-")}
                    </small>
                  ) : null}
                </div>
              ) : (
                <p className="section-description">Processing summary is loading.</p>
              )}
            </section>
            <section className="mini-panel">
              <h4>Employee calculation preview</h4>
              {process ? (
                <div className="mini-list queue-list">
                  {process.employeeRows.length ? (
                    process.employeeRows.map((row) => (
                      <article key={row.id}>
                        <strong>
                          {row.employeeNumber} {row.fullName}
                        </strong>
                        <span>
                          {row.department} | Gross {row.grossPay} | Net {row.netPay}
                        </span>
                        <small>
                          Gross salary {String(row.grossMonthlyPayWouldHaveBeen ?? row.grossPay ?? "-")} | Taxable {row.taxableIncome} | OT {row.overtime} | Unpaid leave {row.unpaidLeaveDeduction}
                        </small>
                      </article>
                    ))
                  ) : (
                    <p className="section-description">No employee calculations are available yet.</p>
                  )}
                </div>
              ) : (
                <p className="section-description">Employee preview is loading.</p>
              )}
            </section>
          </>
        ) : null}
        {canManagePayrollAdditions ? (
          <section className={`mini-panel ${payrollPanel === "additions" ? "" : "is-hidden-panel"}`}>
            <div className="section-heading">
              <div>
                <h4>Bonus, incentive, and salary additions</h4>
                <p className="section-description">
                  Capture bonus or incentive amounts that should ride on top of salary in the next payroll run.
                </p>
              </div>
              <TonePill tone="positive">Earnings</TonePill>
            </div>
            <form className="action-form" onSubmit={handlePayrollAdditionSubmit}>
              <label className="field-stack">
                <span>Employee</span>
                <select
                  onChange={(event) =>
                    setPayrollAdditionForm((current) => ({ ...current, employeeId: event.target.value }))
                  }
                  required
                  value={payrollAdditionForm.employeeId}
                >
                  <option value="">Select employee</option>
                  {payrollSelectableEmployees.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.employeeNumber} | {row.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-row">
                <label className="field-stack">
                  <span>Earning type</span>
                  <select
                    onChange={(event) =>
                      setPayrollAdditionForm((current) => ({ ...current, earningCategory: event.target.value }))
                    }
                    value={payrollAdditionForm.earningCategory}
                  >
                    {["Bonus", "Incentive", "Commission", "Allowance", "Adjustment"].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span>Amount (KES)</span>
                  <input
                    min="1"
                    onChange={(event) =>
                      setPayrollAdditionForm((current) => ({ ...current, amount: event.target.value }))
                    }
                    required
                    step="0.01"
                    type="number"
                    value={payrollAdditionForm.amount}
                  />
                </label>
                <label className="field-stack">
                  <span>Effective date</span>
                  <input
                    onChange={(event) =>
                      setPayrollAdditionForm((current) => ({ ...current, effectiveDate: event.target.value }))
                    }
                    required
                    type="date"
                    value={payrollAdditionForm.effectiveDate}
                  />
                </label>
              </div>
              <label className="field-stack">
                <span>Target payroll run</span>
                <select
                  onChange={(event) =>
                    setPayrollAdditionForm((current) => ({ ...current, targetPayrollRunId: event.target.value }))
                  }
                  required
                  value={payrollAdditionForm.targetPayrollRunId}
                >
                  <option value="">Select payroll run</option>
                  {periods.map((period) => (
                    <option key={String(period.id)} value={String(period.id)}>
                      {String(period.period_label ?? "-")} | {String(period.payroll_type ?? "-")} | {String(period.status ?? "-")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Reason</span>
                <input
                  onChange={(event) =>
                    setPayrollAdditionForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Why should this employee be paid extra on top of salary?"
                  required
                  value={payrollAdditionForm.reason}
                />
              </label>
              <label className="field-stack">
                <span>Comments</span>
                <textarea
                  onChange={(event) =>
                    setPayrollAdditionForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Optional operational note for payroll and approvals"
                  rows={3}
                  value={payrollAdditionForm.notes}
                />
              </label>
              <div className="inline-actions">
                <button
                  className="primary-button"
                  disabled={periodBusyAction === "save-payroll-addition" || payrollPickerEmployeesLoading || periodsLoading}
                  type="submit"
                >
                  {periodBusyAction === "save-payroll-addition"
                    ? "Saving..."
                    : selectedRole.role === "Supervisor"
                      ? "Recommend addition"
                      : "Save addition"}
                </button>
              </div>
            </form>
            {payrollAdditionsLoading ? (
              <p className="section-description">Loading payroll additions...</p>
            ) : (
              <div className="mini-list queue-list">
                {payrollAdditions.length ? (
                  payrollAdditions.slice(0, 12).map((row) => {
                    const additionId = String(row.id ?? "");
                    const status = String(row.status ?? "-");
                    const canVoid = status !== "voided" && status !== "rejected";
                    const canApprove = canApprovePayrollAdditions && status === "pending";
                    return (
                      <article key={additionId}>
                        <strong>{String(row.employeeName ?? "Employee")}</strong>
                        <span>
                          {String(row.employeeNumber ?? "-")} | {String(row.earningCategory ?? "Bonus")} | KES{" "}
                          {Number(row.amount ?? 0).toLocaleString()}
                        </span>
                        <small>
                          {String(row.effectiveDate ?? "-")} | {String(row.reason ?? "-")}
                        </small>
                        {String(row.targetPayrollLabel ?? "") ? (
                          <small>Targets {String(row.targetPayrollLabel)} | {String(row.createdByRole ?? "-")}</small>
                        ) : null}
                        <div className="inline-actions">
                          <TonePill tone={status === "approved" ? "positive" : status === "voided" ? "critical" : "warning"}>
                            {status}
                          </TonePill>
                          {canApprove ? (
                            <button
                              className="primary-button"
                              disabled={periodBusyAction === `approve-payroll-addition-${additionId}`}
                              onClick={() => void handleApprovePayrollAddition(additionId)}
                              type="button"
                            >
                              {periodBusyAction === `approve-payroll-addition-${additionId}` ? "Approving..." : "Approve recommendation"}
                            </button>
                          ) : null}
                          {canVoid ? (
                            <button
                              className="ghost-button"
                              disabled={periodBusyAction === `void-payroll-addition-${additionId}`}
                              onClick={() => void handleVoidPayrollAddition(additionId)}
                              type="button"
                            >
                              {periodBusyAction === `void-payroll-addition-${additionId}` ? "Voiding..." : "Void addition"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="section-description">No bonus or incentive additions have been captured yet.</p>
                )}
              </div>
            )}
          </section>
        ) : null}
        {payrollPanel === "approvals" ? (
          <>
            <section className="mini-panel">
              <h4>Review highlights</h4>
              {process ? (
                <div className="mini-list queue-list">
                  {process.reviewHighlights.map((item) => (
                    <article key={item.label}>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                      <TonePill tone={item.tone}>{item.tone}</TonePill>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="section-description">Review highlights are loading.</p>
              )}
            </section>
            <section className="mini-panel">
              <h4>Approval handoff</h4>
              {canSubmitApproval ? (
                <div className="action-form">
                  <button
                    className="primary-button"
                    disabled={
                      !process?.availableActions.includes("send_for_approval") ||
                      periodBusyAction === "submit-for-approval"
                    }
                    onClick={() => void handleSubmitForApproval()}
                    type="button"
                  >
                    {periodBusyAction === "submit-for-approval" ? "Submitting..." : "Send for approval"}
                  </button>
                  <small className="section-description">
                    This moves the payroll run into maker-reviewer-approver workflow with audit capture.
                  </small>
                </div>
              ) : (
              <p className="section-description">
                Switch to Payroll Admin, HR Admin, Manager, or Super Admin to submit payroll into approval.
              </p>
              )}
            </section>
          </>
        ) : null}
        {payrollPanel === "employee-data" ? (
          <section className="mini-panel">
            <h4>Employee payroll master data</h4>
            {employeeRowsLoading ? (
              <p className="section-description">Loading employee payroll data...</p>
            ) : (
              <div className="mini-list queue-list">
                {employeeRows.length ? (
                  employeeRows.map((row) => (
                    <article key={String(row.id)}>
                      <strong>
                        {String(row.employeeNumber ?? "-")} {String(row.fullName ?? "-")}
                      </strong>
                      <span>
                        {String(row.department ?? "-")} | {String(row.payrollGroup ?? "-")} | {String(row.status ?? "-")}
                      </span>
                      <small>
                        Basic {String(row.basicSalary ?? "-")} | Taxable {String(row.taxableIncome ?? "-")} | Net{" "}
                        {String(row.netPay ?? "-")}
                      </small>
                    </article>
                  ))
                ) : (
                  <p className="section-description">No employee payroll rows are ready yet.</p>
                )}
              </div>
            )}
          </section>
        ) : null}
        {payrollPanel === "warnings" ? (
          <section className="mini-panel">
            <div className="section-heading">
              <div>
                <h4>Validation warnings and blockers</h4>
                <p className="section-description">
                  Use this screen to clean missing statutory identifiers without blocking payroll. Only true blockers should stop processing.
                </p>
              </div>
              <div className="inline-actions">
                <button className="secondary-button" onClick={downloadWarningsCsv} type="button">
                  Export Missing Data List
                </button>
              </div>
            </div>
            <div className="filter-row">
              {[
                ["all", "All"],
                ["blockers", "True blockers"],
                ["missing-kra", "Missing KRA PIN"],
                ["missing-shif", "Missing SHIF"],
                ["missing-nssf", "Missing NSSF"],
                ["missing-helb", "Missing HELB"],
                ["missing-mpesa", "Missing MPESA phone"],
                ["missing-id", "Missing ID"],
                ["missing-salary", "Missing salary"],
                ["severity-critical", "Critical"],
                ["severity-warning", "Warnings"],
              ].map(([value, label]) => (
                <button
                  className={warningFilter === value ? "secondary-button" : "neutral-button"}
                  key={value}
                  onClick={() => setWarningFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="metric-grid compact-grid">
              <article className="metric-card">
                <span>Missing KRA PINs</span>
                <strong>{warningSummary.missingKraPins}</strong>
                <small>PAYE and P9 still export with blank PINs.</small>
              </article>
              <article className="metric-card">
                <span>Missing MPESA phone</span>
                <strong>{warningSummary.missingMpesaPhones}</strong>
                <small>Needed for Net-to-MPESA payout rows.</small>
              </article>
              <article className="metric-card">
                <span>Missing SHIF</span>
                <strong>{warningSummary.missingShifNumbers}</strong>
                <small>Rows still remain in SHIF export.</small>
              </article>
              <article className="metric-card">
                <span>Missing NSSF</span>
                <strong>{warningSummary.missingNssfNumbers}</strong>
                <small>Rows still remain in NSSF export.</small>
              </article>
              <article className="metric-card">
                <span>Missing ID</span>
                <strong>{warningSummary.missingNationalIds}</strong>
                <small>Identity columns stay blank until fixed.</small>
              </article>
            </div>
            <div className="mini-list queue-list">
              {filteredValidationIssues.length ? (
                filteredValidationIssues.map((item) => (
                  <article key={item.id}>
                    <strong>{item.employeeName || item.title}</strong>
                    <span>
                      {item.employeeNumber || "-"} | {item.department || "Unassigned"} | {item.missingField || item.title}
                    </span>
                    <small>
                      {item.affectedReport || "Payroll processing"} | {item.detail}
                    </small>
                    <small>{item.suggestedAction || "Update the employee record and refresh payroll warnings."}</small>
                    <div className="inline-actions">
                      <TonePill tone={item.severity}>{item.severity}</TonePill>
                      {item.employeeId ? (
                        <Link className="secondary-button workflow-link-button" href={workflowRoutes.employeeEdit(item.employeeId)}>
                          Update record
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <p className="section-description">No validation issues match the current filter.</p>
              )}
            </div>
          </section>
        ) : null}
        <section className={`mini-panel ${payrollPanel === "exports" ? "" : "is-hidden-panel"}`} data-tour="payroll-export-center">
          <h4>Export center</h4>
          {canExport ? (
            <div className="action-form">
              <label className="field-stack">
                <span>Payroll period</span>
                <select
                  onChange={(event) => setSelectedExportPeriodId(event.target.value)}
                  value={selectedExportPeriodId}
                >
                  {periods.map((period) => (
                    <option key={String(period.id)} value={String(period.id)}>
                      {String(period.period_label ?? "-")} | {String(period.payroll_type ?? "-")} |{" "}
                      {String(period.status ?? "-")}
                    </option>
                  ))}
                </select>
              </label>
              <div className="report-export-grid">
                {!isSelectedHolidayRun ? (
                  <>
                    <div className="report-export-card">
                      <strong>Generate Payslips PDF</strong>
                      <small>Download the branded payslip pack for the selected payroll run.</small>
                      <button
                        className="primary-button"
                        disabled={exportBusy === "payslip-bundle:download"}
                        onClick={() => onPayslipBundleAction({ mode: "download", periodId: selectedExportPeriodId })}
                        type="button"
                      >
                        {exportBusy === "payslip-bundle:download" ? "Generating..." : "Download"}
                      </button>
                    </div>
                    <div className="report-export-card">
                      <strong>Wagebill Report PDF</strong>
                      <small>Formal wagebill summary matching the uploaded layout.</small>
                      <div className="inline-actions">
                        <button
                          className="ghost-button"
                          disabled={exportBusy === "wagebill_report:preview"}
                          onClick={() =>
                            onExport("wagebill_report", { mode: "preview", periodId: selectedExportPeriodId })
                          }
                          type="button"
                        >
                          {exportBusy === "wagebill_report:preview" ? "Opening..." : "Preview"}
                        </button>
                        <button
                          className="primary-button"
                          disabled={exportBusy === "wagebill_report:download"}
                          onClick={() =>
                            onExport("wagebill_report", { mode: "download", periodId: selectedExportPeriodId })
                          }
                          type="button"
                        >
                          {exportBusy === "wagebill_report:download" ? "Generating..." : "Download"}
                        </button>
                      </div>
                    </div>
                    <div className="report-export-card">
                      <strong>Earnings &amp; Deductions Analysis PDF</strong>
                      <small>Structured earnings and deduction analysis in the template sequence.</small>
                      <div className="inline-actions">
                        <button
                          className="ghost-button"
                          disabled={exportBusy === "earnings_deductions_analysis:preview"}
                          onClick={() =>
                            onExport("earnings_deductions_analysis", {
                              mode: "preview",
                              periodId: selectedExportPeriodId,
                            })
                          }
                          type="button"
                        >
                          {exportBusy === "earnings_deductions_analysis:preview" ? "Opening..." : "Preview"}
                        </button>
                        <button
                          className="primary-button"
                          disabled={exportBusy === "earnings_deductions_analysis:download"}
                          onClick={() =>
                            onExport("earnings_deductions_analysis", {
                              mode: "download",
                              periodId: selectedExportPeriodId,
                            })
                          }
                          type="button"
                        >
                          {exportBusy === "earnings_deductions_analysis:download"
                            ? "Generating..."
                            : "Download"}
                        </button>
                      </div>
                    </div>
                    <div className="report-export-card">
                      <strong>Monthly Deduction Posting List PDF</strong>
                      <small>Multi-page remittance posting list with grouped subtotals.</small>
                      <div className="inline-actions">
                        <button
                          className="ghost-button"
                          disabled={exportBusy === "monthly_deduction_posting_list:preview"}
                          onClick={() =>
                            onExport("monthly_deduction_posting_list", {
                              mode: "preview",
                              periodId: selectedExportPeriodId,
                            })
                          }
                          type="button"
                        >
                          {exportBusy === "monthly_deduction_posting_list:preview" ? "Opening..." : "Preview"}
                        </button>
                        <button
                          className="primary-button"
                          disabled={exportBusy === "monthly_deduction_posting_list:download"}
                          onClick={() =>
                            onExport("monthly_deduction_posting_list", {
                              mode: "download",
                              periodId: selectedExportPeriodId,
                            })
                          }
                          type="button"
                        >
                          {exportBusy === "monthly_deduction_posting_list:download"
                            ? "Generating..."
                            : "Download"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
                <div className="report-export-card">
                  <strong>{isSelectedHolidayRun ? "Holiday Net to Bank Excel" : primaryPaymentExport === "net_to_mpesa" ? "Net to MPESA Excel" : "Net to Bank Excel"}</strong>
                  <small>
                    {isSelectedHolidayRun
                      ? "Standalone holiday worked-pay export. This run is kept outside monthly payroll, statutory reports, and payslips."
                      : primaryPaymentExport === "net_to_mpesa"
                      ? "MPESA payout file with staff number, employee name, department, phone number, payment method, and payable amount."
                      : "Bank schedule with title row, branch, branch code, and final net pay."}
                  </small>
                  <button
                    className="primary-button"
                    disabled={exportBusy === `${isSelectedHolidayRun ? "net_to_bank" : primaryPaymentExport}:download`}
                    onClick={() =>
                      onExport(isSelectedHolidayRun ? "net_to_bank" : primaryPaymentExport, {
                        mode: "download",
                        periodId: selectedExportPeriodId,
                      })
                    }
                    type="button"
                  >
                    {exportBusy === `${isSelectedHolidayRun ? "net_to_bank" : primaryPaymentExport}:download`
                      ? "Generating..."
                      : "Download"}
                  </button>
                </div>
                {!isSelectedHolidayRun ? (
                  <>
                    <div className="report-export-card">
                      <strong>PAYE Excel</strong>
                      <small>KRA filing layout with SHIF, AHL, reliefs, and taxable pay columns.</small>
                      <button
                        className="primary-button"
                        disabled={exportBusy === "paye_report:download"}
                        onClick={() => onExport("paye_report", { mode: "download", periodId: selectedExportPeriodId })}
                        type="button"
                      >
                        {exportBusy === "paye_report:download" ? "Generating..." : "Download"}
                      </button>
                    </div>
                    <div className="report-export-card">
                      <strong>NSSF Excel</strong>
                      <small>Filing-ready NSSF return with payroll number, names, ID, PIN, and voluntary value.</small>
                      <button
                        className="primary-button"
                        disabled={exportBusy === "nssf_report:download"}
                        onClick={() => onExport("nssf_report", { mode: "download", periodId: selectedExportPeriodId })}
                        type="button"
                      >
                        {exportBusy === "nssf_report:download" ? "Generating..." : "Download"}
                      </button>
                    </div>
                    <div className="report-export-card">
                      <strong>SHIF Excel</strong>
                      <small>Same uploaded SHA layout, updated to SHIF number and contribution naming.</small>
                      <button
                        className="primary-button"
                        disabled={exportBusy === "shif_report:download"}
                        onClick={() => onExport("shif_report", { mode: "download", periodId: selectedExportPeriodId })}
                        type="button"
                      >
                        {exportBusy === "shif_report:download" ? "Generating..." : "Download"}
                      </button>
                    </div>
                    <div className="report-export-card">
                      <strong>HELB CSV</strong>
                      <small>Exact header structure for HELB posting uploads.</small>
                      <button
                        className="primary-button"
                        disabled={exportBusy === "helb_report:download"}
                        onClick={() => onExport("helb_report", { mode: "download", periodId: selectedExportPeriodId })}
                        type="button"
                      >
                        {exportBusy === "helb_report:download" ? "Generating..." : "Download"}
                      </button>
                    </div>
                    <div className="report-export-card">
                      <strong>Housing Levy Excel</strong>
                      <small>Filing-ready employee and employer AHL schedule for the selected payroll run.</small>
                      <button
                        className="primary-button"
                        disabled={exportBusy === "housing_levy_report:download"}
                        onClick={() =>
                          onExport("housing_levy_report", { mode: "download", periodId: selectedExportPeriodId })
                        }
                        type="button"
                      >
                        {exportBusy === "housing_levy_report:download" ? "Generating..." : "Download"}
                      </button>
                    </div>
                    <div className="report-export-card">
                      <strong>Payroll Register Excel</strong>
                      <small>Gross pay, deductions, net pay, and employer cost in one payroll register workbook.</small>
                      <button
                        className="primary-button"
                        disabled={exportBusy === "payroll_register:download"}
                        onClick={() =>
                          onExport("payroll_register", { mode: "download", periodId: selectedExportPeriodId })
                        }
                        type="button"
                      >
                        {exportBusy === "payroll_register:download" ? "Generating..." : "Download"}
                      </button>
                    </div>
                    <div className="report-export-card">
                      <strong>P9 Excel</strong>
                      <small>P9-ready tax summary workbook for payroll review and employee distribution.</small>
                      <button
                        className="primary-button"
                        disabled={exportBusy === "p9_forms:download"}
                        onClick={() => onExport("p9_forms", { mode: "download", periodId: selectedExportPeriodId })}
                        type="button"
                      >
                        {exportBusy === "p9_forms:download" ? "Generating..." : "Download"}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
              <small className="section-description">
                {isSelectedHolidayRun
                  ? "Holiday payroll stays separate from monthly payroll. Only the holiday payment export is available here."
                  : "PDF reports open in preview or download mode. Excel and CSV exports download directly and are written into export history. Missing statutory identifiers generate warnings instead of stopping the whole report."}
              </small>
              {lastExportWarningSummary ? (
                <div className="mini-list queue-list" style={{ marginTop: 12 }}>
                  <article>
                    <strong>Report generated successfully with warnings</strong>
                    <span>
                      {String(lastExportWarningSummary.reportName ?? "Export")} | {String(lastExportWarningSummary.payrollPeriod ?? payroll?.period ?? "-")}
                    </span>
                    <small>
                      Included {String(lastExportWarningSummary.employeesIncluded ?? 0)} row(s) | Missing KRA {String(lastExportWarningSummary.missingKraPins ?? 0)} | Missing SHIF {String(lastExportWarningSummary.missingShifNumbers ?? 0)} | Missing NSSF {String(lastExportWarningSummary.missingNssfNumbers ?? 0)} | Missing MPESA {String(lastExportWarningSummary.missingMpesaNumbers ?? 0)} | Total KES {Number(lastExportWarningSummary.totalAmount ?? 0).toLocaleString()}
                    </small>
                    <div className="inline-actions">
                      <button className="secondary-button" onClick={onOpenWarnings} type="button">
                        View Warnings
                      </button>
                    </div>
                  </article>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="section-description">
              Switch to Payroll Admin, Finance Officer, or Super Admin to generate payroll exports.
            </p>
          )}
        </section>
        <section className={`mini-panel ${payrollPanel === "overview" ? "" : "is-hidden-panel"}`}>
          <h4>Recent payroll runs</h4>
          {process ? (
            <div className="mini-list queue-list">
              {process.history.map((item) => (
                <article key={`${item.period}-${item.payrollType}`}>
                  <strong>
                    {item.period} | {item.payrollType}
                  </strong>
                  <span>
                    {item.status} | Gross {item.grossPay}
                  </span>
                  <small>
                    Net {item.netPay} | Processed {item.processedAt}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p className="section-description">Payroll history is loading.</p>
          )}
        </section>
        {payrollPanel === "exports" ? (
          <section className={`mini-panel ${payrollPanel === "exports" ? "" : "is-hidden-panel"}`}>
            <h4>Statutory summary</h4>
            {statutoryLoading ? (
              <p className="section-description">Loading statutory reports...</p>
            ) : (
              <div className="mini-list queue-list">
                {statutoryRows.map((row) => (
                  <article key={String(row.label ?? row.value)}>
                    <strong>{String(row.label ?? "-")}</strong>
                    <span>{String(row.value ?? "-")}</span>
                    <small>{String(row.filingStatus ?? "-")}</small>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
        {payrollPanel === "exports" ? (
          <section className="mini-panel">
            <h4>Payslip output</h4>
            {payslipsLoading ? (
              <p className="section-description">Loading payslips...</p>
            ) : (
              <div className="mini-list queue-list">
                {payslips.length ? (
                  payslips.map((slip) => (
                    <article key={String(slip.id)}>
                      <strong>{String(slip.fullName ?? slip.period ?? "-")}</strong>
                      <span>
                        {String(slip.period ?? "-")} | Gross {String(slip.grossPay ?? "-")} | Net {String(slip.netPay ?? "-")}
                      </span>
                      <small>{String(slip.employeeNumber ?? "-")} | {String(slip.email ?? "-")}</small>
                      {Array.isArray(slip.missingFields) && slip.missingFields.length ? (
                        <small>Complete employee details first: {slip.missingFields.map((field) => String(field)).join(", ")}</small>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="section-description">No payslips are available yet for this run.</p>
                )}
              </div>
            )}
          </section>
        ) : null}
        <section className={`mini-panel ${payrollPanel === "exports" ? "" : "is-hidden-panel"}`}>
          <h4>Export history</h4>
          {process ? (
            <div className="mini-list queue-list">
              {process.exports.map((item) => (
                <article key={item.id}>
                  <strong>{item.label}</strong>
                  <span>
                    {item.actor} | {item.status}
                  </span>
                  <small>{item.generatedAt}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="section-description">Export history is loading.</p>
          )}
        </section>
        {payrollPanel === "audit" ? (
          <section className="mini-panel">
            <h4>Payroll audit trail</h4>
            {auditLoading ? (
              <p className="section-description">Loading payroll audit trail...</p>
            ) : (
              <div className="table-wrap">
                {auditRows.length ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Actor</th>
                        <th>Role</th>
                        <th>Subject</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRows.slice(0, 20).map((row) => (
                        <tr key={String(row.id)}>
                          <td>{String(row.action ?? row.subject ?? "-")}</td>
                          <td>{String(row.actorEmail ?? "-")}</td>
                          <td>{String(row.actorRole ?? "-")}</td>
                          <td>{String(row.subject ?? "-")}</td>
                          <td>{String(row.timestamp ?? "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="section-description">No payroll audit activity has been captured yet.</p>
                )}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
}

function ApprovalWorkbench({
  moduleKey,
  activeItem,
  selectedRole,
  tasks,
  onApprove,
  onReject,
  onCreateEmployee,
  onCreateLeave,
  onCreatePayroll,
  onCreateProfileUpdate,
  onCreateRequisition,
  onCreateTraining,
  onCreateAsset,
  busyId,
  taskMessage,
}: {
  moduleKey: string;
  activeItem: string;
  selectedRole: RuntimeRoleProfile;
  tasks: ApprovalTask[];
  onApprove: (taskId: string) => void;
  onReject: (taskId: string) => void;
  onCreateEmployee: (event: FormEvent<HTMLFormElement>) => void;
  onCreateLeave: (event: FormEvent<HTMLFormElement>) => void;
  onCreatePayroll: (event: FormEvent<HTMLFormElement>) => void;
  onCreateProfileUpdate: (event: FormEvent<HTMLFormElement>) => void;
  onCreateRequisition: (event: FormEvent<HTMLFormElement>) => void;
  onCreateTraining: (event: FormEvent<HTMLFormElement>) => void;
  onCreateAsset: (event: FormEvent<HTMLFormElement>) => void;
  busyId: string | null;
  taskMessage: string;
}) {
  const visibleTasks = tasks.slice(0, 6);
  const canPrepareEmployee = ["Operator", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canPreparePayroll = ["Payroll Admin", "HR Admin", "Manager", "Super Admin"].includes(selectedRole.role);
  const canPrepareLeave = ["Employee", "Manager", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canPrepareRequisition = ["Manager", "Recruiter", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canPrepareTraining = ["Employee", "Manager", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canPrepareAsset = ["Employee", "Operator", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canPrepareProfile = ["Employee", "HR Admin", "Super Admin"].includes(selectedRole.role);

  return (
    <section className="surface-card action-workbench">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Workflow Queue</p>
          <h3>Interactive approvals</h3>
        </div>
        <TonePill tone="warning">role aware</TonePill>
      </div>
      <p className="section-description">
        Route employee, payroll, leave, requisition, training, asset, and profile actions through the live approval queue below.
      </p>

      {taskMessage ? <div className="task-banner">{taskMessage}</div> : null}

      <div className="workbench-grid">
        <section className="mini-panel">
          <h4>Approvals Inbox</h4>
          <div className="mini-list queue-list">
            {visibleTasks.map((task) => {
              const canAct =
                task.status === "pending" &&
                (task.ownerRole === selectedRole.role || selectedRole.role === "Super Admin");

              return (
                <article key={task.id}>
                  <strong>{task.title}</strong>
                  <span>
                    {task.stage} | Owner: {task.ownerRole}
                  </span>
                  <small>
                    {task.description} | Updated {task.updatedAt}
                  </small>
                  <div className="queue-actions">
                    <TonePill
                      tone={
                        task.status === "approved"
                          ? "positive"
                          : task.status === "rejected"
                            ? "critical"
                            : "warning"
                      }
                    >
                      {task.status}
                    </TonePill>
                    {canAct ? (
                      <div className="inline-actions">
                        <button
                          className="primary-button"
                          disabled={busyId === task.id}
                          onClick={() => onApprove(task.id)}
                          type="button"
                        >
                          {busyId === task.id ? "Working..." : "Approve"}
                        </button>
                        <button
                          className="ghost-button"
                          disabled={busyId === task.id}
                          onClick={() => onReject(task.id)}
                          type="button"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mini-panel">
          <h4>Request Studio</h4>
          {moduleKey === "people" && (activeItem === "Staff Register" || activeItem === "Employee Directory") ? (
            canPrepareEmployee ? (
              <form className="action-form" onSubmit={onCreateEmployee}>
                <label>
                  <span>Employee name</span>
                  <input name="employeeName" placeholder="e.g. Lucy Atieno" required />
                </label>
                <label>
                  <span>Department</span>
                  <input name="department" placeholder="People Operations" required />
                </label>
                <label>
                  <span>Branch</span>
                  <input name="branch" placeholder="Nairobi HQ" required />
                </label>
                <label>
                  <span>Employment type</span>
                  <input name="employmentType" placeholder="Permanent" required />
                </label>
                <button className="primary-button" type="submit">
                  Submit for supervisor approval
                </button>
              </form>
            ) : (
              <p className="section-description">
                Switch to Operator, HR Admin, or Super Admin to prepare employee activation requests.
              </p>
            )
          ) : null}

          {moduleKey === "payroll" &&
          (activeItem === "Payroll Dashboard" || activeItem === "Review & Approval") ? (
            canPreparePayroll ? (
              <form className="action-form" onSubmit={onCreatePayroll}>
                <label>
                  <span>Payroll period</span>
                  <input defaultValue="Apr 2026" name="period" required />
                </label>
                <label>
                  <span>Gross pay</span>
                  <input defaultValue="KES 18.45M" name="grossPay" required />
                </label>
                <label>
                  <span>Net pay</span>
                  <input defaultValue="KES 13.94M" name="netPay" required />
                </label>
                <label>
                  <span>Employee count</span>
                  <input defaultValue="1044" name="employeeCount" required />
                </label>
                <button className="primary-button" type="submit">
                  Send to finance review
                </button>
              </form>
            ) : (
              <p className="section-description">
                Switch to Payroll Admin, HR Admin, Manager, or Super Admin to create payroll approval requests.
              </p>
            )
          ) : null}

          {moduleKey === "leave" &&
          (activeItem === "Leave Requests" || activeItem === "Leave Dashboard") ? (
            canPrepareLeave ? (
              <form className="action-form" onSubmit={onCreateLeave}>
                <label>
                  <span>Employee name</span>
                  <input defaultValue="Brian Mwangi" name="employeeName" required />
                </label>
                <label>
                  <span>Leave type</span>
                  <input defaultValue="Annual Leave" name="leaveType" required />
                </label>
                <label>
                  <span>Days</span>
                  <input defaultValue="4" name="days" required />
                </label>
                <label>
                  <span>Start date</span>
                  <input defaultValue="2026-04-28" name="startDate" required />
                </label>
                <button className="primary-button" type="submit">
                  Submit leave request
                </button>
              </form>
            ) : (
              <p className="section-description">
                Switch to Employee, Manager, HR Admin, or Super Admin to prepare leave requests.
              </p>
            )
          ) : null}

          {moduleKey === "recruitment" &&
          (activeItem === "Job Requisitions" || activeItem === "Vacancies") ? (
            canPrepareRequisition ? (
              <form className="action-form" onSubmit={onCreateRequisition}>
                <label>
                  <span>Role title</span>
                  <input defaultValue="Payroll Analyst" name="roleTitle" required />
                </label>
                <label>
                  <span>Department</span>
                  <input defaultValue="Finance" name="department" required />
                </label>
                <label>
                  <span>Branch</span>
                  <input defaultValue="Nairobi HQ" name="branch" required />
                </label>
                <label>
                  <span>Headcount</span>
                  <input defaultValue="1" name="headcount" required />
                </label>
                <button className="primary-button" type="submit">
                  Submit requisition
                </button>
              </form>
            ) : (
              <p className="section-description">
                Switch to Manager, Recruiter, HR Admin, or Super Admin to prepare requisitions.
              </p>
            )
          ) : null}

          {moduleKey === "training" &&
          (activeItem === "Training Requests" || activeItem === "Training Calendar") ? (
            canPrepareTraining ? (
              <form className="action-form" onSubmit={onCreateTraining}>
                <label>
                  <span>Employee name</span>
                  <input defaultValue="Daniel Oloo" name="employeeName" required />
                </label>
                <label>
                  <span>Program name</span>
                  <input defaultValue="Forklift Safety Refresher" name="programName" required />
                </label>
                <label>
                  <span>Schedule</span>
                  <input defaultValue="2026-05-02" name="schedule" required />
                </label>
                <label>
                  <span>Budget</span>
                  <input defaultValue="KES 28,000" name="budget" required />
                </label>
                <button className="primary-button" type="submit">
                  Submit training request
                </button>
              </form>
            ) : (
              <p className="section-description">
                Switch to Employee, Manager, HR Admin, or Super Admin to prepare training requests.
              </p>
            )
          ) : null}

          {moduleKey === "assets" &&
          (activeItem === "Asset Allocation" || activeItem === "Asset Returns") ? (
            canPrepareAsset ? (
              <form className="action-form" onSubmit={onCreateAsset}>
                <label>
                  <span>Employee name</span>
                  <input defaultValue="Lucy Atieno" name="employeeName" required />
                </label>
                <label>
                  <span>Asset name</span>
                  <input defaultValue="Dell Latitude 7440" name="assetName" required />
                </label>
                <label>
                  <span>Request type</span>
                  <input defaultValue="Assign" name="requestType" required />
                </label>
                <label>
                  <span>Branch</span>
                  <input defaultValue="Nairobi HQ" name="branch" required />
                </label>
                <button className="primary-button" type="submit">
                  Submit asset request
                </button>
              </form>
            ) : (
              <p className="section-description">
                Switch to Employee, Operator, HR Admin, or Super Admin to prepare asset requests.
              </p>
            )
          ) : null}

          {moduleKey === "ess" &&
          (activeItem === "My Profile" || activeItem === "My Requests") ? (
            canPrepareProfile ? (
              <form className="action-form" onSubmit={onCreateProfileUpdate}>
                <label>
                  <span>Employee name</span>
                  <input defaultValue="Brian Mwangi" name="employeeName" required />
                </label>
                <label>
                  <span>Field name</span>
                  <input defaultValue="Company phone number" name="fieldName" required />
                </label>
                <label>
                  <span>New value</span>
                  <input defaultValue="0712 555 901" name="newValue" required />
                </label>
                <button className="primary-button" type="submit">
                  Submit profile update
                </button>
              </form>
            ) : (
              <p className="section-description">
                Switch to Employee, HR Admin, or Super Admin to prepare profile update requests.
              </p>
            )
          ) : null}

          {moduleKey !== "people" &&
          moduleKey !== "payroll" &&
          moduleKey !== "leave" &&
          moduleKey !== "recruitment" &&
          moduleKey !== "training" &&
          moduleKey !== "assets" &&
          moduleKey !== "ess" ? (
            <p className="section-description">
              This workflow workbench is now wired for People, Payroll, Leave, Recruitment, Training, Assets, and employee
              self-service requests. The same approval pattern can keep extending across the platform.
            </p>
          ) : null}
        </section>
      </div>
    </section>
  );
}

export function SolvaShell({
  initialModuleKey,
  initialItem,
}: {
  initialModuleKey?: string;
  initialItem?: string;
}) {
  const router = useRouter();
  const fallbackModules = modules;
  const initialModule =
    fallbackModules.find((module) => module.key === initialModuleKey) ?? fallbackModules[0];
  const initialPageItem =
    (initialItem && initialModule?.items.includes(initialItem) ? initialItem : undefined) ??
    initialModule?.items[0] ??
    "";
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null);
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [dataMode, setDataMode] = useState<"loading" | "live" | "error">("loading");
  const [moduleKey, setModuleKey] = useState(initialModule?.key ?? "dashboard");
  const [search, setSearch] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiSuggestedActions, setAiSuggestedActions] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [activeItems, setActiveItems] = useState<Record<string, string>>(
    Object.fromEntries(
      fallbackModules.map((module) => [
        module.key,
        module.key === initialModule?.key ? initialPageItem : module.items[0] ?? "",
      ])
    )
  );
  const [pageState, setPageState] = useState<PageSpec>(() => getPage(initialModule, initialPageItem));
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [payrollPackage, setPayrollPackage] = useState<PayrollPackage | null>(null);
  const [payrollVariance, setPayrollVariance] = useState<PayrollVarianceItem[]>([]);
  const [payrollProcess, setPayrollProcess] = useState<PayrollProcessData | null>(null);
  const [userAccessRows, setUserAccessRows] = useState<Array<Record<string, unknown>>>([]);
  const [userAccessLoading, setUserAccessLoading] = useState(false);
  const [lastExportWarningSummary, setLastExportWarningSummary] = useState<Record<string, unknown> | null>(null);
  const [pageStatus, setPageStatus] = useState<"loading" | "live" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  const [accountBusyKey, setAccountBusyKey] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [taskMessage, setTaskMessage] = useState("");
  const [runtimeError, setRuntimeError] = useState("");
  const [showInstallAppAction, setShowInstallAppAction] = useState(false);
  const [guidanceState, setGuidanceState] = useState<GuidanceState>({
    welcomeDismissed: false,
    checklistDismissed: false,
    completedChecklist: [],
    completedTours: [],
  });
  const [guidanceReady, setGuidanceReady] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [activeTourKey, setActiveTourKey] = useState<keyof typeof TOUR_DEFINITIONS | null>(null);
  const initialRouteAppliedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateInstallVisibility = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches === true ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      const desktop = window.matchMedia?.("(min-width: 1024px)").matches === true;
      setShowInstallAppAction(desktop && !standalone);
    };

    updateInstallVisibility();
    window.addEventListener("resize", updateInstallVisibility);
    window.addEventListener("appinstalled", updateInstallVisibility);

    return () => {
      window.removeEventListener("resize", updateInstallVisibility);
      window.removeEventListener("appinstalled", updateInstallVisibility);
    };
  }, []);

  const refreshRuntime = async () => {
    try {
      setDataMode("loading");
      setRuntimeError("");
      const platformPayload = await fetchPlatformSnapshot();
      const currentRole = (platformPayload.loginProfiles[0]?.role ?? "Employee") as AppRole;
      const partialErrors: string[] = [];

      async function loadOptional<T>(
        allowed: boolean,
        loader: () => Promise<T>,
        onSuccess: (payload: T) => void,
        onFallback: () => void
      ) {
        if (!allowed) {
          onFallback();
          return;
        }

        try {
          const payload = await loader();
          onSuccess(payload);
        } catch (error) {
          const apiError = describeApiError(error);
          if (apiError.status === 401) {
            router.push("/unauthorized");
            throw apiError;
          }
          if (apiError.status === 403) {
            onFallback();
            return;
          }
          partialErrors.push(apiError.message);
          onFallback();
        }
      }

      setSnapshot(platformPayload);

      await Promise.all([
        loadOptional(
          currentRole !== "Employee",
          fetchApprovalTasks,
          (payload) => setTasks(payload.tasks),
          () => setTasks([])
        ),
        loadOptional(
          roleCanAccessModule(currentRole, "audit"),
          fetchAuditLogs,
          (payload) => setAuditEvents(payload.events),
          () => setAuditEvents([])
        ),
        loadOptional(
          roleCanAccessPeople(currentRole),
          fetchEmployeeRecords,
          (payload) => setEmployees(payload.employees),
          () => setEmployees([])
        ),
        loadOptional(
          roleCanAccessModule(currentRole, "payroll"),
          fetchPayrollPackage,
          (payload) => setPayrollPackage(payload.payroll),
          () => setPayrollPackage(null)
        ),
        loadOptional(
          roleCanAccessPayroll(currentRole),
          fetchPayrollReview,
          (payload) => setPayrollVariance(payload.variance),
          () => setPayrollVariance([])
        ),
        loadOptional(
          roleCanAccessPayroll(currentRole),
          fetchPayrollProcess,
          (payload) => setPayrollProcess(payload.process),
          () => setPayrollProcess(null)
        ),
      ]);

      if (partialErrors.length > 0) {
        setRuntimeError(partialErrors[0]);
      }
      setDataMode("live");
    } catch (error) {
      const apiError = describeApiError(error);

      if (apiError.status === 401) {
        router.push("/unauthorized");
        return;
      }

      if (apiError.status === 403) {
        router.push("/forbidden");
        return;
      }

      setSnapshot(null);
      setTasks([]);
      setAuditEvents([]);
      setEmployees([]);
      setPayrollPackage(null);
      setPayrollVariance([]);
      setPayrollProcess(null);
      setLastExportWarningSummary(null);
      setRuntimeError(apiError.message);
      setDataMode("error");
    }
  };

  useEffect(() => {
    void refreshRuntime();
  }, [router]);

  useEffect(() => {
    if (selectedEmployee || employees.length === 0) {
      return;
    }

    void handleEmployeeSelect(employees[0].id);
  }, [employees, selectedEmployee]);

  const secureFallbackModules = fallbackModules.filter((module) => module.key === "ess");
  const liveModules = snapshot?.modules?.length
    ? snapshot.modules
    : dataMode === "live"
      ? fallbackModules
      : secureFallbackModules;
  const availableProfiles: RuntimeRoleProfile[] = snapshot?.loginProfiles?.length
    ? snapshot.loginProfiles.map((profile) => ({
        key: `${profile.email}::${profile.role}`,
        role: profile.role as AppRole,
        email: profile.email,
      }))
    : [
        {
          key: selectedRoleKey || "employee::fallback",
          role: "Employee" as AppRole,
          email: "",
        },
      ];

  const selectedRole = availableProfiles.find((profile) => profile.key === selectedRoleKey) ?? availableProfiles[0];
  const hideEssWorkspace = selectedRole ? !roleShouldUseEssWorkspace(selectedRole.role) : false;
  const canViewUserAccess = ["Payroll Admin", "HR Admin", "Super Admin"].includes(selectedRole?.role ?? "");
  const presentedModules = useMemo(
    () =>
      liveModules
        .map((module) => {
          const presented = getPresentedModule(module, snapshot?.workspace.name ?? null);
          if (presented.key === "dashboard" && selectedRole) {
            return {
              ...presented,
              title: usesApprovalsHome(selectedRole.role) ? "Approvals" : "Dashboard",
              shortTitle: usesApprovalsHome(selectedRole.role) ? "Inbox" : "Dashboard",
              summary: usesApprovalsHome(selectedRole.role)
                ? "See every pending leave, payroll, performance, and staff request in one clean approval queue."
                : presented.summary,
              tagline: usesApprovalsHome(selectedRole.role)
                ? "A simple approvals schedule for sign-offs, comments, and direct action."
                : presented.tagline,
            };
          }
          return presented;
        })
        .filter((module) => {
          if (selectedRole?.role === "Employee" && module.key === "dashboard") {
            return false;
          }
          if (selectedRole?.role === "Employee") {
            return module.key === "ess";
          }
          return !(hideEssWorkspace && module.key === "ess");
        }),
    [hideEssWorkspace, liveModules, selectedRole?.role, snapshot?.workspace.name]
  );

  useEffect(() => {
    if (canViewUserAccess) {
      void loadUserAccessRows();
    } else {
      setUserAccessRows([]);
    }
  }, [canViewUserAccess, selectedRole?.email]);

  const activeModule = useMemo(() => {
    if (selectedRole?.role === "Employee") {
      return presentedModules.find((module) => module.key === "ess") ?? presentedModules[0];
    }
    return presentedModules.find((module) => module.key === moduleKey) ?? presentedModules[0];
  }, [presentedModules, moduleKey, selectedRole?.role]);
  const employeeEssHomeItem = activeItems.ess ?? "My Dashboard";

  useEffect(() => {
    if (!selectedRoleKey && availableProfiles[0]?.key) {
      setSelectedRoleKey(availableProfiles[0].key);
    }
  }, [availableProfiles, selectedRoleKey]);

  useEffect(() => {
    if (!selectedRole?.email) {
      return;
    }

    setGuidanceState(readGuidanceState(selectedRole.email));
    setGuidanceReady(true);
    setActiveTourKey(null);
    setShowHelpPanel(false);
    setSearchDialogOpen(false);
  }, [selectedRole?.email]);

  useEffect(() => {
    if (!guidanceReady || !selectedRole?.email) {
      return;
    }

    writeGuidanceState(selectedRole.email, guidanceState);
  }, [guidanceReady, guidanceState, selectedRole?.email]);

  useEffect(() => {
    if (selectedRole.role !== "Employee") {
      if (usesApprovalsHome(selectedRole.role)) {
        setActiveItems((current) => ({
          ...current,
          dashboard: current.dashboard === "Overview" || !current.dashboard ? "Pending Approvals" : current.dashboard,
        }));
      }
      return;
    }

    const preferredModuleKey = presentedModules.some((module) => module.key === "ess")
      ? "ess"
      : presentedModules[0]?.key;

    if (!preferredModuleKey) {
      return;
    }

    if (moduleKey !== "ess") {
      setModuleKey(preferredModuleKey);
    }

    setActiveItems((current) => ({
      ...current,
      ess: current.ess ?? "My Dashboard",
    }));
  }, [presentedModules, moduleKey, selectedRole.role]);

  const filteredModules = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return presentedModules;
    }

    return presentedModules.filter((module) =>
      `${module.title} ${module.summary} ${module.items.join(" ")}`.toLowerCase().includes(query)
    );
  }, [presentedModules, search, selectedRole.role]);
  const workspaceGroups = useMemo(() => getWorkspaceGroups(selectedRole.role), [selectedRole.role]);
  const groupedModules = useMemo(
    () =>
      workspaceGroups.map((group) => ({
        label: group.label,
        modules: filteredModules.filter((module) => group.keys.some((key) => key === module.key)),
      })).filter((group) => group.modules.length > 0),
    [filteredModules, workspaceGroups]
  );
  const employeeWorkspaceModules: Array<{ key: string; title: string }> = [];

  const activeItem = activeItems[activeModule.key] ?? activeModule.items[0] ?? "";
  const workspaceName = snapshot?.workspace.name ?? "Solva HR Workspace";
  const workspaceDetail = snapshot?.workspace.detail ?? "Live HR and payroll operations";
  const workspaceLogoUrl = snapshot?.workspace.logoUrl ?? null;
  const workspaceLogoMark = snapshot?.workspace.logoMark ?? "S";
  const workspaceShortName = snapshot?.workspace.shortName ?? workspaceName;
  const workspaceWelcomeMessage =
    snapshot?.workspace.welcomeMessage ??
    "Run payroll, approvals, people operations, and employee self service from one secure workspace.";
  const workspacePoweredByLabel = snapshot?.workspace.poweredByLabel ?? "Powered by Solva HR";
  const currentUserName =
    snapshot?.currentUser?.fullName ??
    selectedRole.email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  const pendingTaskCount = tasks.filter((task) => task.status === "pending").length;
  const aiAssist = useMemo(
    () =>
      getRoleAwareAiAssist(selectedRole.role as AppRole, activeModule.title, activeItem, {
        pendingTaskCount,
        employeeCount: employees.length,
        payrollPeriod: payrollPackage?.period ?? "No current payroll period",
        payrollValidationErrors: payrollPackage?.validationErrors ?? 0,
        workspaceName,
      }),
    [
      activeItem,
      activeModule.title,
      employees.length,
      payrollPackage?.period,
      payrollPackage?.validationErrors,
      pendingTaskCount,
      selectedRole.role,
      workspaceName,
    ]
  );
  const aiInsightFeed = snapshot?.featured.insights ?? [];
  const roleGuidance = ROLE_GUIDANCE[selectedRole.role] ?? ROLE_GUIDANCE.default;
  const activeModuleGroup =
    workspaceGroups.find((group) => group.keys.includes(activeModule.key as never))?.label ?? "Workspace";
  const moduleBadgeByKey = useMemo<Record<string, string | null>>(
    () => ({
      dashboard: pendingTaskCount > 0 ? String(pendingTaskCount) : null,
      payroll: payrollPackage?.validationErrors ? String(payrollPackage.validationErrors) : null,
      people: employees.length ? String(employees.length) : null,
      leave: tasks.filter((task) => task.moduleKey === "leave" && task.status === "pending").length
        ? String(tasks.filter((task) => task.moduleKey === "leave" && task.status === "pending").length)
        : null,
      performance: tasks.filter((task) => task.moduleKey === "performance" && task.status === "pending").length
        ? String(tasks.filter((task) => task.moduleKey === "performance" && task.status === "pending").length)
        : null,
      reports: null,
      administration: null,
      ess: null,
    }),
    [employees.length, payrollPackage?.validationErrors, pendingTaskCount, tasks]
  );
  const mobileDockItems = ROLE_BOTTOM_NAV[selectedRole.role] ?? ROLE_BOTTOM_NAV.Operator ?? [];

  useEffect(() => {
    function handleKeyboardShortcuts(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchDialogOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setSearchDialogOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, []);

  useEffect(() => {
    if (!activeModule.items.length || activeModule.items.includes(activeItem)) {
      return;
    }

    setActiveItems((current) => ({
      ...current,
      [activeModule.key]: activeModule.items[0] ?? "",
    }));
  }, [activeItem, activeModule]);

  useEffect(() => {
    const pathParts = typeof window === "undefined" ? [] : window.location.pathname.split("/").filter(Boolean);
    const routeModuleKey = initialModuleKey ?? pathParts[0];
    if (initialRouteAppliedRef.current || !routeModuleKey) {
      return;
    }

    const targetModule = presentedModules.find((module) => module.key === routeModuleKey);
    if (!targetModule || selectedRole.role === "Employee") {
      return;
    }

    const routePageKey = pathParts[1] ?? "";
    const routeItem = ERP_ROUTE_ITEM_LABELS[routeModuleKey]?.[routePageKey];
    const targetItem =
      (initialItem && targetModule.items.includes(initialItem) ? initialItem : undefined) ??
      (routeItem && targetModule.items.includes(routeItem) ? routeItem : undefined) ??
      targetModule.items.find((item) => slugify(item) === routePageKey) ??
      targetModule.items[0] ??
      "";

    initialRouteAppliedRef.current = true;
    setModuleKey(targetModule.key);
    setActiveItems((current) => ({
      ...current,
      [targetModule.key]: targetItem,
    }));
    setPageState(getPage(targetModule, targetItem));
  }, [initialItem, initialModuleKey, presentedModules, selectedRole.role]);

  const checklistItems = useMemo<ChecklistItem[]>(() => {
    const manualDone = new Set(guidanceState.completedChecklist);

    if (selectedRole.role === "Payroll Admin") {
      return [
        {
          key: "payroll-open-period",
          label: "Open your first payroll period",
          detail: "Create a live period so validations and review can begin.",
          completed: Boolean(payrollPackage) || manualDone.has("payroll-open-period"),
          auto: true,
          moduleKey: "payroll",
          item: "Payroll Periods",
        },
        {
          key: "payroll-review",
          label: "Review payroll validations",
          detail: "Check variance, validation issues, and approvals before release.",
          completed: manualDone.has("payroll-review"),
          auto: false,
          moduleKey: "payroll",
          item: "Review & Approval",
        },
        {
          key: "payroll-payslips",
          label: "Generate payslips",
          detail: "Open payslips and release payroll outputs for staff.",
          completed: manualDone.has("payroll-payslips"),
          auto: false,
          moduleKey: "payroll",
          item: "Payslips",
        },
      ];
    }

    if (selectedRole.role === "Manager") {
      return [
        {
          key: "manager-approvals",
          label: "Review pending approvals",
          detail: "Check requests that need your sign-off.",
          completed: pendingTaskCount === 0 || manualDone.has("manager-approvals"),
          auto: true,
          moduleKey: "dashboard",
          item: "Pending Approvals",
        },
        {
          key: "manager-leave",
          label: "Check team leave visibility",
          detail: "Use leave requests and the calendar to understand coverage.",
          completed: manualDone.has("manager-leave"),
          auto: false,
          moduleKey: "leave",
          item: "Leave Requests",
        },
        {
          key: "manager-performance",
          label: "Launch or review appraisals",
          detail: "Open performance reviews and keep the cycle moving.",
          completed: manualDone.has("manager-performance"),
          auto: false,
          moduleKey: "performance",
          item: "Performance Reviews",
        },
      ];
    }

    if (selectedRole.role === "Employee") {
      return [
        {
          key: "employee-profile",
          label: "Review your profile",
          detail: "Check phone, bank details, and statutory information.",
          completed: manualDone.has("employee-profile"),
          auto: false,
          moduleKey: "ess",
          item: "My Profile",
        },
        {
          key: "employee-leave",
          label: "Submit a leave request",
          detail: "Use leave to test balances, dates, and approvals.",
          completed: manualDone.has("employee-leave"),
          auto: false,
          moduleKey: "ess",
          item: "My Leave",
        },
        {
          key: "employee-payslips",
          label: "Open your payslips",
          detail: "Review payroll history and download the latest slip.",
          completed: manualDone.has("employee-payslips"),
          auto: false,
          moduleKey: "ess",
          item: "My Payslips",
        },
      ];
    }

    return [
      {
        key: "hr-add-employee",
        label: "Add your first employee",
        detail: "Create the first live employee record to unlock people workflows.",
        completed: employees.length > 0 || manualDone.has("hr-add-employee"),
        auto: true,
        moduleKey: "people",
        item: "Staff Register",
      },
      {
        key: "hr-departments",
        label: "Create departments",
        detail: "Set up the organizational structure before scaling records and approvals.",
        completed: manualDone.has("hr-departments"),
        auto: false,
        moduleKey: "administration",
        item: "Department Management",
      },
      {
        key: "hr-open-payroll",
        label: "Open payroll period",
        detail: "Start a live payroll cycle once people data is ready.",
        completed: Boolean(payrollPackage) || manualDone.has("hr-open-payroll"),
        auto: true,
        moduleKey: "payroll",
        item: "Payroll Periods",
      },
      {
        key: "hr-review-approvals",
        label: "Review approval queue",
        detail: "Stay ahead of pending actions and team requests.",
        completed: manualDone.has("hr-review-approvals"),
        auto: false,
        moduleKey: "dashboard",
        item: "Pending Approvals",
      },
    ];
  }, [employees.length, guidanceState.completedChecklist, payrollPackage, pendingTaskCount, selectedRole.role]);

  const checklistProgress = checklistItems.length
    ? Math.round((checklistItems.filter((item) => item.completed).length / checklistItems.length) * 100)
    : 0;

  const firstIncompleteChecklistItem = checklistItems.find((item) => !item.completed);
  const nextBestAction: GuidanceAction | null = firstIncompleteChecklistItem
    ? {
        label: firstIncompleteChecklistItem.label,
        description: firstIncompleteChecklistItem.detail,
        moduleKey: firstIncompleteChecklistItem.moduleKey,
        item: firstIncompleteChecklistItem.item,
      }
    : roleGuidance.actions[0] ?? null;

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const searchableModules = selectedRole.role === "Employee" ? filteredModules : presentedModules;
    const actionLibrary =
      selectedRole.role === "Employee"
        ? ["My Payslips", "My Leave", "My Profile", "My Documents", "Issued Documents", "Company Documents", "My Notifications", "Apply Leave"]
        : [
            roleCanAccessModule(selectedRole.role as AppRole, "people") ? "Add Employee" : null,
            roleCanAccessModule(selectedRole.role as AppRole, "payroll") ? "Open Payroll Period" : null,
            roleCanAccessModule(selectedRole.role as AppRole, "payroll") ? "Run Payroll" : null,
            roleCanAccessModule(selectedRole.role as AppRole, "performance") ? "Launch Appraisal" : null,
            roleCanAccessModule(selectedRole.role as AppRole, "reports") ? "Open Reports" : null,
          ];

    const actionSuggestions: SearchSuggestion[] = actionLibrary
      .filter((label): label is string => Boolean(label))
      .filter((label) => label.toLowerCase().includes(query))
      .map((label) => ({
        key: `action-${label}`,
        label,
        detail: "Quick action",
        kind: "action",
        actionLabel: label,
      }));

    const workspaceSuggestions = searchableModules.flatMap((module) => {
      const matchesModule = `${module.title} ${module.summary}`.toLowerCase().includes(query);
      const moduleEntry: SearchSuggestion[] = matchesModule
        ? [
            {
              key: `module-${module.key}`,
              label: module.title,
              detail: module.summary,
              kind: "workspace",
              moduleKey: module.key,
              item: module.items[0],
            },
          ]
        : [];

      const itemEntries = module.items
        .filter((item) => item.toLowerCase().includes(query))
        .map((item) => ({
          key: `item-${module.key}-${item}`,
          label: item,
          detail: module.title,
          kind: "workspace" as const,
          moduleKey: module.key,
          item,
        }));

      return [...moduleEntry, ...itemEntries];
    });

    const employeeSuggestions = roleCanAccessModule(selectedRole.role as AppRole, "people")
      ? employees
      .filter((employee) =>
        `${employee.employeeNumber} ${employee.fullName} ${employee.department} ${employee.branch}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 4)
      .map((employee) => ({
        key: `employee-${employee.id}`,
        label: employee.fullName,
        detail: `${employee.employeeNumber} · ${employee.department} · ${employee.branch}`,
        kind: "employee" as const,
        moduleKey: "people",
        item: "Staff Profiles",
        employeeId: employee.id,
      }))
      : [];

    return [...actionSuggestions, ...employeeSuggestions, ...workspaceSuggestions].slice(0, 8);
  }, [employees, filteredModules, presentedModules, search, selectedRole.role]);

  const activeTour = activeTourKey ? TOUR_DEFINITIONS[activeTourKey] : null;

  useEffect(() => {
    if (!activeModule || !activeItem) {
      return;
    }

    let mounted = true;
    setPageStatus("loading");

    async function loadPage() {
      const customWorkspaceKeys = new Set([
        "dashboard",
        "ess",
        "leave",
        "reports",
        "administration",
        "audit",
        "people",
        "payroll",
        "recruitment",
        "performance",
        "training",
        "assets",
        "integrations",
        "consultancy",
      ]);

      if (customWorkspaceKeys.has(activeModule.key)) {
        setPageState(getPage(activeModule, activeItem));
        setPageStatus("live");
        return;
      }

      try {
        const payload = await fetchPage(activeModule.key, slugify(activeItem));
        if (!mounted) {
          return;
        }

        setPageState(payload);
        setPageStatus("live");
      } catch (error) {
        const apiError = describeApiError(error);

        if (!mounted) {
          return;
        }

        if (apiError.status === 401) {
          router.push("/unauthorized");
          return;
        }

        if (apiError.status === 403) {
          if (selectedRole.role === "Employee") {
            router.push("/?module=ess&item=My%20Dashboard");
          } else {
            router.push("/forbidden");
          }
          return;
        }

        setPageState(getPage(activeModule, activeItem));
        setRuntimeError(apiError.message);
        setPageStatus("error");
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [activeItem, activeModule, router, selectedRole.role]);

  function openItem(item: string) {
    setActiveItems((current) => ({
      ...current,
      [activeModule.key]: item,
    }));
  }

  function navigateTo(moduleKey: string, item?: string) {
    const nextModule = liveModules.find((module) => module.key === moduleKey);
    if (!nextModule) {
      setTaskMessage("That shortcut is not available for this role yet.");
      return;
    }

    setModuleKey(moduleKey);
    setActiveItems((current) => ({
      ...current,
      [moduleKey]: item ?? current[moduleKey] ?? nextModule.items[0] ?? "",
    }));
  }

  function openModuleFromRail(moduleKey: string) {
    if (moduleKey === "dashboard" && usesApprovalsHome(selectedRole.role)) {
      navigateTo("dashboard", "Pending Approvals");
      return;
    }

    navigateTo(moduleKey);
  }

  function openGuidanceAction(action: GuidanceAction) {
    setGuidanceState((current) => ({
      ...current,
      welcomeDismissed: true,
    }));
    if (action.moduleKey && action.item) {
      navigateTo(action.moduleKey, action.item);
    } else {
      handleShortcut(action.label);
    }
    setShowHelpPanel(false);
    setSearch("");
  }

  function startTour(tourKey: keyof typeof TOUR_DEFINITIONS) {
    const destinations: Record<keyof typeof TOUR_DEFINITIONS, { moduleKey: string; item: string }> = {
      dashboard: { moduleKey: "dashboard", item: getDashboardHomeItem(selectedRole.role) },
      people: { moduleKey: "people", item: "Staff Register" },
      payroll: { moduleKey: "payroll", item: "Payroll Periods" },
      leave: { moduleKey: "leave", item: "Leave Requests" },
      ess: { moduleKey: "ess", item: "My Dashboard" },
    };

    const destination = destinations[tourKey];
    if (!roleCanAccessModule(selectedRole.role as AppRole, destination.moduleKey)) {
      setTaskMessage(`${selectedRole.role} cannot open that tour yet.`);
      return;
    }
    navigateTo(destination.moduleKey, destination.item);
    setActiveTourKey(tourKey);
    setShowHelpPanel(false);
    setGuidanceState((current) => ({
      ...current,
      welcomeDismissed: true,
    }));
  }

  function completeTour() {
    if (!activeTourKey) {
      return;
    }

    setGuidanceState((current) => ({
      ...current,
      welcomeDismissed: true,
      completedTours: current.completedTours.includes(activeTourKey)
        ? current.completedTours
        : [...current.completedTours, activeTourKey],
    }));
    setActiveTourKey(null);
  }

  function skipTour() {
    setGuidanceState((current) => ({
      ...current,
      welcomeDismissed: true,
    }));
    setActiveTourKey(null);
  }

  function toggleChecklistItem(key: string) {
    setGuidanceState((current) => {
      const alreadyCompleted = current.completedChecklist.includes(key);
      return {
        ...current,
        completedChecklist: alreadyCompleted
          ? current.completedChecklist.filter((item) => item !== key)
          : [...current.completedChecklist, key],
      };
    });
  }

  function dismissChecklist() {
    setGuidanceState((current) => ({
      ...current,
      checklistDismissed: true,
      welcomeDismissed: true,
    }));
  }

  function restoreChecklist() {
    setGuidanceState((current) => ({
      ...current,
      checklistDismissed: false,
    }));
  }

  function resolveShortcut(action: string) {
    const normalized = action.trim().toLowerCase();
    const directItem = activeModule.items.find((item) => item.toLowerCase() === normalized);
    if (directItem) {
      return { available: true, moduleKey: activeModule.key, item: directItem };
    }

    const leaveTargetModule = roleCanAccessModule(selectedRole.role as AppRole, "leave") ? "leave" : "ess";
    const leaveTargetItem = leaveTargetModule === "leave" ? "Leave Requests" : "My Leave";

    const shortcuts: Array<{
      match: (value: string) => boolean;
      moduleKey: string;
      item: string;
      reason?: string;
      href?: string;
    }> = [
      {
        match: (value) => value.includes("add employee") || value.includes("staff register"),
        moduleKey: "people",
        item: "Staff Register",
        href: workflowRoutes.employeeCreate,
      },
      { match: (value) => value.includes("import record") || value.includes("import employee"), moduleKey: "administration", item: "Data Imports" },
      {
        match: (value) => value.includes("payroll period"),
        moduleKey: "payroll",
        item: "Payroll Periods",
        href: workflowRoutes.payrollPeriodCreate,
      },
      { match: (value) => value.includes("process payroll") || value.includes("run payroll"), moduleKey: "payroll", item: "Process Payroll" },
      { match: (value) => value.includes("review payroll"), moduleKey: "payroll", item: "Review & Approval" },
      { match: (value) => value.includes("review approvals") || value.includes("open approval queue") || value.includes("approve profile change"), moduleKey: "dashboard", item: "Pending Approvals" },
      { match: (value) => value.includes("announcement"), moduleKey: "dashboard", item: "Announcements", reason: "Announcement publishing is being finalized. Use the announcements workspace for now." },
      { match: (value) => value.includes("board pack"), moduleKey: "reports", item: "Executive Dashboard", reason: "Board-pack generation is routed through the executive reports workspace." },
      { match: (value) => value.includes("payslip"), moduleKey: selectedRole.role === "Employee" ? "ess" : "payroll", item: selectedRole.role === "Employee" ? "My Payslips" : "Payslips" },
      { match: (value) => value.includes("profile"), moduleKey: "ess", item: "My Profile" },
      { match: (value) => value.includes("issued document") || value.includes("letter") || value.includes("contract"), moduleKey: "ess", item: "Issued Documents" },
      { match: (value) => value.includes("document"), moduleKey: "ess", item: "My Documents" },
      ...((selectedRole.role === "Employee" || selectedRole.role === "Supervisor")
        ? [
            {
              match: (value: string) => value.includes("apply leave"),
              moduleKey: leaveTargetModule,
              item: leaveTargetItem,
              href: workflowRoutes.leaveCreate,
            },
          ]
        : []),
      { match: (value) => value.includes("approve leave"), moduleKey: "leave", item: "Approvals Inbox" },
      { match: (value) => value.includes("leave calendar"), moduleKey: "leave", item: "Leave Calendar" },
      { match: (value) => value.includes("holiday"), moduleKey: "leave", item: "Holidays" },
      { match: (value) => value.includes("overtime"), moduleKey: "leave", item: "Overtime" },
      { match: (value) => value.includes("attendance"), moduleKey: "leave", item: "Daily Attendance" },
      { match: (value) => value.includes("statutory"), moduleKey: "payroll", item: "Statutory Reports" },
      { match: (value) => value.includes("warning") || value.includes("missing data"), moduleKey: "payroll", item: "Payroll Validation Warnings" },
      { match: (value) => value.includes("net-to-mpesa") || value.includes("net to mpesa"), moduleKey: "payroll", item: "Net to Bank" },
      { match: (value) => value.includes("net-to-bank") || value.includes("net to bank"), moduleKey: "payroll", item: "Net to Bank" },
      { match: (value) => value.includes("variable input"), moduleKey: "payroll", item: "Variable Inputs" },
      {
        match: (value) =>
          value.includes("launch appraisal") ||
          value.includes("review appraisal") ||
          value.includes("self review") ||
          value.includes("view appraisal"),
        moduleKey: "performance",
        item: "Performance Reviews",
        href: workflowRoutes.appraisalCreate,
      },
      { match: (value) => value.includes("create kpi"), moduleKey: "performance", item: "KPIs" },
      { match: (value) => value.includes("promotion"), moduleKey: "performance", item: "Promotions" },
      { match: (value) => value.includes("training"), moduleKey: "training", item: "Training Requests" },
      { match: (value) => value.includes("certificate"), moduleKey: "training", item: "Certifications" },
      { match: (value) => value.includes("requisition"), moduleKey: "recruitment", item: "Job Requisitions" },
      { match: (value) => value.includes("vacancy"), moduleKey: "recruitment", item: "Vacancies" },
      { match: (value) => value.includes("interview"), moduleKey: "recruitment", item: "Interviews" },
      { match: (value) => value.includes("assign asset"), moduleKey: "assets", item: "Asset Allocation" },
      { match: (value) => value.includes("register asset"), moduleKey: "assets", item: "Company Assets" },
      { match: (value) => value.includes("return asset") || value.includes("log return"), moduleKey: "assets", item: "Asset Returns" },
      { match: (value) => value.includes("run report"), moduleKey: "reports", item: "HR Reports" },
      { match: (value) => value.includes("open builder") || value.includes("report builder"), moduleKey: "reports", item: "Custom Report Builder" },
      { match: (value) => value.includes("schedule export"), moduleKey: "reports", item: "Scheduled Reports" },
      { match: (value) => value.includes("invite user"), moduleKey: "administration", item: "User Management" },
      { match: (value) => value.includes("department"), moduleKey: "administration", item: "Department Management" },
      { match: (value) => value.includes("branch"), moduleKey: "administration", item: "Branch Management" },
      { match: (value) => value.includes("designation"), moduleKey: "administration", item: "Designations" },
      { match: (value) => value.includes("job grade"), moduleKey: "administration", item: "Job Grades" },
      { match: (value) => value.includes("payroll group"), moduleKey: "administration", item: "Payroll Groups" },
      { match: (value) => value.includes("permission"), moduleKey: "administration", item: "Permissions Matrix" },
      { match: (value) => value.includes("company setting") || value.includes("branding"), moduleKey: "administration", item: "Company Settings" },
      { match: (value) => value.includes("system health"), moduleKey: "administration", item: "System Health" },
      { match: (value) => value.includes("security"), moduleKey: "administration", item: "Security Settings" },
      { match: (value) => value.includes("sign out"), moduleKey: activeModule.key, item: activeItem, reason: "Use the sign out button in the top bar." },
    ];

    const target = shortcuts.find((entry) => entry.match(normalized));
    if (!target) {
      return {
        available: false,
        reason: `${action} is not active yet. It stays disabled until the dedicated workflow is ready.`,
      };
    }

    if (!roleCanAccessModule(selectedRole.role as AppRole, target.moduleKey)) {
      return {
        available: false,
        reason: `${action} is not available for ${selectedRole.role}.`,
      };
    }

    return {
      available: true,
      moduleKey: target.moduleKey,
      item: target.item,
      reason: target.reason,
      href: target.href,
    };
  }

  function handleShortcut(action: string) {
    const actionState = resolveShortcut(action);
    if (!actionState.available || !actionState.moduleKey || !actionState.item) {
      setTaskMessage(actionState.reason ?? `${action} is not active yet.`);
      return;
    }

    if (actionState.href) {
      router.push(actionState.href);
      return;
    }

    navigateTo(actionState.moduleKey, actionState.item);
    if (actionState.reason) {
      setTaskMessage(actionState.reason);
    } else {
      setTaskMessage("");
    }
  }

  function handleSearchSelection(suggestion: SearchSuggestion) {
    if (suggestion.kind === "action" && suggestion.actionLabel) {
      handleShortcut(suggestion.actionLabel);
      setSearch("");
      setSearchDialogOpen(false);
      return;
    }

    if (suggestion.kind === "employee" && suggestion.employeeId) {
      navigateTo("people", suggestion.item ?? "Staff Profiles");
      void handleEmployeeSelect(suggestion.employeeId);
      setSearch("");
      setSearchDialogOpen(false);
      return;
    }

    if (suggestion.moduleKey && suggestion.item) {
      navigateTo(suggestion.moduleKey, suggestion.item);
      setSearch("");
      setSearchDialogOpen(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setTaskMessage("");
    setRuntimeError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const payload = (await response.json().catch(() => ({ error: "logout_failed" }))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "We could not sign you out right now.");
      }

      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "local" });

      setSnapshot(null);
      setTasks([]);
      setAuditEvents([]);
      setEmployees([]);
      setSelectedEmployee(null);
      setPayrollPackage(null);
      setPayrollVariance([]);
      setPayrollProcess(null);
      setLastExportWarningSummary(null);
      setSelectedRoleKey("");
      setDataMode("loading");
      setPageStatus("loading");

      window.location.assign("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not sign you out right now.";
      setRuntimeError(message);
      setTaskMessage(message);
    } finally {
      setIsSigningOut(false);
    }
  }

  const rendersPeopleWorkbench =
    activeModule.key === "people" &&
    (activeItem === "Staff Register" ||
      activeItem === "Employee Directory" ||
      activeItem === "Staff Profiles" ||
      activeItem === "Employee Profiles");
  const rendersPayrollWorkbench =
    activeModule.key === "payroll" &&
    (activeItem === "Payroll Dashboard" ||
      activeItem === "Payroll Periods" ||
      activeItem === "Process Payroll" ||
      activeItem === "Review & Approval" ||
      activeItem === "Payslips" ||
      activeItem === "Payroll Reports" ||
      activeItem === "Payroll Validation Warnings" ||
      activeItem === "Net to Bank" ||
      activeItem === "P9 Forms" ||
      activeItem === "Statutory Reports" ||
      activeItem === "Payroll Audit Trail");
  const rendersOperationsWorkbench = ["recruitment", "performance", "training", "integrations", "consultancy"].includes(activeModule.key);
  const rendersErpPlaceholder = ERP_PLACEHOLDER_MODULE_KEYS.has(activeModule.key);
  const rendersCustomWorkspace =
    activeModule.key === "dashboard" ||
    activeModule.key === "ess" ||
    activeModule.key === "leave" ||
    activeModule.key === "reports" ||
    activeModule.key === "administration" ||
    activeModule.key === "audit" ||
    rendersErpPlaceholder ||
    rendersPeopleWorkbench ||
    rendersPayrollWorkbench ||
    rendersOperationsWorkbench;

  function renderWorkspacePrimaryAction() {
    if (activeModule.key === "dashboard" || !pageState.quickActions[0]) {
      return null;
    }

    const primaryAction = pageState.quickActions[0];
    const actionState = resolveShortcut(primaryAction);

    return (
      <button
        className="primary-button"
        data-tour="workspace-primary-cta"
        disabled={!actionState.available}
        onClick={() => handleShortcut(primaryAction)}
        title={!actionState.available ? actionState.reason : undefined}
        type="button"
      >
        {primaryAction}
      </button>
    );
  }

  function renderCustomWorkspaceContent() {
    if (rendersErpPlaceholder) {
      return (
        <ERPModulePlaceholder
          content={getERPPlaceholderContent(activeModule.key, activeItem, activeModule.title)}
          hasTenant={Boolean(snapshot?.workspace.name)}
          role={selectedRole.role}
        />
      );
    }

    if (activeModule.key === "dashboard") {
      return (
        <DashboardWorkbench
          activeItem={activeItem}
          busyTaskId={busyId}
          checklistHidden={guidanceState.checklistDismissed}
          checklistItems={checklistItems}
          checklistProgress={checklistProgress}
          nextBestAction={nextBestAction}
          onApprove={(taskId, comment) => void handleTaskAction(taskId, "approve", comment)}
          onChecklistDismiss={dismissChecklist}
          onChecklistToggle={toggleChecklistItem}
          onJump={(item, targetModuleKey) =>
            targetModuleKey ? navigateTo(targetModuleKey, item) : openItem(item)
          }
          onOpenCommand={() => setSearchDialogOpen(true)}
          onOpenHelp={() => setShowHelpPanel(true)}
          onReject={(taskId, comment) => void handleTaskAction(taskId, "reject", comment)}
          onStartTour={() => startTour(roleGuidance.defaultTour)}
          roleName={selectedRole.role}
          snapshot={snapshot}
          visibleModules={presentedModules}
          tasks={tasks}
        />
      );
    }

    if (activeModule.key === "ess") {
      return <EssWorkbench activeItem={activeItem} onJump={openItem} />;
    }

    return (
      <section className="workspace-section workspace-section--focused">
        <div className="workspace-command-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{activeModuleGroup}</p>
              <h3>{pageState.title}</h3>
            </div>
            <div className="inline-actions">
              {renderWorkspacePrimaryAction()}
              {activeModule.key !== "dashboard" ? (
                <button className="secondary-button" onClick={() => setSearchDialogOpen(true)} type="button">
                  Command Search
                </button>
              ) : null}
            </div>
          </div>
          <p className="section-description">{pageState.description}</p>
          <div className="workspace-command-card__status">
            <TonePill tone={dataMode === "live" ? "positive" : dataMode === "loading" ? "warning" : "critical"}>
              {dataMode === "live" ? "live data" : dataMode === "loading" ? "loading" : "attention"}
            </TonePill>
            <span>
              {snapshot?.generatedAt
                ? `Last sync ${snapshot.generatedAt}${runtimeError ? ` - ${runtimeError}` : ""}`
                : runtimeError || "This workspace will show live status when the API responds."}
            </span>
          </div>
        </div>

        {rendersPeopleWorkbench ? (
          <PeopleWorkbench
            accountBusyKey={accountBusyKey}
            employees={employees}
            onCreateUserAccount={(employeeId) => void handleCreateEmployeeUserAccount(employeeId)}
            onCreateUserAccountsBulk={(employeeIds) => void handleCreateEmployeeUserAccountsBulk(employeeIds)}
            onDeleteEmployeeDocument={(employeeId, documentId) =>
              handleEmployeeDocumentDelete(employeeId, documentId)
            }
            onDownloadEmployeeDocument={(employeeId, documentId) =>
              handleEmployeeDocumentDownload(employeeId, documentId)
            }
            onDownloadLeaveForm={(requestId) => handleLeaveFormDocument(requestId, "download")}
            onForceSignOutUser={(userId) => handleForceSignOutUser(userId)}
            onOpenPayrollAddition={(employeeId) => handleOpenPayrollAddition(employeeId)}
            onOpenEmployeeDocument={(employeeId, documentId) =>
              handleEmployeeDocumentOpen(employeeId, documentId)
            }
            onOpenLeaveForm={(requestId) => handleLeaveFormDocument(requestId, "preview")}
            onRunUserAction={(userId, action) => void handleEmployeeUserLifecycleAction(userId, action)}
            onRefreshPeople={refreshRuntime}
            onSelectEmployee={(employeeId) => void handleEmployeeSelect(employeeId)}
            onSetTemporaryPassword={(userId, userLabel) => handleSetTemporaryPassword(userId, userLabel)}
            onToggleSalaryStop={(employeeId, shouldStop, reason) =>
              handleEmployeeSalaryStopToggle(employeeId, shouldStop, reason)
            }
            selectedEmployee={selectedEmployee}
            selectedRole={selectedRole}
            userAccessLoading={userAccessLoading}
            userAccessRows={userAccessRows}
          />
        ) : null}

        {rendersPayrollWorkbench ? (
          <PayrollWorkbench
            activeItem={activeItem}
            exportBusy={exportBusy}
            lastExportWarningSummary={lastExportWarningSummary}
            onExport={(exportType, options) => void handlePayrollExport(exportType, options)}
            onOpenWarnings={() => navigateTo("payroll", "Payroll Validation Warnings")}
            onPayslipAction={(employeeId, options) => void handlePayslipAction(employeeId, options)}
            onPayslipBundleAction={(options) => void handlePayslipBundleAction(options)}
            onRefreshPayroll={refreshRuntime}
            payroll={payrollPackage}
            process={payrollProcess}
            selectedRole={selectedRole}
            variance={payrollVariance}
            workspaceName={workspaceName}
          />
        ) : null}

        {activeModule.key === "leave" ? <LeaveAttendanceWorkbench activeItem={activeItem} onJump={openItem} /> : null}
        {activeModule.key === "reports" ? <ReportsWorkbench activeItem={activeItem} onJump={openItem} /> : null}
        {activeModule.key === "administration" ? <AdminWorkbench activeItem={activeItem} onJump={openItem} /> : null}
        {rendersOperationsWorkbench ? (
          <OperationsWorkbench
            activeItem={activeItem}
            moduleKey={activeModule.key as "recruitment" | "performance" | "training" | "assets" | "integrations" | "consultancy"}
            onJump={(item, targetModuleKey) =>
              targetModuleKey ? navigateTo(targetModuleKey, item) : openItem(item)
            }
          />
        ) : null}
        {activeModule.key === "audit" ? <AuditStream events={auditEvents} /> : null}
      </section>
    );
  }

  async function handleTaskAction(taskId: string, action: "approve" | "reject", comment?: string) {
    setBusyId(taskId);
    setTaskMessage("");

    try {
      await updateApprovalTask(taskId, {
        action,
        actorEmail: selectedRole.email,
        actorRole: selectedRole.role,
        comment: comment?.trim() || undefined,
      });
      await refreshRuntime();
      setTaskMessage(`Task ${action}d successfully as ${selectedRole.role}.`);
    } catch {
      setTaskMessage(`That action is not available for ${selectedRole.role} right now.`);
    } finally {
      setBusyId(null);
    }
  }

  async function runSolvaAi(promptOverride?: string) {
    const prompt = (promptOverride ?? aiPrompt).trim();
    if (!prompt) {
      setAiError("Add a question or instruction for Solva AI first.");
      return;
    }

    setAiBusy(true);
    setAiError("");
    if (promptOverride) {
      setAiPrompt(prompt);
    }

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          roleName: selectedRole.role,
          workspaceName,
          moduleKey: activeModule.key,
          moduleTitle: activeModule.title,
          activeItem,
          payrollPeriod: payrollPackage?.period ?? "",
          payrollValidationErrors: payrollPackage?.validationErrors ?? 0,
          employeeCount: employees.length,
          insightFeed: aiInsightFeed.slice(0, 6),
          pendingTasks: tasks.slice(0, 8).map((task) => ({
            requestType: task.requestType,
            title: task.title,
            employee: task.employee,
            ownerRole: task.ownerRole,
            status: task.status,
            submittedDate: task.submittedDate,
            latestComment: task.latestComment,
          })),
        }),
      });
      const payload = (await response.json()) as {
        answer?: string;
        suggestedActions?: string[];
        model?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Solva AI could not complete that request right now.");
      }
      setAiResponse(payload.answer ?? "");
      setAiSuggestedActions(Array.isArray(payload.suggestedActions) ? payload.suggestedActions : []);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Solva AI could not complete that request right now.");
    } finally {
      setAiBusy(false);
    }
  }

  async function handleEmployeeRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setTaskMessage("");

    try {
      await createEmployeeActivationRequest({
        employeeName: String(form.get("employeeName") ?? ""),
        department: String(form.get("department") ?? ""),
        branch: String(form.get("branch") ?? ""),
        employmentType: String(form.get("employmentType") ?? ""),
        actorEmail: selectedRole.email,
        actorRole: selectedRole.role,
      });
      await refreshRuntime();
      event.currentTarget.reset();
      setTaskMessage("Employee activation request submitted for supervisor review.");
    } catch {
      setTaskMessage("Could not submit the employee request just now.");
    }
  }

  async function handlePayrollRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setTaskMessage("");

    try {
      await createPayrollApprovalRequest({
        period: String(form.get("period") ?? ""),
        grossPay: String(form.get("grossPay") ?? ""),
        netPay: String(form.get("netPay") ?? ""),
        employeeCount: String(form.get("employeeCount") ?? ""),
        actorEmail: selectedRole.email,
        actorRole: selectedRole.role,
      });
      await refreshRuntime();
      setTaskMessage("Payroll package submitted into finance approval.");
    } catch {
      setTaskMessage("Could not submit the payroll approval request just now.");
    }
  }

  async function handleLeaveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setTaskMessage("");

    try {
      await createLeaveRequest({
        employeeName: String(form.get("employeeName") ?? ""),
        leaveType: String(form.get("leaveType") ?? ""),
        days: String(form.get("days") ?? ""),
        startDate: String(form.get("startDate") ?? ""),
        actorEmail: selectedRole.email,
        actorRole: selectedRole.role,
      });
      await refreshRuntime();
      setTaskMessage("Leave request submitted into supervisor approval.");
    } catch {
      setTaskMessage("Could not submit the leave request just now.");
    }
  }

  async function handleRequisitionRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setTaskMessage("");

    try {
      await createRequisitionApprovalRequest({
        roleTitle: String(form.get("roleTitle") ?? ""),
        department: String(form.get("department") ?? ""),
        branch: String(form.get("branch") ?? ""),
        headcount: String(form.get("headcount") ?? ""),
        actorEmail: selectedRole.email,
        actorRole: selectedRole.role,
      });
      await refreshRuntime();
      setTaskMessage("Requisition submitted into finance approval.");
    } catch {
      setTaskMessage("Could not submit the requisition just now.");
    }
  }

  async function handleProfileUpdateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setTaskMessage("");

    try {
      await createProfileUpdateRequest({
        employeeName: String(form.get("employeeName") ?? ""),
        fieldName: String(form.get("fieldName") ?? ""),
        newValue: String(form.get("newValue") ?? ""),
        actorEmail: selectedRole.email,
        actorRole: selectedRole.role,
      });
      await refreshRuntime();
      setTaskMessage("Profile update submitted into HR validation.");
    } catch {
      setTaskMessage("Could not submit the profile update right now.");
    }
  }

  async function handleTrainingRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setTaskMessage("");

    try {
      await createTrainingRequest({
        employeeName: String(form.get("employeeName") ?? ""),
        programName: String(form.get("programName") ?? ""),
        schedule: String(form.get("schedule") ?? ""),
        budget: String(form.get("budget") ?? ""),
        actorEmail: selectedRole.email,
        actorRole: selectedRole.role,
      });
      await refreshRuntime();
      setTaskMessage("Training request submitted into HR review.");
    } catch {
      setTaskMessage("Could not submit the training request right now.");
    }
  }

  async function handleAssetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setTaskMessage("");

    try {
      await createAssetRequest({
        employeeName: String(form.get("employeeName") ?? ""),
        assetName: String(form.get("assetName") ?? ""),
        requestType: String(form.get("requestType") ?? ""),
        branch: String(form.get("branch") ?? ""),
        actorEmail: selectedRole.email,
        actorRole: selectedRole.role,
      });
      await refreshRuntime();
      setTaskMessage("Asset request submitted into HR approval.");
    } catch {
      setTaskMessage("Could not submit the asset request right now.");
    }
  }

  async function handleEmployeeSelect(employeeId: string) {
    setTaskMessage("");

    try {
      const payload = await fetchEmployeeProfile(employeeId);
      setSelectedEmployee(payload.employee);
    } catch {
      setTaskMessage("Could not load that employee profile right now.");
    }
  }

  async function refreshSelectedEmployeeIfNeeded(employeeId: string) {
    if (selectedEmployee?.id !== employeeId) {
      return;
    }

    try {
      const payload = await fetchEmployeeProfile(employeeId);
      setSelectedEmployee(payload.employee);
    } catch {
      // Keep the current detail view if the refresh fails.
    }
  }

  async function handleEmployeeSalaryStopToggle(employeeId: string, shouldStop: boolean, reason?: string) {
    const response = await fetch(`/api/people/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salary_stop_active: shouldStop,
        salary_stop_reason: reason ?? "",
        salary_stop_effective_date: new Date().toISOString().slice(0, 10),
        salary_stop_updated_at: new Date().toISOString(),
        salary_stop_updated_by: selectedRole.email,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error ?? "Could not update salary stop status.");
    }

    await refreshRuntime();
    await refreshSelectedEmployeeIfNeeded(employeeId);
    setTaskMessage(shouldStop ? "Salary stopped and removed from future payroll runs." : "Salary resumed and restored to future payroll runs.");
  }

  async function handleCreateEmployeeUserAccount(employeeId: string) {
    setAccountBusyKey(`create:${employeeId}`);
    setTaskMessage("");

    try {
      const payload = await createEmployeeUserAccount(employeeId, "Employee");
      const summary = payload.result.summary as Record<string, unknown> | undefined;
      await refreshRuntime();
      await refreshSelectedEmployeeIfNeeded(employeeId);
      setTaskMessage(
        summary && Number(summary.created ?? 0) > 0
          ? "Employee user account created and invite sent successfully."
          : "No account was created. Check the employee email or existing account status."
      );
    } catch (error) {
      setTaskMessage(error instanceof Error ? error.message : "Could not create the employee user account.");
    } finally {
      setAccountBusyKey(null);
    }
  }

  async function handleCreateEmployeeUserAccountsBulk(employeeIds: string[]) {
    setAccountBusyKey("bulk-create");
    setTaskMessage("");

    try {
      const payload = await createEmployeeUserAccountsBulk(employeeIds, "Employee");
      const summary = payload.result.summary as Record<string, unknown> | undefined;
      await refreshRuntime();
      if (selectedEmployee?.id) {
        await refreshSelectedEmployeeIfNeeded(selectedEmployee.id);
      }
      setTaskMessage(
        summary
          ? `Created ${summary.created ?? 0} account(s), skipped ${summary.skipped ?? 0}, failed ${summary.failed ?? 0}.`
          : "Bulk account creation completed."
      );
    } catch (error) {
      setTaskMessage(error instanceof Error ? error.message : "Could not create the selected user accounts.");
    } finally {
      setAccountBusyKey(null);
    }
  }

  async function handleEmployeeUserLifecycleAction(
    userId: string,
    action: "activate" | "suspend" | "deactivate" | "reactivate" | "resend_invite" | "reset_password"
  ) {
    const busyKeyPrefix =
      action === "resend_invite"
        ? "resend"
        : action === "reset_password"
          ? "reset"
          : action === "reactivate" || action === "activate"
            ? "activate"
            : "suspend";
    setAccountBusyKey(`${busyKeyPrefix}:${userId}`);
    setTaskMessage("");

    try {
      await runAdminUserLifecycleAction(userId, action);
      await refreshRuntime();
      if (selectedEmployee?.id) {
        await refreshSelectedEmployeeIfNeeded(selectedEmployee.id);
      }
      setTaskMessage(
        action === "resend_invite"
          ? "Invite resent successfully."
          : action === "reset_password"
            ? "Password reset email sent successfully."
            : action === "suspend"
              ? "User account suspended successfully."
              : "User account reactivated successfully."
      );
    } catch (error) {
      setTaskMessage(error instanceof Error ? error.message : "Could not update the employee user account.");
    } finally {
      setAccountBusyKey(null);
    }
  }

  async function loadUserAccessRows() {
    setUserAccessLoading(true);
    try {
      const payload = await readRuntimeJson<{ users: Array<Record<string, unknown>> }>("/api/admin/users");
      setUserAccessRows(payload.users);
    } catch (error) {
      setTaskMessage(error instanceof Error ? error.message : "Could not load user access records.");
      setUserAccessRows([]);
    } finally {
      setUserAccessLoading(false);
    }
  }

  async function handleSetTemporaryPassword(userId: string, userLabel: string) {
    if (!userId) {
      return;
    }

    const providedPassword = window.prompt(
      `Set an ESS password for ${userLabel}. Leave it as RobotCafe123 or replace it with another temporary password.`,
      "RobotCafe123"
    );
    if (providedPassword === null) {
      return;
    }
    setAccountBusyKey(`temp-password:${userId}`);
    setTaskMessage("");
    try {
      const payload = await runAdminUserLifecycleAction(userId, "set_temporary_password", {
        temporaryPassword: providedPassword?.trim() ? providedPassword.trim() : null,
      });
      const tempPassword = String(payload.result.temporaryPassword ?? "");
      await loadUserAccessRows();
      setTaskMessage(
        tempPassword
          ? `ESS password set for ${userLabel}: ${tempPassword}. Ask the user to change it after login.`
          : `Password set for ${userLabel}.`
      );
    } catch (error) {
      setTaskMessage(error instanceof Error ? error.message : "Could not set the password.");
    } finally {
      setAccountBusyKey(null);
    }
  }

  async function handleForceSignOutUser(userId: string) {
    if (!userId) {
      return;
    }
    setAccountBusyKey(`force-sign-out:${userId}`);
    setTaskMessage("");
    try {
      await runAdminUserLifecycleAction(userId, "force_sign_out");
      await loadUserAccessRows();
      setTaskMessage("User signed out from active sessions.");
    } catch (error) {
      setTaskMessage(error instanceof Error ? error.message : "Could not force sign out the user.");
    } finally {
      setAccountBusyKey(null);
    }
  }

  async function handleEmployeeDocumentOpen(employeeId: string, documentId: string) {
    const response = await fetch(`/api/people/employees/${employeeId}/documents/${documentId}`, {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; document?: { signedUrl?: string } }
      | null;

    if (!response.ok || !payload?.document?.signedUrl) {
      throw new Error(payload?.error ?? "Could not open the employee document right now.");
    }

    window.open(payload.document.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleEmployeeDocumentDownload(employeeId: string, documentId: string) {
    const response = await fetch(`/api/people/employees/${employeeId}/documents/${documentId}`, {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          document?: { signedUrl?: string; fileName?: string };
        }
      | null;

    if (!response.ok || !payload?.document?.signedUrl) {
      throw new Error(payload?.error ?? "Could not download the employee document right now.");
    }

    const fileResponse = await fetch(payload.document.signedUrl, { cache: "no-store" });
    if (!fileResponse.ok) {
      throw new Error("Could not download the employee document right now.");
    }

    const blob = await fileResponse.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = payload.document.fileName ?? "employee-document";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  async function handleEmployeeDocumentDelete(employeeId: string, documentId: string) {
    const response = await fetch(`/api/people/employees/${employeeId}/documents/${documentId}`, {
      method: "DELETE",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Could not remove the employee document right now.");
    }

    await refreshRuntime();
    await refreshSelectedEmployeeIfNeeded(employeeId);
    setTaskMessage("Letter removed from the staff file successfully.");
  }

  function handleOpenPayrollAddition(employeeId: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("solva.payroll.openPanel", "additions");
      window.sessionStorage.setItem("solva.payroll.additionEmployeeId", employeeId);
    }
    navigateTo("payroll", "Payroll Dashboard");
  }

  async function handleLeaveFormDocument(requestId: string, mode: "preview" | "download") {
    const response = await fetch(
      `/api/leave/forms/${requestId}?mode=${mode === "preview" ? "preview" : "download"}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Could not ${mode === "preview" ? "open" : "download"} the leave form.`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const fileName =
      parseFileNameFromDisposition(response.headers.get("Content-Disposition")) ?? `leave-form-${requestId}.pdf`;

    if (mode === "preview") {
      window.open(objectUrl, "_blank", "noopener,noreferrer");
    } else {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  async function handlePayrollExport(
    exportType: PayrollExportActionType,
    options?: {
      mode?: "preview" | "download";
      periodId?: string;
    }
  ) {
    const mode = options?.mode ?? "download";
    setExportBusy(`${exportType}:${mode}`);
    setTaskMessage("");
    setLastExportWarningSummary(null);

    try {
      const params = new URLSearchParams();
      if (options?.periodId) {
        params.set("periodId", options.periodId);
      }
      params.set("disposition", mode === "preview" ? "inline" : "attachment");

      params.set("type", exportType);
      const response = await fetch(`/api/payroll/exports?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not generate the payroll export right now.");
      }

      const blob = await response.blob();
      if (blob.type.startsWith("text/plain")) {
        const message = await blob.text();
        throw new Error(message || "Could not generate the payroll export right now.");
      }
      const warnings = (() => {
        const encoded = response.headers.get("X-Solva-Warnings");
        if (!encoded) return [] as string[];
        try {
          const parsed = JSON.parse(decodeURIComponent(encoded)) as unknown;
          return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
        } catch {
          return [];
        }
      })();
      const warningSummary = (() => {
        const encoded = response.headers.get("X-Solva-Warning-Summary");
        if (!encoded) return null;
        try {
          const parsed = JSON.parse(decodeURIComponent(encoded)) as unknown;
          return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
        } catch {
          return null;
        }
      })();
      const objectUrl = URL.createObjectURL(blob);
      const fileName =
        parseFileNameFromDisposition(response.headers.get("Content-Disposition")) ??
        `${exportType}.${blob.type.includes("pdf") ? "pdf" : blob.type.includes("sheet") ? "xlsx" : "csv"}`;

      if (mode === "preview" && blob.type.includes("pdf")) {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      } else {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      await refreshRuntime();
      setLastExportWarningSummary(warnings.length ? warningSummary : null);
      setTaskMessage(
        warnings.length
          ? `${fileName} generated successfully with warnings. Missing identifiers were left blank where needed and the report still reconciled.`
          : mode === "preview"
            ? `${fileName} is ready for preview and has been written into the audit trail.`
            : `${fileName} downloaded successfully and has been written into the audit trail.`
      );
    } catch (error) {
      setTaskMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not generate the payroll export right now."
        )
      );
    } finally {
      setExportBusy(null);
    }
  }

  async function handlePayslipAction(
    employeeId: string,
    options?: {
      mode?: "preview" | "download";
    }
  ) {
    const mode = options?.mode ?? "download";
    setExportBusy(`payslip:${employeeId}:${mode}`);
    setTaskMessage("");

    try {
      const params = new URLSearchParams({
        format: "pdf",
        disposition: mode === "preview" ? "inline" : "attachment",
      });

      const response = await fetch(`/api/payroll/payslips/${employeeId}?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not generate the payslip right now.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const fileName =
        parseFileNameFromDisposition(response.headers.get("Content-Disposition")) ?? `payslip-${employeeId}.pdf`;

      if (mode === "preview") {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      } else {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setTaskMessage(
        mode === "preview"
          ? `${fileName} is open for preview.`
          : `${fileName} downloaded successfully.`
      );
    } catch (error) {
      setTaskMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not generate the payslip right now."
        )
      );
    } finally {
      setExportBusy(null);
    }
  }

  async function handlePayslipBundleAction(options?: { mode?: "preview" | "download"; periodId?: string }) {
    const mode = options?.mode ?? "download";
    setExportBusy(`payslip-bundle:${mode}`);
    setTaskMessage("");

    try {
      const params = new URLSearchParams({
        disposition: mode === "preview" ? "inline" : "attachment",
      });
      if (options?.periodId) {
        params.set("periodId", options.periodId);
      }

      const response = await fetch(`/api/payroll/payslips/bulk?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Could not generate the payslip pack right now.");
      }

      const blob = await response.blob();
      if (blob.type.startsWith("text/plain")) {
        const message = await blob.text();
        throw new Error(message || "Could not generate the payslip pack right now.");
      }
      const objectUrl = URL.createObjectURL(blob);
      const fileName =
        parseFileNameFromDisposition(response.headers.get("Content-Disposition")) ?? "payslips.pdf";

      if (mode === "preview") {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      } else {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setTaskMessage(
        mode === "preview" ? `${fileName} is open for preview.` : `${fileName} downloaded successfully.`
      );
    } catch (error) {
      setTaskMessage(
        formatPayrollRuntimeMessage(
          error instanceof Error ? error.message : "Could not generate the payslip pack right now."
        )
      );
    } finally {
      setExportBusy(null);
    }
  }

  return (
    <main className={`solva-app theme-${theme} ${selectedRole.role === "Employee" ? "is-employee-shell" : ""}`}>
      <aside className="primary-sidebar">
        <div className="brand-card">
          <WorkspaceLogo logoMark={workspaceLogoMark} logoUrl={workspaceLogoUrl} name={workspaceName} />
          <div>
            <strong>Solva ERP Suite</strong>
            <span>{selectedRole.role === "Employee" ? workspacePoweredByLabel : `Solva HR - ${workspaceName}`}</span>
          </div>
        </div>

        {selectedRole.role === "Employee" ? null : (
          <div className="tenant-card">
            <span className="tenant-label">Current Workspace</span>
            <strong>{workspaceName}</strong>
            <small>{workspaceDetail}</small>
          </div>
        )}

        <div className="primary-nav-groups">
          {groupedModules.map((group) => (
            <section className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              <nav className="primary-nav">
                {group.modules.map((module) => (
                  <button
                    className={`nav-item ${module.key === activeModule.key ? "is-active" : ""}`}
                    key={module.key}
                    onClick={() => openModuleFromRail(module.key)}
                    type="button"
                  >
                    <span className="nav-icon">{module.icon}</span>
                    <span className="nav-copy">
                      <strong>{module.title}</strong>
                      <small>{module.shortTitle}</small>
                    </span>
                    {moduleBadgeByKey[module.key] ? <em className="nav-badge">{moduleBadgeByKey[module.key]}</em> : null}
                  </button>
                ))}
              </nav>
            </section>
          ))}
        </div>

        {availableProfiles.length <= 1 ? null : (
          <div className="sidebar-footer">
            <p className="section-eyebrow">Access Profiles</p>
            <div className="login-grid">
              {availableProfiles.map((profile) => (
                <button
                  className={`login-card ${profile.key === selectedRole.key ? "is-active" : ""}`}
                  key={profile.key}
                  onClick={() => setSelectedRoleKey(profile.key)}
                  type="button"
                >
                  <strong>{profile.role}</strong>
                  <span>{profile.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-summary">
            <div className="breadcrumbs">
              <span>{selectedRole.role === "Employee" ? workspaceName : "Solva ERP Suite"}</span>
              <strong>{activeModule.title}</strong>
              <small>{activeItem}</small>
            </div>
            {selectedRole.role === "Employee" ? (
              <div className="topbar-context topbar-context-employee">
              <div className="topbar-context-employee__copy">
                <strong>You are logged in as {currentUserName}</strong>
                <span>{workspaceWelcomeMessage}</span>
              </div>
              <div className="topbar-context-employee__brand" aria-hidden="true">
                <img alt="" className="topbar-context-employee__brand-image" src={workspaceLogoUrl || "/tenant-logos/solva-hr-logo.jpg"} />
              </div>
            </div>
          ) : (
            <div className="topbar-context">
                <strong>You are logged in as {currentUserName}</strong>
                <span>{selectedRole.role} · {workspaceShortName}</span>
              </div>
            )}
          </div>

          <div className="topbar-tools">
            <button
              className="icon-button search-trigger-compact is-always-visible"
              data-tour="global-search"
              onClick={() => setSearchDialogOpen(true)}
              type="button"
            >
              Search / Jump
            </button>
            <button
              className="icon-button"
              data-tour="notifications-trigger"
              onClick={() =>
                navigateTo(selectedRole.role === "Employee" ? "ess" : "dashboard", selectedRole.role === "Employee" ? "My Notifications" : "Notifications")
              }
              title="Open notifications"
              type="button"
            >
              Notifications
            </button>
            {selectedRole.role === "Employee" ? null : (
              <button
                className="icon-button"
                data-tour="approvals-trigger"
                onClick={() => navigateTo("dashboard", "Pending Approvals")}
                title="Open pending approvals"
                type="button"
              >
                Approvals {pendingTaskCount > 0 ? `(${pendingTaskCount})` : ""}
              </button>
            )}
            <button
              className="icon-button"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
              type="button"
            >
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>
            {showInstallAppAction ? (
              <button
                className="ghost-button"
                onClick={() => window.dispatchEvent(new Event(INSTALL_REQUEST_EVENT))}
                type="button"
              >
                Install app
              </button>
            ) : null}
            <button className="ghost-button" onClick={() => setShowHelpPanel(true)} type="button">
              Need Help?
            </button>
            <button
              className="profile-chip"
              onClick={() =>
                selectedRole.role === "Employee"
                  ? navigateTo("ess", employeeEssHomeItem)
                  : navigateTo("dashboard", getDashboardHomeItem(selectedRole.role))
              }
              type="button"
            >
              <span>{selectedRole.role.slice(0, 2).toUpperCase()}</span>
              <strong>{selectedRole.role === "Employee" ? currentUserName : selectedRole.role}</strong>
            </button>
            <button className="ghost-button" disabled={isSigningOut} onClick={() => void handleSignOut()} type="button">
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>

        {selectedRole.role === "Employee" && employeeWorkspaceModules.length ? (
          <section className="employee-workspace-switcher surface-card">
            <div className="employee-workspace-switcher__row">
              {employeeWorkspaceModules.map((module) => (
                <button
                  className={`employee-workspace-switcher__button ${module.key === activeModule.key ? "is-active" : ""}`}
                  key={module.key}
                  onClick={() => setModuleKey(module.key)}
                  type="button"
                >
                  {module.title}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="workspace-body">
          <aside className="module-sidebar">
            <div className="module-card" data-tour="module-menu">
              <p className="section-eyebrow">{activeModuleGroup}</p>
              <h2>{activeModule.title}</h2>
              <p>{activeModule.tagline}</p>
            </div>
            <nav className="secondary-nav">
              {activeModule.items.map((item) => (
                <button
                  className={`secondary-item ${item === activeItem ? "is-active" : ""}`}
                  key={item}
                  onClick={() => openItem(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </nav>
          </aside>

          <section className="module-content">
            {rendersCustomWorkspace ? (
              renderCustomWorkspaceContent()
            ) : (
              <>
                <HeroModule
                  module={activeModule}
                  onOpenItem={openItem}
                />
                <section className="workspace-section">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">{activeModuleGroup}</p>
                  <h3>{pageState.title}</h3>
                </div>
                <div className="inline-actions">
                  {renderWorkspacePrimaryAction()}
                  {activeModule.key === "dashboard" && guidanceState.checklistDismissed ? (
                    <button className="ghost-button" onClick={restoreChecklist} type="button">
                      Show checklist
                    </button>
                  ) : null}
                </div>
              </div>

              <p className="section-description">{pageState.description}</p>

              <div className="status-row">
                <TonePill tone={dataMode === "live" ? "positive" : dataMode === "loading" ? "warning" : "critical"}>
                  {dataMode === "live" ? "api connected" : dataMode === "loading" ? "loading" : "connection issue"}
                </TonePill>
                <TonePill tone={pageStatus === "live" ? "positive" : pageStatus === "loading" ? "warning" : "critical"}>
                  {pageStatus === "live" ? "workspace live" : pageStatus === "loading" ? "loading page" : "workspace blocked"}
                </TonePill>
                <span className="status-copy">
                  {snapshot?.generatedAt
                    ? `Last snapshot ${snapshot.generatedAt}${runtimeError ? ` - ${runtimeError}` : ""}`
                    : runtimeError || "The workspace shell is loaded, but live data has not been established yet."}
                </span>
              </div>

              {pageState.filters.length ? (
                <div className="filter-row">
                  {pageState.filters.map((filter) => (
                    <span className="filter-pill" key={filter}>
                      {filter}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="metric-grid compact-grid">
                {pageState.metrics.map((metric) => (
                  <article className="metric-card" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small>{metric.hint}</small>
                    <TonePill tone={metric.tone ?? "live"}>{metric.tone ?? "live"}</TonePill>
                  </article>
                ))}
              </div>

              <div className="overview-grid">
                <ChartCard title={pageState.chartTitle} data={pageState.chartData} />
                <section className="surface-card">
                  <div className="section-heading">
                    <div>
                      <p className="section-eyebrow">Why This Matters</p>
                      <h3>Design Notes</h3>
                    </div>
                  </div>
                  <div className="note-list">
                    {pageState.highlights.map((highlight) => (
                      <article key={highlight}>
                        <span className="note-dot" />
                        <p>{highlight}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <ControlCenter selectedRole={selectedRole} snapshot={snapshot} />

              {!["dashboard", "ess", "leave", "reports", "administration", "recruitment", "performance", "training", "assets", "integrations", "consultancy"].includes(activeModule.key) ? (
                <ApprovalWorkbench
                  activeItem={activeItem}
                  busyId={busyId}
                  moduleKey={activeModule.key}
                  onApprove={(taskId) => void handleTaskAction(taskId, "approve")}
                  onCreateEmployee={(event) => void handleEmployeeRequest(event)}
                  onCreateLeave={(event) => void handleLeaveRequest(event)}
                  onCreatePayroll={(event) => void handlePayrollRequest(event)}
                  onCreateProfileUpdate={(event) => void handleProfileUpdateRequest(event)}
                  onCreateRequisition={(event) => void handleRequisitionRequest(event)}
                  onCreateTraining={(event) => void handleTrainingRequest(event)}
                  onCreateAsset={(event) => void handleAssetRequest(event)}
                  onReject={(taskId) => void handleTaskAction(taskId, "reject")}
                  selectedRole={selectedRole}
                  taskMessage={taskMessage}
                  tasks={tasks}
                />
              ) : null}

              <DataTable
                columns={pageState.table.columns}
                description={pageState.table.description}
                rows={pageState.table.rows}
                title={pageState.table.title}
              />
                </section>
              </>
            )}
          </section>
        </div>

        <WelcomeExperience
          isOpen={guidanceReady && !guidanceState.welcomeDismissed}
          onOpenAction={openGuidanceAction}
          onSkip={() =>
            setGuidanceState((current) => ({
              ...current,
              welcomeDismissed: true,
            }))
          }
          onStartTour={startTour}
          roleName={selectedRole.role}
        />
        {searchDialogOpen ? (
          <div className="search-dialog-backdrop" onClick={() => setSearchDialogOpen(false)}>
            <section
              aria-label={selectedRole.role === "Employee" ? "Search ESS pages" : "Search workspace"}
              className="search-dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">{selectedRole.role === "Employee" ? "ESS Search" : "Workspace Search"}</p>
                  <h3>{selectedRole.role === "Employee" ? "Find your next task" : "Jump to the next thing quickly"}</h3>
                </div>
                <button className="ghost-button" onClick={() => setSearchDialogOpen(false)} type="button">
                  Close
                </button>
              </div>
              <label className="search-card">
                <span>Search</span>
                <input
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && searchSuggestions[0]) {
                      event.preventDefault();
                      handleSearchSelection(searchSuggestions[0]);
                    }
                  }}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    selectedRole.role === "Employee"
                      ? "Search payslips, leave, requests, or notifications..."
                      : "Search employees, approvals, payroll runs, reports, or workspaces..."
                  }
                  value={search}
                />
              </label>
              {searchSuggestions.length ? (
                <div className="search-dialog-results">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      className="search-suggestion"
                      key={suggestion.key}
                      onClick={() => handleSearchSelection(suggestion)}
                      type="button"
                    >
                      <strong>{suggestion.label}</strong>
                      <small>{suggestion.detail}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="section-description">
                  {selectedRole.role === "Employee"
                    ? "Search your payslips, leave pages, requests, notifications, and profile settings from here."
                    : "Search employees, payroll workspaces, reports, approvals, and key actions from one place."}
                </p>
              )}
            </section>
          </div>
        ) : null}
        <button
          aria-expanded={showAiAssist}
          className="ai-assist-fab"
          onClick={() => setShowAiAssist((current) => !current)}
          type="button"
        >
          {showAiAssist ? "Close Solva AI" : "Ask Solva AI"}
        </button>
        {showAiAssist ? (
          <aside aria-label="Solva AI" className="ai-assist-panel">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Ask Solva AI</p>
                <h3>{aiAssist.heading}</h3>
              </div>
              <button className="ghost-button" onClick={() => setShowAiAssist(false)} type="button">
                Dismiss
              </button>
            </div>
            <p className="section-description">
              Suggestions stay scoped to {workspaceName} and your current {selectedRole.role.toLowerCase()} access.
            </p>
            <div className="ai-assist-panel__cards">
              {aiAssist.cards.map((card) => (
                <article className="surface-card ai-assist-card" key={card.title}>
                  <h4>{card.title}</h4>
                  <p>{card.body}</p>
                  <button
                    className="ghost-button"
                    onClick={() => void runSolvaAi(card.prompt ?? `${card.title}: ${card.body}`)}
                    type="button"
                  >
                    Use this prompt
                  </button>
                </article>
              ))}
            </div>
            <section className="surface-card ai-assist-card">
              <h4>Ask something specific</h4>
              <div className="action-form">
                <label>
                  <span>Prompt</span>
                  <textarea
                    onChange={(event) => setAiPrompt(event.target.value)}
                    placeholder="Ask for an explanation, suggested next steps, a draft approval comment, or a summary of what needs attention."
                    rows={4}
                    value={aiPrompt}
                  />
                </label>
                <div className="inline-actions">
                  <button
                    className="primary-button"
                    disabled={aiBusy || !aiPrompt.trim()}
                    onClick={() => void runSolvaAi()}
                    type="button"
                  >
                    {aiBusy ? "Thinking..." : "Run Solva AI"}
                  </button>
                  <button
                    className="ghost-button"
                    disabled={aiBusy || (!aiPrompt.trim() && !aiResponse)}
                    onClick={() => {
                      setAiPrompt("");
                      setAiResponse("");
                      setAiSuggestedActions([]);
                      setAiError("");
                    }}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {aiError ? <p className="section-description">{aiError}</p> : null}
              {aiResponse ? (
                <div className="mini-list queue-list" style={{ marginTop: 12 }}>
                  <article>
                    <strong>Solva AI response</strong>
                    <small>{aiResponse}</small>
                  </article>
                  {aiSuggestedActions.length ? (
                    <article>
                      <strong>Suggested next steps</strong>
                      <div className="filter-row">
                        {aiSuggestedActions.map((step) => (
                          <span className="filter-pill" key={step}>
                            {step}
                          </span>
                        ))}
                      </div>
                    </article>
                  ) : null}
                </div>
              ) : null}
            </section>
            {aiInsightFeed.length ? (
              <section className="surface-card ai-assist-card">
                <h4>Insights feed</h4>
                <div className="mini-list queue-list">
                  {aiInsightFeed.map((insight, index) => (
                    <article key={`${insight.title}-${index}`}>
                      <strong>{insight.title}</strong>
                      <span>{insight.detail}</span>
                      <small>{insight.tone ?? "default"} signal</small>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        ) : null}
        <HelpPanel
          onClose={() => setShowHelpPanel(false)}
          onOpenTopic={openGuidanceAction}
          onStartTour={startTour}
          open={showHelpPanel}
          roleName={selectedRole.role}
        />
        <GuidedTour
          onFinish={completeTour}
          onSkip={skipTour}
          tour={activeTour}
        />
        <nav aria-label="Workspace quick navigation" className="mobile-dock">
          {mobileDockItems.map((item) => (
            <button
              className={`mobile-dock__item ${moduleKey === item.moduleKey && activeItem === item.item ? "is-active" : ""}`}
              key={`${item.moduleKey}-${item.item}`}
              onClick={() => navigateTo(item.moduleKey, item.item)}
              type="button"
            >
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}
