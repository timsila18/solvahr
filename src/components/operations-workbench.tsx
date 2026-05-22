"use client";

import { useEffect, useMemo, useState } from "react";
import { PerformanceWorkbench } from "@/components/performance-workbench";

type AsyncState<T> = {
  loading: boolean;
  error: string;
  data: T | null;
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
  if (typeof value === "string" && value.length) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      )
    : [];
}

function calculateAchievement(targetValue: number, actualValue: number) {
  if (targetValue <= 0) {
    return 0;
  }

  return Number(((actualValue / targetValue) * 100).toFixed(2));
}

function resolveIndicator(achievementPercent: number) {
  if (achievementPercent >= 100) return "green";
  if (achievementPercent >= 70) return "amber";
  return "red";
}

function SectionMessage({ text }: { text: string }) {
  return <p className="section-description">{text}</p>;
}

function EmptyState({
  title,
  text,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="empty-state-card">
      <strong>{title}</strong>
      <p>{text}</p>
      {actionLabel && onAction ? (
        <button className="primary-button" onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

function MetricGrid({ metrics }: { metrics: Array<{ label: string; value: string | number; hint?: string }> }) {
  return (
    <div className="metric-grid compact-grid">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.hint ?? "Live workspace data"}</small>
        </article>
      ))}
    </div>
  );
}

