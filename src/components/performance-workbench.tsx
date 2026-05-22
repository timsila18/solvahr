"use client";

import { useEffect, useMemo, useState } from "react";

type AsyncState<T> = {
  loading: boolean;
  error: string;
  data: T | null;
};

type ReviewDraft = {
  stage: "supervisor" | "gm";
  supervisorComments: string;
  gmComments: string;
  hrComments: string;
  correctiveAction: string;
  nextQuarterActions: string;
  trainingRecommendation: string;
  rewardRecommendation: string;
  finalDecision: string;
  potentialRating: string;
  pipRecommendation: boolean;
  promotionRecommendation: boolean;
};

type ReviewItemDraft = {
  actualText: string;
  actualValue: string;
  supervisorScore: string;
  gmScore: string;
  evaluatorComments: string;
};

type ReviewAssistPayload = {
  supervisorComments?: string;
  correctiveAction?: string;
  trainingRecommendation?: string;
  gmComments?: string;
  finalDecision?: string;
  nextQuarterActions?: string;
  summary?: string;
  areaSuggestions?: Array<{
    areaId?: string;
    suggestedScore?: number | null;
    note?: string;
  }>;
  model?: string;
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
  if (typeof value === "string" && value.trim().length) {
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

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function formatDate(value: unknown) {
  const text = safeString(value);
  if (!text) return "-";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SectionMessage({ text }: { text: string }) {
  return <p className="section-description">{text}</p>;
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section className="empty-state-card">
      <strong>{title}</strong>
      <p>{text}</p>
    </section>
  );
}

function getDefaultReviewStage(role: string, payrollAdminActionEnabled: boolean) {
  if (["Manager", "HR Admin", "Super Admin"].includes(role)) {
    return "gm" as const;
  }
  if (role === "Payroll Admin" && payrollAdminActionEnabled) {
    return "supervisor" as const;
  }
  return "supervisor" as const;
}

export function PerformanceWorkbench({
  activeItem,
  onJump,
}: {
  activeItem: string;
  onJump: (item: string, moduleKey?: string) => void;
}) {
  const [workspaceState, setWorkspaceState] = useState<AsyncState<Record<string, unknown>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [busyAction, setBusyAction] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});
  const [reviewItemDrafts, setReviewItemDrafts] = useState<Record<string, ReviewItemDraft>>({});

  const [kpiForm, setKpiForm] = useState({
    title: "Weekly Sales",
    category: "Sales Performance",
    employeeId: "",
    assignmentScope: "individual",
    measurementUnit: "KES",
    targetValue: "50000",
    weightPercent: "40",
    periodLabel: "Q2 2026",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    evidenceRequired: true,
    notes: "",
  });
  const [goalForm, setGoalForm] = useState({
    employeeId: "",
    kpiId: "",
    title: "Drive weekly sales target delivery",
    target: "KES 50,000 per week",
    departmentObjective: "Grow branch sales while maintaining service quality",
    expectedOutput: "Weekly sales target met",
    performanceIndicator: "Sales achievement",
    timeline: "Weekly",
    weighting: "40",
    dueDate: "2026-06-30",
  });
  const [workPlanForm, setWorkPlanForm] = useState({
    employeeId: "",
    goalId: "",
    quarterLabel: "Q2 2026",
    departmentObjective: "Increase customer spend per shift",
    individualTarget: "Upsell premium menu items each week",
    expectedOutput: "Higher average ticket size",
    performanceIndicator: "Average spend per table",
    timeline: "Weekly",
    weighting: "25",
  });
  const [cycleForm, setCycleForm] = useState({
    title: "Robot Cafe Q2 Appraisal",
    cycleType: "quarterly",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    scoringModel: "weighted_kpi",
    selfEvaluationEnabled: true,
    supervisorEvaluationEnabled: true,
    gmEvaluationEnabled: true,
    payrollAdminVisibilityEnabled: true,
    payrollAdminActionEnabled: false,
  });
  const [pipForm, setPipForm] = useState({
    employeeId: "",
    reviewId: "",
    issue: "Performance below target",
    improvementTarget: "Achieve at least 80% against assigned KPIs",
    supportRequired: "Supervisor coaching and weekly follow-up",
    reviewDate: "2026-06-15",
  });
  const [promotionForm, setPromotionForm] = useState({
    employeeId: "",
    reviewId: "",
    currentRole: "",
    proposedRole: "",
    currentSalary: "0",
    proposedSalary: "0",
    performanceJustification: "",
    createSalaryRequest: true,
    effectiveDate: "2026-06-01",
  });
  const [successionRoleForm, setSuccessionRoleForm] = useState({
    roleTitle: "General Manager",
    criticality: "high",
    riskLevel: "medium",
    notes: "",
  });
  const [successionCandidateForm, setSuccessionCandidateForm] = useState({
    successionRoleId: "",
    employeeId: "",
    readinessLevel: "Ready Soon",
    developmentActions: "",
    gmComments: "",
    riskLevel: "medium",
  });
  const [talentForm, setTalentForm] = useState({
    employeeId: "",
    reviewId: "",
    performanceBand: "Good",
    potentialRating: "Medium",
    notes: "",
  });
  const [settingsDraft, setSettingsDraft] = useState({
    payrollAdminVisibilityEnabled: true,
    payrollAdminActionEnabled: false,
    kpiCategoriesText: "",
  });

  async function loadWorkspace() {
    setWorkspaceState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ workspace: Record<string, unknown> }>("/api/performance/workspace");
      setWorkspaceState({ loading: false, error: "", data: payload.workspace });
    } catch (error) {
      setWorkspaceState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load the performance workspace.",
        data: null,
      });
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const workspace = workspaceState.data;
  const summary = asRecord(workspace?.summary);
  const settings = asRecord(workspace?.settings);
  const employees = asRecordArray(workspace?.employees);
  const kpis = asRecordArray(workspace?.kpis);
  const goals = asRecordArray(workspace?.goals);
  const workPlans = asRecordArray(workspace?.workPlans);
  const cycles = asRecordArray(workspace?.cycles);
  const reviews = asRecordArray(workspace?.reviews);
  const pips = asRecordArray(workspace?.pips);
  const promotionCases = asRecordArray(workspace?.promotionCases);
  const successionRoles = asRecordArray(workspace?.successionRoles);
  const successionCandidates = asRecordArray(workspace?.successionCandidates);
  const talentAssessments = asRecordArray(workspace?.talentAssessments);
  const aiAssist = asRecord(workspace?.aiAssist);
  const viewerRole = safeString(workspace?.viewerRole);
  const payrollAdminActionEnabled = Boolean(settings?.payroll_admin_action_enabled);
  const workflowMode = safeString(workspace?.workflowMode);
  const simpleWorkflow = asRecord(workspace?.simpleWorkflow);
  const isSimpleRobotCafeWorkflow = workflowMode === "robot_cafe_simple";
  const simpleWorkflowSteps = asStringArray(simpleWorkflow?.steps);
  const simpleWorkflowAreas = asRecordArray(simpleWorkflow?.areas);
  const simpleWorkflowOutcomes = asStringArray(simpleWorkflow?.finalOutcomes);

  useEffect(() => {
    if (!employees.length) return;
    const defaultEmployeeId = safeString(employees[0]?.id);
    const defaultReviewId = safeString(reviews[0]?.id);
    const defaultKpiId = safeString(kpis[0]?.id);
    const defaultGoalId = safeString(goals[0]?.id);
    const defaultSuccessionRoleId = safeString(successionRoles[0]?.id);
    const defaultEmployee = asRecordArray(workspace?.employees).find((employee) => safeString(employee.id) === defaultEmployeeId);
    setKpiForm((current) => ({ ...current, employeeId: current.employeeId || defaultEmployeeId }));
    setGoalForm((current) => ({
      ...current,
      employeeId: current.employeeId || defaultEmployeeId,
      kpiId: current.kpiId || defaultKpiId,
    }));
    setWorkPlanForm((current) => ({
      ...current,
      employeeId: current.employeeId || defaultEmployeeId,
      goalId: current.goalId || defaultGoalId,
    }));
    setPipForm((current) => ({
      ...current,
      employeeId: current.employeeId || defaultEmployeeId,
      reviewId: current.reviewId || defaultReviewId,
    }));
    setPromotionForm((current) => ({
      ...current,
      employeeId: current.employeeId || defaultEmployeeId,
      reviewId: current.reviewId || defaultReviewId,
      currentRole: current.currentRole || safeString(defaultEmployee?.designation, ""),
    }));
    setSuccessionCandidateForm((current) => ({
      ...current,
      successionRoleId: current.successionRoleId || defaultSuccessionRoleId,
      employeeId: current.employeeId || defaultEmployeeId,
    }));
    setTalentForm((current) => ({
      ...current,
      employeeId: current.employeeId || defaultEmployeeId,
      reviewId: current.reviewId || defaultReviewId,
    }));
  }, [employees, reviews, kpis, goals, successionRoles, workspace]);

  useEffect(() => {
    if (!settings) return;
    setSettingsDraft({
      payrollAdminVisibilityEnabled: Boolean(settings.payroll_admin_visibility_enabled),
      payrollAdminActionEnabled: Boolean(settings.payroll_admin_action_enabled),
      kpiCategoriesText: asStringArray(settings.categories).join("\n"),
    });
  }, [settings]);

  const currentSection = activeItem === "Promotions" ? "Promotion Cases" : activeItem;

  const metricCards = useMemo(
    () => [
      {
        label: "Q2 completion",
        value:
          summary && summary.q2Completion != null
            ? `${safeNumber(summary.q2Completion).toFixed(1)}%`
            : "Pending setup",
        hint: "Finalized appraisals against the live review workload",
      },
      {
        label: "Reviews in progress",
        value: summary ? safeNumber(summary.reviewsInProgress) : "Pending setup",
        hint: "Open employee, supervisor, and GM reviews",
      },
      {
        label: "Active PIPs",
        value: summary ? safeNumber(summary.activePips) : "Pending setup",
        hint: "Cases that need follow-through",
      },
      {
        label: "Successor coverage",
        value:
          summary && summary.successorCoverage != null
            ? `${safeNumber(summary.successorCoverage).toFixed(1)}%`
            : "No data yet",
        hint: "High-criticality roles with named successor cover",
      },
    ],
    [summary]
  );

  const primaryActionLabel = useMemo(() => {
    switch (currentSection) {
      case "KPIs":
        return "Create KPI";
      case "Goals":
        return "Create goal";
      case "Appraisals":
        return "Launch appraisal cycle";
      case "Performance Improvement Plans":
        return "Create PIP";
      case "Promotion Cases":
        return "Create promotion case";
      case "Performance Reports":
        return "Generate performance report";
      default:
        return "Refresh workspace";
    }
  }, [currentSection]);

  async function handlePost(url: string, body: Record<string, unknown>, successMessage: string) {
    setBusyAction(url);
    setActionMessage("");
    try {
      await readJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setActionMessage(successMessage);
      await loadWorkspace();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "The performance action could not be completed.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleReviewSubmit(reviewId: string) {
    const draft = reviewDrafts[reviewId] ?? {
      stage: getDefaultReviewStage(viewerRole, payrollAdminActionEnabled),
      supervisorComments: "",
      gmComments: "",
      hrComments: "",
      correctiveAction: "",
      nextQuarterActions: "",
      trainingRecommendation: "",
      rewardRecommendation: "",
      finalDecision: "",
      potentialRating: "Medium",
      pipRecommendation: false,
      promotionRecommendation: false,
    };
    const review = reviews.find((item) => safeString(item.id) === reviewId);
    const items = asRecordArray(review?.items);
    const itemUpdates = items.map((item) => {
      const itemId = safeString(item.id);
      const itemDraft = reviewItemDrafts[itemId];
      const payload: Record<string, unknown> = { id: itemId };
      if (itemDraft?.actualText) payload.actualText = itemDraft.actualText;
      if (itemDraft?.actualValue.trim().length) payload.actualValue = safeNumber(itemDraft.actualValue);
      if (itemDraft?.evaluatorComments) payload.evaluatorComments = itemDraft.evaluatorComments;
      if (draft.stage === "supervisor" && itemDraft?.supervisorScore.trim().length) {
        payload.supervisorScore = safeNumber(itemDraft.supervisorScore);
      }
      if (draft.stage === "gm" && itemDraft?.gmScore.trim().length) {
        payload.gmScore = safeNumber(itemDraft.gmScore);
      }
      return payload;
    });

    setBusyAction(`review-${reviewId}`);
    setActionMessage("");
    try {
      await readJson(`/api/performance/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: draft.stage,
          submit: true,
          supervisorComments: draft.supervisorComments,
          gmComments: draft.gmComments,
          hrComments: draft.hrComments,
          correctiveAction: draft.correctiveAction,
          nextQuarterActions: draft.nextQuarterActions,
          trainingRecommendation: draft.trainingRecommendation,
          rewardRecommendation: draft.rewardRecommendation,
          finalDecision: draft.finalDecision,
          potentialRating: draft.potentialRating,
          pipRecommendation: draft.pipRecommendation,
          promotionRecommendation: draft.promotionRecommendation,
          itemUpdates,
        }),
      });
      setActionMessage("Review update saved and moved to the next appraisal stage.");
      await loadWorkspace();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update that appraisal review.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleReviewAssist(review: Record<string, unknown>, draft: ReviewDraft) {
    const reviewId = safeString(review.id);
    const mode = draft.stage === "gm" ? "gm_review" : "supervisor_review";
    setBusyAction(`review-ai-${reviewId}`);
    setActionMessage("");
    try {
      const payload = await readJson<ReviewAssistPayload>("/api/ai/appraisal-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          employeeName: safeString(review.employeeName),
          reviewTitle: safeString(review.title),
          reviewPeriod: safeString(
            review.reviewPeriodLabel,
            `${safeString(review.periodStart)} to ${safeString(review.periodEnd)}`
          ),
          selfComments: safeString(review.selfComments),
          challengesSummary: safeString(review.challengesSummary),
          supportRequired: safeString(review.supportRequired),
          supervisorComments: draft.supervisorComments,
          gmComments: draft.gmComments,
          finalDecision: draft.finalDecision,
          allowedOutcomes: simpleWorkflowOutcomes,
          areas: asRecordArray(review.items).map((item) => {
            const itemId = safeString(item.id);
            const itemDraft = reviewItemDrafts[itemId];
            return {
              id: itemId,
              title: safeString(item.title),
              expectedOutput: safeString(item.expectedOutput),
              performanceIndicator: safeString(item.performanceIndicator),
              selfScore: safeNumber(item.selfScore),
              supervisorScore:
                draft.stage === "supervisor" && itemDraft?.supervisorScore
                  ? safeNumber(itemDraft.supervisorScore)
                  : safeNumber(item.supervisorScore),
              gmScore:
                draft.stage === "gm" && itemDraft?.gmScore
                  ? safeNumber(itemDraft.gmScore)
                  : safeNumber(item.gmScore),
              evaluatorComments: safeString(itemDraft?.evaluatorComments, safeString(item.evaluatorComments)),
            };
          }),
        }),
      });

      setReviewDrafts((current) => ({
        ...current,
        [reviewId]: {
          ...draft,
          supervisorComments: payload.supervisorComments || draft.supervisorComments,
          correctiveAction: payload.correctiveAction || draft.correctiveAction,
          trainingRecommendation: payload.trainingRecommendation || draft.trainingRecommendation,
          gmComments: payload.gmComments || draft.gmComments,
          finalDecision: payload.finalDecision || draft.finalDecision,
          nextQuarterActions: payload.nextQuarterActions || draft.nextQuarterActions,
        },
      }));

      if (Array.isArray(payload.areaSuggestions) && payload.areaSuggestions.length) {
        setReviewItemDrafts((current) => {
          const next = { ...current };
          for (const suggestion of payload.areaSuggestions ?? []) {
            const areaId = safeString(suggestion.areaId);
            if (!areaId) continue;
            const existing = next[areaId] ?? {
              actualText: "",
              actualValue: "0",
              supervisorScore: "",
              gmScore: "",
              evaluatorComments: "",
            };
            next[areaId] = {
              ...existing,
              supervisorScore:
                draft.stage === "supervisor" && suggestion.suggestedScore
                  ? String(suggestion.suggestedScore)
                  : existing.supervisorScore,
              gmScore:
                draft.stage === "gm" && suggestion.suggestedScore
                  ? String(suggestion.suggestedScore)
                  : existing.gmScore,
              evaluatorComments: suggestion.note || existing.evaluatorComments,
            };
          }
          return next;
        });
      }

      setActionMessage(payload.summary || "A stronger review draft is ready. Please adjust it to match the real performance record.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not prepare review assistance right now.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleOpenPerformanceReport(reviewId: string, disposition: "inline" | "attachment") {
    setBusyAction(`report-${reviewId}-${disposition}`);
    setActionMessage("");
    try {
      window.open(
        `/api/performance/reports/${reviewId}?disposition=${disposition}`,
        "_blank",
        "noopener,noreferrer"
      );
      setActionMessage(disposition === "inline" ? "Opening the performance report preview." : "Downloading the performance report.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not open the performance report.");
    } finally {
      setBusyAction("");
    }
  }

  function scrollToPrimaryForm() {
    const target = document.getElementById("performance-primary-form");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    void loadWorkspace();
  }

  function renderKpis() {
    if (isSimpleRobotCafeWorkflow) {
      return (
        <section className="mini-panel" id="performance-primary-form">
          <h4>Robot Cafe simple appraisal mode</h4>
          <SectionMessage text="Robot Cafe is now using the simpler appraisal flow. KPI setup is no longer required before launching appraisals." />
        </section>
      );
    }
    return (
      <>
        <section className="mini-panel" id="performance-primary-form">
          <h4>Create KPI</h4>
          <div className="action-form">
            <label>
              <span>KPI title</span>
              <input value={kpiForm.title} onChange={(event) => setKpiForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              <span>Category</span>
              <select className="filter-pill" value={kpiForm.category} onChange={(event) => setKpiForm((current) => ({ ...current, category: event.target.value }))}>
                {asStringArray(settings?.categories).map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Employee</span>
              <select className="filter-pill" value={kpiForm.employeeId} onChange={(event) => setKpiForm((current) => ({ ...current, employeeId: event.target.value }))}>
                {employees.map((employee) => (
                  <option key={safeString(employee.id)} value={safeString(employee.id)}>
                    {safeString(employee.label)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Target value</span>
              <input value={kpiForm.targetValue} onChange={(event) => setKpiForm((current) => ({ ...current, targetValue: event.target.value }))} />
            </label>
            <label>
              <span>Weight %</span>
              <input value={kpiForm.weightPercent} onChange={(event) => setKpiForm((current) => ({ ...current, weightPercent: event.target.value }))} />
            </label>
            <label>
              <span>Measurement unit</span>
              <input value={kpiForm.measurementUnit} onChange={(event) => setKpiForm((current) => ({ ...current, measurementUnit: event.target.value }))} />
            </label>
            <label>
              <span>Period</span>
              <input value={kpiForm.periodLabel} onChange={(event) => setKpiForm((current) => ({ ...current, periodLabel: event.target.value }))} />
            </label>
            <label>
              <span>Start date</span>
              <input type="date" value={kpiForm.startDate} onChange={(event) => setKpiForm((current) => ({ ...current, startDate: event.target.value }))} />
            </label>
            <label>
              <span>End date</span>
              <input type="date" value={kpiForm.endDate} onChange={(event) => setKpiForm((current) => ({ ...current, endDate: event.target.value }))} />
            </label>
            <label>
              <span>Evidence required</span>
              <select className="filter-pill" value={kpiForm.evidenceRequired ? "yes" : "no"} onChange={(event) => setKpiForm((current) => ({ ...current, evidenceRequired: event.target.value === "yes" }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>
              <span>Notes</span>
              <textarea rows={3} value={kpiForm.notes} onChange={(event) => setKpiForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <button
              className="primary-button"
              disabled={busyAction === "/api/performance/kpis"}
              onClick={() =>
                void handlePost(
                  "/api/performance/kpis",
                  {
                    ...kpiForm,
                    targetValue: safeNumber(kpiForm.targetValue),
                    weightPercent: safeNumber(kpiForm.weightPercent),
                  },
                  "KPI created successfully."
                )
              }
              type="button"
            >
              {busyAction === "/api/performance/kpis" ? "Saving..." : "Create KPI"}
            </button>
          </div>
        </section>
        <section className="mini-panel">
          <h4>KPI guidance</h4>
          <div className="mini-list queue-list">
            <article>
              <strong>How to set KPIs</strong>
              <span>Keep each KPI measurable, time-bound, and tied to a role or business outcome.</span>
            </article>
            <article>
              <strong>Scoring guide</strong>
              <span>101%+ Excellent | 100% Good | 80-99% Fair | 70-79% Poor | Below 70% Very Poor</span>
            </article>
            {asRecordArray(settings?.examples).map((item, index) => (
              <article key={`${safeString(item.role)}-${index}`}>
                <strong>{safeString(item.role)}</strong>
                <span>
                  {safeString(item.title)} | {safeString(item.category)} | Target {safeNumber(item.targetValue).toLocaleString()} | Weight {safeNumber(item.weightPercent)}%
                </span>
              </article>
            ))}
          </div>
        </section>
        <section className="mini-panel">
          <h4>Live KPIs</h4>
          <div className="mini-list queue-list">
            {kpis.length ? (
              kpis.map((kpi) => (
                <article key={safeString(kpi.id)}>
                  <strong>{safeString(kpi.title)}</strong>
                  <span>
                    {safeString(kpi.employeeName)} | {safeString(kpi.category)} | {safeString(kpi.periodLabel)}
                  </span>
                  <small>
                    Target {safeNumber(kpi.targetValue).toLocaleString()} {safeString(kpi.measurementUnit)} | Weight {safeNumber(kpi.weightPercent)}% | {safeString(kpi.status)}
                  </small>
                </article>
              ))
            ) : (
              <SectionMessage text="No KPIs have been created yet." />
            )}
          </div>
        </section>
      </>
    );
  }

  function renderGoals() {
    if (isSimpleRobotCafeWorkflow) {
      return (
        <section className="mini-panel" id="performance-primary-form">
          <h4>Robot Cafe simple appraisal mode</h4>
          <SectionMessage text="Goals and work plans are now optional support tools. The live appraisal flow runs through Employee -> Supervisor -> GM without needing these sections first." />
        </section>
      );
    }
    return (
      <>
        <section className="mini-panel" id="performance-primary-form">
          <h4>Create goal</h4>
          <div className="action-form">
            <label>
              <span>Employee</span>
              <select className="filter-pill" value={goalForm.employeeId} onChange={(event) => setGoalForm((current) => ({ ...current, employeeId: event.target.value }))}>
                {employees.map((employee) => (
                  <option key={safeString(employee.id)} value={safeString(employee.id)}>
                    {safeString(employee.label)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Linked KPI</span>
              <select className="filter-pill" value={goalForm.kpiId} onChange={(event) => setGoalForm((current) => ({ ...current, kpiId: event.target.value }))}>
                <option value="">No linked KPI</option>
                {kpis.map((kpi) => (
                  <option key={safeString(kpi.id)} value={safeString(kpi.id)}>
                    {safeString(kpi.title)}
                  </option>
                ))}
              </select>
            </label>
            <label><span>Goal title</span><input value={goalForm.title} onChange={(event) => setGoalForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <label><span>Target</span><input value={goalForm.target} onChange={(event) => setGoalForm((current) => ({ ...current, target: event.target.value }))} /></label>
            <label><span>Department objective</span><textarea rows={3} value={goalForm.departmentObjective} onChange={(event) => setGoalForm((current) => ({ ...current, departmentObjective: event.target.value }))} /></label>
            <label><span>Expected output</span><input value={goalForm.expectedOutput} onChange={(event) => setGoalForm((current) => ({ ...current, expectedOutput: event.target.value }))} /></label>
            <label><span>Performance indicator</span><input value={goalForm.performanceIndicator} onChange={(event) => setGoalForm((current) => ({ ...current, performanceIndicator: event.target.value }))} /></label>
            <label><span>Timeline</span><input value={goalForm.timeline} onChange={(event) => setGoalForm((current) => ({ ...current, timeline: event.target.value }))} /></label>
            <label><span>Weighting</span><input value={goalForm.weighting} onChange={(event) => setGoalForm((current) => ({ ...current, weighting: event.target.value }))} /></label>
            <label><span>Due date</span><input type="date" value={goalForm.dueDate} onChange={(event) => setGoalForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
            <button
              className="primary-button"
              disabled={busyAction === "/api/performance/goals"}
              onClick={() =>
                void handlePost(
                  "/api/performance/goals",
                  {
                    ...goalForm,
                    weighting: safeNumber(goalForm.weighting),
                  },
                  "Goal created successfully."
                )
              }
              type="button"
            >
              {busyAction === "/api/performance/goals" ? "Saving..." : "Create goal"}
            </button>
          </div>
        </section>
        <section className="mini-panel">
          <h4>Create work plan</h4>
          <div className="action-form">
            <label><span>Employee</span><select className="filter-pill" value={workPlanForm.employeeId} onChange={(event) => setWorkPlanForm((current) => ({ ...current, employeeId: event.target.value }))}>{employees.map((employee) => (<option key={safeString(employee.id)} value={safeString(employee.id)}>{safeString(employee.label)}</option>))}</select></label>
            <label><span>Linked goal</span><select className="filter-pill" value={workPlanForm.goalId} onChange={(event) => setWorkPlanForm((current) => ({ ...current, goalId: event.target.value }))}><option value="">No linked goal</option>{goals.map((goal) => (<option key={safeString(goal.id)} value={safeString(goal.id)}>{safeString(goal.title)}</option>))}</select></label>
            <label><span>Quarter label</span><input value={workPlanForm.quarterLabel} onChange={(event) => setWorkPlanForm((current) => ({ ...current, quarterLabel: event.target.value }))} /></label>
            <label><span>Department objective</span><textarea rows={3} value={workPlanForm.departmentObjective} onChange={(event) => setWorkPlanForm((current) => ({ ...current, departmentObjective: event.target.value }))} /></label>
            <label><span>Individual target</span><textarea rows={3} value={workPlanForm.individualTarget} onChange={(event) => setWorkPlanForm((current) => ({ ...current, individualTarget: event.target.value }))} /></label>
            <label><span>Expected output</span><input value={workPlanForm.expectedOutput} onChange={(event) => setWorkPlanForm((current) => ({ ...current, expectedOutput: event.target.value }))} /></label>
            <label><span>Performance indicator</span><input value={workPlanForm.performanceIndicator} onChange={(event) => setWorkPlanForm((current) => ({ ...current, performanceIndicator: event.target.value }))} /></label>
            <label><span>Timeline</span><input value={workPlanForm.timeline} onChange={(event) => setWorkPlanForm((current) => ({ ...current, timeline: event.target.value }))} /></label>
            <label><span>Weighting</span><input value={workPlanForm.weighting} onChange={(event) => setWorkPlanForm((current) => ({ ...current, weighting: event.target.value }))} /></label>
            <button
              className="primary-button"
              disabled={busyAction === "/api/performance/work-plans"}
              onClick={() =>
                void handlePost(
                  "/api/performance/work-plans",
                  {
                    ...workPlanForm,
                    weighting: safeNumber(workPlanForm.weighting),
                  },
                  "Work plan created successfully."
                )
              }
              type="button"
            >
              {busyAction === "/api/performance/work-plans" ? "Saving..." : "Create work plan"}
            </button>
          </div>
        </section>
        <section className="mini-panel">
          <h4>Goals and work plans</h4>
          <div className="mini-list queue-list">
            {goals.length ? (
              goals.map((goal) => (
                <article key={safeString(goal.id)}>
                  <strong>{safeString(goal.title)}</strong>
                  <span>{safeString(goal.employeeName)} | {safeString(goal.reviewStatus, safeString(goal.status))}</span>
                  <small>{safeString(goal.target)} | Weight {safeNumber(goal.weighting)}% | Due {formatDate(goal.dueDate)}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No goals have been created yet." />
            )}
            {workPlans.length ? (
              workPlans.map((plan) => (
                <article key={safeString(plan.id)}>
                  <strong>{safeString(plan.individualTarget)}</strong>
                  <span>{safeString(plan.employeeName)} | {safeString(plan.quarterLabel)}</span>
                  <small>{safeString(plan.performanceIndicator)} | Weight {safeNumber(plan.weighting)}% | {safeString(plan.reviewStatus)}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No work plans have been created yet." />
            )}
          </div>
        </section>
      </>
    );
  }

  function renderAppraisals() {
    if (isSimpleRobotCafeWorkflow) {
      return (
        <>
          <section className="mini-panel" id="performance-primary-form">
            <h4>Launch simple appraisal cycle</h4>
            <p className="section-description">
              Robot Cafe is using the lighter appraisal path: employee self-review, supervisor review, GM final review,
              then one final downloadable appraisal form.
            </p>
            <div className="action-form">
              <label><span>Cycle title</span><input value={cycleForm.title} onChange={(event) => setCycleForm((current) => ({ ...current, title: event.target.value }))} /></label>
              <label><span>Cycle type</span><select className="filter-pill" value={cycleForm.cycleType} onChange={(event) => setCycleForm((current) => ({ ...current, cycleType: event.target.value }))}><option value="quarterly">Quarterly appraisal</option><option value="annual">Annual appraisal</option><option value="mid_year">Mid-year review</option><option value="probation">Probation review</option><option value="custom">Custom review</option></select></label>
              <label><span>Period start</span><input type="date" value={cycleForm.periodStart} onChange={(event) => setCycleForm((current) => ({ ...current, periodStart: event.target.value }))} /></label>
              <label><span>Period end</span><input type="date" value={cycleForm.periodEnd} onChange={(event) => setCycleForm((current) => ({ ...current, periodEnd: event.target.value }))} /></label>
              <button
                className="primary-button"
                disabled={busyAction === "/api/performance/cycles"}
                onClick={() =>
                  void handlePost(
                    "/api/performance/cycles",
                    {
                      title: cycleForm.title,
                      cycleType: cycleForm.cycleType,
                      periodStart: cycleForm.periodStart,
                      periodEnd: cycleForm.periodEnd,
                      scoringModel: "simple_qualitative",
                      selfEvaluationEnabled: true,
                      supervisorEvaluationEnabled: true,
                      gmEvaluationEnabled: true,
                    },
                    "Simple appraisal cycle launched successfully."
                  )
                }
                type="button"
              >
                {busyAction === "/api/performance/cycles" ? "Launching..." : "Launch simple appraisal cycle"}
              </button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Simple workflow</h4>
            <div className="mini-list queue-list">
              {simpleWorkflowSteps.map((step) => (
                <article key={step}>
                  <strong>{step}</strong>
                </article>
              ))}
              {simpleWorkflowAreas.map((area) => (
                <article key={safeString(area.title)}>
                  <strong>{safeString(area.title)}</strong>
                  <span>{safeString(area.expectedOutput, safeString(area.performanceIndicator))}</span>
                </article>
              ))}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Appraisal cycles</h4>
            <div className="mini-list queue-list">
              {cycles.length ? (
                cycles.map((cycle) => (
                  <article key={safeString(cycle.id)}>
                    <strong>{safeString(cycle.title)}</strong>
                    <span>{safeString(cycle.cycleType)} | {formatDate(cycle.periodStart)} to {formatDate(cycle.periodEnd)}</span>
                    <small>{safeString(cycle.status)} | Employee, Supervisor, and GM workflow</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No appraisal cycles have been launched yet." />
              )}
            </div>
          </section>
        </>
      );
    }

    return (
      <>
        <section className="mini-panel" id="performance-primary-form">
          <h4>Launch appraisal cycle</h4>
          <div className="action-form">
            <label><span>Cycle title</span><input value={cycleForm.title} onChange={(event) => setCycleForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <label><span>Cycle type</span><select className="filter-pill" value={cycleForm.cycleType} onChange={(event) => setCycleForm((current) => ({ ...current, cycleType: event.target.value }))}><option value="quarterly">Quarterly appraisal</option><option value="annual">Annual appraisal</option><option value="mid_year">Mid-year review</option><option value="probation">Probation review</option><option value="promotion">Promotion review</option><option value="custom">Custom review</option></select></label>
            <label><span>Period start</span><input type="date" value={cycleForm.periodStart} onChange={(event) => setCycleForm((current) => ({ ...current, periodStart: event.target.value }))} /></label>
            <label><span>Period end</span><input type="date" value={cycleForm.periodEnd} onChange={(event) => setCycleForm((current) => ({ ...current, periodEnd: event.target.value }))} /></label>
            <label><span>Scoring model</span><input value={cycleForm.scoringModel} onChange={(event) => setCycleForm((current) => ({ ...current, scoringModel: event.target.value }))} /></label>
            <label><span>Self-evaluation</span><select className="filter-pill" value={cycleForm.selfEvaluationEnabled ? "yes" : "no"} onChange={(event) => setCycleForm((current) => ({ ...current, selfEvaluationEnabled: event.target.value === "yes" }))}><option value="yes">Enabled</option><option value="no">Disabled</option></select></label>
            <label><span>Supervisor evaluation</span><select className="filter-pill" value={cycleForm.supervisorEvaluationEnabled ? "yes" : "no"} onChange={(event) => setCycleForm((current) => ({ ...current, supervisorEvaluationEnabled: event.target.value === "yes" }))}><option value="yes">Enabled</option><option value="no">Disabled</option></select></label>
            <label><span>GM evaluation</span><select className="filter-pill" value={cycleForm.gmEvaluationEnabled ? "yes" : "no"} onChange={(event) => setCycleForm((current) => ({ ...current, gmEvaluationEnabled: event.target.value === "yes" }))}><option value="yes">Enabled</option><option value="no">Disabled</option></select></label>
            <button
              className="primary-button"
              disabled={busyAction === "/api/performance/cycles"}
              onClick={() => void handlePost("/api/performance/cycles", cycleForm, "Appraisal cycle launched successfully.")}
              type="button"
            >
              {busyAction === "/api/performance/cycles" ? "Launching..." : "Launch appraisal cycle"}
            </button>
          </div>
        </section>
        <section className="mini-panel">
          <h4>Appraisal cycles</h4>
          <div className="mini-list queue-list">
            {cycles.length ? (
              cycles.map((cycle) => (
                <article key={safeString(cycle.id)}>
                  <strong>{safeString(cycle.title)}</strong>
                  <span>{safeString(cycle.cycleType)} | {formatDate(cycle.periodStart)} to {formatDate(cycle.periodEnd)}</span>
                  <small>{safeString(cycle.status)} | Self {cycle.selfEvaluationEnabled ? "on" : "off"} | Supervisor {cycle.supervisorEvaluationEnabled ? "on" : "off"} | GM {cycle.gmEvaluationEnabled ? "on" : "off"}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No appraisal cycles have been launched yet." />
            )}
          </div>
        </section>
      </>
    );
  }

  function renderReviews() {
    if (isSimpleRobotCafeWorkflow) {
      return (
        <section className="mini-panel" id="performance-primary-form">
          <h4>Simple appraisal reviews</h4>
          <div className="mini-list queue-list">
            {reviews.length ? (
              reviews.map((review) => {
                const draft =
                  reviewDrafts[safeString(review.id)] ??
                  ({
                    stage: getDefaultReviewStage(viewerRole, payrollAdminActionEnabled),
                    supervisorComments: safeString(review.supervisorComments),
                    gmComments: safeString(review.gmComments),
                    hrComments: safeString(review.hrComments),
                    correctiveAction: safeString(review.correctiveAction),
                    nextQuarterActions: safeString(review.nextQuarterActions),
                    trainingRecommendation: safeString(review.trainingRecommendation),
                    rewardRecommendation: safeString(review.rewardRecommendation),
                    finalDecision: safeString(review.finalDecision),
                    potentialRating: safeString(review.potentialRating, "Medium"),
                    pipRecommendation: Boolean(review.pipRecommendation),
                    promotionRecommendation: Boolean(review.promotionRecommendation),
                  } satisfies ReviewDraft);
                const items = asRecordArray(review.items);
                const waitingForEmployee = safeString(review.status) === "self_review_pending";
                const waitingForSupervisor = safeString(review.status) === "supervisor_review_pending";
                const waitingForGm = safeString(review.status) === "gm_review_pending";

                return (
                  <article key={safeString(review.id)}>
                    <strong>{safeString(review.employeeName)} | {safeString(review.title)}</strong>
                    <span>{safeString(review.reviewPeriodLabel, `${safeString(review.periodStart)} to ${safeString(review.periodEnd)}`)}</span>
                    <small>
                      {safeString(review.status)} | Final score {safeNumber(review.finalScore).toFixed(2)}/99 |{" "}
                      {safeString(review.finalDecision, safeString(review.ratingBand, "Pending decision"))}
                    </small>
                    <div className="inline-actions">
                      <button className="ghost-button" disabled={busyAction === `report-${safeString(review.id)}-inline`} onClick={() => void handleOpenPerformanceReport(safeString(review.id), "inline")} type="button">
                        Preview report
                      </button>
                      <button className="ghost-button" disabled={busyAction === `report-${safeString(review.id)}-attachment`} onClick={() => void handleOpenPerformanceReport(safeString(review.id), "attachment")} type="button">
                        Download report
                      </button>
                    </div>

                    <p className="section-description">
                      {waitingForEmployee
                        ? "Waiting for the employee to complete the short self-review."
                        : waitingForSupervisor
                          ? "Ready for supervisor evaluation."
                          : waitingForGm
                            ? "Ready for General Manager final review."
                            : "Finalized appraisal record."}
                    </p>

                    <div className="mini-panel">
                      <h4>Employee self-review</h4>
                      <p className="section-description"><strong>What went well:</strong> {safeString(review.selfComments, "-")}</p>
                      <p className="section-description"><strong>Challenges:</strong> {safeString(review.challengesSummary, "-")}</p>
                      <p className="section-description"><strong>Support needed:</strong> {safeString(review.supportRequired, "-")}</p>
                    </div>

                    {waitingForEmployee ? null : (
                      <div className="action-form compact-form">
                        <label>
                          <span>Review stage</span>
                          <select
                            className="filter-pill"
                            value={draft.stage}
                            onChange={(event) =>
                              setReviewDrafts((current) => ({
                                ...current,
                                [safeString(review.id)]: {
                                  ...draft,
                                  stage: event.target.value === "gm" ? "gm" : "supervisor",
                                },
                              }))
                            }
                          >
                            {viewerRole === "Supervisor" || viewerRole === "Payroll Admin" ? <option value="supervisor">Supervisor review</option> : null}
                            {["Manager", "HR Admin", "Super Admin"].includes(viewerRole) ? <option value="gm">GM final review</option> : null}
                          </select>
                        </label>
                        <div className="inline-actions">
                          <button
                            className="ghost-button"
                            disabled={busyAction === `review-ai-${safeString(review.id)}`}
                            onClick={() => void handleReviewAssist(review, draft)}
                            type="button"
                          >
                            {busyAction === `review-ai-${safeString(review.id)}`
                              ? "Drafting..."
                              : draft.stage === "gm"
                                ? "Help me finalize this"
                                : "Help me draft this"}
                          </button>
                        </div>

                        {items.map((item) => {
                          const itemId = safeString(item.id);
                          const itemDraft = reviewItemDrafts[itemId] ?? {
                            actualText: safeString(item.actualText),
                            actualValue: safeNumber(item.actualValue).toString(),
                            supervisorScore: safeNumber(item.supervisorScore).toString(),
                            gmScore: safeNumber(item.gmScore).toString(),
                            evaluatorComments: safeString(item.evaluatorComments),
                          };

                          return (
                            <div className="mini-panel" key={itemId}>
                              <h4>{safeString(item.title)}</h4>
                              <p className="section-description">{safeString(item.expectedOutput, safeString(item.targetText, safeString(item.performanceIndicator, "-")))}</p>
                              <div className="action-form compact-form">
                                {draft.stage === "supervisor" ? (
                                  <label><span>Supervisor score</span><select className="filter-pill" value={itemDraft.supervisorScore || "0"} onChange={(event) => setReviewItemDrafts((current) => ({ ...current, [itemId]: { ...itemDraft, supervisorScore: event.target.value } }))}><option value="0">Select</option><option value="1">1 - Needs improvement</option><option value="2">2 - Fair</option><option value="3">3 - Good</option><option value="4">4 - Very good</option><option value="5">5 - Excellent</option></select></label>
                                ) : null}
                                {draft.stage === "gm" ? (
                                  <label><span>GM score</span><select className="filter-pill" value={itemDraft.gmScore || "0"} onChange={(event) => setReviewItemDrafts((current) => ({ ...current, [itemId]: { ...itemDraft, gmScore: event.target.value } }))}><option value="0">Select</option><option value="1">1 - Needs improvement</option><option value="2">2 - Fair</option><option value="3">3 - Good</option><option value="4">4 - Very good</option><option value="5">5 - Excellent</option></select></label>
                                ) : null}
                                {draft.stage === "supervisor" ? (
                                  <label><span>Supervisor note</span><textarea rows={2} value={itemDraft.evaluatorComments} onChange={(event) => setReviewItemDrafts((current) => ({ ...current, [itemId]: { ...itemDraft, evaluatorComments: event.target.value } }))} /></label>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}

                        {draft.stage === "supervisor" ? (
                          <>
                            <label><span>Strengths observed</span><textarea rows={3} value={draft.supervisorComments} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, supervisorComments: event.target.value } }))} /></label>
                            <label><span>Areas to improve</span><textarea rows={3} value={draft.correctiveAction} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, correctiveAction: event.target.value } }))} /></label>
                            <label><span>Supervisor recommendation</span><textarea rows={3} value={draft.trainingRecommendation} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, trainingRecommendation: event.target.value } }))} /></label>
                          </>
                        ) : null}

                        {draft.stage === "gm" ? (
                          <>
                            <label><span>GM management remark</span><textarea rows={3} value={draft.gmComments} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, gmComments: event.target.value } }))} /></label>
                            <label><span>Final outcome</span><select className="filter-pill" value={draft.finalDecision} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, finalDecision: event.target.value } }))}><option value="">Select final outcome</option>{simpleWorkflowOutcomes.map((outcome) => (<option key={outcome} value={outcome}>{outcome}</option>))}</select></label>
                            <label><span>Next action</span><textarea rows={3} value={draft.nextQuarterActions} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, nextQuarterActions: event.target.value } }))} /></label>
                          </>
                        ) : null}

                        <button className="primary-button" disabled={busyAction === `review-${safeString(review.id)}`} onClick={() => void handleReviewSubmit(safeString(review.id))} type="button">
                          {busyAction === `review-${safeString(review.id)}` ? "Saving..." : draft.stage === "gm" ? "Finalize review" : "Submit supervisor review"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <SectionMessage text="No appraisal reviews are available yet." />
            )}
          </div>
        </section>
      );
    }

    return (
      <section className="mini-panel" id="performance-primary-form">
        <h4>Performance reviews</h4>
        <div className="mini-list queue-list">
          {reviews.length ? (
            reviews.map((review) => {
              const draft =
                reviewDrafts[safeString(review.id)] ??
                ({
                  stage: getDefaultReviewStage(viewerRole, payrollAdminActionEnabled),
                  supervisorComments: safeString(review.supervisorComments),
                  gmComments: safeString(review.gmComments),
                  hrComments: safeString(review.hrComments),
                  correctiveAction: safeString(review.correctiveAction),
                  nextQuarterActions: safeString(review.nextQuarterActions),
                  trainingRecommendation: safeString(review.trainingRecommendation),
                  rewardRecommendation: safeString(review.rewardRecommendation),
                  finalDecision: safeString(review.finalDecision),
                  potentialRating: safeString(review.potentialRating, "Medium"),
                  pipRecommendation: Boolean(review.pipRecommendation),
                  promotionRecommendation: Boolean(review.promotionRecommendation),
                } satisfies ReviewDraft);
              const items = asRecordArray(review.items);
              return (
                <article key={safeString(review.id)}>
                  <strong>{safeString(review.employeeName)} | {safeString(review.title)}</strong>
                  <span>{safeString(review.status)} | Score {safeNumber(review.finalScore).toFixed(2)} | {safeString(review.ratingBand, "Pending rating")}</span>
                  <small>{safeString(review.reviewPeriodLabel, `${safeString(review.periodStart)} to ${safeString(review.periodEnd)}`)}</small>
                  <div className="inline-actions">
                    <button className="ghost-button" disabled={busyAction === `report-${safeString(review.id)}-inline`} onClick={() => void handleOpenPerformanceReport(safeString(review.id), "inline")} type="button">
                      Preview report
                    </button>
                    <button className="ghost-button" disabled={busyAction === `report-${safeString(review.id)}-attachment`} onClick={() => void handleOpenPerformanceReport(safeString(review.id), "attachment")} type="button">
                      Download report
                    </button>
                  </div>
                  <div className="action-form compact-form">
                    <label>
                      <span>Review stage</span>
                      <select
                        className="filter-pill"
                        value={draft.stage}
                        onChange={(event) =>
                          setReviewDrafts((current) => ({
                            ...current,
                            [safeString(review.id)]: {
                              ...draft,
                              stage: event.target.value === "gm" ? "gm" : "supervisor",
                            },
                          }))
                        }
                      >
                        {viewerRole === "Supervisor" ? <option value="supervisor">Supervisor evaluation</option> : null}
                        {["Manager", "HR Admin", "Super Admin"].includes(viewerRole) ? <option value="gm">GM / calibration</option> : null}
                        {viewerRole === "Payroll Admin" && payrollAdminActionEnabled ? <option value="supervisor">Payroll review support</option> : null}
                      </select>
                    </label>
                    <div className="inline-actions">
                      <button
                        className="ghost-button"
                        disabled={busyAction === `review-ai-${safeString(review.id)}`}
                        onClick={() => void handleReviewAssist(review, draft)}
                        type="button"
                      >
                        {busyAction === `review-ai-${safeString(review.id)}`
                          ? "Drafting..."
                          : draft.stage === "gm"
                            ? "Help me finalize this"
                            : "Help me draft this"}
                      </button>
                    </div>
                    {items.map((item) => {
                      const itemId = safeString(item.id);
                      const itemDraft = reviewItemDrafts[itemId] ?? {
                        actualText: safeString(item.actualText),
                        actualValue: safeNumber(item.actualValue).toString(),
                        supervisorScore: safeNumber(item.supervisorScore).toString(),
                        gmScore: safeNumber(item.gmScore).toString(),
                        evaluatorComments: safeString(item.evaluatorComments),
                      };
                      return (
                        <div className="mini-panel" key={itemId}>
                          <h4>{safeString(item.title)}</h4>
                          <p className="section-description">
                            Target {safeString(item.targetText, safeNumber(item.targetValue).toLocaleString())} | Actual {safeString(item.actualText, safeNumber(item.actualValue).toLocaleString())} | Weight {safeNumber(item.weightPercent)}% | {safeString(item.ratingBand, "Pending")}
                          </p>
                          <div className="action-form compact-form">
                            <label><span>Actual value</span><input value={itemDraft.actualValue} onChange={(event) => setReviewItemDrafts((current) => ({ ...current, [itemId]: { ...itemDraft, actualValue: event.target.value } }))} /></label>
                            <label><span>Actual text</span><input value={itemDraft.actualText} onChange={(event) => setReviewItemDrafts((current) => ({ ...current, [itemId]: { ...itemDraft, actualText: event.target.value } }))} /></label>
                            {draft.stage === "supervisor" ? (
                              <label><span>Supervisor score</span><input value={itemDraft.supervisorScore} onChange={(event) => setReviewItemDrafts((current) => ({ ...current, [itemId]: { ...itemDraft, supervisorScore: event.target.value } }))} /></label>
                            ) : null}
                            {draft.stage === "gm" ? (
                              <label><span>GM score</span><input value={itemDraft.gmScore} onChange={(event) => setReviewItemDrafts((current) => ({ ...current, [itemId]: { ...itemDraft, gmScore: event.target.value } }))} /></label>
                            ) : null}
                            <label><span>Evaluator comments</span><textarea rows={2} value={itemDraft.evaluatorComments} onChange={(event) => setReviewItemDrafts((current) => ({ ...current, [itemId]: { ...itemDraft, evaluatorComments: event.target.value } }))} /></label>
                          </div>
                        </div>
                      );
                    })}
                    {draft.stage === "supervisor" ? (
                      <>
                        <label><span>Supervisor comments</span><textarea rows={3} value={draft.supervisorComments} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, supervisorComments: event.target.value } }))} /></label>
                        <label><span>Training recommendation</span><input value={draft.trainingRecommendation} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, trainingRecommendation: event.target.value } }))} /></label>
                        <label><span>Reward recommendation</span><input value={draft.rewardRecommendation} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, rewardRecommendation: event.target.value } }))} /></label>
                        <label><span>PIP recommendation</span><select className="filter-pill" value={draft.pipRecommendation ? "yes" : "no"} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, pipRecommendation: event.target.value === "yes" } }))}><option value="no">No</option><option value="yes">Yes</option></select></label>
                        <label><span>Promotion recommendation</span><select className="filter-pill" value={draft.promotionRecommendation ? "yes" : "no"} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, promotionRecommendation: event.target.value === "yes" } }))}><option value="no">No</option><option value="yes">Yes</option></select></label>
                      </>
                    ) : (
                      <>
                        <label><span>GM comments</span><textarea rows={3} value={draft.gmComments} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, gmComments: event.target.value } }))} /></label>
                        <label><span>Final decision</span><input value={draft.finalDecision} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, finalDecision: event.target.value } }))} /></label>
                        <label><span>Potential rating</span><select className="filter-pill" value={draft.potentialRating} onChange={(event) => setReviewDrafts((current) => ({ ...current, [safeString(review.id)]: { ...draft, potentialRating: event.target.value } }))}><option>Low</option><option>Medium</option><option>High</option></select></label>
                      </>
                    )}
                    <button className="primary-button" disabled={busyAction === `review-${safeString(review.id)}`} onClick={() => void handleReviewSubmit(safeString(review.id))} type="button">
                      {busyAction === `review-${safeString(review.id)}` ? "Saving..." : "Submit review stage"}
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <SectionMessage text="No appraisal reviews are in scope yet. Launch a cycle after setting KPIs and goals." />
          )}
        </div>
      </section>
    );
  }

  function renderPips() {
    return (
      <>
        <section className="mini-panel" id="performance-primary-form">
          <h4>Create performance improvement plan</h4>
          <div className="action-form">
            <label><span>Employee</span><select className="filter-pill" value={pipForm.employeeId} onChange={(event) => setPipForm((current) => ({ ...current, employeeId: event.target.value }))}>{employees.map((employee) => (<option key={safeString(employee.id)} value={safeString(employee.id)}>{safeString(employee.label)}</option>))}</select></label>
            <label><span>Linked review</span><select className="filter-pill" value={pipForm.reviewId} onChange={(event) => setPipForm((current) => ({ ...current, reviewId: event.target.value }))}><option value="">No linked review</option>{reviews.map((review) => (<option key={safeString(review.id)} value={safeString(review.id)}>{safeString(review.employeeName)} | {safeString(review.title)}</option>))}</select></label>
            <label><span>Issue</span><textarea rows={3} value={pipForm.issue} onChange={(event) => setPipForm((current) => ({ ...current, issue: event.target.value }))} /></label>
            <label><span>Improvement target</span><textarea rows={3} value={pipForm.improvementTarget} onChange={(event) => setPipForm((current) => ({ ...current, improvementTarget: event.target.value }))} /></label>
            <label><span>Support required</span><textarea rows={3} value={pipForm.supportRequired} onChange={(event) => setPipForm((current) => ({ ...current, supportRequired: event.target.value }))} /></label>
            <label><span>Review date</span><input type="date" value={pipForm.reviewDate} onChange={(event) => setPipForm((current) => ({ ...current, reviewDate: event.target.value }))} /></label>
            <button className="primary-button" disabled={busyAction === "/api/performance/pips"} onClick={() => void handlePost("/api/performance/pips", pipForm, "PIP created successfully.")} type="button">
              {busyAction === "/api/performance/pips" ? "Saving..." : "Create PIP"}
            </button>
          </div>
        </section>
        <section className="mini-panel">
          <h4>Active PIPs</h4>
          <div className="mini-list queue-list">
            {pips.length ? (
              pips.map((pip) => (
                <article key={safeString(pip.id)}>
                  <strong>{safeString(pip.employeeName)}</strong>
                  <span>{safeString(pip.status)} | Review {formatDate(pip.reviewDate)}</span>
                  <small>{safeString(pip.issue)} | Target: {safeString(pip.improvementTarget)}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No PIPs are active yet." />
            )}
          </div>
        </section>
      </>
    );
  }

  function renderPromotionCases() {
    return (
      <>
        <section className="mini-panel" id="performance-primary-form">
          <h4>Create promotion case</h4>
          <div className="action-form">
            <label><span>Employee</span><select className="filter-pill" value={promotionForm.employeeId} onChange={(event) => setPromotionForm((current) => ({ ...current, employeeId: event.target.value }))}>{employees.map((employee) => (<option key={safeString(employee.id)} value={safeString(employee.id)}>{safeString(employee.label)}</option>))}</select></label>
            <label><span>Linked review</span><select className="filter-pill" value={promotionForm.reviewId} onChange={(event) => setPromotionForm((current) => ({ ...current, reviewId: event.target.value }))}><option value="">No linked review</option>{reviews.map((review) => (<option key={safeString(review.id)} value={safeString(review.id)}>{safeString(review.employeeName)} | {safeString(review.title)}</option>))}</select></label>
            <label><span>Current role</span><input value={promotionForm.currentRole} onChange={(event) => setPromotionForm((current) => ({ ...current, currentRole: event.target.value }))} /></label>
            <label><span>Proposed role</span><input value={promotionForm.proposedRole} onChange={(event) => setPromotionForm((current) => ({ ...current, proposedRole: event.target.value }))} /></label>
            <label><span>Current salary</span><input value={promotionForm.currentSalary} onChange={(event) => setPromotionForm((current) => ({ ...current, currentSalary: event.target.value }))} /></label>
            <label><span>Proposed salary</span><input value={promotionForm.proposedSalary} onChange={(event) => setPromotionForm((current) => ({ ...current, proposedSalary: event.target.value }))} /></label>
            <label><span>Effective date</span><input type="date" value={promotionForm.effectiveDate} onChange={(event) => setPromotionForm((current) => ({ ...current, effectiveDate: event.target.value }))} /></label>
            <label><span>Performance justification</span><textarea rows={4} value={promotionForm.performanceJustification} onChange={(event) => setPromotionForm((current) => ({ ...current, performanceJustification: event.target.value }))} /></label>
            <label><span>Create linked salary request</span><select className="filter-pill" value={promotionForm.createSalaryRequest ? "yes" : "no"} onChange={(event) => setPromotionForm((current) => ({ ...current, createSalaryRequest: event.target.value === "yes" }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
            <button
              className="primary-button"
              disabled={busyAction === "/api/performance/promotion-cases"}
              onClick={() =>
                void handlePost(
                  "/api/performance/promotion-cases",
                  {
                    ...promotionForm,
                    currentSalary: safeNumber(promotionForm.currentSalary),
                    proposedSalary: safeNumber(promotionForm.proposedSalary),
                  },
                  "Promotion case created successfully."
                )
              }
              type="button"
            >
              {busyAction === "/api/performance/promotion-cases" ? "Saving..." : "Create promotion case"}
            </button>
          </div>
        </section>
        <section className="mini-panel">
          <h4>Promotion cases</h4>
          <div className="mini-list queue-list">
            {promotionCases.length ? (
              promotionCases.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.employeeName)}</strong>
                  <span>{safeString(item.currentRole)} to {safeString(item.proposedRole)} | {safeString(item.status)}</span>
                  <small>Current salary {safeNumber(item.currentSalary).toLocaleString()} | Proposed {safeNumber(item.proposedSalary).toLocaleString()} | Payroll impact {item.payrollImpactFlag ? "Yes" : "No"}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No promotion cases are in workflow yet." />
            )}
          </div>
        </section>
      </>
    );
  }

  function renderSuccessionPlanning() {
    return (
      <>
        <section className="mini-panel" id="performance-primary-form">
          <h4>Critical role setup</h4>
          <div className="action-form">
            <label><span>Role title</span><input value={successionRoleForm.roleTitle} onChange={(event) => setSuccessionRoleForm((current) => ({ ...current, roleTitle: event.target.value }))} /></label>
            <label><span>Criticality</span><select className="filter-pill" value={successionRoleForm.criticality} onChange={(event) => setSuccessionRoleForm((current) => ({ ...current, criticality: event.target.value }))}><option>high</option><option>medium</option><option>low</option></select></label>
            <label><span>Risk level</span><select className="filter-pill" value={successionRoleForm.riskLevel} onChange={(event) => setSuccessionRoleForm((current) => ({ ...current, riskLevel: event.target.value }))}><option>high</option><option>medium</option><option>low</option></select></label>
            <label><span>Notes</span><textarea rows={3} value={successionRoleForm.notes} onChange={(event) => setSuccessionRoleForm((current) => ({ ...current, notes: event.target.value }))} /></label>
            <button className="primary-button" disabled={busyAction === "/api/performance/succession"} onClick={() => void handlePost("/api/performance/succession", successionRoleForm, "Succession role created successfully.")} type="button">
              Create critical role
            </button>
          </div>
        </section>
        <section className="mini-panel">
          <h4>Add successor</h4>
          <div className="action-form">
            <label><span>Critical role</span><select className="filter-pill" value={successionCandidateForm.successionRoleId} onChange={(event) => setSuccessionCandidateForm((current) => ({ ...current, successionRoleId: event.target.value }))}>{successionRoles.map((role) => (<option key={safeString(role.id)} value={safeString(role.id)}>{safeString(role.roleTitle)}</option>))}</select></label>
            <label><span>Employee</span><select className="filter-pill" value={successionCandidateForm.employeeId} onChange={(event) => setSuccessionCandidateForm((current) => ({ ...current, employeeId: event.target.value }))}>{employees.map((employee) => (<option key={safeString(employee.id)} value={safeString(employee.id)}>{safeString(employee.label)}</option>))}</select></label>
            <label><span>Readiness</span><select className="filter-pill" value={successionCandidateForm.readinessLevel} onChange={(event) => setSuccessionCandidateForm((current) => ({ ...current, readinessLevel: event.target.value }))}><option>Ready Now</option><option>Ready Soon</option><option>Ready Later</option></select></label>
            <label><span>Development actions</span><textarea rows={3} value={successionCandidateForm.developmentActions} onChange={(event) => setSuccessionCandidateForm((current) => ({ ...current, developmentActions: event.target.value }))} /></label>
            <label><span>GM comments</span><textarea rows={3} value={successionCandidateForm.gmComments} onChange={(event) => setSuccessionCandidateForm((current) => ({ ...current, gmComments: event.target.value }))} /></label>
            <button className="primary-button" disabled={busyAction === "/api/performance/succession"} onClick={() => void handlePost("/api/performance/succession", { entityType: "candidate", ...successionCandidateForm }, "Succession candidate saved successfully.")} type="button">
              Add successor
            </button>
          </div>
        </section>
        <section className="mini-panel">
          <h4>Succession map</h4>
          <div className="mini-list queue-list">
            {successionRoles.length ? successionRoles.map((role) => (
              <article key={safeString(role.id)}>
                <strong>{safeString(role.roleTitle)}</strong>
                <span>{safeString(role.criticality)} criticality | {safeString(role.riskLevel)} risk</span>
                <small>{safeString(role.incumbentName, "No incumbent assigned")}</small>
              </article>
            )) : <SectionMessage text="No critical roles have been defined yet." />}
            {successionCandidates.length ? successionCandidates.map((candidate) => (
              <article key={safeString(candidate.id)}>
                <strong>{safeString(candidate.employeeName)}</strong>
                <span>{safeString(candidate.readinessLevel)} | {safeString(candidate.status)}</span>
                <small>{safeString(candidate.developmentActions, "No development actions recorded.")}</small>
              </article>
            )) : <SectionMessage text="No successors have been mapped yet." />}
          </div>
        </section>
      </>
    );
  }

  function renderTalentMatrix() {
    return (
      <>
        <section className="mini-panel" id="performance-primary-form">
          <h4>Create talent assessment</h4>
          <div className="action-form">
            <label><span>Employee</span><select className="filter-pill" value={talentForm.employeeId} onChange={(event) => setTalentForm((current) => ({ ...current, employeeId: event.target.value }))}>{employees.map((employee) => (<option key={safeString(employee.id)} value={safeString(employee.id)}>{safeString(employee.label)}</option>))}</select></label>
            <label><span>Linked review</span><select className="filter-pill" value={talentForm.reviewId} onChange={(event) => setTalentForm((current) => ({ ...current, reviewId: event.target.value }))}><option value="">No linked review</option>{reviews.map((review) => (<option key={safeString(review.id)} value={safeString(review.id)}>{safeString(review.employeeName)} | {safeString(review.title)}</option>))}</select></label>
            <label><span>Performance band</span><select className="filter-pill" value={talentForm.performanceBand} onChange={(event) => setTalentForm((current) => ({ ...current, performanceBand: event.target.value }))}><option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option><option>Very Poor</option></select></label>
            <label><span>Potential rating</span><select className="filter-pill" value={talentForm.potentialRating} onChange={(event) => setTalentForm((current) => ({ ...current, potentialRating: event.target.value }))}><option>Low</option><option>Medium</option><option>High</option></select></label>
            <label><span>Notes</span><textarea rows={3} value={talentForm.notes} onChange={(event) => setTalentForm((current) => ({ ...current, notes: event.target.value }))} /></label>
            <button className="primary-button" disabled={busyAction === "/api/performance/talent-matrix"} onClick={() => void handlePost("/api/performance/talent-matrix", talentForm, "Talent assessment created successfully.")} type="button">
              Save talent assessment
            </button>
          </div>
        </section>
        <section className="mini-panel">
          <h4>Talent matrix</h4>
          <div className="mini-list queue-list">
            {talentAssessments.length ? (
              talentAssessments.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.employeeName)}</strong>
                  <span>{safeString(item.performanceBand)} performance | {safeString(item.potentialRating)} potential</span>
                  <small>{safeString(item.matrixBox)} | {safeString(item.notes, "No notes")}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No talent assessments have been captured yet." />
            )}
          </div>
        </section>
      </>
    );
  }

  function renderReports() {
    return (
      <section className="mini-panel" id="performance-primary-form">
        <h4>Performance reports</h4>
        <div className="mini-list queue-list">
          {reviews.length ? (
            reviews.map((review) => (
              <article key={safeString(review.id)}>
                <strong>{safeString(review.employeeName)}</strong>
                <span>{safeString(review.title)} | {safeString(review.provisionalStatus)} | {safeString(review.ratingBand, "Pending rating")}</span>
                <small>Final score {safeNumber(review.finalScore).toFixed(2)} | Items {safeNumber(review.itemCount)}</small>
                <div className="inline-actions">
                  <button className="ghost-button" disabled={busyAction === `report-${safeString(review.id)}-inline`} onClick={() => void handleOpenPerformanceReport(safeString(review.id), "inline")} type="button">
                    Preview report
                  </button>
                  <button className="primary-button" disabled={busyAction === `report-${safeString(review.id)}-attachment`} onClick={() => void handleOpenPerformanceReport(safeString(review.id), "attachment")} type="button">
                    Download report
                  </button>
                </div>
              </article>
            ))
          ) : (
            <SectionMessage text="No appraisal reports can be generated yet because there are no active appraisal reviews." />
          )}
        </div>
      </section>
    );
  }

  function renderSettings() {
    return (
      <>
        <section className="mini-panel" id="performance-primary-form">
          <h4>Performance settings</h4>
          <div className="action-form">
            <label><span>Payroll Admin visibility</span><select className="filter-pill" value={settingsDraft.payrollAdminVisibilityEnabled ? "yes" : "no"} onChange={(event) => setSettingsDraft((current) => ({ ...current, payrollAdminVisibilityEnabled: event.target.value === "yes" }))}><option value="yes">Enabled</option><option value="no">Disabled</option></select></label>
            <label><span>Payroll Admin action access</span><select className="filter-pill" value={settingsDraft.payrollAdminActionEnabled ? "yes" : "no"} onChange={(event) => setSettingsDraft((current) => ({ ...current, payrollAdminActionEnabled: event.target.value === "yes" }))}><option value="yes">Enabled</option><option value="no">Disabled</option></select></label>
            <label><span>KPI categories (one per line)</span><textarea rows={8} value={settingsDraft.kpiCategoriesText} onChange={(event) => setSettingsDraft((current) => ({ ...current, kpiCategoriesText: event.target.value }))} /></label>
            <button
              className="primary-button"
              disabled={busyAction === "performance-settings"}
              onClick={async () => {
                setBusyAction("performance-settings");
                setActionMessage("");
                try {
                  await readJson("/api/performance/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      payrollAdminVisibilityEnabled: settingsDraft.payrollAdminVisibilityEnabled,
                      payrollAdminActionEnabled: settingsDraft.payrollAdminActionEnabled,
                      kpiCategories: settingsDraft.kpiCategoriesText
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    }),
                  });
                  setActionMessage("Performance settings updated.");
                  await loadWorkspace();
                } catch (error) {
                  setActionMessage(error instanceof Error ? error.message : "Could not save performance settings.");
                } finally {
                  setBusyAction("");
                }
              }}
              type="button"
            >
              {busyAction === "performance-settings" ? "Saving..." : "Save settings"}
            </button>
          </div>
        </section>
        <section className="mini-panel">
          <h4>Solva AI guidance</h4>
          <div className="mini-list queue-list">
            {Object.entries(aiAssist ?? {}).length ? (
              Object.entries(aiAssist ?? {}).map(([role, prompts]) => (
                <article key={role}>
                  <strong>{role.toUpperCase()}</strong>
                  <span>{asStringArray(prompts).join(" | ")}</span>
                </article>
              ))
            ) : (
              <SectionMessage text="AI guidance prompts are not configured yet." />
            )}
          </div>
        </section>
      </>
    );
  }

  function renderOverview() {
    return (
      <>
        <section className="mini-panel">
          <h4>Top performers</h4>
          <div className="mini-list queue-list">
            {asRecordArray(summary?.topPerformers).length ? (
              asRecordArray(summary?.topPerformers).map((item, index) => (
                <article key={`${safeString(item.name)}-${index}`}>
                  <strong>{safeString(item.name)}</strong>
                  <span>{safeString(item.ratingBand)} | Score {safeNumber(item.score).toFixed(2)}</span>
                </article>
              ))
            ) : (
              <SectionMessage text="No top performer data yet." />
            )}
          </div>
        </section>
        <section className="mini-panel">
          <h4>At-risk staff</h4>
          <div className="mini-list queue-list">
            {asRecordArray(summary?.atRiskStaff).length ? (
              asRecordArray(summary?.atRiskStaff).map((item, index) => (
                <article key={`${safeString(item.name)}-${index}`}>
                  <strong>{safeString(item.name)}</strong>
                  <span>{safeString(item.ratingBand)} | Score {safeNumber(item.score).toFixed(2)}</span>
                </article>
              ))
            ) : (
              <SectionMessage text="No at-risk staff are currently flagged." />
            )}
          </div>
        </section>
      </>
    );
  }

  function renderCurrentSection() {
    switch (currentSection) {
      case "KPIs":
        return renderKpis();
      case "Goals":
        return renderGoals();
      case "Appraisals":
        return renderAppraisals();
      case "Performance Reviews":
        return renderReviews();
      case "Performance Improvement Plans":
        return renderPips();
      case "Promotion Cases":
        return renderPromotionCases();
      case "Succession Planning":
        return renderSuccessionPlanning();
      case "Talent Matrix":
        return renderTalentMatrix();
      case "Performance Reports":
        return renderReports();
      case "Performance Settings":
        return renderSettings();
      default:
        return renderOverview();
    }
  }

  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Performance</p>
          <h3>{currentSection}</h3>
        </div>
        <div className="inline-actions">
          <button className="primary-button" onClick={scrollToPrimaryForm} type="button">
            {primaryActionLabel}
          </button>
          <button className="ghost-button" onClick={() => void loadWorkspace()} type="button">
            Refresh
          </button>
        </div>
      </div>
      <p className="workspace-intro">
        {isSimpleRobotCafeWorkflow
          ? "Robot Cafe is now using the simpler appraisal flow: employee self-review, supervisor evaluation, GM final review, then one final downloadable appraisal form."
          : "This workspace ties KPI design, appraisal workflow, development actions, promotion support, and PAS-style reporting into one controlled performance operating flow."}
      </p>

      {actionMessage ? <p className="section-description">{actionMessage}</p> : null}
      {workspaceState.error ? <p className="section-description">{workspaceState.error}</p> : null}

      {workspaceState.loading && !workspace ? (
        <EmptyState title="Loading performance workspace" text="Pulling live Robot Cafe performance data and appraisal records." />
      ) : null}

      {!workspaceState.loading && !workspace ? (
        <EmptyState title="Performance workspace unavailable" text="No performance data is available for this role or tenant scope yet." />
      ) : null}

      {workspace ? (
        <>
          <div className="metric-grid compact-grid">
            {metricCards.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.hint}</small>
              </article>
            ))}
          </div>
          <div className="workbench-grid">
            {renderCurrentSection()}
          </div>
          {currentSection !== "Performance Settings" ? (
            <section className="mini-panel">
              <h4>Smart guidance</h4>
              <p className="section-description">Helpful prompts are surfaced here when they can speed up reviews and keep the appraisal consistent.</p>
              <div className="mini-list queue-list">
                {asStringArray(asRecord(aiAssist)?.[viewerRole === "Manager" ? "gm" : viewerRole === "Supervisor" ? "supervisor" : viewerRole === "Payroll Admin" ? "supervisor" : "hr"]).length ? (
                  asStringArray(
                    asRecord(aiAssist)?.[
                      viewerRole === "Manager"
                        ? "gm"
                        : viewerRole === "Supervisor"
                          ? "supervisor"
                          : viewerRole === "Payroll Admin"
                            ? "supervisor"
                            : "hr"
                    ]
                  ).map((item) => (
                    <article key={item}>
                      <strong>Solva AI</strong>
                      <span>{item}</span>
                    </article>
                  ))
                ) : (
                  <SectionMessage text="No guidance prompts are configured yet for this role." />
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
