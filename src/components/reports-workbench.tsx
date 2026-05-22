"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type AsyncState<T> = {
  loading: boolean;
  error: string;
  data: T | null;
};

type BuilderPreview = {
  fields: string[];
  preview: Array<Record<string, unknown>>;
  totalRows: number;
};

type ActionScheduleFilter = {
  actorName: string;
  actorTitle: string;
  actorDepartment: string;
};

const CATEGORY_MAP: Record<string, string> = {
  "Executive Dashboard": "executive-dashboard",
  "Operations Health Center": "operations-health",
  "HR Reports": "hr",
  "Payroll Reports": "payroll",
  "Leave Reports": "leave",
  "Attendance Reports": "attendance",
  "Recruitment Reports": "recruitment",
  "Performance Reports": "performance",
  "Training Reports": "training",
  "Asset Reports": "assets",
  "Compliance Reports": "compliance",
  "Branch Reports": "branch",
  "Department Reports": "department",
  "Consultancy Reports": "consultancy",
};

const EXPORT_MAP: Record<
  string,
  { category: string; reportName: string; reportKey: string }
> = {
  "Executive Dashboard": {
    category: "Executive Dashboard",
    reportName: "Executive Dashboard",
    reportKey: "executive_dashboard",
  },
  "Operations Health Center": {
    category: "Executive Dashboard",
    reportName: "Operations Health Center",
    reportKey: "operations_health_center",
  },
  "HR Reports": {
    category: "HR Reports",
    reportName: "Employee Master List",
    reportKey: "employee_master_list",
  },
  "Payroll Reports": {
    category: "Payroll Reports",
    reportName: "Payroll Register",
    reportKey: "payroll_register",
  },
  "Leave Reports": {
    category: "Leave Reports",
    reportName: "Leave Summary",
    reportKey: "leave_summary",
  },
  "Attendance Reports": {
    category: "Attendance Reports",
    reportName: "Attendance Summary",
    reportKey: "attendance_summary",
  },
  "Recruitment Reports": {
    category: "Recruitment Reports",
    reportName: "Recruitment Pipeline",
    reportKey: "recruitment_pipeline",
  },
  "Performance Reports": {
    category: "Performance Reports",
    reportName: "Performance Distribution",
    reportKey: "performance_distribution",
  },
  "Training Reports": {
    category: "Training Reports",
    reportName: "Training Requests",
    reportKey: "training_requests",
  },
  "Asset Reports": {
    category: "Asset Reports",
    reportName: "Asset Allocation",
    reportKey: "asset_allocation",
  },
  "Compliance Reports": {
    category: "Compliance Reports",
    reportName: "Compliance Gap Dashboard",
    reportKey: "compliance_gaps",
  },
  "Branch Reports": {
    category: "Branch Reports",
    reportName: "Branch Reports",
    reportKey: "branch_reports",
  },
  "Department Reports": {
    category: "Department Reports",
    reportName: "Department Reports",
    reportKey: "department_reports",
  },
  "Consultancy Reports": {
    category: "Consultancy Reports",
    reportName: "Consultancy Reports",
    reportKey: "consultancy_reports",
  },
};

const REPORT_LAUNCHERS = [
  { title: "Executive Dashboard", detail: "Leadership and operations summary" },
  { title: "Payroll Reports", detail: "Register, wagebill, statutory, and payout views" },
  { title: "HR Reports", detail: "Headcount, contracts, exits, and staff structure" },
  { title: "Leave Reports", detail: "Balances, utilization, and leave activity" },
  { title: "Attendance Reports", detail: "Attendance, lateness, and overtime" },
  { title: "Performance Reports", detail: "Targets, appraisals, and score distribution" },
  { title: "Branch Reports", detail: "Branch-by-branch workforce visibility" },
  { title: "Department Reports", detail: "Department visibility and staffing mix" },
] as const;

const REPORT_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
  if (typeof value === "string" && value.length) {
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
  return parsed.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toTitle(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SectionMessage({ text }: { text: string }) {
  return <p className="section-description">{text}</p>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className="mini-panel">
      <h4>{title}</h4>
      <SectionMessage text={text} />
    </section>
  );
}

function ScheduleTable({
  columns,
  rows,
  emptyText,
}: {
  columns: Array<{ key: string; label: string; align?: "left" | "right" }>;
  rows: Array<Record<string, React.ReactNode>>;
  emptyText: string;
}) {
  if (!rows.length) {
    return <SectionMessage text={emptyText} />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.align === "right" ? "align-right" : undefined} key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? row.key ?? index)}>
              {columns.map((column) => (
                <td className={column.align === "right" ? "align-right" : undefined} key={column.key}>
                  {row[column.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: Array<{ label: string; value: string | number; hint?: string }> }) {
  return (
    <div className="metric-grid compact-grid">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.hint ?? "Live reports data"}</small>
        </article>
      ))}
    </div>
  );
}

function MiniList({
  title,
  items,
  emptyText,
  renderItem,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
  emptyText: string;
  renderItem: (item: Record<string, unknown>, index: number) => React.ReactNode;
}) {
  return (
    <section className="mini-panel">
      <h4>{title}</h4>
      <div className="mini-list queue-list">
        {items.length ? items.map(renderItem) : <SectionMessage text={emptyText} />}
      </div>
    </section>
  );
}

function DistributionList({
  title,
  items,
  labelKey = "label",
  valueKey = "value",
  emptyText,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
  labelKey?: string;
  valueKey?: string;
  emptyText: string;
}) {
  return (
    <MiniList
      emptyText={emptyText}
      items={items}
      title={title}
      renderItem={(item, index) => (
        <article key={`${safeString(item[labelKey])}-${index}`}>
          <strong>{safeString(item[labelKey], "Unknown")}</strong>
          <span>
            {typeof item[valueKey] === "string" ? safeString(item[valueKey]) : safeNumber(item[valueKey])}
          </span>
        </article>
      )}
    />
  );
}

function InsightList({
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
            <article key={`${safeString(item.title, safeString(item.label, "insight"))}-${index}`}>
              <strong>{safeString(item.title, safeString(item.label, "Insight"))}</strong>
              <span>{safeString(item.detail, safeString(item.display, safeString(item.value)))}</span>
              <small>{safeString(item.tone, safeString(item.status, "Live signal"))}</small>
            </article>
          ))
        ) : (
          <SectionMessage text={emptyText} />
        )}
      </div>
    </section>
  );
}

