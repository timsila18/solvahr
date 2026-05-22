"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { APP_ROLES } from "@/lib/auth";
import { SaasWorkbench } from "@/components/saas-workbench";

type AsyncState<T> = {
  loading: boolean;
  error: string;
  data: T | null;
};

type Option = {
  id: string;
  label: string;
  code?: string;
  status?: string;
};

type ReferencePayload = {
  branches: Option[];
  departments: Option[];
  designations: Option[];
  jobGrades: Option[];
  payrollGroups: Option[];
  employees: Option[];
};

const MODULE_OPTIONS = [
  "dashboard",
  "people",
  "payroll",
  "leave",
  "recruitment",
  "performance",
  "training",
  "assets",
  "ess",
  "reports",
  "settings",
  "audit",
  "integrations",
  "consultancy",
  "administration",
];

const SCOPE_OPTIONS = ["global", "company-wide", "branch-specific", "department-specific", "team-only", "self-only"];

const LOOKUP_CONFIG: Record<
  string,
  {
    table: "branches" | "departments" | "designations" | "job_grades" | "payroll_groups";
    label: string;
    nameField: string;
    fields: Array<{ key: string; label: string; type?: "text" | "number" }>;
  }
> = {
  "Branch Management": {
    table: "branches",
    label: "Branch",
    nameField: "name",
    fields: [
      { key: "code", label: "Branch code" },
      { key: "name", label: "Branch name" },
      { key: "location", label: "Location" },
      { key: "contact_email", label: "Contact email" },
      { key: "contact_phone", label: "Contact phone" },
      { key: "status", label: "Status" },
    ],
  },
  "Department Management": {
    table: "departments",
    label: "Department",
    nameField: "name",
    fields: [
      { key: "code", label: "Department code" },
      { key: "name", label: "Department name" },
      { key: "status", label: "Status" },
    ],
  },
  Designations: {
    table: "designations",
    label: "Designation",
    nameField: "title",
    fields: [
      { key: "code", label: "Designation code" },
      { key: "title", label: "Designation title" },
      { key: "status", label: "Status" },
    ],
  },
  "Job Grades": {
    table: "job_grades",
    label: "Job grade",
    nameField: "name",
    fields: [
      { key: "code", label: "Grade code" },
      { key: "name", label: "Grade name" },
      { key: "level_rank", label: "Level rank", type: "number" },
      { key: "status", label: "Status" },
    ],
  },
  "Payroll Groups": {
    table: "payroll_groups",
    label: "Payroll group",
    nameField: "name",
    fields: [
      { key: "name", label: "Group name" },
      { key: "frequency", label: "Frequency" },
      { key: "currency", label: "Currency" },
      { key: "cut_off_day", label: "Cut-off day", type: "number" },
      { key: "pay_day", label: "Pay day", type: "number" },
      { key: "status", label: "Status" },
    ],
  },
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}`);
  }

  return payload;
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      )
    : [];
}

function formatDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function normaliseCompanyLogoFile(file: File) {
  if (file.type === "image/jpeg" || file.type === "image/jpg") {
    return file;
  }

  if (typeof window === "undefined") {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not read the logo file."));
      element.src = objectUrl;
    });

    const scale = Math.min(1, 720 / Math.max(image.width, image.height || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not prepare the logo for upload.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (!value) {
          reject(new Error("Could not convert the logo for reports."));
          return;
        }
        resolve(value);
      }, "image/jpeg", 0.92);
    });

    const stem = file.name.replace(/\.[^.]+$/, "") || "logo";
    return new File([blob], `${stem}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className="mini-panel">
      <h4>{title}</h4>
      <p className="section-description">{text}</p>
    </section>
  );
}

