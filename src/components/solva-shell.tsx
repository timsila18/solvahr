"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createAssetRequest,
  createEmployeeActivationRequest,
  createLeaveRequest,
  createPayrollApprovalRequest,
  createProfileUpdateRequest,
  createRequisitionApprovalRequest,
  createTrainingRequest,
  fetchApprovalTasks,
  fetchPage,
  fetchPlatformSnapshot,
  updateApprovalTask,
} from "@/lib/solva-api";
import {
  getPage,
  loginProfiles,
  modules,
  type ApprovalTask,
  type Metric,
  type ModuleSpec,
  type PageSpec,
  type PlatformSnapshot,
  type ThemeMode,
} from "@/lib/solva-data";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function SolvaLogo() {
  return (
    <div className="solva-logo" aria-hidden="true">
      <span className="solva-logo-mark">S</span>
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
        <TonePill tone="live">demo api</TonePill>
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
  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Data Table</p>
          <h3>{title}</h3>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" type="button">
            Filters
          </button>
          <button className="ghost-button" type="button">
            Export CSV
          </button>
          <button className="ghost-button" type="button">
            Bulk actions
          </button>
        </div>
      </div>
      <p className="section-description">{description}</p>
      <div className="table-toolbar">
        <label className="search-card">
          <span>Search</span>
          <input placeholder="Find by name, branch, code, or status" />
        </label>
        <div className="table-pagination">Page 1 of 6</div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input aria-label="Select all rows" type="checkbox" />
              </th>
              {columns.map((column) => (
                <th key={column.key} className={column.align === "right" ? "align-right" : undefined}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${index}-${row[columns[0].key] ?? "row"}`}>
                <td>
                  <input aria-label={`Select row ${index + 1}`} type="checkbox" />
                </td>
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
          <div className="hero-actions">
            {module.quickActions.slice(0, 4).map((action, index) => (
              <button className={index === 0 ? "primary-button" : "ghost-button"} key={action} type="button">
                {action}
              </button>
            ))}
          </div>
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
  selectedRole: (typeof loginProfiles)[number];
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
  selectedRole: (typeof loginProfiles)[number];
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
  const canPreparePayroll = ["Payroll Admin", "Super Admin"].includes(selectedRole.role);
  const canPrepareLeave = ["Employee", "Manager", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canPrepareRequisition = ["Manager", "Recruiter", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canPrepareTraining = ["Employee", "Manager", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canPrepareAsset = ["Employee", "Operator", "HR Admin", "Super Admin"].includes(selectedRole.role);
  const canPrepareProfile = ["Employee", "HR Admin", "Super Admin"].includes(selectedRole.role);

  return (
    <section className="surface-card action-workbench">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Workflow Demo</p>
          <h3>Interactive approvals</h3>
        </div>
        <TonePill tone="warning">role aware</TonePill>
      </div>
      <p className="section-description">
        Prepare requests from People and Payroll, then switch roles to approve them in the queue below.
      </p>

      {taskMessage ? <div className="task-banner">{taskMessage}</div> : null}

      <div className="workbench-grid">
        <section className="mini-panel">
          <h4>Approval Queue</h4>
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
          {moduleKey === "people" && activeItem === "Employee Directory" ? (
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
                Switch to Payroll Admin or Super Admin to create payroll approval requests.
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
              This demo workbench is now wired for People, Payroll, Leave, Recruitment, Training, Assets, and employee
              self-service requests. The same approval pattern can keep spreading across the platform.
            </p>
          ) : null}
        </section>
      </div>
    </section>
  );
}

export function SolvaShell() {
  const fallbackModules = modules;
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null);
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [dataMode, setDataMode] = useState<"loading" | "live" | "fallback">("loading");
  const [moduleKey, setModuleKey] = useState(fallbackModules[0]?.key ?? "dashboard");
  const [search, setSearch] = useState("");
  const [selectedRoleEmail, setSelectedRoleEmail] = useState(loginProfiles[0]?.email ?? "");
  const [activeItems, setActiveItems] = useState<Record<string, string>>(
    Object.fromEntries(fallbackModules.map((module) => [module.key, module.items[0] ?? ""]))
  );
  const [pageState, setPageState] = useState<PageSpec>(() =>
    getPage(fallbackModules[0], fallbackModules[0]?.items[0] ?? "")
  );
  const [pageStatus, setPageStatus] = useState<"loading" | "live" | "fallback">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState("");

  const refreshRuntime = async () => {
    try {
      const [platformPayload, taskPayload] = await Promise.all([
        fetchPlatformSnapshot(),
        fetchApprovalTasks(),
      ]);
      setSnapshot(platformPayload);
      setTasks(taskPayload.tasks);
      setDataMode("live");
    } catch {
      setSnapshot(null);
      setTasks([]);
      setDataMode("fallback");
    }
  };

  useEffect(() => {
    void refreshRuntime();
  }, []);

  const liveModules = snapshot?.modules ?? fallbackModules;

  const activeModule = useMemo(
    () => liveModules.find((module) => module.key === moduleKey) ?? liveModules[0],
    [liveModules, moduleKey]
  );

  const selectedRole =
    snapshot?.loginProfiles.find((profile) => profile.email === selectedRoleEmail) ??
    loginProfiles.find((profile) => profile.email === selectedRoleEmail) ??
    loginProfiles[0];

  const filteredModules = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return liveModules;
    }

    return liveModules.filter((module) =>
      `${module.title} ${module.summary} ${module.items.join(" ")}`.toLowerCase().includes(query)
    );
  }, [liveModules, search]);

  const activeItem = activeItems[activeModule.key] ?? activeModule.items[0] ?? "";

  useEffect(() => {
    if (!activeModule || !activeItem) {
      return;
    }

    let mounted = true;
    setPageStatus("loading");

    async function loadPage() {
      try {
        const payload = await fetchPage(activeModule.key, slugify(activeItem));
        if (!mounted) {
          return;
        }

        setPageState(payload);
        setPageStatus("live");
      } catch {
        if (!mounted) {
          return;
        }

        setPageState(getPage(activeModule, activeItem));
        setPageStatus("fallback");
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [activeItem, activeModule]);

  function openItem(item: string) {
    setActiveItems((current) => ({
      ...current,
      [activeModule.key]: item,
    }));
  }

  async function handleTaskAction(taskId: string, action: "approve" | "reject") {
    setBusyId(taskId);
    setTaskMessage("");

    try {
      await updateApprovalTask(taskId, {
        action,
        actorEmail: selectedRole.email,
        actorRole: selectedRole.role,
      });
      await refreshRuntime();
      setTaskMessage(`Task ${action}d successfully as ${selectedRole.role}.`);
    } catch {
      setTaskMessage(`That action is not available for ${selectedRole.role} right now.`);
    } finally {
      setBusyId(null);
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

  return (
    <main className={`solva-app theme-${theme}`}>
      <aside className="primary-sidebar">
        <div className="brand-card">
          <SolvaLogo />
          <div>
            <strong>Solva HR</strong>
            <span>Kenyan HR and Payroll Cloud Platform</span>
          </div>
        </div>

        <div className="tenant-card">
          <span className="tenant-label">Current Workspace</span>
          <strong>Solva Demo Manufacturing</strong>
          <small>Nairobi HQ | Multi-branch | Kenya payroll</small>
        </div>

        <nav className="primary-nav">
          {filteredModules.map((module) => (
            <button
              className={`nav-item ${module.key === activeModule.key ? "is-active" : ""}`}
              key={module.key}
              onClick={() => setModuleKey(module.key)}
              type="button"
            >
              <span className="nav-icon">{module.icon}</span>
              <span className="nav-copy">
                <strong>{module.title}</strong>
                <small>{module.shortTitle}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="section-eyebrow">Demo Logins</p>
          <div className="login-grid">
            {(snapshot?.loginProfiles ?? loginProfiles).map((profile) => (
              <button
                className={`login-card ${profile.email === selectedRole.email ? "is-active" : ""}`}
                key={profile.email}
                onClick={() => setSelectedRoleEmail(profile.email)}
                type="button"
              >
                <strong>{profile.role}</strong>
                <span>{profile.email}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Solva HR</span>
            <strong>{activeModule.title}</strong>
            <small>{activeItem}</small>
          </div>

          <div className="topbar-tools">
            <label className="search-card search-wide">
              <span>Search</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search modules, payroll features, reports, approvals..."
                value={search}
              />
            </label>
            <button className="icon-button" type="button">
              {tasks.filter((task) => task.status === "pending").length || 7}
            </button>
            <button
              className="icon-button"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
              type="button"
            >
              {theme === "light" ? "Dark" : "Light"}
            </button>
            <button className="profile-chip" type="button">
              <span>{selectedRole.role.slice(0, 2).toUpperCase()}</span>
              <strong>{selectedRole.role}</strong>
            </button>
          </div>
        </header>

        <div className="workspace-body">
          <aside className="module-sidebar">
            <div className="module-card">
              <p className="section-eyebrow">Module Menu</p>
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
            <HeroModule module={activeModule} onOpenItem={openItem} />

            <section className="workspace-section">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Active Workspace</p>
                  <h3>{pageState.title}</h3>
                </div>
                <div className="inline-actions">
                  {pageState.quickActions.slice(0, 4).map((action, index) => (
                    <button className={index === 0 ? "primary-button" : "ghost-button"} key={action} type="button">
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <p className="section-description">{pageState.description}</p>

              <div className="status-row">
                <TonePill tone={dataMode === "live" ? "positive" : dataMode === "loading" ? "warning" : "critical"}>
                  {dataMode === "live" ? "api connected" : dataMode === "loading" ? "loading" : "fallback data"}
                </TonePill>
                <TonePill tone={pageStatus === "live" ? "positive" : pageStatus === "loading" ? "warning" : "critical"}>
                  {pageStatus === "live" ? "workspace live" : pageStatus === "loading" ? "loading page" : "workspace fallback"}
                </TonePill>
                <span className="status-copy">
                  {snapshot?.generatedAt
                    ? `Last snapshot ${snapshot.generatedAt}`
                    : "Mock APIs are in place, with local fallback data if a route is unavailable."}
                </span>
              </div>

              <div className="filter-row">
                {pageState.filters.map((filter) => (
                  <button className="filter-pill" key={filter} type="button">
                    {filter}
                  </button>
                ))}
              </div>

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

              <DataTable
                columns={pageState.table.columns}
                description={pageState.table.description}
                rows={pageState.table.rows}
                title={pageState.table.title}
              />
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