export function ReportsWorkbench({
  activeItem,
  onJump,
}: {
  activeItem: string;
  onJump: (item: string) => void;
}) {
  type ReportRunnerState = {
    year: string;
    month: string;
    reportItem: string;
    format: string;
  };
  const [categoryState, setCategoryState] = useState<AsyncState<Record<string, unknown>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [savedState, setSavedState] = useState<AsyncState<Array<Record<string, unknown>>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [scheduledState, setScheduledState] = useState<AsyncState<Array<Record<string, unknown>>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [exportsState, setExportsState] = useState<AsyncState<Array<Record<string, unknown>>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [accessState, setAccessState] = useState<AsyncState<Array<Record<string, unknown>>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [auditState, setAuditState] = useState<AsyncState<Array<Record<string, unknown>>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [previewState, setPreviewState] = useState<AsyncState<BuilderPreview>>({
    loading: false,
    error: "",
    data: null,
  });
  const [actionMessage, setActionMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [reportRunner, setReportRunner] = useState<ReportRunnerState>({
    year: String(new Date().getFullYear()),
    month: REPORT_MONTHS[new Date().getMonth()] ?? "",
    reportItem: REPORT_LAUNCHERS[1]?.title ?? "Payroll Reports",
    format: "pdf",
  });
  const [actionFilters, setActionFilters] = useState<ActionScheduleFilter>({
    actorName: "",
    actorTitle: "",
    actorDepartment: "",
  });

  const [builderForm, setBuilderForm] = useState({
    moduleKey: "employees",
    category: "Custom Reports",
    name: "Headcount Snapshot",
    description: "Live employee report with branch, department, and status filters.",
    visibility: "private",
    fields: "employee_number,full_name,department,branch,status",
    status: "active",
    branch: "",
    department: "",
  });

  const [scheduleForm, setScheduleForm] = useState({
    templateId: "",
    name: "Monthly Executive Pack",
    frequency: "Monthly",
    exportType: "csv",
    recipients: "hr@solvahr.app,finance@solvahr.app",
  });

  const [templateEditor, setTemplateEditor] = useState({
    templateId: "",
    moduleKey: "employees",
    name: "",
    description: "",
    visibility: "private",
    fields: "",
    status: "",
    branch: "",
    department: "",
  });

  async function loadCategory(categoryKey: string) {
    setCategoryState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ report: Record<string, unknown> }>(
        `/api/reports/category/${categoryKey}`
      );
      setCategoryState({ loading: false, error: "", data: payload.report });
    } catch (error) {
      setCategoryState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load report.",
        data: null,
      });
    }
  }

  const loadSaved = useCallback(async () => {
    setSavedState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ reports: Array<Record<string, unknown>> }>(
        "/api/reports/saved"
      );
      setSavedState({ loading: false, error: "", data: payload.reports });
      if (payload.reports[0]?.id) {
        setScheduleForm((current) =>
          current.templateId
            ? current
            : {
                ...current,
                templateId: safeString(payload.reports[0]?.id),
              }
        );
      }
    } catch (error) {
      setSavedState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load saved reports.",
        data: null,
      });
    }
  }, []);

  async function loadScheduled() {
    setScheduledState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ schedules: Array<Record<string, unknown>> }>(
        "/api/reports/scheduled"
      );
      setScheduledState({ loading: false, error: "", data: payload.schedules });
    } catch (error) {
      setScheduledState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load scheduled reports.",
        data: null,
      });
    }
  }

  async function loadExports() {
    setExportsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ exports: Array<Record<string, unknown>> }>(
        "/api/reports/exports"
      );
      setExportsState({ loading: false, error: "", data: payload.exports });
    } catch (error) {
      setExportsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load export history.",
        data: null,
      });
    }
  }

  async function loadAccessLogs() {
    setAccessState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ logs: Array<Record<string, unknown>> }>(
        "/api/reports/access-logs"
      );
      setAccessState({ loading: false, error: "", data: payload.logs });
    } catch (error) {
      setAccessState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load report access logs.",
        data: null,
      });
    }
  }

  async function loadAuditEvents() {
    setAuditState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ events: Array<Record<string, unknown>> }>("/api/audit-logs");
      setAuditState({ loading: false, error: "", data: payload.events });
    } catch (error) {
      setAuditState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load user action schedule.",
        data: null,
      });
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const categoryKey = CATEGORY_MAP[activeItem];
      if (categoryKey) {
        void loadCategory(categoryKey);
      }

      if (activeItem === "Saved Reports") {
        void loadSaved();
      }

      if (activeItem === "Scheduled Reports") {
        void Promise.all([loadScheduled(), loadSaved()]);
      }

      if (activeItem === "Custom Report Builder") {
        void loadSaved();
      }

      if (activeItem === "Export History") {
        void loadExports();
      }

      if (activeItem === "Audit & Report Access Logs") {
        void Promise.all([loadAccessLogs(), loadAuditEvents()]);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeItem, loadSaved]);

  useEffect(() => {
    if (CATEGORY_MAP[activeItem]) {
      setReportRunner((current) => ({
        ...current,
        reportItem: activeItem,
      }));
    }
  }, [activeItem]);

  const savedReports = useMemo(() => savedState.data ?? [], [savedState.data]);
  const filteredAuditEvents = useMemo(() => {
    const actorNameFilter = actionFilters.actorName.trim().toLowerCase();
    const actorTitleFilter = actionFilters.actorTitle.trim().toLowerCase();
    const actorDepartmentFilter = actionFilters.actorDepartment.trim().toLowerCase();

    return (auditState.data ?? []).filter((item) => {
      const actorName = safeString(item.actorName, safeString(item.actor_name)).toLowerCase();
      const actorTitle = safeString(item.actorTitle, safeString(item.actor_title)).toLowerCase();
      const actorDepartment = safeString(item.actorDepartment, safeString(item.actor_department)).toLowerCase();

      return (
        (!actorNameFilter || actorName.includes(actorNameFilter)) &&
        (!actorTitleFilter || actorTitle.includes(actorTitleFilter)) &&
        (!actorDepartmentFilter || actorDepartment.includes(actorDepartmentFilter))
      );
    });
  }, [actionFilters, auditState.data]);

  function exportRows(fileName: string, sheetName: string, rows: Array<Record<string, unknown>>, format: "xlsx" | "csv") {
    if (!rows.length) {
      setActionMessage("There is no data to export yet.");
      return;
    }

    if (format === "xlsx") {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, fileName);
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleExport(
    input: {
      category: string;
      reportName: string;
      reportKey: string;
      exportType: string;
      templateId?: string | null;
      filters?: Record<string, unknown>;
    }
  ) {
    setBusyAction(`export-${input.reportKey}`);
    setActionMessage("");
    try {
      const result = await readJson<{ id: string; file_name: string }>("/api/reports/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      window.open(`/api/reports/exports/${result.id}`, "_blank");
      await loadExports();
      setActionMessage(`${input.reportName} export is ready.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not prepare the export.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRunnerGenerate() {
    const exportConfig = EXPORT_MAP[reportRunner.reportItem];
    if (!exportConfig) {
      setActionMessage("Choose a report first.");
      return;
    }

    await handleExport({
      ...exportConfig,
      exportType: reportRunner.format,
      filters: {
        month: reportRunner.month,
        year: reportRunner.year,
      },
    });
  }

  async function handleBuilderPreview() {
    setBusyAction("builder-preview");
    setActionMessage("");
    setPreviewState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const filters = {
        status: builderForm.status,
        branch: builderForm.branch,
        department: builderForm.department,
      };
      const fields = builderForm.fields
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const payload = await readJson<{ preview: BuilderPreview }>(
        "/api/reports/builder/preview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleKey: builderForm.moduleKey,
            fields,
            filters,
          }),
        }
      );
      setPreviewState({ loading: false, error: "", data: payload.preview });
      setActionMessage(`Preview generated for ${builderForm.moduleKey}.`);
    } catch (error) {
      setPreviewState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not preview the report.",
        data: null,
      });
      setActionMessage(error instanceof Error ? error.message : "Could not preview the report.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleSaveTemplate() {
    setBusyAction("save-template");
    setActionMessage("");
    try {
      const fields = builderForm.fields
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      await readJson("/api/reports/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleKey: "reports",
          category: builderForm.category,
          name: builderForm.name,
          description: builderForm.description,
          visibility: builderForm.visibility,
          definition: {
            module: builderForm.moduleKey,
            fields,
            filters: {
              status: builderForm.status,
              branch: builderForm.branch,
              department: builderForm.department,
            },
          },
        }),
      });
      await loadSaved();
      setActionMessage("Saved report template created.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save the report template.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleTemplateAction(
    reportId: string,
    action: "favorite" | "clone" | "delete"
  ) {
    setBusyAction(`${action}-${reportId}`);
    setActionMessage("");
    try {
      await readJson(`/api/reports/saved/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await Promise.all([loadSaved(), loadExports()]);
      setActionMessage(`Report template ${action} action completed.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update the report template.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleTemplateUpdate() {
    if (!templateEditor.templateId) {
      setActionMessage("Choose a report template first.");
      return;
    }

    setBusyAction(`edit-${templateEditor.templateId}`);
    setActionMessage("");
    try {
      const fields = templateEditor.fields
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      await readJson(`/api/reports/saved/${templateEditor.templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateEditor.name,
          description: templateEditor.description,
          visibility: templateEditor.visibility,
          definition: {
            module: templateEditor.moduleKey,
            fields,
            filters: {
              status: templateEditor.status,
              branch: templateEditor.branch,
              department: templateEditor.department,
            },
          },
        }),
      });
      await loadSaved();
      setActionMessage("Saved report definition updated.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update the report template.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleScheduleSave() {
    setBusyAction("schedule-save");
    setActionMessage("");
    try {
      await readJson("/api/reports/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: scheduleForm.templateId,
          name: scheduleForm.name,
          frequency: scheduleForm.frequency,
          exportType: scheduleForm.exportType,
          recipients: scheduleForm.recipients
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });
      await loadScheduled();
      setActionMessage("Scheduled report saved.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save the schedule.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleScheduleToggle(scheduleId: string, nextStatus: "active" | "paused") {
    setBusyAction(`schedule-${scheduleId}`);
    setActionMessage("");
    try {
      await readJson(`/api/reports/scheduled/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadScheduled();
      setActionMessage(`Scheduled report ${nextStatus === "active" ? "enabled" : "paused"}.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update the schedule.");
    } finally {
      setBusyAction("");
    }
  }

  function openTemplateEditor(item: Record<string, unknown>) {
    const definition = asRecord(item.definition);
    const filters = asRecord(definition?.filters);
    const fields = Array.isArray(definition?.fields)
      ? (definition?.fields as unknown[]).filter((value): value is string => typeof value === "string")
      : [];

    setTemplateEditor({
      templateId: safeString(item.id),
      moduleKey: safeString(definition?.module, "employees"),
      name: safeString(item.name),
      description: safeString(item.description),
      visibility: safeString(item.visibility, "private"),
      fields: fields.join(","),
      status: safeString(filters?.status),
      branch: safeString(filters?.branch),
      department: safeString(filters?.department),
    });
  }

  function renderExecutiveDashboard() {
    if (categoryState.loading) return <SectionMessage text="Loading executive dashboard..." />;
    if (categoryState.error) return <SectionMessage text={categoryState.error} />;
    const report = categoryState.data;
    if (!report) return <SectionMessage text="Executive metrics are not available yet." />;

    const metrics = asRecord(report.metrics);
    const charts = asRecord(report.charts);
    const payrollIntelligence = asRecord(report.payrollIntelligence);
    const performanceIntelligence = asRecord(report.performanceIntelligence);
    const operationsHealth = asRecord(report.operationsHealth);
    const financeIntelligence = asRecord(report.financeIntelligence);
    const insightsFeed = asRecordArray(report.insightsFeed);
    const forecast = asRecord(payrollIntelligence?.forecast);
    const comparison = asRecord(payrollIntelligence?.comparison);
    const comparisonRows = comparison
      ? Object.entries(comparison).map(([label, value]) => ({
          label: toTitle(label),
          ...(asRecord(value) ?? {}),
        }))
      : [];

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Executive Dashboard</p>
            <h3>Leadership visibility across payroll, people, leave, attendance, and approvals</h3>
          </div>
          <div className="inline-actions">
            <button
              className="primary-button"
              disabled={busyAction === "export-executive_dashboard"}
              onClick={() =>
                void handleExport({
                  ...EXPORT_MAP["Executive Dashboard"],
                  exportType: "csv",
                })
              }
              type="button"
            >
              Export snapshot
            </button>
          </div>
        </div>

        <MetricGrid
          metrics={[
            { label: "Total employees", value: safeNumber(metrics?.totalEmployees) },
            { label: "Active employees", value: safeNumber(metrics?.activeEmployees) },
            { label: "New hires", value: safeNumber(metrics?.newHiresThisMonth) },
            { label: "Exits", value: safeNumber(metrics?.exitsThisMonth) },
            { label: "Gross pay", value: safeString(metrics?.totalGrossPay, "KES 0") },
            { label: "Net pay", value: safeString(metrics?.totalNetPay, "KES 0") },
            { label: "Employer cost", value: safeString(metrics?.totalMonthlyPayrollCost, "KES 0") },
            { label: "Attendance rate", value: `${safeNumber(metrics?.attendanceRate)}%` },
            { label: "Turnover rate", value: `${safeNumber(metrics?.turnoverRate)}%` },
            { label: "Pending approvals", value: safeNumber(metrics?.pendingApprovals) },
            { label: "Projected next payroll", value: safeString(metrics?.projectedNextMonthPayroll, "KES 0") },
            { label: "Payroll warnings", value: safeNumber(metrics?.payrollWarnings) },
          ]}
        />

        <div className="workbench-grid">
          <InsightList
            emptyText="No executive insights are available yet."
            items={insightsFeed}
            title="Solva AI insights feed"
          />
          <MiniList
            emptyText="No payroll anomalies detected."
            items={asRecordArray(payrollIntelligence?.anomalies)}
            title="Payroll anomaly detection"
            renderItem={(item, index) => (
              <article key={`${safeString(item.title, "anomaly")}-${index}`}>
                <strong>{safeString(item.title, "Anomaly")}</strong>
                <span>{safeString(item.detail)}</span>
                <small>{safeString(item.severity, "default")}</small>
              </article>
            )}
          />
          <MiniList
            emptyText="Forecast will appear after more payroll history exists."
            items={[
              { label: "Next month wagebill", value: safeString(forecast?.nextMonthWagebill, "KES 0") },
              { label: "Employer cost", value: safeString(forecast?.nextMonthEmployerCost, "KES 0") },
              { label: "Projected annual payroll", value: safeString(forecast?.projectedAnnualPayroll, "KES 0") },
              { label: "Promotion impact", value: safeString(forecast?.promotionImpact, "KES 0") },
            ]}
            title="Payroll forecast"
            renderItem={(item, index) => (
              <article key={`${safeString(item.label)}-${index}`}>
                <strong>{safeString(item.label)}</strong>
                <span>{safeString(item.value)}</span>
                <small>{safeString(forecast?.movementDirection, "trend-aware forecast")}</small>
              </article>
            )}
          />
          <MiniList
            emptyText="No finance summary is available yet."
            items={asRecordArray(financeIntelligence?.statutoryLiabilitySummary)}
            title="Statutory liability summary"
            renderItem={(item, index) => (
              <article key={`${safeString(item.label)}-${index}`}>
                <strong>{safeString(item.label)}</strong>
                <span>{safeString(item.value)}</span>
                <small>{safeString(financeIntelligence?.projectedPayrollNextMonth, "Latest statutory signal")}</small>
              </article>
            )}
          />
          <DistributionList
            emptyText="No payroll trend data available."
            items={asRecordArray(charts?.payrollTrend)}
            labelKey="label"
            title="Monthly wage bill trend"
            valueKey="grossPay"
          />
          <DistributionList
            emptyText="No team performance summary available."
            items={asRecordArray(performanceIntelligence?.topTeams)}
            title="Top-performing teams"
            valueKey="display"
          />
          <DistributionList
            emptyText="No underperforming teams identified."
            items={asRecordArray(performanceIntelligence?.underperformingTeams)}
            title="Underperforming teams"
            valueKey="display"
          />
          <DistributionList
            emptyText="No headcount breakdown available."
            items={asRecordArray(charts?.headcountByDepartment)}
            title="Headcount by department"
          />
          <DistributionList
            emptyText="No branch payroll breakdown available."
            items={asRecordArray(charts?.payrollByBranch)}
            title="Payroll cost by branch"
          />
          <DistributionList
            emptyText="No gender distribution data available."
            items={asRecordArray(charts?.genderDistribution)}
            title="Employee distribution by gender"
          />
          <MiniList
            emptyText="No payroll comparison baseline is available yet."
            items={comparisonRows}
            title="Payroll comparison engine"
            renderItem={(item, index) => (
              <article key={`${safeString(item.label)}-${index}`}>
                <strong>{safeString(item.label)}</strong>
                <span>{safeString(item.current, "KES 0")} vs {safeString(item.previous, "KES 0")}</span>
                <small>{safeString(item.movement, "No movement summary")}</small>
              </article>
            )}
          />
          <MiniList
            emptyText="Operations watchlist is clear."
            items={asRecordArray(operationsHealth?.warnings)}
            title="Operations health center"
            renderItem={(item, index) => (
              <article key={`${safeString(item.title)}-${index}`}>
                <strong>{safeString(item.title)}</strong>
                <span>{safeString(item.detail)}</span>
                <small>{safeString(item.tone, "default")}</small>
              </article>
            )}
          />
        </div>
      </section>
    );
  }

  function renderOperationsHealthCenter() {
    if (categoryState.loading) return <SectionMessage text="Loading operations health center..." />;
    if (categoryState.error) return <SectionMessage text={categoryState.error} />;
    const report = categoryState.data;
    if (!report) return <SectionMessage text="Operations health is not available yet." />;

    const operationsHealth = asRecord(report.operationsHealth);
    const cards = asRecord(operationsHealth?.cards);

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Operations Health Center</p>
            <h3>Warnings, process pressure, export failures, and missing data in one place</h3>
          </div>
          <div className="inline-actions">
            <button
              className="primary-button"
              disabled={busyAction === "export-operations_health_center"}
              onClick={() =>
                void handleExport({
                  ...EXPORT_MAP["Operations Health Center"],
                  exportType: "csv",
                })
              }
              type="button"
            >
              Export watchlist
            </button>
          </div>
        </div>

        <MetricGrid
          metrics={[
            { label: "Pending approvals", value: safeNumber(cards?.pendingApprovals) },
            { label: "Unresolved complaints", value: safeNumber(cards?.unresolvedComplaints) },
            { label: "Failed exports", value: safeNumber(cards?.failedExports) },
            { label: "Missing employee data", value: safeNumber(cards?.missingEmployeeData) },
            { label: "Payroll warnings", value: safeNumber(cards?.payrollWarnings) },
            { label: "Overdue tasks", value: safeNumber(cards?.overdueTasks) },
          ]}
        />

        <div className="workbench-grid">
          <InsightList
            emptyText="No operational warnings are active."
            items={asRecordArray(operationsHealth?.warnings)}
            title="Active warnings"
          />
          <MiniList
            emptyText="No missing-data rows are blocking operations."
            items={asRecordArray(operationsHealth?.missingData)}
            title="Missing employee data"
            renderItem={(item, index) => (
              <article key={`${safeString(item.label)}-${index}`}>
                <strong>{safeString(item.label)}</strong>
                <span>{safeString(item.value)}</span>
                <small>Needs cleanup before downstream exports and payroll controls</small>
              </article>
            )}
          />
          <MiniList
            emptyText="No scheduled reminders are configured yet."
            items={asRecordArray(operationsHealth?.reminders)}
            title="Automation reminders"
            renderItem={(item, index) => (
              <article key={`${safeString(item.title)}-${index}`}>
                <strong>{safeString(item.title)}</strong>
                <span>{safeString(item.detail)}</span>
                <small>{safeString(item.status, "Ready")}</small>
              </article>
            )}
          />
          <MiniList
            emptyText="No automation workflows are available yet."
            items={asRecordArray(asRecord(report.automationCenter)?.workflows)}
            title="Workflow automation"
            renderItem={(item, index) => (
              <article key={`${safeString(item.title)}-${index}`}>
                <strong>{safeString(item.title)}</strong>
                <span>{safeString(item.detail)}</span>
                <small>{safeString(item.status, "Ready")}</small>
              </article>
            )}
          />
        </div>
      </section>
    );
  }

  function renderStandardReport(
    title: string,
    cards: Record<string, unknown> | null,
    primaryList: Array<Record<string, unknown>>,
    secondaryList: Array<Record<string, unknown>>,
    primaryTitle: string,
    secondaryTitle: string,
    exportItem: keyof typeof EXPORT_MAP,
    distribution?: Array<Record<string, unknown>>,
    distributionTitle?: string
  ) {
    const metrics = cards
      ? Object.entries(cards).map(([key, value]) => ({
          label: toTitle(key),
          value: typeof value === "number" ? value : safeString(value),
        }))
      : [];

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Reports Workspace</p>
            <h3>{title}</h3>
          </div>
          <div className="inline-actions">
            <button
              className="ghost-button"
              disabled={busyAction === `export-${EXPORT_MAP[exportItem].reportKey}`}
              onClick={() =>
                void handleExport({
                  ...EXPORT_MAP[exportItem],
                  exportType: "pdf",
                })
              }
              type="button"
            >
              Export PDF
            </button>
            <button
              className="primary-button"
              disabled={busyAction === `export-${EXPORT_MAP[exportItem].reportKey}`}
              onClick={() =>
                void handleExport({
                  ...EXPORT_MAP[exportItem],
                  exportType: "csv",
                })
              }
              type="button"
            >
              Export CSV
            </button>
            <button
              className="ghost-button"
              disabled={busyAction === `export-${EXPORT_MAP[exportItem].reportKey}`}
              onClick={() =>
                void handleExport({
                  ...EXPORT_MAP[exportItem],
                  exportType: "excel",
                })
              }
              type="button"
            >
              Export Excel
            </button>
          </div>
        </div>

        {metrics.length ? <MetricGrid metrics={metrics.slice(0, 8)} /> : null}

        <div className="workbench-grid">
          <MiniList
            emptyText={`No ${primaryTitle.toLowerCase()} available.`}
            items={primaryList.slice(0, 8)}
            title={primaryTitle}
            renderItem={(item, index) => (
              <article key={`${index}-${safeString(item.id, safeString(item.employeeNumber, safeString(item.roleTitle, title)))}`}>
                <strong>
                  {safeString(item.employeeName) ||
                    safeString(item.fullName) ||
                    safeString(item.roleTitle) ||
                    safeString(item.program_name) ||
                    safeString(item.asset_name) ||
                    safeString(item.companyName) ||
                    safeString(item.department) ||
                    safeString(item.branch) ||
                    "Report row"}
                </strong>
                <span>
                  {safeString(item.department) ||
                    safeString(item.branch) ||
                    safeString(item.leaveType) ||
                    safeString(item.status) ||
                    safeString(item.review_cycle) ||
                    safeString(item.asset_category) ||
                    safeString(item.employeeNumber)}
                </span>
                <small>
                  {safeString(item.grossPay) ||
                    safeString(item.netPay) ||
                    safeString(item.startDate) ||
                    safeString(item.workDate) ||
                    safeString(item.schedule) ||
                    safeString(item.created_at) ||
                    safeString(item.status) ||
                    safeString(item.grossPay) ||
                    safeString(item.payrollErrors)}
                </small>
              </article>
            )}
          />
          <MiniList
            emptyText={`No ${secondaryTitle.toLowerCase()} available.`}
            items={secondaryList.slice(0, 8)}
            title={secondaryTitle}
            renderItem={(item, index) => (
              <article key={`${index}-${safeString(item.label, safeString(item.department, safeString(item.branch, "row")))}`}>
                <strong>{safeString(item.label, safeString(item.department, safeString(item.branch, "Item")))}</strong>
                <span>{safeString(item.value, String(safeNumber(item.value)))}</span>
                <small>{safeString(item.filingStatus, safeString(item.status, "Live rollup"))}</small>
              </article>
            )}
          />
          {distribution ? (
            <DistributionList
              emptyText="No distribution data available."
              items={distribution}
              title={distributionTitle ?? "Distribution"}
            />
          ) : null}
        </div>
      </section>
    );
  }

  function renderHrReports(report: Record<string, unknown>) {
    const cards = asRecord(report.cards);
    const employeeMasterList = asRecordArray(report.employeeMasterList);
    const exitedEmployeesList = asRecordArray(report.exitedEmployeesList);
    const headcountByDepartment = asRecordArray(report.headcountByDepartment);
    const staffDataExportRows = asRecordArray(report.staffDataExportRows);
    const metrics = cards
      ? Object.entries(cards).map(([key, value]) => ({
          label: toTitle(key),
          value: typeof value === "number" ? value : safeString(value),
        }))
      : [];

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Reports Workspace</p>
            <h3>Workforce structure, demographics, exits, and full staff master reporting</h3>
          </div>
          <div className="inline-actions">
            <button
              className="primary-button"
              disabled={busyAction === "export-employee_master_list"}
              onClick={() =>
                void handleExport({
                  category: "HR Reports",
                  reportName: "All Staff Data Schedule",
                  reportKey: "employee_master_list",
                  exportType: "csv",
                })
              }
              type="button"
            >
              Export CSV
            </button>
            <button
              className="ghost-button"
              disabled={busyAction === "export-employee_master_list"}
              onClick={() =>
                void handleExport({
                  category: "HR Reports",
                  reportName: "All Staff Data Schedule",
                  reportKey: "employee_master_list",
                  exportType: "excel",
                })
              }
              type="button"
            >
              Export Excel
            </button>
            <button
              className="ghost-button"
              disabled={busyAction === "export-employee_master_list"}
              onClick={() =>
                void handleExport({
                  category: "HR Reports",
                  reportName: "All Staff Data Schedule",
                  reportKey: "employee_master_list",
                  exportType: "pdf",
                })
              }
              type="button"
            >
              Export PDF
            </button>
          </div>
        </div>

        {metrics.length ? <MetricGrid metrics={metrics.slice(0, 8)} /> : null}

        <div className="workbench-grid">
          <MiniList
            emptyText="No employee master list data available."
            items={employeeMasterList.slice(0, 8)}
            title="Employee master list"
            renderItem={(item, index) => (
              <article key={`${index}-${safeString(item.employeeNumber, safeString(item.fullName, "employee"))}`}>
                <strong>{`${safeString(item.employeeNumber)} ${safeString(item.fullName)}`.trim()}</strong>
                <span>{safeString(item.department)} | {safeString(item.branch)}</span>
                <small>{safeString(item.employmentType)} | {safeString(item.status)}</small>
              </article>
            )}
          />
          <MiniList
            emptyText="No exited employees recorded."
            items={exitedEmployeesList.slice(0, 8)}
            title="Exited employees"
            renderItem={(item, index) => (
              <article key={`${index}-${safeString(item.employee_number, safeString(item.id, "exit"))}`}>
                <strong>{safeString(item.first_name)} {safeString(item.last_name)}</strong>
                <span>{safeString((asRecord(item.department))?.name, "-")} | {safeString((asRecord(item.branch))?.name, "-")}</span>
                <small>{safeString(item.status)} | Hire {safeString(item.hire_date, "-")}</small>
              </article>
            )}
          />
          <DistributionList
            emptyText="No headcount distribution data available."
            items={headcountByDepartment}
            title="Headcount by department"
          />
        </div>

        <section className="mini-panel">
          <h4>All staff data schedule</h4>
          <ScheduleTable
            columns={[
              { key: "employeeNumber", label: "Staff No." },
              { key: "fullName", label: "Name" },
              { key: "gender", label: "Gender" },
              { key: "dateOfBirth", label: "DOB" },
              { key: "age", label: "Age" },
              { key: "phone", label: "Phone" },
              { key: "branch", label: "Branch" },
              { key: "department", label: "Department" },
              { key: "designation", label: "Designation" },
              { key: "salary", label: "Salary", align: "right" },
              { key: "status", label: "Status" },
            ]}
            emptyText="No staff records are available for export yet."
            rows={staffDataExportRows.map((item) => ({
              id: safeString(item.employee_number, safeString(item.full_name)),
              employeeNumber: safeString(item.employee_number),
              fullName: safeString(item.full_name),
              gender: safeString(item.gender, "-"),
              dateOfBirth: safeString(item.date_of_birth, "-"),
              age: safeString(item.age_years, "-"),
              phone: safeString(item.phone_number, "-"),
              branch: safeString(item.branch, "-"),
              department: safeString(item.department, "-"),
              designation: safeString(item.designation, "-"),
              salary: safeNumber(item.salary).toLocaleString("en-KE"),
              status: safeString(item.status, "-"),
            }))}
          />
        </section>
      </section>
    );
  }

  function renderCategoryPage() {
    if (categoryState.loading) return <SectionMessage text={`Loading ${activeItem.toLowerCase()}...`} />;
    if (categoryState.error) return <SectionMessage text={categoryState.error} />;
    if (!categoryState.data) return <SectionMessage text="Report data is not available yet." />;

    if (activeItem === "Executive Dashboard") {
      return renderExecutiveDashboard();
    }

    if (activeItem === "Operations Health Center") {
      return renderOperationsHealthCenter();
    }

    const report = categoryState.data;

    if (activeItem === "HR Reports") {
      return renderHrReports(report);
    }

    if (activeItem === "Payroll Reports") {
      return renderStandardReport(
        `Live payroll register for ${safeString(report.latestPeriod, "the current run")}`,
        asRecord(report.cards),
        asRecordArray(report.register),
        asRecordArray(report.statutorySummary),
        "Payroll register",
        "Statutory summary",
        "Payroll Reports",
        asRecordArray(report.byDepartment),
        "Payroll by department"
      );
    }

    if (activeItem === "Leave Reports") {
      return renderStandardReport(
        "Leave utilization, balances, and payroll-linked leave impacts",
        asRecord(report.cards),
        asRecordArray(report.requests),
        asRecordArray(report.payrollLinkage),
        "Leave requests",
        "Payroll linkage",
        "Leave Reports",
        asRecordArray(report.byDepartment),
        "Leave by department"
      );
    }

    if (activeItem === "Attendance Reports") {
      return renderStandardReport(
        "Attendance, overtime, lateness, timesheets, and payroll-ready outputs",
        asRecord(report.cards),
        asRecordArray(report.attendance),
        asRecordArray(asRecord(report.lateness)?.exceptions),
        "Attendance records",
        "Attendance exceptions",
        "Attendance Reports",
        asRecordArray(report.payrollLinkage),
        "Payroll linkage output"
      );
    }

    if (activeItem === "Recruitment Reports") {
      return renderStandardReport(
        "Hiring demand, requisitions, and funnel visibility",
        asRecord(report.cards),
        asRecordArray(report.requisitions),
        asRecordArray(report.funnel),
        "Requisitions",
        "Pipeline funnel",
        "Recruitment Reports"
      );
    }

    if (activeItem === "Performance Reports") {
      return renderStandardReport(
        "Appraisal completion, distribution, promotions, and PIP exposure",
        asRecord(report.cards),
        asRecordArray(report.reviews),
        asRecordArray(report.distribution),
        "Performance reviews",
        "Performance distribution",
        "Performance Reports"
      );
    }

    if (activeItem === "Training Reports") {
      return renderStandardReport(
        "Training demand, approvals, and departmental coverage",
        asRecord(report.cards),
        asRecordArray(report.requests),
        asRecordArray(report.byDepartment),
        "Training requests",
        "Training by department",
        "Training Reports"
      );
    }

    if (activeItem === "Asset Reports") {
      return renderStandardReport(
        "Asset allocation, returns risk, and category usage",
        asRecord(report.cards),
        asRecordArray(report.allocations),
        asRecordArray(report.byCategory),
        "Asset allocation",
        "Asset categories",
        "Asset Reports"
      );
    }

    if (activeItem === "Compliance Reports") {
      return renderStandardReport(
        "Payroll and employee file compliance gaps",
        asRecord(report.cards),
        asRecordArray(report.gaps),
        asRecordArray(report.gaps).filter((item) => Boolean(item.missingKraPin) || Boolean(item.missingShif) || Boolean(item.missingNssf)),
        "Compliance gaps",
        "Critical statutory gaps",
        "Compliance Reports"
      );
    }

    if (activeItem === "Branch Reports") {
      return renderStandardReport(
        "Branch-level workforce, leave, attendance, and payroll coverage",
        {
          branches: asRecordArray(report).length,
        },
        asRecordArray(report),
        asRecordArray(report),
        "Branch comparison",
        "Branch KPI rollup",
        "Branch Reports"
      );
    }

    if (activeItem === "Department Reports") {
      return renderStandardReport(
        "Department-level headcount, payroll coverage, leave, and training demand",
        {
          departments: asRecordArray(report).length,
        },
        asRecordArray(report),
        asRecordArray(report),
        "Department comparison",
        "Department KPI rollup",
        "Department Reports"
      );
    }

    if (activeItem === "Consultancy Reports") {
      return renderStandardReport(
        "Multi-company comparison for consultancy and advisory work",
        asRecord(report.cards),
        asRecordArray(report.companies),
        asRecordArray(report.companies),
        "Company comparison",
        "Consultancy portfolio view",
        "Consultancy Reports"
      );
    }

    return <EmptyState text="This report category is still being prepared." title={activeItem} />;
  }

  function renderSavedReports() {
    if (savedState.loading) return <SectionMessage text="Loading saved reports..." />;
    if (savedState.error) return <SectionMessage text={savedState.error} />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Saved Reports</p>
            <h3>Template library for HR, payroll, executive, and consultancy packs</h3>
          </div>
          <div className="inline-actions">
            <button className="ghost-button" onClick={() => onJump("Custom Report Builder")} type="button">
              Open builder
            </button>
          </div>
        </div>

        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Edit selected template</h4>
            <div className="action-form">
              <label>
                <span>Name</span>
                <input
                  onChange={(event) =>
                    setTemplateEditor((current) => ({ ...current, name: event.target.value }))
                  }
                  value={templateEditor.name}
                />
              </label>
              <label>
                <span>Description</span>
                <input
                  onChange={(event) =>
                    setTemplateEditor((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  value={templateEditor.description}
                />
              </label>
              <label>
                <span>Module</span>
                <select
                  className="filter-pill"
                  onChange={(event) =>
                    setTemplateEditor((current) => ({
                      ...current,
                      moduleKey: event.target.value,
                    }))
                  }
                  value={templateEditor.moduleKey}
                >
                  <option value="employees">Employees</option>
                  <option value="payroll">Payroll</option>
                  <option value="leave">Leave</option>
                  <option value="attendance">Attendance</option>
                  <option value="recruitment">Recruitment</option>
                  <option value="performance">Performance</option>
                  <option value="training">Training</option>
                  <option value="assets">Assets</option>
                </select>
              </label>
              <label>
                <span>Fields</span>
                <input
                  onChange={(event) =>
                    setTemplateEditor((current) => ({ ...current, fields: event.target.value }))
                  }
                  value={templateEditor.fields}
                />
              </label>
              <button
                className="primary-button"
                disabled={busyAction.startsWith("edit-")}
                onClick={() => void handleTemplateUpdate()}
                type="button"
              >
                Save template
              </button>
            </div>
          </section>

          <section className="mini-panel">
            <h4>Saved templates</h4>
            <div className="mini-list queue-list">
              {savedReports.length ? (
                savedReports.map((item) => (
                  <article key={safeString(item.id)}>
                    <strong>{safeString(item.name)}</strong>
                    <span>
                      {safeString(item.category)} | {safeString(item.visibility)}
                    </span>
                    <small>{safeString(item.description)}</small>
                    <div className="inline-actions">
                      <button
                        className="ghost-button"
                        onClick={() => openTemplateEditor(item)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="ghost-button"
                        disabled={busyAction === `favorite-${safeString(item.id)}`}
                        onClick={() => void handleTemplateAction(safeString(item.id), "favorite")}
                        type="button"
                      >
                        {item.is_favorite ? "Unfavorite" : "Favorite"}
                      </button>
                      <button
                        className="ghost-button"
                        disabled={busyAction === `clone-${safeString(item.id)}`}
                        onClick={() => void handleTemplateAction(safeString(item.id), "clone")}
                        type="button"
                      >
                        Clone
                      </button>
                      <button
                        className="ghost-button"
                        disabled={busyAction === `delete-${safeString(item.id)}`}
                        onClick={() => void handleTemplateAction(safeString(item.id), "delete")}
                        type="button"
                      >
                        Archive
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <SectionMessage text="No saved reports are available yet." />
              )}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderScheduledReports() {
    if (scheduledState.loading && !scheduledState.data) {
      return <SectionMessage text="Loading scheduled reports..." />;
    }
    if (scheduledState.error) return <SectionMessage text={scheduledState.error} />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Scheduled Reports</p>
            <h3>Recurring report delivery setup for weekly and month-end reporting</h3>
          </div>
        </div>

        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Create schedule</h4>
            <div className="action-form">
              <label>
                <span>Template</span>
                <select
                  className="filter-pill"
                  onChange={(event) =>
                    setScheduleForm((current) => ({ ...current, templateId: event.target.value }))
                  }
                  value={scheduleForm.templateId}
                >
                  {savedReports.map((item) => (
                    <option key={safeString(item.id)} value={safeString(item.id)}>
                      {safeString(item.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Name</span>
                <input
                  onChange={(event) =>
                    setScheduleForm((current) => ({ ...current, name: event.target.value }))
                  }
                  value={scheduleForm.name}
                />
              </label>
              <label>
                <span>Frequency</span>
                <select
                  className="filter-pill"
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      frequency: event.target.value,
                    }))
                  }
                  value={scheduleForm.frequency}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              </label>
              <label>
                <span>Export type</span>
                <select
                  className="filter-pill"
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      exportType: event.target.value,
                    }))
                  }
                  value={scheduleForm.exportType}
                >
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
              <label>
                <span>Recipients</span>
                <input
                  onChange={(event) =>
                    setScheduleForm((current) => ({
                      ...current,
                      recipients: event.target.value,
                    }))
                  }
                  value={scheduleForm.recipients}
                />
              </label>
              <button
                className="primary-button"
                disabled={busyAction === "schedule-save"}
                onClick={() => void handleScheduleSave()}
                type="button"
              >
                {busyAction === "schedule-save" ? "Saving..." : "Save schedule"}
              </button>
            </div>
          </section>

          <section className="mini-panel">
            <h4>Active schedules</h4>
            <div className="mini-list queue-list">
              {(scheduledState.data ?? []).length ? (
                (scheduledState.data ?? []).map((item) => {
                  const template = asRecord(item.template);
                  return (
                    <article key={safeString(item.id)}>
                      <strong>{safeString(item.name)}</strong>
                      <span>
                        {safeString(item.frequency)} | {safeString(item.export_type)}
                      </span>
                      <small>
                        {safeString(template?.name)} | Next {formatDate(safeString(item.next_run_at))}
                      </small>
                      <div className="inline-actions">
                        <button
                          className="ghost-button"
                          disabled={busyAction === `schedule-${safeString(item.id)}`}
                          onClick={() =>
                            void handleScheduleToggle(
                              safeString(item.id),
                              safeString(item.status) === "active" ? "paused" : "active"
                            )
                          }
                          type="button"
                        >
                          {safeString(item.status) === "active" ? "Pause" : "Enable"}
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <SectionMessage text="No scheduled reports are configured yet." />
              )}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderBuilder() {
    const preview = previewState.data;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Custom Report Builder</p>
            <h3>Simple mode builder for fast HR, payroll, leave, attendance, and operations reports</h3>
          </div>
          <div className="inline-actions">
            <button
              className="ghost-button"
              onClick={() => onJump("Saved Reports")}
              type="button"
            >
              View saved reports
            </button>
          </div>
        </div>

        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Builder definition</h4>
            <div className="action-form">
              <label>
                <span>Dataset</span>
                <select
                  className="filter-pill"
                  onChange={(event) =>
                    setBuilderForm((current) => ({ ...current, moduleKey: event.target.value }))
                  }
                  value={builderForm.moduleKey}
                >
                  <option value="employees">Employees</option>
                  <option value="payroll">Payroll</option>
                  <option value="leave">Leave</option>
                  <option value="attendance">Attendance</option>
                  <option value="recruitment">Recruitment</option>
                  <option value="performance">Performance</option>
                  <option value="training">Training</option>
                  <option value="assets">Assets</option>
                </select>
              </label>
              <label>
                <span>Report name</span>
                <input
                  onChange={(event) =>
                    setBuilderForm((current) => ({ ...current, name: event.target.value }))
                  }
                  value={builderForm.name}
                />
              </label>
              <label>
                <span>Fields</span>
                <input
                  onChange={(event) =>
                    setBuilderForm((current) => ({ ...current, fields: event.target.value }))
                  }
                  value={builderForm.fields}
                />
              </label>
              <label>
                <span>Status filter</span>
                <input
                  onChange={(event) =>
                    setBuilderForm((current) => ({ ...current, status: event.target.value }))
                  }
                  value={builderForm.status}
                />
              </label>
              <label>
                <span>Branch filter</span>
                <input
                  onChange={(event) =>
                    setBuilderForm((current) => ({ ...current, branch: event.target.value }))
                  }
                  value={builderForm.branch}
                />
              </label>
              <label>
                <span>Department filter</span>
                <input
                  onChange={(event) =>
                    setBuilderForm((current) => ({ ...current, department: event.target.value }))
                  }
                  value={builderForm.department}
                />
              </label>
              <div className="inline-actions">
                <button
                  className="primary-button"
                  disabled={busyAction === "builder-preview"}
                  onClick={() => void handleBuilderPreview()}
                  type="button"
                >
                  {busyAction === "builder-preview" ? "Previewing..." : "Preview"}
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === "save-template"}
                  onClick={() => void handleSaveTemplate()}
                  type="button"
                >
                  Save template
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === "export-builder_preview"}
                  onClick={() =>
                    void handleExport({
                      category: "Custom Report Builder",
                      reportName: builderForm.name,
                      reportKey: `builder_${builderForm.moduleKey}`,
                      exportType: "csv",
                      filters: {
                        status: builderForm.status,
                        branch: builderForm.branch,
                        department: builderForm.department,
                        fields: builderForm.fields
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  type="button"
                >
                  Export preview
                </button>
              </div>
            </div>
          </section>

          <section className="mini-panel">
            <h4>Preview results</h4>
            {previewState.loading ? <SectionMessage text="Building preview..." /> : null}
            {previewState.error ? <SectionMessage text={previewState.error} /> : null}
            {!previewState.loading && !previewState.error && preview ? (
              <div className="mini-list queue-list">
                <article>
                  <strong>{preview.totalRows} matching rows</strong>
                  <span>{preview.fields.join(", ")}</span>
                </article>
                {preview.preview.slice(0, 10).map((row, index) => (
                  <article key={`preview-${index}`}>
                    <strong>{preview.fields.map((field) => safeString(row[field])).filter(Boolean)[0] || `Row ${index + 1}`}</strong>
                    <span>
                      {preview.fields
                        .slice(1, 3)
                        .map((field) => `${toTitle(field)}: ${safeString(row[field], String(row[field] ?? ""))}`)
                        .join(" | ")}
                    </span>
                    <small>
                      {preview.fields
                        .slice(3, 6)
                        .map((field) => safeString(row[field], String(row[field] ?? "")))
                        .filter(Boolean)
                        .join(" | ")}
                    </small>
                  </article>
                ))}
              </div>
            ) : null}
            {!previewState.loading && !previewState.error && !previewState.data ? (
              <SectionMessage text="Run a preview to see the dataset before saving or exporting." />
            ) : null}
          </section>
        </div>
      </section>
    );
  }

  function renderExportHistory() {
    if (exportsState.loading) return <SectionMessage text="Loading export history..." />;
    if (exportsState.error) return <SectionMessage text={exportsState.error} />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Export History</p>
            <h3>CSV, Excel, and PDF-ready report files with timestamps and accountability</h3>
          </div>
        </div>
        <ScheduleTable
          columns={[
            { key: "report", label: "Report" },
            { key: "category", label: "Category" },
            { key: "format", label: "Format" },
            { key: "file", label: "File Name" },
            { key: "date", label: "Created" },
            { key: "download", label: "Download" },
          ]}
          emptyText="No report exports have been generated yet."
          rows={(exportsState.data ?? []).map((item) => ({
            id: safeString(item.id),
            report: safeString(item.report_name),
            category: safeString(item.category),
            format: safeString(item.export_type),
            file: safeString(item.file_name),
            date: formatDate(safeString(item.created_at)),
            download: (
              <button
                className="ghost-button"
                onClick={() => window.open(`/api/reports/exports/${safeString(item.id)}`, "_blank")}
                type="button"
              >
                Download
              </button>
            ),
          }))}
        />
      </section>
    );
  }

  function renderAccessLogs() {
    if (accessState.loading || auditState.loading) return <SectionMessage text="Loading action schedule..." />;
    if (accessState.error) return <SectionMessage text={accessState.error} />;
    if (auditState.error) return <SectionMessage text={auditState.error} />;

    const actionScheduleRows = filteredAuditEvents.map((item) => ({
      "Actor Name": safeString(item.actorName, safeString(item.actor_name)),
      Title: safeString(item.actorTitle, safeString(item.actor_title)),
      Department: safeString(item.actorDepartment, safeString(item.actor_department)),
      Module: safeString(item.moduleKey, safeString(item.module_key)),
      Action: safeString(item.action),
      "Entity Type": safeString(item.entityType, safeString(item.entity_type)),
      "Entity ID": safeString(item.entityId, safeString(item.entity_id)),
      Outcome: safeString(item.approvalAction, safeString(item.approval_action, "Recorded")),
      "Created At": safeString(item.createdAt, safeString(item.created_at)),
    }));

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">User Action Schedule</p>
            <h3>All actions taken by system users, with filters and downloadable schedules</h3>
          </div>
          <div className="inline-actions">
            <button
              className="ghost-button"
              onClick={() => exportRows("robot-cafe-user-action-schedule.xlsx", "Action Schedule", actionScheduleRows, "xlsx")}
              type="button"
            >
              Export Excel
            </button>
            <button
              className="ghost-button"
              onClick={() => exportRows("robot-cafe-user-action-schedule.csv", "Action Schedule", actionScheduleRows, "csv")}
              type="button"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Filter schedule</h4>
            <div className="action-form">
              <label>
                <span>User name</span>
                <input
                  onChange={(event) =>
                    setActionFilters((current) => ({ ...current, actorName: event.target.value }))
                  }
                  placeholder="e.g. Timothy Sila"
                  value={actionFilters.actorName}
                />
              </label>
              <label>
                <span>Title</span>
                <input
                  onChange={(event) =>
                    setActionFilters((current) => ({ ...current, actorTitle: event.target.value }))
                  }
                  placeholder="e.g. HR Admin"
                  value={actionFilters.actorTitle}
                />
              </label>
              <label>
                <span>Department</span>
                <input
                  onChange={(event) =>
                    setActionFilters((current) => ({ ...current, actorDepartment: event.target.value }))
                  }
                  placeholder="e.g. Operations"
                  value={actionFilters.actorDepartment}
                />
              </label>
              <button
                className="ghost-button"
                onClick={() => setActionFilters({ actorName: "", actorTitle: "", actorDepartment: "" })}
                type="button"
              >
                Clear filters
              </button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Action schedule</h4>
            <ScheduleTable
              columns={[
                { key: "actor", label: "Actor" },
                { key: "title", label: "Title" },
                { key: "department", label: "Department" },
                { key: "module", label: "Module" },
                { key: "action", label: "Action" },
                { key: "outcome", label: "Outcome" },
                { key: "date", label: "Date" },
              ]}
              emptyText="No user actions match the selected filters yet."
              rows={filteredAuditEvents.map((item) => ({
                id: safeString(item.id),
                actor: safeString(item.actorName, safeString(item.actor_name, safeString(item.actorEmail))),
                title: safeString(item.actorTitle, safeString(item.actor_title, "-")),
                department: safeString(item.actorDepartment, safeString(item.actor_department, "-")),
                module: safeString(item.moduleKey, safeString(item.module_key)),
                action: safeString(item.action),
                outcome: safeString(item.approvalAction, safeString(item.approval_action, "Recorded")),
                date: formatDate(safeString(item.createdAt, safeString(item.created_at))),
              }))}
            />
          </section>
        </div>
        <section className="mini-panel">
          <h4>Report access logs</h4>
          <ScheduleTable
            columns={[
              { key: "report", label: "Report" },
              { key: "category", label: "Category" },
              { key: "action", label: "Action" },
              { key: "role", label: "Role" },
              { key: "actor", label: "Actor" },
              { key: "format", label: "Format" },
              { key: "date", label: "Date" },
            ]}
            emptyText="No report access logs are available yet."
            rows={(accessState.data ?? []).map((item) => ({
              id: safeString(item.id),
              report: safeString(item.report_name),
              category: safeString(item.category),
              action: safeString(item.action),
              role: safeString(item.actor_role),
              actor: safeString(item.actor_email),
              format: safeString(item.export_type, "run"),
              date: formatDate(safeString(item.created_at)),
            }))}
          />
        </section>
      </section>
    );
  }

  function renderReportsLauncher() {
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Reports Hub</p>
            <h3>Open one reports button and get the right report family at a glance</h3>
          </div>
        </div>
        <div className="workspace-segment-bar">
          {REPORT_LAUNCHERS.map((report) => (
            <button
              key={report.title}
              className={`workspace-segment-button ${reportRunner.reportItem === report.title ? "is-active" : ""}`}
              onClick={() => {
                setReportRunner((current) => ({ ...current, reportItem: report.title }));
                onJump(report.title);
              }}
              type="button"
            >
              {report.title}
            </button>
          ))}
        </div>
        <div className="report-runner-grid">
          <label>
            <span>Year</span>
            <select
              value={reportRunner.year}
              onChange={(event) =>
                setReportRunner((current) => ({ ...current, year: event.target.value }))
              }
            >
              {Array.from({ length: 5 }).map((_, index) => {
                const year = String(new Date().getFullYear() - index);
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            <span>Month</span>
            <select
              value={reportRunner.month}
              onChange={(event) =>
                setReportRunner((current) => ({ ...current, month: event.target.value }))
              }
            >
              {REPORT_MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Report Name</span>
            <select
              value={reportRunner.reportItem}
              onChange={(event) =>
                setReportRunner((current) => ({ ...current, reportItem: event.target.value }))
              }
            >
              {REPORT_LAUNCHERS.map((report) => (
                <option key={report.title} value={report.title}>
                  {report.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Format</span>
            <select
              value={reportRunner.format}
              onChange={(event) =>
                setReportRunner((current) => ({ ...current, format: event.target.value }))
              }
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          <div className="report-runner-grid__action">
            <button
              className="primary-button"
              disabled={busyAction === `export-${EXPORT_MAP[reportRunner.reportItem]?.reportKey ?? ""}`}
              onClick={() => void handleRunnerGenerate()}
              type="button"
            >
              {busyAction === `export-${EXPORT_MAP[reportRunner.reportItem]?.reportKey ?? ""}` ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const content = (() => {
    if (activeItem === "Executive Dashboard") {
      return renderReportsLauncher();
    }
    if (CATEGORY_MAP[activeItem]) {
      return renderCategoryPage();
    }
    if (activeItem === "Saved Reports") {
      return renderSavedReports();
    }
    if (activeItem === "Scheduled Reports") {
      return renderScheduledReports();
    }
    if (activeItem === "Custom Report Builder") {
      return renderBuilder();
    }
    if (activeItem === "Export History") {
      return renderExportHistory();
    }
    if (activeItem === "Audit & Report Access Logs") {
      return renderAccessLogs();
    }

    return (
      <EmptyState
        title={activeItem}
        text="This reports workspace is being prepared with live Supabase data."
      />
    );
  })();

  return (
    <>
      {actionMessage ? <div className="task-banner">{actionMessage}</div> : null}
      {activeItem !== "Executive Dashboard" ? renderReportsLauncher() : null}
      {content}
    </>
  );
}