function SummaryList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
  emptyText: string;
}) {
  return (
    <section className="mini-panel">
      <h4>{title}</h4>
      <div className="mini-list queue-list">
        {items.length ? (
          items.map((item, index) => (
            <article key={`${title}-${index}`}>
              <strong>
                {safeString(item.title) ||
                  safeString(item.name) ||
                  safeString(item.email) ||
                  safeString(item.role) ||
                  safeString(item.module_key) ||
                  safeString(item.moduleKey) ||
                  safeString(item.import_type) ||
                  safeString(item.bucket) ||
                  "Record"}
              </strong>
              <span>
                {safeString(item.status) ||
                  safeString(item.action) ||
                  safeString(item.scope_type) ||
                  safeString(item.outcome) ||
                  safeString(item.detail) ||
                  safeString(item.role)}
              </span>
              <small>
                {safeString(item.updated_at) ||
                  safeString(item.created_at) ||
                  safeString(item.createdAt) ||
                  safeString(item.lastLogin) ||
                  safeString(item.timestamp) ||
                  "-"}
              </small>
            </article>
          ))
        ) : (
          <p className="section-description">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

export function AdminWorkbench({
  activeItem,
  onJump,
}: {
  activeItem: string;
  onJump: (item: string) => void;
}) {
  const [actionMessage, setActionMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [dashboardState, setDashboardState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [usersState, setUsersState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [userDetailState, setUserDetailState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [rolesState, setRolesState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [permissionsState, setPermissionsState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [companyState, setCompanyState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [workflowState, setWorkflowState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [notificationState, setNotificationState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [securityState, setSecurityState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [sessionState, setSessionState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [accessState, setAccessState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [auditState, setAuditState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [healthState, setHealthState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [supportState, setSupportState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [importsState, setImportsState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [referenceState, setReferenceState] = useState<AsyncState<ReferencePayload>>({ loading: false, error: "", data: null });
  const [lookupState, setLookupState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedLookupId, setSelectedLookupId] = useState("");

  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "Employee",
    employeeId: "",
    branchId: "",
    departmentId: "",
    inviteOnly: true,
  });
  const [roleForm, setRoleForm] = useState({
    roleKey: "",
    name: "",
    description: "",
    scopeType: "company-wide",
    assignable: false,
    cloneSource: "Employee",
    cloneName: "",
  });
  const [permissionForm, setPermissionForm] = useState({
    roleKey: "Employee",
    moduleKey: "ess",
    scopeType: "self-only",
    canView: true,
    canCreate: true,
    canEdit: true,
    canApprove: false,
    canExport: false,
    canDelete: false,
    canAdmin: false,
    status: "active",
  });
  const [companyForm, setCompanyForm] = useState({
    name: "",
    status: "active",
    primary_email: "",
    phone: "",
    physical_address: "",
    registration_number: "",
    tax_pin: "",
    default_currency: "KES",
    country: "Kenya",
    timezone: "Africa/Nairobi",
    display_name: "",
    employer_identifier: "",
    report_footer: "Generated by Solva HR - www.solvahr.co.ke",
    accent_color: "#1d4ed8",
    secondary_color: "#0f172a",
    company_short_name: "",
    welcome_message: "",
    email_signature: "",
    powered_by_label: "Powered by Solva HR",
    logo_url: "",
    logo_mark: "S",
  });
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [workflowForm, setWorkflowForm] = useState({
    moduleKey: "people",
    name: "Employee Changes Workflow",
    moduleScope: "company-wide",
    status: "active",
    approverRoles: "Supervisor,HR Admin",
    makerCheckerEnabled: true,
    finalApprovalRequired: true,
  });
  const [notificationForm, setNotificationForm] = useState({
    email_enabled: true,
    in_app_enabled: true,
    sms_enabled: false,
  });
  const [securityForm, setSecurityForm] = useState({
    session_timeout_minutes: 60,
    mfa_required: false,
    minLength: 8,
    requireUpper: true,
    requireNumber: true,
    requireSymbol: true,
  });
  const [lookupForm, setLookupForm] = useState<Record<string, string>>({});
  const [importForm, setImportForm] = useState({
    importType: "employees",
    fileName: "employees.csv",
    content: "employee_number,first_name,last_name,email,branch_code,department_code,status,salary",
  });

  const activeLookupConfig = LOOKUP_CONFIG[activeItem] ?? null;

  const adminStats = useMemo(() => {
    const stats = asRecord(dashboardState.data?.stats);
    if (!stats) {
      return [];
    }

    return [
      { label: "Total users", value: safeNumber(stats.totalUsers) },
      { label: "Active users", value: safeNumber(stats.activeUsers) },
      { label: "Pending invites", value: safeNumber(stats.pendingInvites) },
      { label: "Suspended users", value: safeNumber(stats.suspendedUsers) },
      { label: "Branches", value: safeNumber(stats.branches) },
      { label: "Departments", value: safeNumber(stats.departments) },
      { label: "Workflows", value: safeNumber(stats.workflows) },
    ];
  }, [dashboardState.data]);

  const roleRows = asRecordArray(rolesState.data);
  const permissionRows = asRecordArray(permissionsState.data?.matrix);
  const permissionRoles = asRecordArray(permissionsState.data?.roles);
  const lookupRows = asRecordArray(lookupState.data);
  const recentLogins = asRecordArray(dashboardState.data?.recentLogins);
  const recentImports = asRecordArray(dashboardState.data?.recentImports);

  const loadReferenceData = useCallback(async () => {
    setReferenceState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ reference: ReferencePayload }>("/api/admin/reference-data");
      setReferenceState({ loading: false, error: "", data: payload.reference });
    } catch (error) {
      setReferenceState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load admin reference data.",
        data: null,
      });
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ dashboard: Record<string, unknown> }>("/api/admin/dashboard");
      setDashboardState({ loading: false, error: "", data: payload.dashboard });
    } catch (error) {
      setDashboardState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load the admin dashboard.",
        data: null,
      });
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ users: Array<Record<string, unknown>> }>("/api/admin/users");
      setUsersState({ loading: false, error: "", data: payload.users });
      if (!selectedUserId && payload.users[0]?.id) {
        setSelectedUserId(String(payload.users[0].id));
      }
    } catch (error) {
      setUsersState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load users.",
        data: null,
      });
    }
  }, [selectedUserId]);

  const loadUserDetail = useCallback(async (userId: string) => {
    if (!userId) return;
    setUserDetailState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ user: Record<string, unknown> }>(`/api/admin/users/${userId}`);
      setUserDetailState({ loading: false, error: "", data: payload.user });
    } catch (error) {
      setUserDetailState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load the selected user.",
        data: null,
      });
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setRolesState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ roles: Array<Record<string, unknown>> }>("/api/admin/roles");
      setRolesState({ loading: false, error: "", data: payload.roles });
    } catch (error) {
      setRolesState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load role definitions.",
        data: null,
      });
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    setPermissionsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<Record<string, unknown>>("/api/admin/permissions");
      setPermissionsState({ loading: false, error: "", data: payload });
    } catch (error) {
      setPermissionsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load the permissions matrix.",
        data: null,
      });
    }
  }, []);

  const loadCompany = useCallback(async () => {
    setCompanyState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ company: Record<string, unknown> }>("/api/admin/company-settings");
      setCompanyState({ loading: false, error: "", data: payload.company });
    } catch (error) {
      setCompanyState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load company settings.",
        data: null,
      });
    }
  }, []);

  const loadWorkflows = useCallback(async () => {
    setWorkflowState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ workflows: Array<Record<string, unknown>> }>("/api/admin/approval-workflows");
      setWorkflowState({ loading: false, error: "", data: payload.workflows });
    } catch (error) {
      setWorkflowState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load workflow settings.",
        data: null,
      });
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ settings: Record<string, unknown> }>("/api/admin/notification-settings");
      setNotificationState({ loading: false, error: "", data: payload.settings });
    } catch (error) {
      setNotificationState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load notification settings.",
        data: null,
      });
    }
  }, []);

  const loadSecurity = useCallback(async () => {
    setSecurityState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ settings: Record<string, unknown> }>("/api/admin/security-settings");
      setSecurityState({ loading: false, error: "", data: payload.settings });
    } catch (error) {
      setSecurityState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load security settings.",
        data: null,
      });
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ sessions: Array<Record<string, unknown>> }>("/api/admin/login-sessions");
      setSessionState({ loading: false, error: "", data: payload.sessions });
    } catch (error) {
      setSessionState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load login sessions.",
        data: null,
      });
    }
  }, []);

  const loadAccess = useCallback(async () => {
    setAccessState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ logs: Array<Record<string, unknown>> }>("/api/admin/access-logs");
      setAccessState({ loading: false, error: "", data: payload.logs });
    } catch (error) {
      setAccessState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load access logs.",
        data: null,
      });
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ audits: Array<Record<string, unknown>> }>("/api/admin/audit-oversight");
      setAuditState({ loading: false, error: "", data: payload.audits });
    } catch (error) {
      setAuditState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load audit oversight logs.",
        data: null,
      });
    }
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ health: Record<string, unknown> }>("/api/admin/system-health");
      setHealthState({ loading: false, error: "", data: payload.health });
    } catch (error) {
      setHealthState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load system health.",
        data: null,
      });
    }
  }, []);

  const loadSupport = useCallback(async () => {
    setSupportState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ support: Record<string, unknown> }>("/api/admin/support-console");
      setSupportState({ loading: false, error: "", data: payload.support });
    } catch (error) {
      setSupportState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load support tooling.",
        data: null,
      });
    }
  }, []);

  const loadImports = useCallback(async () => {
    setImportsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ jobs: Array<Record<string, unknown>> }>("/api/admin/imports");
      setImportsState({ loading: false, error: "", data: payload.jobs });
    } catch (error) {
      setImportsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load import jobs.",
        data: null,
      });
    }
  }, []);

  const loadLookup = useCallback(async () => {
    if (!activeLookupConfig) return;
    setLookupState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ records: Array<Record<string, unknown>> }>(`/api/lookups/${activeLookupConfig.table}`);
      setLookupState({ loading: false, error: "", data: payload.records });
      if (!selectedLookupId && payload.records[0]?.id) {
        setSelectedLookupId(String(payload.records[0].id));
      }
    } catch (error) {
      setLookupState({
        loading: false,
        error: error instanceof Error ? error.message : `Could not load ${activeLookupConfig.label.toLowerCase()} records.`,
        data: null,
      });
    }
  }, [activeLookupConfig, selectedLookupId]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (selectedUserId) {
      void loadUserDetail(selectedUserId);
    }
  }, [loadUserDetail, selectedUserId]);

  useEffect(() => {
    if (activeItem === "Admin Dashboard") {
      void loadDashboard();
    } else if (activeItem === "User Management") {
      void loadUsers();
    } else if (activeItem === "Role Management") {
      void loadRoles();
    } else if (activeItem === "Permissions Matrix") {
      void loadPermissions();
    } else if (activeItem === "Company Settings") {
      void loadCompany();
    } else if (activeItem === "Approval Workflow Settings") {
      void loadWorkflows();
    } else if (activeItem === "Notification Settings") {
      void loadNotifications();
    } else if (activeItem === "Security Settings") {
      void loadSecurity();
    } else if (activeItem === "Login Sessions") {
      void loadSessions();
    } else if (activeItem === "Access Logs") {
      void loadAccess();
    } else if (activeItem === "Audit Oversight") {
      void loadAudit();
    } else if (activeItem === "System Health") {
      void loadHealth();
    } else if (activeItem === "Support & Recovery") {
      void loadSupport();
    } else if (activeItem === "Data Imports") {
      void loadImports();
    } else if (activeLookupConfig) {
      void loadLookup();
    }
  }, [
    activeItem,
    activeLookupConfig,
    loadAccess,
    loadAudit,
    loadCompany,
    loadDashboard,
    loadHealth,
    loadImports,
    loadLookup,
    loadNotifications,
    loadPermissions,
    loadRoles,
    loadSecurity,
    loadSessions,
    loadSupport,
    loadUsers,
    loadWorkflows,
  ]);

  useEffect(() => {
    const company = companyState.data;
    const settings = asRecord(company?.settings);
    const branding = asRecord(settings?.branding);
    if (!company || !settings) return;

    setCompanyForm({
      name: safeString(company.name),
      status: safeString(company.status, "active"),
      primary_email: safeString(settings.primary_email),
      phone: safeString(settings.phone),
      physical_address: safeString(settings.physical_address),
      registration_number: safeString(settings.registration_number),
      tax_pin: safeString(settings.tax_pin),
      default_currency: safeString(settings.default_currency, "KES"),
      country: safeString(settings.country, "Kenya"),
      timezone: safeString(settings.timezone, "Africa/Nairobi"),
      display_name: safeString(branding?.displayName, safeString(company.name)),
      employer_identifier: safeString(branding?.employerIdentifier),
      report_footer: safeString(branding?.reportFooter, "Generated by Solva HR - www.solvahr.co.ke"),
      accent_color: safeString(branding?.accentColor, "#1d4ed8"),
      secondary_color: safeString(branding?.secondaryColor, "#0f172a"),
      company_short_name: safeString(branding?.companyShortName, safeString(branding?.displayName, safeString(company.name))),
      welcome_message: safeString(branding?.welcomeMessage),
      email_signature: safeString(branding?.emailSignature),
      powered_by_label: safeString(branding?.poweredByLabel, "Powered by Solva HR"),
      logo_url: safeString(branding?.logoUrl),
      logo_mark: safeString(branding?.logoMark, "S"),
    });
  }, [companyState.data]);

  useEffect(() => {
    const settings = notificationState.data;
    if (!settings) return;
    setNotificationForm({
      email_enabled: Boolean(settings.email_enabled),
      in_app_enabled: Boolean(settings.in_app_enabled),
      sms_enabled: Boolean(settings.sms_enabled),
    });
  }, [notificationState.data]);

  useEffect(() => {
    const settings = securityState.data;
    if (!settings) return;
    const passwordPolicy = asRecord(settings.password_policy);
    setSecurityForm({
      session_timeout_minutes: safeNumber(settings.session_timeout_minutes, 60),
      mfa_required: Boolean(settings.mfa_required),
      minLength: safeNumber(passwordPolicy?.minLength, 8),
      requireUpper: Boolean(passwordPolicy?.requireUpper),
      requireNumber: Boolean(passwordPolicy?.requireNumber),
      requireSymbol: Boolean(passwordPolicy?.requireSymbol),
    });
  }, [securityState.data]);

  useEffect(() => {
    if (!activeLookupConfig) return;
    const seed: Record<string, string> = {};
    for (const field of activeLookupConfig.fields) {
      seed[field.key] = field.key === "status" ? "active" : "";
    }
    setLookupForm(seed);
    setSelectedLookupId("");
  }, [activeLookupConfig]);

  function updateUserForm(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    setUserForm((current) => ({
      ...current,
      [name]: type === "checkbox" && "checked" in event.target ? event.target.checked : value,
    }));
  }

  function updateRoleForm(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    setRoleForm((current) => ({
      ...current,
      [name]: type === "checkbox" && "checked" in event.target ? event.target.checked : value,
    }));
  }

  function updatePermissionForm(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    setPermissionForm((current) => ({
      ...current,
      [name]: type === "checkbox" && "checked" in event.target ? event.target.checked : value,
    }));
  }

  function updateCompanyForm(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setCompanyForm((current) => ({ ...current, [name]: value }));
  }

  function updateCompanyLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setCompanyLogoFile(file);
  }

  function updateWorkflowForm(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    setWorkflowForm((current) => ({
      ...current,
      [name]: type === "checkbox" && "checked" in event.target ? event.target.checked : value,
    }));
  }

  function updateNotificationForm(event: ChangeEvent<HTMLInputElement>) {
    const { name, checked } = event.target;
    setNotificationForm((current) => ({ ...current, [name]: checked }));
  }

  function updateSecurityForm(event: ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = event.target;
    setSecurityForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? event.target.checked : Number.isNaN(Number(value)) ? value : Number(value),
    }));
  }

  function updateLookupForm(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setLookupForm((current) => ({ ...current, [name]: value }));
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("save-user");
    setActionMessage("");
    try {
      await readJson("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      setActionMessage(userForm.inviteOnly ? "User invite sent and recorded." : "User created successfully.");
      setUserForm({
        fullName: "",
        email: "",
        phone: "",
        role: "Employee",
        employeeId: "",
        branchId: "",
        departmentId: "",
        inviteOnly: true,
      });
      await loadUsers();
      await loadDashboard();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save the user.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleUserAction(action: string) {
    if (!selectedUserId) return;
    setBusyAction(action);
    setActionMessage("");
    try {
      await readJson(`/api/admin/users/${selectedUserId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setActionMessage(`${action.replace(/_/g, " ")} completed.`);
      await Promise.all([loadUsers(), loadUserDetail(selectedUserId), loadSessions(), loadAccess(), loadDashboard()]);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not complete that user action.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRoleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("save-role");
    setActionMessage("");
    try {
      await readJson("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleForm),
      });
      setActionMessage("Role definition saved.");
      setRoleForm({
        roleKey: "",
        name: "",
        description: "",
        scopeType: "company-wide",
        assignable: false,
        cloneSource: "Employee",
        cloneName: "",
      });
      await Promise.all([loadRoles(), loadPermissions()]);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not create the role.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCloneRole() {
    setBusyAction("clone-role");
    setActionMessage("");
    try {
      await readJson("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "clone",
          roleKey: roleForm.cloneSource,
          cloneName: roleForm.cloneName || `${roleForm.cloneSource} Copy`,
        }),
      });
      setActionMessage("Role template cloned.");
      await Promise.all([loadRoles(), loadPermissions()]);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not clone the role.");
    } finally {
      setBusyAction("");
    }
  }

  async function handlePermissionSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("save-permission");
    setActionMessage("");
    try {
      await readJson("/api/admin/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permissionForm),
      });
      setActionMessage("Permissions updated.");
      await loadPermissions();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update permissions.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCompanySave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("save-company");
    setActionMessage("");
    try {
      await readJson("/api/admin/company-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyForm.name,
          status: companyForm.status,
          primary_email: companyForm.primary_email,
          phone: companyForm.phone,
          physical_address: companyForm.physical_address,
          registration_number: companyForm.registration_number,
          tax_pin: companyForm.tax_pin,
          default_currency: companyForm.default_currency,
          country: companyForm.country,
          timezone: companyForm.timezone,
          branding: {
            displayName: companyForm.display_name,
            employerIdentifier: companyForm.employer_identifier,
            reportFooter: companyForm.report_footer,
            accentColor: companyForm.accent_color,
            secondaryColor: companyForm.secondary_color,
            companyShortName: companyForm.company_short_name,
            welcomeMessage: companyForm.welcome_message,
            emailSignature: companyForm.email_signature,
            poweredByLabel: companyForm.powered_by_label,
            logoUrl: companyForm.logo_url,
            logoMark: companyForm.logo_mark,
          },
        }),
      });
      setActionMessage("Company settings saved.");
      await loadCompany();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save company settings.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCompanyLogoUpload() {
    if (!companyLogoFile) {
      setActionMessage("Choose a logo file first.");
      return;
    }

    setBusyAction("upload-company-logo");
    setActionMessage("");

    try {
      const preparedFile = await normaliseCompanyLogoFile(companyLogoFile);
      const formData = new FormData();
      formData.append("file", preparedFile);

      const response = await fetch("/api/admin/company-branding/logo", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        result?: { branding?: Record<string, unknown> };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not upload logo.");
      }

      const branding = asRecord(payload.result?.branding);
      setCompanyForm((current) => ({
        ...current,
        logo_url: safeString(branding?.logoUrl, current.logo_url),
        logo_mark: safeString(branding?.logoMark, current.logo_mark),
      }));
      setCompanyLogoFile(null);
      setActionMessage("Organization logo uploaded.");
      await loadCompany();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not upload the organization logo.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCompanyLogoRemove() {
    setBusyAction("remove-company-logo");
    setActionMessage("");

    try {
      await readJson("/api/admin/company-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branding: {
            logoPath: "",
            logoUrl: "",
            logoMark: companyForm.logo_mark,
          },
        }),
      });
      setCompanyLogoFile(null);
      setActionMessage("Organization logo removed.");
      await loadCompany();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not remove the organization logo.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleWorkflowSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("save-workflow");
    setActionMessage("");
    try {
      await readJson("/api/admin/approval-workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleKey: workflowForm.moduleKey,
          name: workflowForm.name,
          moduleScope: workflowForm.moduleScope,
          status: workflowForm.status,
          makerCheckerEnabled: workflowForm.makerCheckerEnabled,
          finalApprovalRequired: workflowForm.finalApprovalRequired,
          steps: workflowForm.approverRoles
            .split(",")
            .map((role, index) => ({ step: index + 1, approverRole: role.trim() }))
            .filter((step) => step.approverRole.length > 0),
        }),
      });
      setActionMessage("Approval workflow saved.");
      await loadWorkflows();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save the workflow.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleNotificationSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("save-notifications");
    setActionMessage("");
    try {
      await readJson("/api/admin/notification-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationForm),
      });
      setActionMessage("Notification settings saved.");
      await loadNotifications();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save notification settings.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleSecuritySave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("save-security");
    setActionMessage("");
    try {
      await readJson("/api/admin/security-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_timeout_minutes: securityForm.session_timeout_minutes,
          mfa_required: securityForm.mfa_required,
          password_policy: {
            minLength: securityForm.minLength,
            requireUpper: securityForm.requireUpper,
            requireNumber: securityForm.requireNumber,
            requireSymbol: securityForm.requireSymbol,
          },
        }),
      });
      setActionMessage("Security settings saved.");
      await loadSecurity();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save security settings.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleLookupSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeLookupConfig) return;

    setBusyAction("save-lookup");
    setActionMessage("");
    try {
      const payload = Object.fromEntries(
        activeLookupConfig.fields.map((field) => [
          field.key,
          field.type === "number" ? Number(lookupForm[field.key] || 0) : lookupForm[field.key] || null,
        ])
      );

      if (selectedLookupId) {
        await readJson(`/api/lookups/${activeLookupConfig.table}/${selectedLookupId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setActionMessage(`${activeLookupConfig.label} updated.`);
      } else {
        await readJson(`/api/lookups/${activeLookupConfig.table}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setActionMessage(`${activeLookupConfig.label} created.`);
      }

      await loadLookup();
      await loadReferenceData();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : `Could not save the ${activeLookupConfig.label.toLowerCase()}.`);
    } finally {
      setBusyAction("");
    }
  }

  async function handleLookupDeactivate() {
    if (!activeLookupConfig || !selectedLookupId) return;
    setBusyAction("deactivate-lookup");
    setActionMessage("");
    try {
      await readJson(`/api/lookups/${activeLookupConfig.table}/${selectedLookupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      });
      setActionMessage(`${activeLookupConfig.label} status updated.`);
      await Promise.all([loadLookup(), loadReferenceData()]);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : `Could not update ${activeLookupConfig.label.toLowerCase()} status.`);
    } finally {
      setBusyAction("");
    }
  }

  async function handleImport(previewOnly: boolean) {
    setBusyAction(previewOnly ? "preview-import" : "run-import");
    setActionMessage("");
    try {
      await readJson("/api/admin/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...importForm,
          previewOnly,
        }),
      });
      setActionMessage(previewOnly ? "Import preview completed." : "Import submitted successfully.");
      await loadImports();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not process the import.");
    } finally {
      setBusyAction("");
    }
  }

  function hydrateLookupForm(record: Record<string, unknown>) {
    if (!activeLookupConfig) return;
    const next = Object.fromEntries(
      activeLookupConfig.fields.map((field) => [field.key, safeString(record[field.key])])
    );
    setLookupForm(next);
    setSelectedLookupId(safeString(record.id));
  }

  function renderLookupPage() {
    if (!activeLookupConfig) return null;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Organization Setup</p>
            <h3>{activeItem}</h3>
          </div>
          <button className="ghost-button" onClick={() => {
            const seed: Record<string, string> = {};
            for (const field of activeLookupConfig.fields) {
              seed[field.key] = field.key === "status" ? "active" : "";
            }
            setLookupForm(seed);
            setSelectedLookupId("");
          }} type="button">
            New {activeLookupConfig.label}
          </button>
        </div>

        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>{activeLookupConfig.label} register</h4>
            <div className="mini-list queue-list">
              {lookupRows.length ? (
                lookupRows.map((row, index) => (
                  <button
                    className="detail-card-button"
                    key={`${safeString(row.id)}-${index}`}
                    onClick={() => hydrateLookupForm(row)}
                    type="button"
                  >
                    <strong>{safeString(row[activeLookupConfig.nameField], activeLookupConfig.label)}</strong>
                    <span>{safeString(row.code)}</span>
                    <small>{safeString(row.status, "active")}</small>
                  </button>
                ))
              ) : (
                <p className="section-description">No {activeLookupConfig.label.toLowerCase()} records yet.</p>
              )}
            </div>
          </section>

          <section className="mini-panel">
            <h4>{selectedLookupId ? `Edit ${activeLookupConfig.label}` : `Create ${activeLookupConfig.label}`}</h4>
            <form className="action-form" onSubmit={handleLookupSave}>
              {activeLookupConfig.fields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    name={field.key}
                    onChange={updateLookupForm}
                    type={field.type === "number" ? "number" : "text"}
                    value={lookupForm[field.key] ?? ""}
                  />
                </label>
              ))}
              <div className="form-actions-row">
                <button className="primary-button" disabled={busyAction === "save-lookup"} type="submit">
                  {busyAction === "save-lookup" ? "Saving..." : selectedLookupId ? "Update record" : "Create record"}
                </button>
                {selectedLookupId ? (
                  <button className="ghost-button" disabled={busyAction === "deactivate-lookup"} onClick={handleLookupDeactivate} type="button">
                    {busyAction === "deactivate-lookup" ? "Updating..." : "Deactivate"}
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </div>
      </section>
    );
  }

  if (activeItem === "Admin Dashboard") {
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Administration</p>
            <h3>Admin Dashboard</h3>
          </div>
          <div className="inline-actions">
            <button className="primary-button" onClick={() => onJump("User Management")} type="button">
              Invite user
            </button>
            <button className="ghost-button" onClick={() => onJump("Role Management")} type="button">
              Review roles
            </button>
          </div>
        </div>
        {dashboardState.loading ? <p className="section-description">Loading admin overview...</p> : null}
        {dashboardState.error ? <p className="section-description">{dashboardState.error}</p> : null}
        {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
        <div className="metric-grid compact-grid">
          {adminStats.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>Live admin summary</small>
            </article>
          ))}
        </div>
        <div className="workbench-grid">
          <SummaryList title="Recent logins" items={recentLogins} emptyText="No recent login activity yet." />
          <SummaryList title="Recent import jobs" items={recentImports} emptyText="No import jobs have been recorded yet." />
        </div>
      </section>
    );
  }

  if (activeItem === "User Management") {
    const detail = userDetailState.data;
    const linkedEmployee = asRecord(detail?.linkedEmployee);
    const loginHistory = asRecordArray(detail?.loginHistory);
    const recentAudit = asRecordArray(detail?.recentAudit);
    const recentApprovals = asRecordArray(detail?.recentApprovals);

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Administration</p>
            <h3>User Management</h3>
          </div>
        </div>
        {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Users</h4>
            <div className="mini-list queue-list">
              {usersState.loading ? <p className="section-description">Loading users...</p> : null}
              {usersState.error ? <p className="section-description">{usersState.error}</p> : null}
              {asRecordArray(usersState.data).map((user, index) => (
                <button
                  className="detail-card-button"
                  key={`${safeString(user.id)}-${index}`}
                  onClick={() => setSelectedUserId(safeString(user.id))}
                  type="button"
                >
                  <strong>{safeString(user.fullName)}</strong>
                  <span>{safeString(user.role)} | {safeString(user.status)}</span>
                  <small>{safeString(user.email)}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="mini-panel">
            <h4>User detail</h4>
            {userDetailState.loading ? <p className="section-description">Loading user detail...</p> : null}
            {userDetailState.error ? <p className="section-description">{userDetailState.error}</p> : null}
            {detail ? (
              <div className="profile-detail-stack">
                <div className="detail-section-grid">
                  <section className="detail-section-card">
                    <h5>Profile summary</h5>
                    <div className="detail-kv-list">
                      <article><span>Name</span><strong>{safeString(detail.fullName)}</strong></article>
                      <article><span>Email</span><strong>{safeString(detail.email)}</strong></article>
                      <article><span>Role</span><strong>{safeString(detail.role)}</strong></article>
                      <article><span>Status</span><strong>{safeString(detail.status)}</strong></article>
                      <article><span>Linked employee</span><strong>{linkedEmployee ? safeString(linkedEmployee.label) : "Standalone user"}</strong></article>
                      <article><span>Last login</span><strong>{safeString(detail.lastLogin)}</strong></article>
                    </div>
                  </section>
                  <section className="detail-section-card">
                    <h5>Lifecycle actions</h5>
                    <div className="inline-actions">
                      {["activate", "suspend", "deactivate", "reactivate", "resend_invite", "reset_password", "force_sign_out"].map((action) => (
                        <button
                          className="ghost-button"
                          disabled={busyAction === action}
                          key={action}
                          onClick={() => void handleUserAction(action)}
                          type="button"
                        >
                          {busyAction === action ? "Working..." : action.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="detail-section-grid">
                  <SummaryList title="Login history" items={loginHistory} emptyText="No login events for this user yet." />
                  <SummaryList title="Recent audit activity" items={recentAudit} emptyText="No audit activity for this user yet." />
                </div>
                <SummaryList title="Recent approvals" items={recentApprovals} emptyText="No recent approvals linked to this user." />
              </div>
            ) : (
              <p className="section-description">Select a user to inspect role, sessions, and recent activity.</p>
            )}
          </section>

          <section className="mini-panel">
            <h4>Create or invite user</h4>
            <form className="action-form" onSubmit={handleUserSubmit}>
              <label><span>Full name</span><input name="fullName" onChange={updateUserForm} value={userForm.fullName} /></label>
              <label><span>Email</span><input name="email" onChange={updateUserForm} value={userForm.email} /></label>
              <label><span>Phone</span><input name="phone" onChange={updateUserForm} value={userForm.phone} /></label>
              <label>
                <span>Role</span>
                <select name="role" onChange={updateUserForm} value={userForm.role}>
                  {APP_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
              <label>
                <span>Linked employee</span>
                <select name="employeeId" onChange={updateUserForm} value={userForm.employeeId}>
                  <option value="">Standalone user</option>
                  {(referenceState.data?.employees ?? []).map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Branch scope</span>
                <select name="branchId" onChange={updateUserForm} value={userForm.branchId}>
                  <option value="">No branch restriction</option>
                  {(referenceState.data?.branches ?? []).map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Department scope</span>
                <select name="departmentId" onChange={updateUserForm} value={userForm.departmentId}>
                  <option value="">No department restriction</option>
                  {(referenceState.data?.departments ?? []).map((department) => (
                    <option key={department.id} value={department.id}>{department.label}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox-row">
                <input checked={userForm.inviteOnly} name="inviteOnly" onChange={updateUserForm} type="checkbox" />
                <span>Invite only instead of creating an immediate password account</span>
              </label>
              <button className="primary-button" disabled={busyAction === "save-user"} type="submit">
                {busyAction === "save-user" ? "Saving..." : userForm.inviteOnly ? "Send invite" : "Create user"}
              </button>
            </form>
          </section>
        </div>
      </section>
    );
  }

  if (activeItem === "Role Management") {
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Administration</p>
            <h3>Role Management</h3>
          </div>
        </div>
        {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Roles</h4>
            <div className="mini-list queue-list">
              {rolesState.loading ? <p className="section-description">Loading roles...</p> : null}
              {rolesState.error ? <p className="section-description">{rolesState.error}</p> : null}
              {roleRows.map((role, index) => (
                <article key={`${safeString(role.id)}-${index}`}>
                  <strong>{safeString(role.name)}</strong>
                  <span>{safeString(role.scopeType)} | {safeString(role.status)}</span>
                  <small>{safeNumber(role.userCount)} assigned users</small>
                </article>
              ))}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Create custom role</h4>
            <form className="action-form" onSubmit={handleRoleCreate}>
              <label><span>Role key</span><input name="roleKey" onChange={updateRoleForm} value={roleForm.roleKey} /></label>
              <label><span>Role name</span><input name="name" onChange={updateRoleForm} value={roleForm.name} /></label>
              <label><span>Description</span><input name="description" onChange={updateRoleForm} value={roleForm.description} /></label>
              <label>
                <span>Scope type</span>
                <select name="scopeType" onChange={updateRoleForm} value={roleForm.scopeType}>
                  {SCOPE_OPTIONS.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
                </select>
              </label>
              <label className="checkbox-row">
                <input checked={roleForm.assignable} name="assignable" onChange={updateRoleForm} type="checkbox" />
                <span>Assignable to real users when compatible with the core app role model</span>
              </label>
              <button className="primary-button" disabled={busyAction === "save-role"} type="submit">
                {busyAction === "save-role" ? "Saving..." : "Create role"}
              </button>
            </form>
          </section>
          <section className="mini-panel">
            <h4>Clone existing role</h4>
            <div className="action-form">
              <label>
                <span>Source role</span>
                <select name="cloneSource" onChange={updateRoleForm} value={roleForm.cloneSource}>
                  {APP_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
              <label><span>Clone name</span><input name="cloneName" onChange={updateRoleForm} value={roleForm.cloneName} /></label>
              <button className="ghost-button" disabled={busyAction === "clone-role"} onClick={() => void handleCloneRole()} type="button">
                {busyAction === "clone-role" ? "Cloning..." : "Clone role template"}
              </button>
            </div>
          </section>
        </div>
      </section>
    );
  }

  if (activeItem === "Permissions Matrix") {
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Governance</p>
            <h3>Permissions Matrix</h3>
          </div>
        </div>
        {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Current matrix</h4>
            <div className="mini-list queue-list">
              {permissionsState.loading ? <p className="section-description">Loading permissions...</p> : null}
              {permissionsState.error ? <p className="section-description">{permissionsState.error}</p> : null}
              {permissionRows.slice(0, 24).map((permission, index) => (
                <button
                  className="detail-card-button"
                  key={`${safeString(permission.id)}-${index}`}
                  onClick={() =>
                    setPermissionForm({
                      roleKey: safeString(permission.role_key),
                      moduleKey: safeString(permission.module_key),
                      scopeType: safeString(permission.scope_type, "company-wide"),
                      canView: Boolean(permission.can_view),
                      canCreate: Boolean(permission.can_create),
                      canEdit: Boolean(permission.can_edit),
                      canApprove: Boolean(permission.can_approve),
                      canExport: Boolean(permission.can_export),
                      canDelete: Boolean(permission.can_delete),
                      canAdmin: Boolean(permission.can_admin),
                      status: safeString(permission.status, "active"),
                    })
                  }
                  type="button"
                >
                  <strong>{safeString(permission.role_key)} - {safeString(permission.module_key)}</strong>
                  <span>{safeString(permission.scope_type)} | {safeString(permission.status, "active")}</span>
                  <small>View {Boolean(permission.can_view) ? "Y" : "N"} | Edit {Boolean(permission.can_edit) ? "Y" : "N"} | Approve {Boolean(permission.can_approve) ? "Y" : "N"}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Update permission</h4>
            <form className="action-form" onSubmit={handlePermissionSave}>
              <label>
                <span>Role</span>
                <select name="roleKey" onChange={updatePermissionForm} value={permissionForm.roleKey}>
                  {permissionRoles.map((role, index) => (
                    <option key={`${safeString(role.role_key)}-${index}`} value={safeString(role.role_key)}>
                      {safeString(role.name, safeString(role.role_key))}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Module</span>
                <select name="moduleKey" onChange={updatePermissionForm} value={permissionForm.moduleKey}>
                  {MODULE_OPTIONS.map((moduleKey) => <option key={moduleKey} value={moduleKey}>{moduleKey}</option>)}
                </select>
              </label>
              <label>
                <span>Scope</span>
                <select name="scopeType" onChange={updatePermissionForm} value={permissionForm.scopeType}>
                  {SCOPE_OPTIONS.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
                </select>
              </label>
              {[
                ["canView", "View"],
                ["canCreate", "Create"],
                ["canEdit", "Edit"],
                ["canApprove", "Approve"],
                ["canExport", "Export"],
                ["canDelete", "Delete"],
                ["canAdmin", "Admin settings"],
              ].map(([key, label]) => (
                <label className="checkbox-row" key={key}>
                  <input checked={Boolean(permissionForm[key as keyof typeof permissionForm])} name={key} onChange={updatePermissionForm} type="checkbox" />
                  <span>{label}</span>
                </label>
              ))}
              <button className="primary-button" disabled={busyAction === "save-permission"} type="submit">
                {busyAction === "save-permission" ? "Saving..." : "Save permissions"}
              </button>
            </form>
          </section>
        </div>
      </section>
    );
  }

  if (activeItem === "Company Settings") {
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Company Administration</p>
            <h3>Company Settings</h3>
          </div>
        </div>
        {companyState.loading ? <p className="section-description">Loading company settings...</p> : null}
        {companyState.error ? <p className="section-description">{companyState.error}</p> : null}
        {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
        <form className="action-form" onSubmit={handleCompanySave}>
          <div className="detail-section-grid">
            <label><span>Company name</span><input name="name" onChange={updateCompanyForm} value={companyForm.name} /></label>
            <label><span>Status</span><input name="status" onChange={updateCompanyForm} value={companyForm.status} /></label>
            <label><span>Primary email</span><input name="primary_email" onChange={updateCompanyForm} value={companyForm.primary_email} /></label>
            <label><span>Phone</span><input name="phone" onChange={updateCompanyForm} value={companyForm.phone} /></label>
            <label><span>Physical address</span><textarea name="physical_address" onChange={updateCompanyForm} value={companyForm.physical_address} /></label>
            <label><span>Registration number</span><input name="registration_number" onChange={updateCompanyForm} value={companyForm.registration_number} /></label>
            <label><span>Tax PIN</span><input name="tax_pin" onChange={updateCompanyForm} value={companyForm.tax_pin} /></label>
            <label><span>Default currency</span><input name="default_currency" onChange={updateCompanyForm} value={companyForm.default_currency} /></label>
            <label><span>Country</span><input name="country" onChange={updateCompanyForm} value={companyForm.country} /></label>
            <label><span>Timezone</span><input name="timezone" onChange={updateCompanyForm} value={companyForm.timezone} /></label>
            <label><span>Display name on reports</span><input name="display_name" onChange={updateCompanyForm} value={companyForm.display_name} /></label>
            <label><span>Company short name</span><input name="company_short_name" onChange={updateCompanyForm} value={companyForm.company_short_name} /></label>
            <label><span>Employer identifier</span><input name="employer_identifier" onChange={updateCompanyForm} value={companyForm.employer_identifier} /></label>
            <label><span>Report footer</span><input name="report_footer" onChange={updateCompanyForm} value={companyForm.report_footer} /></label>
            <label><span>Brand accent color</span><input name="accent_color" onChange={updateCompanyForm} value={companyForm.accent_color} /></label>
            <label><span>Secondary brand color</span><input name="secondary_color" onChange={updateCompanyForm} value={companyForm.secondary_color} /></label>
            <label><span>Welcome message</span><textarea name="welcome_message" onChange={updateCompanyForm} value={companyForm.welcome_message} /></label>
            <label><span>Email signature branding</span><textarea name="email_signature" onChange={updateCompanyForm} value={companyForm.email_signature} /></label>
            <label><span>Powered-by label</span><input name="powered_by_label" onChange={updateCompanyForm} value={companyForm.powered_by_label} /></label>
          </div>
          <section className="mini-panel">
            <h4>Organization branding</h4>
            <p className="section-description">
              Upload the employer logo and control the organization identity shown in the app shell and payroll reports.
            </p>
            <div className="detail-section-grid">
              <div className="branding-preview-card">
                {companyForm.logo_url ? (
                  <img alt={`${companyForm.display_name || companyForm.name} logo`} className="branding-preview-image" src={companyForm.logo_url} />
                ) : (
                  <div className="branding-preview-fallback">{companyForm.logo_mark || "S"}</div>
                )}
                <div className="branding-preview-copy">
                  <strong>{companyForm.display_name || companyForm.name || "Organization"}</strong>
                  <span>{companyForm.employer_identifier || "Employer identifier pending"}</span>
                </div>
              </div>
              <label>
                <span>Upload logo</span>
                <input accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={updateCompanyLogo} type="file" />
              </label>
            </div>
            <button
              className="secondary-button"
              disabled={busyAction === "upload-company-logo"}
              onClick={handleCompanyLogoUpload}
              type="button"
            >
              {busyAction === "upload-company-logo" ? "Uploading..." : "Upload logo"}
            </button>
            <button
              className="ghost-button"
              disabled={busyAction === "remove-company-logo" || !companyForm.logo_url}
              onClick={handleCompanyLogoRemove}
              type="button"
            >
              {busyAction === "remove-company-logo" ? "Removing..." : "Remove logo"}
            </button>
          </section>
          <div className="form-actions-row">
            <button className="primary-button" disabled={busyAction === "save-company"} type="submit">
              {busyAction === "save-company" ? "Saving..." : "Save company settings"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (activeItem === "Approval Workflow Settings") {
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Workflow Governance</p>
            <h3>Approval Workflow Settings</h3>
          </div>
        </div>
        {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
        <div className="workbench-grid">
          <SummaryList title="Saved workflows" items={asRecordArray(workflowState.data)} emptyText="No approval workflows configured yet." />
          <section className="mini-panel">
            <h4>Create or update workflow</h4>
            <form className="action-form" onSubmit={handleWorkflowSave}>
              <label><span>Name</span><input name="name" onChange={updateWorkflowForm} value={workflowForm.name} /></label>
              <label>
                <span>Module</span>
                <select name="moduleKey" onChange={updateWorkflowForm} value={workflowForm.moduleKey}>
                  {MODULE_OPTIONS.map((moduleKey) => <option key={moduleKey} value={moduleKey}>{moduleKey}</option>)}
                </select>
              </label>
              <label>
                <span>Scope</span>
                <select name="moduleScope" onChange={updateWorkflowForm} value={workflowForm.moduleScope}>
                  {SCOPE_OPTIONS.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
                </select>
              </label>
              <label><span>Approver roles (comma separated)</span><input name="approverRoles" onChange={updateWorkflowForm} value={workflowForm.approverRoles} /></label>
              <label className="checkbox-row">
                <input checked={workflowForm.makerCheckerEnabled} name="makerCheckerEnabled" onChange={updateWorkflowForm} type="checkbox" />
                <span>Enable maker-checker rule</span>
              </label>
              <label className="checkbox-row">
                <input checked={workflowForm.finalApprovalRequired} name="finalApprovalRequired" onChange={updateWorkflowForm} type="checkbox" />
                <span>Require final approval</span>
              </label>
              <button className="primary-button" disabled={busyAction === "save-workflow"} type="submit">
                {busyAction === "save-workflow" ? "Saving..." : "Save workflow"}
              </button>
            </form>
          </section>
        </div>
      </section>
    );
  }

  if (activeItem === "Notification Settings") {
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Communication Controls</p>
            <h3>Notification Settings</h3>
          </div>
        </div>
        {notificationState.loading ? <p className="section-description">Loading notification settings...</p> : null}
        {notificationState.error ? <p className="section-description">{notificationState.error}</p> : null}
        {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
        <form className="action-form" onSubmit={handleNotificationSave}>
          <label className="checkbox-row"><input checked={notificationForm.email_enabled} name="email_enabled" onChange={updateNotificationForm} type="checkbox" /><span>Email notifications</span></label>
          <label className="checkbox-row"><input checked={notificationForm.in_app_enabled} name="in_app_enabled" onChange={updateNotificationForm} type="checkbox" /><span>In-app notifications</span></label>
          <label className="checkbox-row"><input checked={notificationForm.sms_enabled} name="sms_enabled" onChange={updateNotificationForm} type="checkbox" /><span>SMS placeholder toggle</span></label>
          <button className="primary-button" disabled={busyAction === "save-notifications"} type="submit">
            {busyAction === "save-notifications" ? "Saving..." : "Save notification settings"}
          </button>
        </form>
      </section>
    );
  }

  if (activeItem === "Security Settings") {
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Security Controls</p>
            <h3>Security Settings</h3>
          </div>
        </div>
        {securityState.loading ? <p className="section-description">Loading security settings...</p> : null}
        {securityState.error ? <p className="section-description">{securityState.error}</p> : null}
        {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
        <form className="action-form" onSubmit={handleSecuritySave}>
          <label><span>Session timeout (minutes)</span><input min={15} name="session_timeout_minutes" onChange={updateSecurityForm} type="number" value={securityForm.session_timeout_minutes} /></label>
          <label><span>Minimum password length</span><input min={8} name="minLength" onChange={updateSecurityForm} type="number" value={securityForm.minLength} /></label>
          <label className="checkbox-row"><input checked={securityForm.mfa_required} name="mfa_required" onChange={updateSecurityForm} type="checkbox" /><span>MFA required placeholder</span></label>
          <label className="checkbox-row"><input checked={securityForm.requireUpper} name="requireUpper" onChange={updateSecurityForm} type="checkbox" /><span>Require uppercase letters</span></label>
          <label className="checkbox-row"><input checked={securityForm.requireNumber} name="requireNumber" onChange={updateSecurityForm} type="checkbox" /><span>Require numbers</span></label>
          <label className="checkbox-row"><input checked={securityForm.requireSymbol} name="requireSymbol" onChange={updateSecurityForm} type="checkbox" /><span>Require symbols</span></label>
          <button className="primary-button" disabled={busyAction === "save-security"} type="submit">
            {busyAction === "save-security" ? "Saving..." : "Save security settings"}
          </button>
        </form>
      </section>
    );
  }

  if (activeItem === "Login Sessions") {
    return <SummaryList title="Login sessions" items={asRecordArray(sessionState.data)} emptyText="No login sessions recorded yet." />;
  }

  if (activeItem === "Access Logs") {
    return <SummaryList title="Access logs" items={asRecordArray(accessState.data)} emptyText="No access logs recorded yet." />;
  }

  if (activeItem === "Audit Oversight") {
    return <SummaryList title="Audit oversight" items={asRecordArray(auditState.data)} emptyText="No audit events recorded yet." />;
  }

  if (activeItem === "System Health") {
    const auth = asRecord(healthState.data?.auth);
    const database = asRecord(healthState.data?.database);
    const storage = asRecordArray(healthState.data?.storage);
    const build = asRecord(healthState.data?.build);
    const summaryCards = asRecordArray(healthState.data?.summaryCards);
    const operations = asRecord(healthState.data?.operations);
    const dataQuality = asRecord(healthState.data?.dataQuality);
    const compliance = asRecord(healthState.data?.compliance);
    const supportReadiness = asRecord(healthState.data?.supportReadiness);
    const environmentSeparation = asRecord(healthState.data?.environmentSeparation);
    const placeholders = Array.isArray(healthState.data?.placeholders) ? healthState.data?.placeholders : [];

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Operational Visibility</p>
            <h3>System Health</h3>
          </div>
        </div>
        {summaryCards.length ? (
          <section className="mini-panel">
            <h4>Production summary</h4>
            <div className="metrics-grid">
              {summaryCards.map((card, index) => (
                <article className="metric-card" key={`${safeString(card.label)}-${index}`}>
                  <span>{safeString(card.label)}</span>
                  <strong>{safeString(card.value, String(card.value ?? "-"))}</strong>
                  <small>{safeString(card.hint)}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Core services</h4>
            <div className="detail-kv-list">
              <article><span>Auth</span><strong>{safeString(auth?.status)} - {safeString(auth?.detail)}</strong></article>
              <article><span>Database</span><strong>{safeString(database?.status)} - {safeString(database?.detail)}</strong></article>
              <article><span>Build</span><strong>{safeString(build?.environment)} - {safeString(build?.appVersion)}</strong></article>
              <article><span>Runtime</span><strong>{safeString(build?.runtime, "local-node")}</strong></article>
            </div>
          </section>
          <SummaryList title="Storage buckets" items={storage} emptyText="No storage checks yet." />
          <section className="mini-panel">
            <h4>Operations watchlist</h4>
            <div className="detail-kv-list">
              <article><span>Pending approvals</span><strong>{safeNumber(operations?.pendingApprovals)}</strong></article>
              <article><span>Report exports</span><strong>{safeNumber(operations?.reportExports)}</strong></article>
              <article><span>Failed payroll exports</span><strong>{safeNumber(operations?.failedPayrollExports)}</strong></article>
            </div>
          </section>
          <SummaryList title="Recent failures" items={asRecordArray(operations?.recentFailures)} emptyText="No recent failures were captured in the current scope." />
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Data quality</h4>
            <div className="detail-kv-list">
              <article><span>Missing KRA PIN</span><strong>{safeNumber(dataQuality?.missingKraPins)}</strong></article>
              <article><span>Missing SHIF number</span><strong>{safeNumber(dataQuality?.missingShifNumbers)}</strong></article>
              <article><span>Missing NSSF number</span><strong>{safeNumber(dataQuality?.missingNssfNumbers)}</strong></article>
              <article><span>Missing bank details</span><strong>{safeNumber(dataQuality?.missingBankDetails)}</strong></article>
            </div>
          </section>
          <SummaryList title="Support readiness" items={Array.isArray(supportReadiness?.supportActions) ? (supportReadiness?.supportActions as unknown[]).map((action) => ({ title: String(action) })) : []} emptyText="Support actions will appear here." />
          <SummaryList title="Environment separation" items={Object.entries(environmentSeparation ?? {}).map(([title, detail]) => ({ title, detail }))} emptyText="Environment guidance unavailable." />
        </div>
        <SummaryList title="Compliance retention" items={Array.isArray(compliance?.retentionPolicies) ? (compliance?.retentionPolicies as unknown[]).map((item) => ({ title: String(item) })) : []} emptyText="Retention policies not configured yet." />
        <EmptyState title="Next platform ops pass" text={placeholders.join(" | ") || "Extended health checks are still being expanded."} />
      </section>
    );
  }

  if (activeItem === "Data Imports") {
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Bulk Administration</p>
            <h3>Data Imports</h3>
          </div>
        </div>
        {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Import tool</h4>
            <div className="action-form">
              <label>
                <span>Import type</span>
                <select value={importForm.importType} onChange={(event) => setImportForm((current) => ({ ...current, importType: event.target.value }))}>
                  <option value="employees">Employees</option>
                  <option value="branches">Branches</option>
                  <option value="departments">Departments</option>
                  <option value="designations">Designations</option>
                  <option value="job_grades">Job grades</option>
                  <option value="payroll_groups">Payroll groups</option>
                </select>
              </label>
              <label><span>File name</span><input value={importForm.fileName} onChange={(event) => setImportForm((current) => ({ ...current, fileName: event.target.value }))} /></label>
              <label><span>CSV content</span><textarea value={importForm.content} onChange={(event) => setImportForm((current) => ({ ...current, content: event.target.value }))} /></label>
              <div className="form-actions-row">
                <button className="ghost-button" disabled={busyAction === "preview-import"} onClick={() => void handleImport(true)} type="button">
                  {busyAction === "preview-import" ? "Previewing..." : "Preview import"}
                </button>
                <button className="primary-button" disabled={busyAction === "run-import"} onClick={() => void handleImport(false)} type="button">
                  {busyAction === "run-import" ? "Running..." : "Run import"}
                </button>
              </div>
            </div>
          </section>
          <SummaryList title="Recent import jobs" items={asRecordArray(importsState.data)} emptyText="No import jobs recorded yet." />
        </div>
      </section>
    );
  }

  if (activeItem === "Support & Recovery") {
    const cards = asRecordArray(supportState.data?.cards);
    const failedExports = asRecordArray(supportState.data?.failedExports);
    const riskyAccounts = asRecordArray(supportState.data?.riskyAccounts);
    const activeSessions = asRecordArray(supportState.data?.activeSessions);
    const dataQuality = asRecordArray(supportState.data?.dataQuality);
    const recentAudit = asRecordArray(supportState.data?.recentAudit);
    const recommendedActions = Array.isArray(supportState.data?.recommendedActions)
      ? (supportState.data?.recommendedActions as unknown[]).map((item) => ({ title: String(item) }))
      : [];
    const safeguards = Array.isArray(supportState.data?.safeguards)
      ? (supportState.data?.safeguards as unknown[]).map((item) => ({ title: String(item) }))
      : [];

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Platform Support</p>
            <h3>Support & Recovery</h3>
          </div>
        </div>
        {supportState.loading ? <p className="section-description">Loading support console...</p> : null}
        {supportState.error ? <p className="section-description">{supportState.error}</p> : null}
        {cards.length ? (
          <section className="mini-panel">
            <h4>Tenant support summary</h4>
            <div className="metrics-grid">
              {cards.map((card, index) => (
                <article className="metric-card" key={`${safeString(card.label)}-${index}`}>
                  <span>{safeString(card.label)}</span>
                  <strong>{safeString(card.value, String(card.value ?? "-"))}</strong>
                  <small>{safeString(card.hint)}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <div className="workbench-grid">
          <SummaryList title="Failed exports" items={failedExports} emptyText="No failed payroll exports are queued for support review." />
          <SummaryList title="Risky accounts" items={riskyAccounts} emptyText="No suspicious or repeatedly failing accounts were found." />
          <SummaryList title="Active sessions" items={activeSessions} emptyText="No active sessions are visible right now." />
          <SummaryList title="Data quality gaps" items={dataQuality} emptyText="No compliance gaps are currently reported." />
          <SummaryList title="Recent audit" items={recentAudit} emptyText="Recent audit events will appear here." />
          <SummaryList title="Recommended actions" items={recommendedActions} emptyText="No support recommendations yet." />
        </div>
        <SummaryList title="Safeguards" items={safeguards} emptyText="Safeguards summary is unavailable." />
      </section>
    );
  }

  if (
    activeItem === "Billing & Subscription" ||
    activeItem === "Company Onboarding" ||
    activeItem === "SaaS HQ"
  ) {
    return <SaasWorkbench activeItem={activeItem} onJump={onJump} />;
  }

  if (activeLookupConfig) {
    return renderLookupPage();
  }

  return (
    <EmptyState
      title={activeItem}
      text="This administration screen is being kept honest: either it becomes fully wired or it stays clearly marked while we finish the rest of the control layer."
    />
  );
}
