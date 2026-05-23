"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChecklistItem, GuidanceAction } from "@/components/onboarding-guidance";
import type { ApprovalTask, ModuleSpec, PlatformSnapshot } from "@/lib/solva-data";
import { workflowRoutes } from "@/lib/workflow-routes";

type AsyncState<T> = {
  loading: boolean;
  error: string;
  data: T | null;
};

type ReferralMetricSummary = {
  totalReferrals: number;
  newReferrals: number;
  contactedReferrals: number;
  convertedReferrals: number;
  rewardedReferrals: number;
};

type ReferralRecord = {
  id: string;
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  industry: string;
  notes: string;
  rewardType: string;
  rewardValue: string;
  status: string;
  createdAt: string;
};

type ReferralPayload = {
  metrics: ReferralMetricSummary;
  referrals: ReferralRecord[];
};

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function formatCompactDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SectionMessage({ text }: { text: string }) {
  return <p className="section-description">{text}</p>;
}

export function DashboardWorkbench({
  activeItem,
  busyTaskId,
  onJump,
  onApprove,
  onReject,
  snapshot,
  visibleModules,
  tasks,
  roleName,
  checklistItems,
  checklistHidden,
  checklistProgress,
  nextBestAction,
  onChecklistToggle,
  onChecklistDismiss,
  onStartTour,
  onOpenCommand,
  onOpenHelp,
}: {
  activeItem: string;
  busyTaskId: string | null;
  onJump: (item: string, moduleKey?: string) => void;
  onApprove: (taskId: string, comment?: string) => void;
  onReject: (taskId: string, comment?: string) => void;
  snapshot: PlatformSnapshot | null;
  visibleModules: ModuleSpec[];
  tasks: ApprovalTask[];
  roleName: string;
  checklistItems: ChecklistItem[];
  checklistHidden: boolean;
  checklistProgress: number;
  nextBestAction: GuidanceAction | null;
  onChecklistToggle: (key: string) => void;
  onChecklistDismiss: () => void;
  onStartTour: () => void;
  onOpenCommand: () => void;
  onOpenHelp: () => void;
}) {
  const canManageReferrals =
    roleName === "Manager" ||
    roleName === "HR Admin" ||
    roleName === "Payroll Admin" ||
    roleName === "Super Admin";
  const modules = visibleModules;
  const isApprovalsPrimaryRole = roleName === "Manager" || roleName === "HR Admin" || roleName === "Payroll Admin";
  const moduleKeys = new Set(modules.map((module) => module.key));
  const approvals = tasks.slice(0, 8);
  const pendingApprovals = tasks.filter((task) => task.status === "pending");
  const visibleApprovals = activeItem === "Pending Approvals" ? pendingApprovals : approvals;
  const approvalSummary = Array.from(
    pendingApprovals.reduce((map, task) => {
      const key = safeString(task.requestType, task.kind);
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
  const gmFacingApprovals = pendingApprovals.filter(
    (task) => task.ownerRole === "Manager" || safeString(task.pendingApprover) === "Manager"
  ).length;
  const announcements = snapshot?.featured.announcements ?? [];
  const featuredApprovals = snapshot?.featured.approvals ?? [];
  const featuredInsights = snapshot?.featured.insights ?? [];
  const [referralState, setReferralState] = useState<AsyncState<ReferralPayload>>({
    loading: false,
    error: "",
    data: null,
  });
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});
  const [showReferralPanel, setShowReferralPanel] = useState(false);
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralMessage, setReferralMessage] = useState("");
  const [referralForm, setReferralForm] = useState({
    companyName: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    notes: "",
    rewardType: "free_month",
    rewardValue: "",
  });
  const workspaceCards = [
    {
      group: "Operations",
      title: "Payroll",
      description: "Run 15th payroll, month-end payroll, payslips, deductions, reports, and Net-to-MPESA.",
      item: "Payroll Dashboard",
      moduleKey: "payroll",
      icon: "PY",
      badge: pendingApprovals.filter((task) => task.moduleKey === "payroll").length || undefined,
      status: "Live payroll controls",
    },
    {
      group: "Operations",
      title: "Run Payroll",
      description: "Open payroll periods, process live runs, and move 15th or month-end payroll forward quickly.",
      item: "Process Payroll",
      moduleKey: "payroll",
      icon: "15",
      status: "Payroll processing",
    },
    {
      group: "Operations",
      title: "Payroll Warnings",
      description: "Resolve validation issues, missing data warnings, and payroll blockers from one focused workspace.",
      item: "Payroll Validation Warnings",
      moduleKey: "payroll",
      icon: "WR",
      badge: pendingApprovals.filter((task) => task.moduleKey === "payroll").length || undefined,
      status: "Warnings and fixes",
    },
    {
      group: "Operations",
      title: "Pending Approvals",
      description: "Leave, payroll, salary reviews, promotions, performance, offboarding, and profile changes.",
      item: "Pending Approvals",
      moduleKey: "dashboard",
      icon: "AP",
      badge: pendingApprovals.length || undefined,
      status: pendingApprovals.length ? "Needs action" : "No pending work",
    },
    {
      group: "Operations",
      title: "Leave & Attendance",
      description: "Leave applications, off-days, balances, approvals, attendance, and overtime.",
      item: "Leave Dashboard",
      moduleKey: "leave",
      icon: "LV",
      status: "Availability planning",
    },
    {
      group: "Operations",
      title: "Shift Rosters",
      description: "Download templates, upload populated rosters, review team schedules, and watch shift coverage.",
      item: "Shift Scheduling",
      moduleKey: "leave",
      icon: "SR",
      status: "Coverage and scheduling",
    },
    {
      group: "People",
      title: "Staff Directory",
      description: "Open one powerful staff button for files, documents, salary, letters, lifecycle, and approvals.",
      item: "Staff Register",
      moduleKey: "people",
      icon: "PE",
      status: "Primary people control",
      badge: "Start here",
    },
    {
      group: "People",
      title: "Review Salary",
      description: "Open direct salary review, salary history, and payroll-effective changes without hunting through forms.",
      item: "Performance Reviews",
      moduleKey: "performance",
      icon: "SA",
      status: "Compensation actions",
    },
    {
      group: "People",
      title: "Performance",
      description: "KPIs, targets, appraisals, reviews, PIPs, promotions, talent matrix, and sales tracking.",
      item: "Performance Reviews",
      moduleKey: "performance",
      icon: "PF",
      status: "Goal and review cycle",
    },
    {
      group: "People",
      title: "Employee Relations",
      description: "Complaints, warnings, disciplinary records, show-cause actions, commendations, and offboarding cases.",
      item: "Disciplinary Records",
      moduleKey: "people",
      icon: "ER",
      status: "Case management",
    },
    {
      group: "People",
      title: "HR Letters",
      description: "Issue contracts, appointment letters, commendations, warnings, recommendations, and disciplinary letters.",
      item: "Staff Register",
      moduleKey: "people",
      icon: "DO",
      status: "Document issuing",
    },
    {
      group: "People",
      title: "Welfare & Benefits",
      description: "Loans, checkoff items, staff welfare, SACCO-style deductions, and benefit-linked payroll items.",
      item: "Loan & Checkoff Management",
      moduleKey: "payroll",
      icon: "WB",
      status: "Benefits and deductions",
    },
    {
      group: "Employee",
      title: "Employee Self Service",
      description: "My payslips, leave, attendance, performance, complaints, profile, and notifications.",
      item: "My Dashboard",
      moduleKey: "ess",
      icon: "ES",
      status: "Personal workspace",
    },
    {
      group: "Analytics",
      title: "Payroll Reports",
      description: "Open payroll register, wagebill, statutory exports, payslips, and MPESA outputs from one reporting hub.",
      item: "Payroll Reports",
      moduleKey: "reports",
      icon: "PR",
      status: "Payroll reporting",
    },
    {
      group: "Analytics",
      title: "Reports",
      description: "Payroll, statutory, leave, attendance, performance, executive dashboards, and export history.",
      item: "Executive Dashboard",
      moduleKey: "reports",
      icon: "RP",
      status: "Exports and dashboards",
    },
    {
      group: "Analytics",
      title: "Executive Dashboard",
      description: "Live operations health, approvals due today, payroll visibility, and workforce signals.",
      item: "Executive Dashboard",
      moduleKey: "reports",
      icon: "XD",
      status: "Leadership visibility",
    },
    {
      group: "Administration",
      title: "Settings / Admin",
      description: "Users, permissions, organization settings, security controls, and operational readiness.",
      item: "Admin Dashboard",
      moduleKey: "administration",
      icon: "AD",
      status: "Control plane",
    },
    {
      group: "Administration",
      title: "Solva AI",
      description: "Role-aware help for approvals, payroll warnings, performance notes, and next best actions.",
      item: "Overview",
      moduleKey: "dashboard",
      icon: "AI",
      helperAction: "help" as const,
      status: "Contextual guidance",
    },
  ].filter((card) => moduleKeys.has(card.moduleKey));

  const roleCardOrder: Record<string, string[]> = {
    "Supervisor": [
      "Employee Self Service",
      "Shift Rosters",
      "Leave & Attendance",
      "Performance",
      "Pending Approvals",
      "Staff Directory",
      "Employee Relations",
      "Reports",
      "Solva AI",
    ],
    "Payroll Admin": [
      "Staff Directory",
      "Payroll",
      "Pending Approvals",
      "Reports",
      "Welfare & Benefits",
      "Settings / Admin",
      "Solva AI",
    ],
    "Finance Officer": [
      "Payroll",
      "Pending Approvals",
      "Reports",
      "Welfare & Benefits",
      "Solva AI",
    ],
    "Manager": [
      "Staff Directory",
      "Review Salary",
      "Run Payroll",
      "Pending Approvals",
      "Leave & Attendance",
      "HR Letters",
      "Payroll Reports",
      "Payroll Warnings",
      "Performance",
      "Shift Rosters",
      "Employee Relations",
      "Reports",
      "Solva AI",
    ],
    "HR Admin": [
      "Staff Directory",
      "Leave & Attendance",
      "Performance",
      "Employee Relations",
      "Reports",
      "Settings / Admin",
      "Pending Approvals",
      "Solva AI",
    ],
    "Super Admin": [
      "Pending Approvals",
      "Reports",
      "Settings / Admin",
      "Staff Directory",
      "Payroll",
      "Performance",
      "Leave & Attendance",
      "Solva AI",
    ],
  };

  const visibleWorkspaceCards = (roleCardOrder[roleName] ?? workspaceCards.map((card) => card.title))
    .map((title) => workspaceCards.find((card) => card.title === title))
    .filter((card): card is (typeof workspaceCards)[number] => Boolean(card));

  const defaultQuickActions = useMemo(() => {
    const sharedActions = [
      {
        key: "command-search",
        icon: "CMD",
        label: "Command Search",
        detail: "Find employees, approvals, payroll periods, and reports from one launcher.",
        helperAction: "command" as const,
      },
      {
        key: "review-approvals",
        icon: "APR",
        label: "Review Approvals",
        detail: "Keep pending approvals moving from one central inbox.",
        item: "Pending Approvals",
        moduleKey: "dashboard",
      },
    ];

    if (roleName === "Employee") {
      return [
        {
          key: "download-payslip",
          icon: "PAY",
          label: "Download Payslip",
          detail: "Open the latest payroll document in one tap.",
          item: "My Payslips",
          moduleKey: "ess",
        },
        {
          key: "apply-leave",
          icon: "LVE",
          label: "Apply Leave",
          detail: "Start a leave request with balances and dates in view.",
          item: "My Leave",
          moduleKey: "ess",
        },
        {
          key: "view-shift",
          icon: "SFT",
          label: "View Shift",
          detail: "Check today's shift and the rest of the week quickly.",
          item: "My Attendance",
          moduleKey: "ess",
        },
        {
          key: "my-performance",
          icon: "PRF",
          label: "My Performance",
          detail: "Track targets, reviews, and comments from one place.",
          item: "My Performance",
          moduleKey: "ess",
        },
        ...sharedActions,
      ];
    }

    if (roleName === "Supervisor") {
      return [
        {
          key: "upload-roster",
          icon: "ROS",
          label: "Upload Roster",
          detail: "Refresh team shifts and ESS visibility in one action.",
          item: "Shift Scheduling",
          moduleKey: "leave",
        },
        {
          key: "approve-leave",
          icon: "LEV",
          label: "Approve Leave",
          detail: "Review team leave and off-day requests from one queue.",
          item: "Approvals Inbox",
          moduleKey: "leave",
        },
        {
          key: "issue-warning",
          icon: "WRN",
          label: "Issue Warning",
          detail: "Open staff cases and issue supervisor documents quickly.",
          item: "Disciplinary Records",
          moduleKey: "people",
        },
        {
          key: "review-team",
          icon: "TEM",
          label: "Review Team",
          detail: "Open the live staff register and act on team files.",
          item: "Staff Register",
          moduleKey: "people",
        },
        {
          key: "update-targets",
          icon: "KPI",
          label: "Update Targets",
          detail: "Move goals, KPIs, and reviews forward from the hub.",
          item: "Goals",
          moduleKey: "performance",
        },
        ...sharedActions,
      ];
    }

    if (roleName === "Payroll Admin") {
      return [
        {
          key: "review-salary",
          icon: "SAL",
          label: "Review Salary",
          detail: "Open direct salary review and salary history for payroll-effective changes.",
          item: "Performance Reviews",
          moduleKey: "performance",
        },
        {
          key: "run-15th",
          icon: "15",
          label: "Run 15th Payroll",
          detail: "Open the half-month payroll workflow with warnings grouped.",
          item: "Process Payroll",
          moduleKey: "payroll",
        },
        {
          key: "run-month-end",
          icon: "ME",
          label: "Run Month-End Payroll",
          detail: "Review the full-month payroll path and exports.",
          item: "Payroll Periods",
          moduleKey: "payroll",
        },
        {
          key: "undo-payroll",
          icon: "UNDO",
          label: "Undo Payroll",
          detail: "Reopen a completed or incorrect payroll run so new salaries and deductions can be picked up cleanly.",
          item: "Payroll Periods",
          moduleKey: "payroll",
        },
        {
          key: "generate-payslips",
          icon: "PS",
          label: "Generate Payslips",
          detail: "Release live payslips once payroll is processed.",
          item: "Payslips",
          moduleKey: "payroll",
        },
        {
          key: "export-mpesa",
          icon: "MP",
          label: "Export MPESA",
          detail: "Generate the live payment file using employee phone data.",
          item: "Net to Bank",
          moduleKey: "payroll",
        },
        {
          key: "refer-company",
          icon: "REF",
          label: "Refer Another Company",
          detail: "Capture a referral lead and keep reward tracking visible from the payroll desk.",
          helperAction: "referral" as const,
        },
        ...sharedActions,
      ];
    }

    if (roleName === "Manager") {
      return [
        {
          key: "staff-register",
          icon: "PPL",
          label: "Staff Directory",
          detail: "Open the full live Robot Cafe staff register and act on staff files quickly.",
          item: "Staff Register",
          moduleKey: "people",
        },
        {
          key: "review-salary",
          icon: "SAL",
          label: "Review Salary",
          detail: "Update gross pay directly and keep salary history visible from one workflow.",
          item: "Performance Reviews",
          moduleKey: "performance",
        },
        {
          key: "run-payroll",
          icon: "PAY",
          label: "Run Payroll",
          detail: "Jump directly into payroll processing, approval, and export controls.",
          item: "Process Payroll",
          moduleKey: "payroll",
        },
        {
          key: "undo-payroll",
          icon: "UNDO",
          label: "Undo Payroll",
          detail: "Reset a payroll run for corrections when salaries, deductions, or roster changes need to be pulled in again.",
          item: "Payroll Periods",
          moduleKey: "payroll",
        },
        {
          key: "approve-leave",
          icon: "LEV",
          label: "Approve Leave",
          detail: "Open live leave and off-day approvals without hunting through menus.",
          item: "Approvals Inbox",
          moduleKey: "leave",
        },
        {
          key: "issue-letter",
          icon: "DOC",
          label: "Issue Letter",
          detail: "Open staff files and issue commendations, warnings, contracts, and other letters quickly.",
          item: "Staff Register",
          moduleKey: "people",
        },
        {
          key: "payroll-reports",
          icon: "RPT",
          label: "Generate Reports",
          detail: "Open payroll reports, statutory exports, and executive visibility from one place.",
          item: "Payroll Reports",
          moduleKey: "reports",
        },
        {
          key: "refer-company",
          icon: "REF",
          label: "Refer Another Company",
          detail: "Capture a lead and keep referral rewards visible from the GM workspace.",
          helperAction: "referral" as const,
        },
        ...sharedActions,
      ];
    }

    if (roleName === "HR Admin") {
      return [
        {
          key: "review-salary",
          icon: "SAL",
          label: "Review Salary",
          detail: "Save direct salary changes and generate salary review records quickly.",
          item: "Performance Reviews",
          moduleKey: "performance",
        },
        {
          key: "add-employee",
          icon: "PPL",
          label: "Add Employee",
          detail: "Create staff records directly from the people workspace.",
          item: "Staff Register",
          moduleKey: "people",
        },
        {
          key: "open-payroll",
          icon: "PAY",
          label: "Run Payroll",
          detail: "Jump straight into payroll periods, processing, and exports.",
          item: "Payroll Periods",
          moduleKey: "payroll",
        },
        {
          key: "undo-payroll",
          icon: "UNDO",
          label: "Undo Payroll",
          detail: "Open payroll periods and reverse a run when the latest salary or deduction corrections need to be applied.",
          item: "Payroll Periods",
          moduleKey: "payroll",
        },
        {
          key: "issue-letter",
          icon: "DOC",
          label: "Issue Letter",
          detail: "Open staff letters, contracts, and salary review documents quickly.",
          item: "Staff Register",
          moduleKey: "people",
        },
        {
          key: "refer-company",
          icon: "REF",
          label: "Refer Another Company",
          detail: "Send a referral into the Solva HR pipeline without leaving your daily flow.",
          helperAction: "referral" as const,
        },
        ...sharedActions,
      ];
    }

    if (roleName === "Super Admin") {
      return [
        {
          key: "open-payroll-period",
          icon: "PAY",
          label: "Open Payroll Period",
          detail: "Start the next payroll cycle with one controlled workflow.",
          item: "Payroll Periods",
          moduleKey: "payroll",
        },
        {
          key: "add-employee",
          icon: "PPL",
          label: "Add Employee",
          detail: "Create or activate employee records without leaving the hub.",
          item: "Staff Register",
          moduleKey: "people",
        },
        {
          key: "launch-appraisal",
          icon: "PRF",
          label: "Launch Appraisal",
          detail: "Move performance reviews forward from one guided path.",
          item: "Performance Reviews",
          moduleKey: "performance",
        },
        {
          key: "open-reports",
          icon: "RPT",
          label: "Open Reports",
          detail: "Jump straight into live reporting and executive dashboards.",
          item: "Executive Dashboard",
          moduleKey: "reports",
        },
        {
          key: "refer-company",
          icon: "REF",
          label: "Refer Another Company",
          detail: "Track and reward live referrals from the organizations already using Solva HR.",
          helperAction: "referral" as const,
        },
        ...sharedActions,
      ];
    }

    return [
      {
        key: "open-payroll-period",
        icon: "PAY",
        label: "Open Payroll Period",
        detail: "Start the next payroll cycle with one controlled workflow.",
        item: "Payroll Periods",
        moduleKey: "payroll",
      },
      {
        key: "add-employee",
        icon: "PPL",
        label: "Add Employee",
        detail: "Create or activate employee records without leaving the hub.",
        item: "Staff Register",
        moduleKey: "people",
      },
      {
        key: "launch-appraisal",
        icon: "PRF",
        label: "Launch Appraisal",
        detail: "Move performance reviews forward from one guided path.",
        item: "Performance Reviews",
        moduleKey: "performance",
      },
      {
        key: "open-reports",
        icon: "RPT",
        label: "Open Reports",
        detail: "Jump straight into live reporting and executive dashboards.",
        item: "Executive Dashboard",
        moduleKey: "reports",
      },
      ...sharedActions,
    ];
  }, [roleName]);

  const quickActionStorageKey = `solva.quick-actions.${roleName.toLowerCase().replace(/\s+/g, "-")}`;
  const [quickActionOrder, setQuickActionOrder] = useState<string[]>([]);
  const [editQuickActions, setEditQuickActions] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedOrder = window.localStorage.getItem(quickActionStorageKey);
    const defaultOrder = defaultQuickActions.map((action) => action.key);

    if (!savedOrder) {
      setQuickActionOrder(defaultOrder);
      return;
    }

    try {
      const parsed = JSON.parse(savedOrder);
      if (!Array.isArray(parsed)) {
        setQuickActionOrder(defaultOrder);
        return;
      }

      const validKeys = parsed.filter((value): value is string =>
        typeof value === "string" && defaultOrder.includes(value)
      );
      const mergedOrder = [...validKeys, ...defaultOrder.filter((key) => !validKeys.includes(key))];
      setQuickActionOrder(mergedOrder);
    } catch {
      setQuickActionOrder(defaultOrder);
    }
  }, [defaultQuickActions, quickActionStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !quickActionOrder.length) {
      return;
    }

    window.localStorage.setItem(quickActionStorageKey, JSON.stringify(quickActionOrder));
  }, [quickActionOrder, quickActionStorageKey]);

  const quickActionMap = useMemo(
    () => new Map(defaultQuickActions.map((action) => [action.key, action])),
    [defaultQuickActions]
  );

  const quickActions = (quickActionOrder.length ? quickActionOrder : defaultQuickActions.map((action) => action.key))
    .flatMap((key) => {
      const action = quickActionMap.get(key);
      if (!action) {
        return [];
      }
      if ("moduleKey" in action && action.moduleKey && !moduleKeys.has(action.moduleKey)) {
        return [];
      }
      return [action];
    });

  const workspaceSections = ["Operations", "People", "Employee", "Analytics", "Administration"]
    .map((group) => ({
      group,
      cards: visibleWorkspaceCards.filter((card) => card.group === group),
    }))
    .filter((section) => section.cards.length > 0);

  const pulseMetrics = [
    {
      label: "Pending approvals",
      value: String(pendingApprovals.length),
      hint: "Live approvals across payroll, leave, and people workflows",
    },
    {
      label: "High priority items",
      value: String(pendingApprovals.filter((task) => safeString(task.priority).toLowerCase() === "high").length),
      hint: "Needs same-day attention",
    },
    {
      label: roleName === "Manager" ? "GM sign-offs" : "Approval types",
      value: String(roleName === "Manager" ? gmFacingApprovals : approvalSummary.length),
      hint: roleName === "Manager" ? "Waiting for manager action" : "Distinct categories in queue",
    },
    {
      label: "Live workspaces",
      value: String(visibleWorkspaceCards.length),
      hint: "Role-aware categories available right now",
    },
  ];

  useEffect(() => {
    if (!canManageReferrals) {
      return;
    }

    let cancelled = false;

    async function loadReferrals() {
      setReferralState((current) => ({ ...current, loading: true, error: "" }));
      try {
        const response = await fetch("/api/referrals", { cache: "no-store" });
        const payload = (await response.json()) as ReferralPayload & { error?: string };
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            if (!cancelled) {
              setReferralState({ loading: false, error: "", data: null });
            }
            return;
          }
          throw new Error(payload.error ?? `Request failed with ${response.status}`);
        }
        if (!cancelled) {
          setReferralState({ loading: false, error: "", data: payload });
        }
      } catch (error) {
        if (!cancelled) {
          setReferralState({
            loading: false,
            error: error instanceof Error ? error.message : "Could not load referrals.",
            data: null,
          });
        }
      }
    }

    void loadReferrals();
    return () => {
      cancelled = true;
    };
  }, [canManageReferrals]);

  async function handleReferralSubmit() {
    if (!referralForm.companyName.trim() || !referralForm.contactPerson.trim()) {
      setReferralMessage("Enter the company name and contact person first.");
      return;
    }

    setReferralBusy(true);
    setReferralMessage("");
    try {
      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(referralForm),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `Request failed with ${response.status}`);
      }

      const refreshedResponse = await fetch("/api/referrals", { cache: "no-store" });
      const refreshedPayload = (await refreshedResponse.json()) as ReferralPayload & { error?: string };
      if (!refreshedResponse.ok) {
        throw new Error(refreshedPayload.error ?? `Request failed with ${refreshedResponse.status}`);
      }

      setReferralState({ loading: false, error: "", data: refreshedPayload });
      setReferralForm({
        companyName: "",
        contactPerson: "",
        contactEmail: "",
        contactPhone: "",
        industry: "",
        notes: "",
        rewardType: "free_month",
        rewardValue: "",
      });
      setShowReferralPanel(true);
      setReferralMessage("Referral captured and added to the Solva HR pipeline.");
    } catch (error) {
      setReferralMessage(error instanceof Error ? error.message : "Could not save the referral.");
    } finally {
      setReferralBusy(false);
    }
  }

  function moveQuickAction(actionKey: string, direction: "left" | "right") {
    setQuickActionOrder((current) => {
      const next = current.length ? [...current] : defaultQuickActions.map((action) => action.key);
      const index = next.indexOf(actionKey);
      if (index === -1) {
        return next;
      }
      const swapIndex = direction === "left" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) {
        return next;
      }
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  const primaryAction =
    roleName === "Payroll Admin" || roleName === "Finance Officer"
      ? isApprovalsPrimaryRole
        ? { label: "Open All Pending Tasks & Approvals", item: "Pending Approvals", moduleKey: "dashboard" }
        : { label: "Open Payroll", item: "Payroll Dashboard", moduleKey: "payroll" }
      : roleName === "Manager" || roleName === "HR Admin" || roleName === "Payroll Admin"
        ? { label: "Open All Pending Tasks & Approvals", item: "Pending Approvals", moduleKey: "dashboard" }
      : roleName === "Supervisor"
        ? { label: "Open Pending Approvals", item: "Pending Approvals", moduleKey: "dashboard" }
          : { label: "Open Dashboard", item: "Overview", moduleKey: "dashboard" };

  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">{isApprovalsPrimaryRole ? "Pending work" : "Dashboard"}</p>
          <h3>
            {activeItem === "Overview"
              ? isApprovalsPrimaryRole
                ? "All Pending Tasks & Approvals"
                : "Dashboard"
              : activeItem}
          </h3>
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={() => onJump(primaryAction.item, primaryAction.moduleKey)} type="button">
            {primaryAction.label}
          </button>
        </div>
      </div>

      {activeItem === "Overview" && !checklistHidden ? (
        <section className="surface-card onboarding-checklist">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Getting Started</p>
              <h3>{roleName} launch checklist</h3>
            </div>
            <div className="inline-actions">
              <button className="ghost-button" onClick={onStartTour} type="button">
                Start tour
              </button>
              <button className="ghost-button" onClick={onOpenHelp} type="button">
                Need help?
              </button>
              <button className="ghost-button" onClick={onChecklistDismiss} type="button">
                Hide
              </button>
            </div>
          </div>
          <div className="checklist-progress">
            <div className="checklist-progress__bar">
              <span style={{ width: `${checklistProgress}%` }} />
            </div>
            <strong>{checklistProgress}% complete</strong>
          </div>
          {nextBestAction ? (
            <div className="next-best-action">
              <span>Next best action</span>
              <strong>{nextBestAction.label}</strong>
              <small>{nextBestAction.description}</small>
              <button
                className="primary-button"
                onClick={() =>
                  nextBestAction.moduleKey && nextBestAction.item
                    ? onJump(nextBestAction.item, nextBestAction.moduleKey)
                    : undefined
                }
                type="button"
              >
                Open now
              </button>
            </div>
          ) : null}
          <div className="checklist-list">
            {checklistItems.map((item) => (
              <article className={`checklist-item ${item.completed ? "is-complete" : ""}`} key={item.key}>
                <label className="checklist-item__copy">
                  <input checked={item.completed} onChange={() => onChecklistToggle(item.key)} type="checkbox" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </label>
                {item.moduleKey && item.item ? (
                  <button className="ghost-button" onClick={() => onJump(item.item!, item.moduleKey!)} type="button">
                    Open
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="workbench-grid">
        <section className="mini-panel">
          <div className="section-heading">
            <div>
              <h4>Quick actions</h4>
              <SectionMessage text="One-tap actions for the things this role does most often." />
            </div>
            <div className="inline-actions">
              <button className="ghost-button" onClick={() => setEditQuickActions((current) => !current)} type="button">
                {editQuickActions ? "Done" : "Edit actions"}
              </button>
            </div>
          </div>
          <div className="metric-grid compact-grid workspace-pulse-grid">
            {pulseMetrics.map((metric) => (
              <article className="metric-card workspace-pulse-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.hint}</small>
              </article>
            ))}
          </div>
          <div className="quick-actions-grid quick-actions-grid--scroll" data-tour="dashboard-quick-actions">
            {quickActions.map((action) => (
              <article className="quick-action-card quick-action-card--premium" key={action.key}>
                <button
                  className="quick-action-card__trigger"
                  onClick={() =>
                    "helperAction" in action && action.helperAction === "command"
                      ? onOpenCommand()
                      : "helperAction" in action && action.helperAction === "referral"
                        ? setShowReferralPanel(true)
                      : action.key === "launch-appraisal"
                        ? window.location.assign(workflowRoutes.appraisalCreate)
                      : action.item && action.moduleKey
                        ? onJump(action.item, action.moduleKey)
                        : undefined
                  }
                  type="button"
                >
                  <span className="quick-action-card__icon">{action.icon}</span>
                  <strong>{action.label}</strong>
                  <small>{action.detail}</small>
                </button>
                {editQuickActions ? (
                  <div className="quick-action-card__editor">
                    <button className="neutral-button" onClick={() => moveQuickAction(action.key, "left")} type="button">
                      Move left
                    </button>
                    <button className="neutral-button" onClick={() => moveQuickAction(action.key, "right")} type="button">
                      Move right
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        {canManageReferrals ? (
          <section className="mini-panel">
            <div className="section-heading">
              <div>
                <h4>Refer another company</h4>
                <SectionMessage text="Capture tenant referrals naturally from daily use, with reward visibility and a clean lead trail." />
              </div>
              <div className="inline-actions">
                <button
                  className="ghost-button"
                  onClick={() => setShowReferralPanel((current) => !current)}
                  type="button"
                >
                  {showReferralPanel ? "Hide form" : "Open form"}
                </button>
              </div>
            </div>
            <div className="metric-grid compact-grid">
              <article className="metric-card">
                <span>Total referrals</span>
                <strong>{referralState.data?.metrics.totalReferrals ?? 0}</strong>
                <small>Tenant referrals recorded so far</small>
              </article>
              <article className="metric-card">
                <span>New leads</span>
                <strong>{referralState.data?.metrics.newReferrals ?? 0}</strong>
                <small>Awaiting commercial follow-up</small>
              </article>
              <article className="metric-card">
                <span>Converted</span>
                <strong>{referralState.data?.metrics.convertedReferrals ?? 0}</strong>
                <small>Now active client opportunities</small>
              </article>
              <article className="metric-card">
                <span>Rewarded</span>
                <strong>{referralState.data?.metrics.rewardedReferrals ?? 0}</strong>
                <small>Rewards already honored</small>
              </article>
            </div>
            {showReferralPanel ? (
              <div className="workbench-grid">
                <section className="mini-panel">
                  <h4>Referral details</h4>
                  <div className="action-form">
                    <label>
                      <span>Company name</span>
                      <input
                        onChange={(event) =>
                          setReferralForm((current) => ({ ...current, companyName: event.target.value }))
                        }
                        placeholder="Bluewave Logistics Ltd"
                        value={referralForm.companyName}
                      />
                    </label>
                    <label>
                      <span>Contact person</span>
                      <input
                        onChange={(event) =>
                          setReferralForm((current) => ({ ...current, contactPerson: event.target.value }))
                        }
                        placeholder="Amina Kariuki"
                        value={referralForm.contactPerson}
                      />
                    </label>
                    <label>
                      <span>Phone / WhatsApp</span>
                      <input
                        onChange={(event) =>
                          setReferralForm((current) => ({ ...current, contactPhone: event.target.value }))
                        }
                        placeholder="+254 700 000000"
                        value={referralForm.contactPhone}
                      />
                    </label>
                    <label>
                      <span>Email</span>
                      <input
                        onChange={(event) =>
                          setReferralForm((current) => ({ ...current, contactEmail: event.target.value }))
                        }
                        placeholder="ops@bluewave.co.ke"
                        type="email"
                        value={referralForm.contactEmail}
                      />
                    </label>
                    <label>
                      <span>Industry</span>
                      <input
                        onChange={(event) =>
                          setReferralForm((current) => ({ ...current, industry: event.target.value }))
                        }
                        placeholder="Logistics"
                        value={referralForm.industry}
                      />
                    </label>
                    <label>
                      <span>Preferred reward</span>
                      <select
                        onChange={(event) =>
                          setReferralForm((current) => ({ ...current, rewardType: event.target.value }))
                        }
                        value={referralForm.rewardType}
                      >
                        <option value="free_month">Free month</option>
                        <option value="discounted_setup">Discounted setup</option>
                        <option value="premium_support">Premium support</option>
                        <option value="additional_users">Additional users</option>
                        <option value="referral_credits">Referral credits</option>
                      </select>
                    </label>
                    <label>
                      <span>Reward detail</span>
                      <input
                        onChange={(event) =>
                          setReferralForm((current) => ({ ...current, rewardValue: event.target.value }))
                        }
                        placeholder="1 free month after go-live"
                        value={referralForm.rewardValue}
                      />
                    </label>
                    <label>
                      <span>Notes</span>
                      <textarea
                        onChange={(event) =>
                          setReferralForm((current) => ({ ...current, notes: event.target.value }))
                        }
                        placeholder="Anything that helps the sales or onboarding team."
                        value={referralForm.notes}
                      />
                    </label>
                    <button
                      className="primary-button"
                      disabled={referralBusy}
                      onClick={() => void handleReferralSubmit()}
                      type="button"
                    >
                      {referralBusy ? "Saving..." : "Save referral"}
                    </button>
                  </div>
                </section>
                <section className="mini-panel">
                  <h4>Referral tracker</h4>
                  {referralState.loading ? <SectionMessage text="Loading referrals..." /> : null}
                  {referralState.error ? <SectionMessage text={referralState.error} /> : null}
                  {!referralState.loading && !referralState.error ? (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Company</th>
                            <th>Contact</th>
                            <th>Industry</th>
                            <th>Reward</th>
                            <th>Status</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(referralState.data?.referrals ?? []).length ? (
                            (referralState.data?.referrals ?? []).map((referral) => (
                              <tr key={referral.id}>
                                <td>{referral.companyName}</td>
                                <td>{`${referral.contactPerson}${referral.contactPhone ? ` | ${referral.contactPhone}` : ""}`}</td>
                                <td>{referral.industry || "-"}</td>
                                <td>{referral.rewardValue || referral.rewardType || "-"}</td>
                                <td>{referral.status}</td>
                                <td>{formatCompactDate(referral.createdAt)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6}>No referrals have been recorded yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </section>
              </div>
            ) : null}
            {referralMessage ? <div className="task-banner">{referralMessage}</div> : null}
          </section>
        ) : null}

        {!isApprovalsPrimaryRole ? (
          <section className="mini-panel">
            <h4>Work areas</h4>
            <SectionMessage
              text="Open one work area and stay inside that operational flow instead of hunting through long admin menus."
            />
            <div className="workspace-hub-sections">
              {workspaceSections.map((section) => (
                <section className="workspace-hub-section" key={section.group}>
                  <div className="workspace-hub-section__header">
                    <p className="section-eyebrow">{section.group}</p>
                  </div>
                  <div className="compact-shortcut-list workspace-hub-grid">
                    {section.cards.map((card) => (
                      <button
                        className={`compact-shortcut-item workspace-hub-card ${card.title === "Staff Directory" ? "workspace-hub-card--featured" : ""}`}
                        key={card.title}
                        onClick={() =>
                          card.helperAction === "help" ? onOpenHelp() : onJump(card.item, card.moduleKey)
                        }
                        type="button"
                      >
                        <span>{card.icon}</span>
                        <strong>{card.title}</strong>
                        <small>{card.description}</small>
                        <div className="workspace-hub-card__meta">
                          <span>{card.status}</span>
                          {card.badge ? <em>{card.badge}</em> : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mini-panel">
          <h4>Live summary</h4>
          <SectionMessage
            text={
              snapshot?.featured.summary ??
              "Your dashboard summary will appear here once the live snapshot loads."
            }
          />
          <div className="mini-list queue-list">
            {featuredApprovals.length ? (
              featuredApprovals.map((approval, index) => (
                <article key={`${approval.item}-${index}`}>
                  <strong>{approval.item}</strong>
                  <span>{approval.status}</span>
                  <small>{approval.owner} | {approval.due}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No featured alerts are available yet." />
            )}
          </div>
        </section>

        <section className="mini-panel">
          <h4>Insights feed</h4>
          <div className="mini-list queue-list">
            {featuredInsights.length ? (
              featuredInsights.map((insight, index) => (
                <article key={`${insight.title}-${index}`}>
                  <strong>{insight.title}</strong>
                  <span>{insight.detail}</span>
                  <small>{insight.tone ?? "default"} signal</small>
                </article>
              ))
            ) : (
              <SectionMessage text="Executive insights will appear here when live analytics are available for this role." />
            )}
          </div>
        </section>
      </div>

      {(activeItem === "Pending Approvals" || activeItem === "Overview") && (
        <section className="mini-panel">
          <h4>{roleName === "Manager" ? "GM approvals center" : "Pending approvals"}</h4>
          <div className="metric-grid compact-grid">
            <article className="metric-card">
              <span>Total pending</span>
              <strong>{pendingApprovals.length}</strong>
              <small>Items waiting in one queue</small>
            </article>
            <article className="metric-card">
              <span>High priority</span>
              <strong>{pendingApprovals.filter((task) => safeString(task.priority).toLowerCase() === "high").length}</strong>
              <small>Need same-day review</small>
            </article>
            <article className="metric-card">
              <span>GM actions</span>
              <strong>{gmFacingApprovals}</strong>
              <small>Manager sign-offs in scope</small>
            </article>
            <article className="metric-card">
              <span>Approval types</span>
              <strong>{approvalSummary.length}</strong>
              <small>Grouped request categories</small>
            </article>
          </div>
          {approvalSummary.length ? (
            <div className="filter-row">
              {approvalSummary.map(([label, count]) => (
                <span className="filter-pill" key={label}>
                  {label} ({count})
                </span>
              ))}
            </div>
          ) : null}
          <div className="mini-list queue-list">
            {visibleApprovals.length ? (
              visibleApprovals.map((task) => (
                <article key={task.id}>
                  <strong>{task.requestType}</strong>
                  <span>{task.employee} | {task.department}</span>
                  {task.kind === "staff_complaint" ? (
                    <small>
                      Raised by {task.employee || task.requestedBy} | {formatCompactDate(safeString(task.submittedDate))} | Priority {task.priority}
                    </small>
                  ) : (
                    <small>
                      Launched by {task.requestedBy} | {formatCompactDate(safeString(task.submittedDate))} | Priority {task.priority}
                    </small>
                  )}
                  <small>
                    Pending approver {task.pendingApprover} | {task.title}
                  </small>
                  {task.latestComment ? <small>{task.latestComment}</small> : null}
                  {task.status === "pending" && (task.ownerRole === roleName || roleName === "Super Admin") ? (
                    <div className="action-form compact-form">
                      <label>
                        <span>Optional reply</span>
                        <textarea
                          onChange={(event) =>
                            setApprovalComments((current) => ({
                              ...current,
                              [task.id]: event.target.value,
                            }))
                          }
                          placeholder="Comment and approve or comment and reject"
                          rows={2}
                          value={approvalComments[task.id] ?? ""}
                        />
                      </label>
                      <div className="inline-actions">
                      <button
                        className="primary-button"
                        disabled={busyTaskId === task.id}
                        onClick={() => onApprove(task.id, approvalComments[task.id] ?? "")}
                        type="button"
                      >
                        {busyTaskId === task.id ? "Working..." : "Approve"}
                      </button>
                      <button
                        className="ghost-button"
                        disabled={busyTaskId === task.id}
                        onClick={() => onReject(task.id, approvalComments[task.id] ?? "")}
                        type="button"
                      >
                        Reject
                      </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <SectionMessage text="No approval tasks are pending for this profile right now." />
            )}
          </div>
        </section>
      )}

      {(activeItem === "Notifications" || activeItem === "Announcements" || activeItem === "Overview") && (
        <section className="mini-panel">
          <h4>Announcements</h4>
          <div className="mini-list queue-list">
            {announcements.length ? (
              announcements.map((announcement, index) => (
                <article key={`${announcement.title}-${index}`}>
                  <strong>{announcement.title}</strong>
                  <span>{announcement.audience}</span>
                  <small>{announcement.time}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No announcements are published yet." />
            )}
          </div>
        </section>
      )}

      {(activeItem === "Tasks" || activeItem === "Reports Snapshot") && (
        <section className="mini-panel">
          <h4>{activeItem === "Tasks" ? "Action plan" : "Reports snapshot"}</h4>
          <div className="mini-list queue-list">
            {modules.slice(0, 5).map((module) => (
              <article key={module.key}>
                <strong>{module.title}</strong>
                <span>{safeString(module.quickActions[0], "Open workspace")}</span>
                <small>{module.tagline}</small>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