export function OperationsWorkbench({
  moduleKey,
  activeItem,
  onJump,
}: {
  moduleKey: "recruitment" | "performance" | "training" | "assets" | "integrations" | "consultancy";
  activeItem: string;
  onJump: (item: string, moduleKey?: string) => void;
}) {
  const [workspaceState, setWorkspaceState] = useState<AsyncState<Record<string, unknown>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [tasksState, setTasksState] = useState<AsyncState<Array<Record<string, unknown>>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [busyAction, setBusyAction] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [requisitionForm, setRequisitionForm] = useState({
    roleTitle: "HR Business Partner",
    headcount: "1",
  });
  const [performanceUpdateForm] = useState({
    status: "manager_review",
    score: "78",
    supervisorComments: "Solid delivery and stakeholder communication.",
    hrComments: "Ready for calibration.",
    promotionRecommendation: "Monitor for next cycle",
    pipStatus: "none",
  });
  const [performanceCreateForm, setPerformanceCreateForm] = useState({
    employeeId: "",
    reviewCycle: "Weekly Sales Target",
    reviewPeriod: new Date().toISOString().slice(0, 10),
    metricLabel: "Weekly sales target",
    targetValue: "0",
    actualValue: "0",
    supervisorComments: "",
    managerRating: "",
  });
  const [trainingForm, setTrainingForm] = useState({
    programName: "Kenya Labour Law Refresher",
    schedule: "2026-05-14",
    budget: "15000",
  });
  const [assetRequestForm, setAssetRequestForm] = useState({
    assetName: "Dell Latitude 5450",
    requestType: "replacement",
    branch: "HQ",
  });
  const [assetAssignmentForm, setAssetAssignmentForm] = useState({
    employeeId: "",
    assetName: "Lenovo ThinkPad E14",
    assetCategory: "Laptop",
    serialNumber: "SOLVA-LAP-104",
    issueDate: new Date().toISOString().slice(0, 10),
    expectedReturnDate: "",
    notes: "Assigned from the operations pool.",
  });
  const [salaryRequestsState, setSalaryRequestsState] = useState<AsyncState<Array<Record<string, unknown>>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [salaryChangeForm, setSalaryChangeForm] = useState({
    employeeId: "",
    proposedSalary: "0",
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: "Promotion adjustment",
    supportingComments: "",
  });

  async function loadWorkspace() {
    setWorkspaceState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ workspace: Record<string, unknown> }>(`/api/${moduleKey}/workspace`);
      setWorkspaceState({ loading: false, error: "", data: payload.workspace });
      const employees = asRecordArray(payload.workspace.employees);
      if (!assetAssignmentForm.employeeId && employees[0]?.id) {
        setAssetAssignmentForm((current) => ({ ...current, employeeId: safeString(employees[0]?.id) }));
      }
      if (!performanceCreateForm.employeeId && employees[0]?.id) {
        setPerformanceCreateForm((current) => ({ ...current, employeeId: safeString(employees[0]?.id) }));
      }
      if (!salaryChangeForm.employeeId && employees[0]?.id) {
        setSalaryChangeForm((current) => ({ ...current, employeeId: safeString(employees[0]?.id) }));
      }
    } catch (error) {
      setWorkspaceState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load this workspace.",
        data: null,
      });
    }
  }

  async function loadTasks() {
    setTasksState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ tasks: Array<Record<string, unknown>> }>("/api/approval-tasks");
      const tasks = payload.tasks.filter((task) => safeString(task.moduleKey) === moduleKey);
      setTasksState({ loading: false, error: "", data: tasks });
    } catch (error) {
      setTasksState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load approval tasks.",
        data: null,
      });
    }
  }

  async function loadSalaryRequests() {
    if (moduleKey !== "performance") {
      return;
    }

    setSalaryRequestsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ requests: Array<Record<string, unknown>> }>("/api/performance/salary-requests");
      setSalaryRequestsState({ loading: false, error: "", data: payload.requests });
    } catch (error) {
      setSalaryRequestsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load salary change requests.",
        data: null,
      });
    }
  }

  useEffect(() => {
    void Promise.all([loadWorkspace(), loadTasks(), loadSalaryRequests()]);
  }, [moduleKey]);

  const summary = asRecord(workspaceState.data?.summary);
  const tasks = tasksState.data ?? [];
  const requisitions = asRecordArray(workspaceState.data?.requisitions);
  const reviews = asRecordArray(workspaceState.data?.reviews);
  const trainingRequests = asRecordArray(workspaceState.data?.requests);
  const assets = asRecordArray(workspaceState.data?.assignments);
  const employees = asRecordArray(workspaceState.data?.employees);
  const connectors = asRecordArray(workspaceState.data?.connectors);
  const companies = asRecordArray(workspaceState.data?.companies);
  const hotspots = asRecordArray(workspaceState.data?.hotspots);
  const exportsList = asRecordArray(workspaceState.data?.exports);
  const devices = asRecordArray(asRecord(workspaceState.data?.devices)?.devices);
  const viewerRole = safeString(workspaceState.data?.viewerRole);
  const canDirectSalarySave = ["Manager", "HR Admin", "Payroll Admin", "Super Admin"].includes(viewerRole);
  const selectedSalaryEmployee = employees.find((employee) => safeString(employee.id) === salaryChangeForm.employeeId) ?? employees[0] ?? null;
  const currentGrossPay = safeNumber(asRecord(selectedSalaryEmployee)?.currentSalary);

  const metricCards = useMemo(() => {
    if (!summary) return [];

    if (moduleKey === "recruitment") {
      return [
        { label: "Requisitions", value: safeNumber(summary.totalRequisitions), hint: "Live demand pipeline" },
        { label: "Pending", value: safeNumber(summary.pendingRequisitions), hint: "Awaiting approvals" },
        { label: "Approved", value: safeNumber(summary.approvedRequisitions), hint: "Approved demand" },
        { label: "Planned headcount", value: safeNumber(summary.plannedHeadcount), hint: "Positions requested" },
      ];
    }

    if (moduleKey === "performance") {
      return [
        { label: "Reviews", value: safeNumber(summary.totalReviews), hint: "Live review records" },
        { label: "Completed", value: safeNumber(summary.completedReviews), hint: "Signed-off reviews" },
        { label: "PIPs", value: safeNumber(summary.activePips), hint: "Performance cases" },
        { label: "Average score", value: safeNumber(summary.averageScore), hint: "Current score trend" },
      ];
    }

    if (moduleKey === "training") {
      return [
        { label: "Requests", value: safeNumber(summary.totalRequests), hint: "Learning requests" },
        { label: "Pending", value: safeNumber(summary.pendingRequests), hint: "Awaiting approval" },
        { label: "Approved", value: safeNumber(summary.approvedRequests), hint: "Approved learning" },
        { label: "Planned budget", value: safeString(summary.plannedBudget), hint: "Current request total" },
      ];
    }

    if (moduleKey === "assets") {
      return [
        { label: "Assignments", value: safeNumber(summary.totalAssignments), hint: "Tracked assets" },
        { label: "Active", value: safeNumber(summary.activeAssignments), hint: "Assigned to staff" },
        { label: "Overdue returns", value: safeNumber(summary.overdueReturns), hint: "Need follow-up" },
        { label: "Pending requests", value: safeNumber(summary.pendingRequests), hint: "Asset requests queue" },
      ];
    }

    if (moduleKey === "integrations") {
      return [
        { label: "Connected services", value: safeNumber(summary.connectedServices), hint: "Live and placeholder hooks" },
        { label: "Recent exports", value: safeNumber(summary.recentExports), hint: "Payroll/statutory downloads" },
        { label: "Bank-ready staff", value: safeNumber(summary.bankReadyEmployees), hint: "Bank export readiness" },
        { label: "Devices", value: safeNumber(summary.devices), hint: "Attendance device count" },
      ];
    }

    return [
      { label: "Companies", value: safeNumber(summary.companies), hint: "Visible consultancy scope" },
      { label: "Employees", value: safeNumber(summary.totalEmployees), hint: "Portfolio headcount" },
      { label: "Pending approvals", value: safeNumber(summary.pendingApprovals), hint: "Cross-company queue" },
      { label: "Payroll errors", value: safeNumber(summary.payrollErrors), hint: "Need intervention" },
    ];
  }, [moduleKey, summary]);

  async function handleApproval(taskId: string, action: "approve" | "reject") {
    setBusyAction(`${action}-${taskId}`);
    setActionMessage("");
    try {
      await readJson(`/api/approval-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setActionMessage(`Request ${action}d successfully.`);
      await Promise.all([loadTasks(), loadWorkspace()]);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update that approval.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRequisitionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("create-requisition");
    setActionMessage("");
    try {
      await readJson("/api/recruitment/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requisitionForm),
      });
      setActionMessage("Requisition submitted into the approval workflow.");
      await Promise.all([loadWorkspace(), loadTasks()]);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not create the requisition.");
    } finally {
      setBusyAction("");
    }
  }

  async function handlePerformanceUpdate(reviewId: string) {
    setBusyAction(`update-review-${reviewId}`);
    setActionMessage("");
    try {
      await readJson(`/api/performance/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: performanceUpdateForm.status,
          score: safeNumber(performanceUpdateForm.score),
          supervisorComments: performanceUpdateForm.supervisorComments,
          hrComments: performanceUpdateForm.hrComments,
          promotionRecommendation: performanceUpdateForm.promotionRecommendation,
          pipStatus: performanceUpdateForm.pipStatus,
        }),
      });
      setActionMessage("Performance review updated.");
      await loadWorkspace();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update the review.");
    } finally {
      setBusyAction("");
    }
  }

  async function handlePerformanceCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("create-performance-review");
    setActionMessage("");
    try {
      const targetValue = safeNumber(performanceCreateForm.targetValue);
      const actualValue = safeNumber(performanceCreateForm.actualValue);
      const achievementPercent = calculateAchievement(targetValue, actualValue);
      await readJson("/api/performance/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: performanceCreateForm.employeeId,
          reviewCycle: performanceCreateForm.reviewCycle,
          reviewPeriod: performanceCreateForm.reviewPeriod,
          score: achievementPercent,
          status: "manager_review",
          supervisorComments: performanceCreateForm.supervisorComments,
          kpis: [
            {
              metricLabel: performanceCreateForm.metricLabel,
              targetValue,
              actualValue,
              achievementPercent,
              indicator: resolveIndicator(achievementPercent),
              weekLabel: performanceCreateForm.reviewPeriod,
              managerRating: performanceCreateForm.managerRating,
            },
          ],
        }),
      });
      setActionMessage("Performance target saved.");
      await loadWorkspace();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save the performance target.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleSalaryChangeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("create-salary-change");
    setActionMessage("");
    try {
      await readJson("/api/performance/salary-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: salaryChangeForm.employeeId,
          proposedSalary: safeNumber(salaryChangeForm.proposedSalary),
          effectiveDate: salaryChangeForm.effectiveDate,
          reason: salaryChangeForm.reason,
          supportingComments: salaryChangeForm.supportingComments,
        }),
      });
      setActionMessage("Salary review saved successfully.");
      await Promise.all([loadSalaryRequests(), loadTasks()]);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit the salary change request.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleTrainingSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("create-training");
    setActionMessage("");
    try {
      await readJson("/api/training/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trainingForm),
      });
      setActionMessage("Training request submitted.");
      await Promise.all([loadWorkspace(), loadTasks()]);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit the training request.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleAssetRequestSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("request-asset");
    setActionMessage("");
    try {
      await readJson("/api/assets/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          ...assetRequestForm,
        }),
      });
      setActionMessage("Asset request submitted.");
      await Promise.all([loadWorkspace(), loadTasks()]);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit the asset request.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleAssetAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("assign-asset");
    setActionMessage("");
    try {
      await readJson("/api/assets/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          ...assetAssignmentForm,
        }),
      });
      setActionMessage("Asset assigned successfully.");
      await loadWorkspace();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not assign the asset.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleAssetStatus(assetId: string, status: string) {
    setBusyAction(`${status}-${assetId}`);
    setActionMessage("");
    try {
      await readJson(`/api/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setActionMessage(`Asset marked as ${status}.`);
      await loadWorkspace();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update the asset.");
    } finally {
      setBusyAction("");
    }
  }

  function renderApprovals() {
    return (
      <section className="mini-panel">
        <h4>Approval queue</h4>
        <div className="mini-list queue-list">
          {tasks.length ? (
            tasks.map((task) => (
              <article key={safeString(task.id)}>
                <strong>{safeString(task.title)}</strong>
                <span>{safeString(task.stage)} · {safeString(task.ownerRole)}</span>
                <small>{safeString(task.status)} · {safeString(task.updatedAt)}</small>
                <div className="queue-actions">
                  <button
                    className="ghost-button"
                    disabled={busyAction === `approve-${safeString(task.id)}`}
                    onClick={() => void handleApproval(safeString(task.id), "approve")}
                    type="button"
                  >
                    {busyAction === `approve-${safeString(task.id)}` ? "Approving..." : "Approve"}
                  </button>
                  <button
                    className="ghost-button"
                    disabled={busyAction === `reject-${safeString(task.id)}`}
                    onClick={() => void handleApproval(safeString(task.id), "reject")}
                    type="button"
                  >
                    {busyAction === `reject-${safeString(task.id)}` ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <SectionMessage text="No approval tasks are currently queued for this suite." />
          )}
        </div>
      </section>
    );
  }

  function renderRecruitment() {
    return (
      <>
        <MetricGrid metrics={metricCards} />
        <div className="workbench-grid">
          <section className="mini-panel">
            <div className="section-heading">
              <div>
                <h4>Requisition pipeline</h4>
                <SectionMessage text="The live recruitment backbone is running through requisitions and approvals. Vacancy publishing, applicants, interviews, and offers stay clearly marked until their deeper backend layer is added." />
              </div>
              <button className="ghost-button" onClick={() => onJump("Recruitment Reports", "reports")} type="button">
                Recruitment reports
              </button>
            </div>
            <div className="mini-list queue-list">
              {requisitions.length ? (
                requisitions.map((item) => (
                  <article key={safeString(item.id)}>
                    <strong>{safeString(item.roleTitle)}</strong>
                    <span>{safeString(item.department)} · {safeString(item.branch)}</span>
                    <small>Headcount {safeNumber(item.headcount)} · {safeString(item.status)} · {safeString(item.createdAt)}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No requisitions have been submitted yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Create requisition</h4>
            <p className="workspace-intro">
              Keep new demand lightweight. Capture the role and headcount here, then let approvals and the wider
              recruitment workflow handle the rest.
            </p>
            <form className="action-form" onSubmit={handleRequisitionSubmit}>
              <label><span>Role title</span><input value={requisitionForm.roleTitle} onChange={(event) => setRequisitionForm((current) => ({ ...current, roleTitle: event.target.value }))} /></label>
              <label><span>Headcount</span><input min={1} type="number" value={requisitionForm.headcount} onChange={(event) => setRequisitionForm((current) => ({ ...current, headcount: event.target.value }))} /></label>
              <button className="primary-button" disabled={busyAction === "create-requisition"} type="submit">
                {busyAction === "create-requisition" ? "Submitting..." : "Submit requisition"}
              </button>
            </form>
          </section>
        </div>
        {renderApprovals()}
      </>
    );
  }

  function renderPerformance() {
    const canCreateReview = ["Supervisor", "Manager", "HR Admin", "Super Admin"].includes(
      safeString((workspaceState.data as Record<string, unknown> | null)?.viewerRole)
    );

    return (
      <>
        <MetricGrid metrics={metricCards} />
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Performance reviews</h4>
            <div className="mini-list queue-list">
              {reviews.length ? (
                reviews.map((review) => (
                  <article key={safeString(review.id)}>
                    <strong>{safeString(review.employeeName) || safeString(review.reviewCycle)}</strong>
                    <span>{safeString(review.metricLabel, safeString(review.reviewCycle))} · {safeString(review.weekLabel, safeString(review.reviewPeriod))} · {safeString(review.status)}</span>
                    <small>Target {safeNumber(review.targetValue).toLocaleString()} · Actual {safeNumber(review.actualValue).toLocaleString()} · {safeNumber(review.achievementPercent).toFixed(2)}% · {safeString(review.indicator).toUpperCase()}</small>
                    <div className="queue-actions">
                      <button
                        className="ghost-button"
                        disabled={busyAction === `update-review-${safeString(review.id)}`}
                        onClick={() => void handlePerformanceUpdate(safeString(review.id))}
                        type="button"
                      >
                        {busyAction === `update-review-${safeString(review.id)}` ? "Saving..." : "Save review update"}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <SectionMessage text="No performance reviews are available in scope yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Weekly target update</h4>
            {canCreateReview ? (
              <form className="action-form" onSubmit={handlePerformanceCreate}>
                <label><span>Employee</span><select className="filter-pill" onChange={(event) => setPerformanceCreateForm((current) => ({ ...current, employeeId: event.target.value }))} value={performanceCreateForm.employeeId}>{employees.map((employee) => (<option key={safeString(employee.id)} value={safeString(employee.id)}>{safeString(employee.label)}</option>))}</select></label>
                <label><span>Week / period</span><input onChange={(event) => setPerformanceCreateForm((current) => ({ ...current, reviewPeriod: event.target.value }))} value={performanceCreateForm.reviewPeriod} /></label>
                <label><span>Metric</span><input onChange={(event) => setPerformanceCreateForm((current) => ({ ...current, metricLabel: event.target.value }))} value={performanceCreateForm.metricLabel} /></label>
                <label><span>Weekly target</span><input onChange={(event) => setPerformanceCreateForm((current) => ({ ...current, targetValue: event.target.value }))} value={performanceCreateForm.targetValue} /></label>
                <label><span>Actual</span><input onChange={(event) => setPerformanceCreateForm((current) => ({ ...current, actualValue: event.target.value }))} value={performanceCreateForm.actualValue} /></label>
                <label><span>Comments</span><textarea onChange={(event) => setPerformanceCreateForm((current) => ({ ...current, supervisorComments: event.target.value }))} rows={3} value={performanceCreateForm.supervisorComments} /></label>
                <label><span>GM rating (for supervisor reviews)</span><input onChange={(event) => setPerformanceCreateForm((current) => ({ ...current, managerRating: event.target.value }))} value={performanceCreateForm.managerRating} /></label>
                <button className="primary-button" disabled={busyAction === "create-performance-review"} type="submit">
                  {busyAction === "create-performance-review" ? "Saving..." : "Save weekly target"}
                </button>
              </form>
            ) : (
              <SectionMessage text="This role can review performance summaries here but cannot edit targets." />
            )}
          </section>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Salary change requests</h4>
            <div className="mini-list queue-list">
              {salaryRequestsState.loading ? (
                <SectionMessage text="Loading salary change requests..." />
              ) : salaryRequestsState.error ? (
                <SectionMessage text={salaryRequestsState.error} />
              ) : salaryRequestsState.data?.length ? (
                salaryRequestsState.data.map((request) => (
                  <article key={safeString(request.id)}>
                    <strong>{safeString(request.employeeName)}</strong>
                    <span>{safeString(request.currentSalary)} · {safeString(request.proposedSalary)} · {safeString(request.status)}</span>
                    <small>Effective {safeString(request.effectiveDate)} · {safeString(request.ownerRole)}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No salary change requests are in scope yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Review Salary</h4>
            <form className="action-form" onSubmit={handleSalaryChangeSubmit}>
              <label><span>Employee</span><select className="filter-pill" onChange={(event) => setSalaryChangeForm((current) => ({ ...current, employeeId: event.target.value }))} value={salaryChangeForm.employeeId}>{employees.map((employee) => (<option key={safeString(employee.id)} value={safeString(employee.id)}>{safeString(employee.label)}</option>))}</select></label>
              <label><span>Current gross pay</span><input disabled value={currentGrossPay ? currentGrossPay.toLocaleString() : "0"} /></label>
              <label><span>Proposed salary</span><input onChange={(event) => setSalaryChangeForm((current) => ({ ...current, proposedSalary: event.target.value }))} value={salaryChangeForm.proposedSalary} /></label>
              <label><span>Effective date</span><input onChange={(event) => setSalaryChangeForm((current) => ({ ...current, effectiveDate: event.target.value }))} type="date" value={salaryChangeForm.effectiveDate} /></label>
              <label><span>Reason</span><input onChange={(event) => setSalaryChangeForm((current) => ({ ...current, reason: event.target.value }))} value={salaryChangeForm.reason} /></label>
              <label><span>Supporting comments</span><textarea onChange={(event) => setSalaryChangeForm((current) => ({ ...current, supportingComments: event.target.value }))} rows={3} value={salaryChangeForm.supportingComments} /></label>
              <button className="primary-button" disabled={busyAction === "create-salary-change"} type="submit">
                {busyAction === "create-salary-change" ? "Saving..." : canDirectSalarySave ? "Save salary review" : "Submit salary change"}
              </button>
            </form>
          </section>
        </div>
        {renderApprovals()}
      </>
    );
  }

  function renderTraining() {
    const canRequest = Boolean(workspaceState.data?.canRequest);

    return (
      <>
        <MetricGrid metrics={metricCards} />
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Training requests</h4>
            <div className="mini-list queue-list">
              {trainingRequests.length ? (
                trainingRequests.map((item) => (
                  <article key={safeString(item.id)}>
                    <strong>{safeString(item.programName)}</strong>
                    <span>{safeString(item.employeeName)} · {safeString(item.department)}</span>
                    <small>{safeString(item.schedule)} · KES {safeNumber(item.budget)} · {safeString(item.status)}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No training requests are in scope yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Submit training request</h4>
            {canRequest ? (
              <form className="action-form" onSubmit={handleTrainingSubmit}>
                <label><span>Program</span><input value={trainingForm.programName} onChange={(event) => setTrainingForm((current) => ({ ...current, programName: event.target.value }))} /></label>
                <label><span>Schedule</span><input type="date" value={trainingForm.schedule} onChange={(event) => setTrainingForm((current) => ({ ...current, schedule: event.target.value }))} /></label>
                <label><span>Budget</span><input type="number" value={trainingForm.budget} onChange={(event) => setTrainingForm((current) => ({ ...current, budget: event.target.value }))} /></label>
                <button className="primary-button" disabled={busyAction === "create-training"} type="submit">
                  {busyAction === "create-training" ? "Submitting..." : "Submit training request"}
                </button>
              </form>
            ) : (
              <SectionMessage text="This account is not linked to an employee profile yet, so direct training requests are disabled." />
            )}
          </section>
        </div>
        {renderApprovals()}
      </>
    );
  }

  function renderAssets() {
    const canRequest = Boolean(workspaceState.data?.canRequest);
    const canAssign = Boolean(workspaceState.data?.canAssign);

    return (
      <>
        <MetricGrid metrics={metricCards} />
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Asset register</h4>
            <div className="mini-list queue-list">
              {assets.length ? (
                assets.map((item) => (
                  <article key={safeString(item.id)}>
                    <strong>{safeString(item.assetName)}</strong>
                    <span>{safeString(item.employeeName)} · {safeString(item.branch)}</span>
                    <small>{safeString(item.assetCategory)} · {safeString(item.status)} · {safeString(item.serialNumber, "No serial")}</small>
                    <div className="queue-actions">
                      <button className="ghost-button" disabled={busyAction === `returned-${safeString(item.id)}`} onClick={() => void handleAssetStatus(safeString(item.id), "returned")} type="button">
                        {busyAction === `returned-${safeString(item.id)}` ? "Updating..." : "Mark returned"}
                      </button>
                      <button className="ghost-button" disabled={busyAction === `damaged-${safeString(item.id)}`} onClick={() => void handleAssetStatus(safeString(item.id), "damaged")} type="button">
                        {busyAction === `damaged-${safeString(item.id)}` ? "Updating..." : "Mark damaged"}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <SectionMessage text="No assigned assets are visible for this scope yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Asset actions</h4>
            {canAssign ? (
              <form className="action-form" onSubmit={handleAssetAssign}>
                <label>
                  <span>Employee</span>
                  <select value={assetAssignmentForm.employeeId} onChange={(event) => setAssetAssignmentForm((current) => ({ ...current, employeeId: event.target.value }))}>
                    {employees.map((employee) => (
                      <option key={safeString(employee.id)} value={safeString(employee.id)}>{safeString(employee.label)}</option>
                    ))}
                  </select>
                </label>
                <label><span>Asset name</span><input value={assetAssignmentForm.assetName} onChange={(event) => setAssetAssignmentForm((current) => ({ ...current, assetName: event.target.value }))} /></label>
                <label><span>Category</span><input value={assetAssignmentForm.assetCategory} onChange={(event) => setAssetAssignmentForm((current) => ({ ...current, assetCategory: event.target.value }))} /></label>
                <label><span>Serial number</span><input value={assetAssignmentForm.serialNumber} onChange={(event) => setAssetAssignmentForm((current) => ({ ...current, serialNumber: event.target.value }))} /></label>
                <button className="primary-button" disabled={busyAction === "assign-asset"} type="submit">
                  {busyAction === "assign-asset" ? "Assigning..." : "Assign asset"}
                </button>
              </form>
            ) : canRequest ? (
              <form className="action-form" onSubmit={handleAssetRequestSubmit}>
                <label><span>Asset needed</span><input value={assetRequestForm.assetName} onChange={(event) => setAssetRequestForm((current) => ({ ...current, assetName: event.target.value }))} /></label>
                <label><span>Request type</span><input value={assetRequestForm.requestType} onChange={(event) => setAssetRequestForm((current) => ({ ...current, requestType: event.target.value }))} /></label>
                <label><span>Branch</span><input value={assetRequestForm.branch} onChange={(event) => setAssetRequestForm((current) => ({ ...current, branch: event.target.value }))} /></label>
                <button className="primary-button" disabled={busyAction === "request-asset"} type="submit">
                  {busyAction === "request-asset" ? "Submitting..." : "Submit asset request"}
                </button>
              </form>
            ) : (
              <SectionMessage text="This account cannot request or assign assets yet." />
            )}
          </section>
        </div>
        {renderApprovals()}
      </>
    );
  }

  function renderIntegrations() {
    return (
      <>
        <MetricGrid metrics={metricCards} />
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Integration health</h4>
            <div className="mini-list queue-list">
              {connectors.length ? (
                connectors.map((connector) => (
                  <article key={safeString(connector.key)}>
                    <strong>{safeString(connector.label)}</strong>
                    <span>{safeString(connector.status)}</span>
                    <small>{safeString(connector.detail)}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="Integration health data is not available yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Exports and devices</h4>
            <div className="mini-list queue-list">
              {exportsList.slice(0, 6).map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.exportType)}</strong>
                  <span>{safeString(item.status)}</span>
                  <small>{safeString(item.fileName)} · {safeString(item.createdAt)}</small>
                </article>
              ))}
              {!exportsList.length && <SectionMessage text="No recent payroll export records are visible yet." />}
              {devices.slice(0, 4).map((device) => (
                <article key={`device-${safeString(device.id)}`}>
                  <strong>{safeString(device.device_name)}</strong>
                  <span>{safeString(device.device_type)} · {safeString(device.status)}</span>
                  <small>{safeString(asRecord(device.branch)?.name, "No branch")} · Last sync {safeString(device.last_sync_at, "never")}</small>
                </article>
              ))}
            </div>
            <div className="inline-actions">
              <button className="ghost-button" onClick={() => onJump("Statutory Reports", "payroll")} type="button">
                Open statutory reports
              </button>
              <button className="ghost-button" disabled title="Provider onboarding screens stay disabled until their credential vault and sync contracts are implemented." type="button">
                Configure provider coming soon
              </button>
            </div>
          </section>
        </div>
      </>
    );
  }

  function renderConsultancy() {
    return (
      <>
        <MetricGrid metrics={metricCards} />
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Company comparison</h4>
            <div className="mini-list queue-list">
              {companies.length ? (
                companies.map((company, index) => (
                  <article key={`${safeString(company.companyName)}-${index}`}>
                    <strong>{safeString(company.companyName)}</strong>
                    <span>{safeNumber(company.employees)} employees · {safeString(company.grossPay)}</span>
                    <small>{safeNumber(company.leaveRequests)} leave requests · {safeNumber(company.pendingApprovals)} approvals · {safeNumber(company.payrollErrors)} payroll errors</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No cross-company rows are visible for this scope yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Advisory hotspots</h4>
            <div className="mini-list queue-list">
              {hotspots.length ? (
                hotspots.map((company, index) => (
                  <article key={`${safeString(company.companyName)}-hotspot-${index}`}>
                    <strong>{safeString(company.companyName)}</strong>
                    <span>{safeNumber(company.payrollErrors)} payroll errors</span>
                    <small>{safeNumber(company.pendingApprovals)} pending approvals · {safeNumber(company.leaveRequests)} leave requests</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No cross-company risk hotspots are available yet." />
              )}
            </div>
            <div className="inline-actions">
              <button className="ghost-button" onClick={() => onJump("Consultancy Reports", "reports")} type="button">
                Open consultancy reports
              </button>
              <button className="ghost-button" disabled title="Board pack automation will ride on the scheduled reports engine after executive pack templates are finalized." type="button">
                Board packs coming soon
              </button>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Live Suite</p>
          <h3>{activeItem}</h3>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" onClick={() => void Promise.all([loadWorkspace(), loadTasks()])} type="button">
            Refresh
          </button>
          {moduleKey === "consultancy" ? (
            <button className="ghost-button" onClick={() => onJump("Consultancy Reports", "reports")} type="button">
              Open reports
            </button>
          ) : null}
        </div>
      </div>
      <p className="workspace-intro">
        This suite keeps the current operational work front and center. High-value actions stay obvious, while lower
        priority or not-yet-live features remain out of the way.
      </p>

      {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
      {workspaceState.error ? <p className="section-description">{workspaceState.error}</p> : null}
      {tasksState.error ? <p className="section-description">{tasksState.error}</p> : null}

      {workspaceState.loading && !workspaceState.data ? (
        <EmptyState title="Loading workspace" text="Pulling the latest live operational data from Supabase." />
      ) : null}

      {!workspaceState.loading && !workspaceState.data ? (
        <EmptyState
          actionLabel="Open Dashboard"
          onAction={() => onJump("Overview", "dashboard")}
          text="This suite does not have live data available yet for the signed-in role."
          title="Workspace unavailable"
        />
      ) : null}

      {workspaceState.data ? (
        <>
          {moduleKey === "recruitment" ? renderRecruitment() : null}
          {moduleKey === "performance" ? <PerformanceWorkbench activeItem={activeItem} onJump={onJump} /> : null}
          {moduleKey === "training" ? renderTraining() : null}
          {moduleKey === "assets" ? renderAssets() : null}
          {moduleKey === "integrations" ? renderIntegrations() : null}
          {moduleKey === "consultancy" ? renderConsultancy() : null}
        </>
      ) : null}
    </section>
  );
}
