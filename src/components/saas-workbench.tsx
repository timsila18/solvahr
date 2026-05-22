"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchBillingDashboard,
  fetchOnboardingDashboard,
  fetchSaasHQDashboard,
  reviewEmployerRegistration,
  updateBillingSubscription,
  updateOnboardingDashboard,
} from "@/lib/solva-api";

type AsyncState<T> = {
  loading: boolean;
  error: string;
  data: T | null;
};

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
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function formatDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export function SaasWorkbench({
  activeItem,
  onJump,
}: {
  activeItem: "Billing & Subscription" | "Company Onboarding" | "SaaS HQ";
  onJump: (item: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [billingState, setBillingState] = useState<AsyncState<Record<string, unknown>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [onboardingState, setOnboardingState] = useState<AsyncState<Record<string, unknown>>>({
    loading: false,
    error: "",
    data: null,
  });
  const [hqState, setHqState] = useState<AsyncState<Record<string, unknown>>>({
    loading: false,
    error: "",
    data: null,
  });

  const loadBilling = useCallback(async () => {
    setBillingState({ loading: true, error: "", data: null });
    try {
      const payload = await fetchBillingDashboard();
      setBillingState({ loading: false, error: "", data: payload.billing });
    } catch (error) {
      setBillingState({ loading: false, error: error instanceof Error ? error.message : "Could not load billing.", data: null });
    }
  }, []);

  const loadOnboarding = useCallback(async () => {
    setOnboardingState({ loading: true, error: "", data: null });
    try {
      const payload = await fetchOnboardingDashboard();
      setOnboardingState({ loading: false, error: "", data: payload.onboarding });
    } catch (error) {
      setOnboardingState({ loading: false, error: error instanceof Error ? error.message : "Could not load onboarding.", data: null });
    }
  }, []);

  const loadHq = useCallback(async () => {
    setHqState({ loading: true, error: "", data: null });
    try {
      const payload = await fetchSaasHQDashboard();
      setHqState({ loading: false, error: "", data: payload.hq });
    } catch (error) {
      setHqState({ loading: false, error: error instanceof Error ? error.message : "Could not load Solva HQ.", data: null });
    }
  }, []);

  useEffect(() => {
    if (activeItem === "Billing & Subscription") {
      void loadBilling();
    } else if (activeItem === "Company Onboarding") {
      void loadOnboarding();
    } else if (activeItem === "SaaS HQ") {
      void loadHq();
    }
  }, [activeItem, loadBilling, loadHq, loadOnboarding]);

  async function handleUpgrade(planId: string) {
    setBusyAction(`upgrade:${planId}`);
    setMessage("");
    try {
      const payload = await updateBillingSubscription({ planId });
      setBillingState({ loading: false, error: "", data: payload.billing });
      setMessage("Plan update prepared. Invoice and renewal details have been refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the subscription.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleToggleChecklist(stepKey: string) {
    setBusyAction(`step:${stepKey}`);
    setMessage("");
    try {
      const payload = await updateOnboardingDashboard({ completedStep: stepKey });
      setOnboardingState({ loading: false, error: "", data: payload.onboarding });
      setMessage("Onboarding progress updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update onboarding progress.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleEmployerReview(companyId: string, action: "approve" | "reject") {
    setBusyAction(`${action}:${companyId}`);
    setMessage("");
    try {
      const payload = await reviewEmployerRegistration(companyId, { action });
      await loadHq();
      setMessage(
        `${safeString(asRecord(payload.result)?.companyName, "Organization")} ${
          action === "approve" ? "approved" : "rejected"
        } successfully.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not review the organization registration.");
    } finally {
      setBusyAction("");
    }
  }

  if (activeItem === "Billing & Subscription") {
    const data = billingState.data;
    const company = asRecord(data?.company);
    const subscription = asRecord(data?.subscription);
    const usage = asRecord(data?.usage);
    const plans = asRecordArray(data?.plans);
    const invoices = asRecordArray(data?.invoices);
    const paymentMethods = asRecordArray(data?.paymentMethods);

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Commercial Operations</p>
            <h3>Billing & Subscription</h3>
          </div>
        </div>
        {billingState.loading ? <p className="section-description">Loading billing workspace...</p> : null}
        {billingState.error ? <div className="task-banner">{billingState.error}</div> : null}
        {message ? <div className="task-banner">{message}</div> : null}
        {!billingState.loading && data ? (
          <div className="workbench-grid saas-grid">
            <section className="mini-panel">
              <h4>Current plan</h4>
              <div className="mini-list queue-list">
                <article>
                  <strong>{safeString(company?.name, "Organization")}</strong>
                  <span>{safeString(subscription?.planName, "Growth")} | {safeString(subscription?.status, "trialing")}</span>
                  <small>{safeString(subscription?.description)}</small>
                </article>
                <article>
                  <strong>Renewal and trial</strong>
                  <span>{safeString(subscription?.paymentStatus, "trial")} payment state</span>
                  <small>
                    Trial ends {formatDate(safeString(subscription?.trialEndsAt))} | Renewal {formatDate(safeString(subscription?.renewalDate))}
                  </small>
                </article>
                <article>
                  <strong>Usage</strong>
                  <span>Employees {safeString(usage?.employeeUsageLabel)}</span>
                  <small>Admins {safeString(usage?.adminUsageLabel)}</small>
                </article>
              </div>
              {safeString(subscription?.upgradePrompt) ? (
                <div className="task-banner">{safeString(subscription?.upgradePrompt)}</div>
              ) : null}
            </section>

            <section className="mini-panel">
              <h4>Payment methods</h4>
              <div className="mini-list queue-list">
                {paymentMethods.map((method) => (
                  <article key={safeString(method.key)}>
                    <strong>{safeString(method.label)}</strong>
                    <span>{safeString(method.status)}</span>
                    <small>
                      {safeString(method.status) === "prepared"
                        ? "Ready for billing workflows."
                        : safeString(method.status) === "manual_review"
                          ? "Visible for finance follow-up."
                          : "Held as a clean placeholder until full gateway work lands."}
                    </small>
                  </article>
                ))}
              </div>
            </section>

            <section className="mini-panel saas-wide-panel">
              <h4>Available plans</h4>
              <div className="selection-card-grid">
                {plans.map((plan) => (
                  <article className={`selection-card ${safeString(plan.id) === safeString(subscription?.planId) ? "is-active" : ""}`} key={safeString(plan.id)}>
                    <strong>{safeString(plan.name)}</strong>
                    <span>{safeString(plan.monthlyPriceLabel, "Custom")}</span>
                    <small>{safeString(plan.description)}</small>
                    <ul>
                      {asRecordArray(plan.features).length === 0 && Array.isArray(plan.features)
                        ? (plan.features as unknown[]).slice(0, 4).map((feature) => <li key={String(feature)}>{String(feature)}</li>)
                        : null}
                    </ul>
                    <button
                      className="primary-button"
                      disabled={busyAction === `upgrade:${safeString(plan.id)}` || safeString(plan.id) === safeString(subscription?.planId)}
                      onClick={() => void handleUpgrade(safeString(plan.id))}
                      type="button"
                    >
                      {safeString(plan.id) === safeString(subscription?.planId)
                        ? "Current plan"
                        : busyAction === `upgrade:${safeString(plan.id)}`
                          ? "Updating..."
                          : "Upgrade"}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="mini-panel saas-wide-panel">
              <h4>Invoice history</h4>
              <div className="mini-list queue-list">
                {invoices.length ? (
                  invoices.map((invoice) => (
                    <article key={safeString(invoice.id)}>
                      <strong>{safeString(invoice.invoiceNumber)}</strong>
                      <span>{safeString(invoice.amountLabel)} | {safeString(invoice.status)}</span>
                      <small>{formatDate(safeString(invoice.invoiceDate))} | due {formatDate(safeString(invoice.dueDate))}</small>
                    </article>
                  ))
                ) : (
                  <p className="section-description">No invoices yet. The current trial invoice will appear here once refreshed.</p>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    );
  }

  if (activeItem === "Company Onboarding") {
    const data = onboardingState.data;
    const company = asRecord(data?.company);
    const onboarding = asRecord(data?.onboarding);
    const checklist = asRecordArray(onboarding?.checklist);
    const counts = asRecord(onboarding?.counts);
    const nextAction = asRecord(onboarding?.nextAction);

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Client Activation</p>
            <h3>Company Onboarding</h3>
          </div>
        </div>
        {onboardingState.loading ? <p className="section-description">Loading onboarding workspace...</p> : null}
        {onboardingState.error ? <div className="task-banner">{onboardingState.error}</div> : null}
        {message ? <div className="task-banner">{message}</div> : null}
        {!onboardingState.loading && data ? (
          <div className="workbench-grid saas-grid">
            <section className="mini-panel">
              <h4>Launch progress</h4>
              <div className="checklist-progress">
                <div className="checklist-progress__bar">
                  <span style={{ width: `${safeNumber(onboarding?.progressPercent)}%` }} />
                </div>
                <strong>{safeNumber(onboarding?.progressPercent)}% complete</strong>
              </div>
              <p className="section-description">{safeString(onboarding?.guidedLaunch)}</p>
              {nextAction ? (
                <div className="next-best-action">
                  <span>Next step</span>
                  <strong>{safeString(nextAction.label)}</strong>
                  <small>{safeString(nextAction.description)}</small>
                  {safeString(nextAction.item) ? (
                    <button className="primary-button" onClick={() => onJump(safeString(nextAction.item))} type="button">
                      Open
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="mini-panel">
              <h4>Launch counts</h4>
              <div className="mini-list queue-list">
                {[
                  { label: "Branches", value: safeNumber(counts?.branches) },
                  { label: "Departments", value: safeNumber(counts?.departments) },
                  { label: "Employees", value: safeNumber(counts?.employees) },
                  { label: "Users", value: safeNumber(counts?.users) },
                  { label: "Payroll groups", value: safeNumber(counts?.payrollGroups) },
                  { label: "Payroll runs", value: safeNumber(counts?.payrollRuns) },
                ].map((metric) => (
                  <article key={metric.label}>
                    <strong>{metric.label}</strong>
                    <span>{metric.value}</span>
                    <small>{safeString(company?.name)}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="mini-panel saas-wide-panel">
              <h4>Setup wizard</h4>
              <div className="checklist-list">
                {checklist.map((step) => (
                  <article className={`checklist-item ${step.completed ? "is-complete" : ""}`} key={safeString(step.key)}>
                    <label className="checklist-item__copy">
                      <input
                        checked={Boolean(step.completed)}
                        onChange={() => void handleToggleChecklist(safeString(step.key))}
                        type="checkbox"
                      />
                      <span>
                        <strong>{safeString(step.label)}</strong>
                        <small>{safeString(step.description)}</small>
                      </span>
                    </label>
                    {safeString(step.item) ? (
                      <button className="ghost-button" onClick={() => onJump(safeString(step.item))} type="button">
                        Open
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    );
  }

  const data = hqState.data;
  const cards = asRecordArray(data?.cards);
  const organizations = asRecordArray(data?.organizations);
  const leads = asRecordArray(data?.leads);
  const invoices = asRecordArray(data?.invoices);

  return (
    <section className="surface-card action-workbench">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Platform Owner</p>
          <h3>SaaS HQ</h3>
        </div>
      </div>
      {hqState.loading ? <p className="section-description">Loading Solva HQ...</p> : null}
      {hqState.error ? <div className="task-banner">{hqState.error}</div> : null}
      {!hqState.loading && data ? (
        <div className="workbench-grid saas-grid">
          <section className="mini-panel saas-wide-panel">
            <h4>Commercial summary</h4>
            <div className="metrics-grid">
              {cards.map((card) => (
                <article className="metric-card" key={safeString(card.label)}>
                  <span>{safeString(card.label)}</span>
                  <strong>{safeString(card.value)}</strong>
                  <small>{safeString(card.hint)}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="mini-panel saas-wide-panel">
            <h4>Organizations</h4>
            <div className="mini-list queue-list">
              {organizations.map((organization) => (
                <article key={safeString(organization.companyId)}>
                  <strong>{safeString(organization.name)}</strong>
                  <span>{safeString(organization.planName)} | {safeString(organization.subscriptionStatus)} | Health {safeString(organization.healthScore, String(organization.healthScore ?? "-"))}/100</span>
                  <small>
                    {safeNumber(organization.employeeCount)} employees | {safeNumber(organization.adminCount)} admins | {safeString(organization.paymentStatus)} | Onboarding {safeString(organization.onboardingProgress, String(organization.onboardingProgress ?? 0))}% | Failed exports {safeString(organization.failedExports, String(organization.failedExports ?? 0))}
                  </small>
                  {safeString(organization.status) === "pending_approval" ? (
                    <div className="queue-actions">
                      <button
                        className="primary-button"
                        disabled={busyAction === `approve:${safeString(organization.companyId)}`}
                        onClick={() => void handleEmployerReview(safeString(organization.companyId), "approve")}
                        type="button"
                      >
                        {busyAction === `approve:${safeString(organization.companyId)}` ? "Approving..." : "Approve"}
                      </button>
                      <button
                        className="ghost-button"
                        disabled={busyAction === `reject:${safeString(organization.companyId)}`}
                        onClick={() => void handleEmployerReview(safeString(organization.companyId), "reject")}
                        type="button"
                      >
                        {busyAction === `reject:${safeString(organization.companyId)}` ? "Rejecting..." : "Reject"}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="mini-panel">
            <h4>Leads</h4>
            <div className="mini-list queue-list">
              {leads.map((lead) => (
                <article key={safeString(lead.id)}>
                  <strong>{safeString(lead.companyName)}</strong>
                  <span>{safeString(lead.contactPerson)} | {safeString(lead.status)}</span>
                  <small>{safeString(lead.email)} | {formatDate(safeString(lead.createdAt))}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="mini-panel">
            <h4>Recent invoices</h4>
            <div className="mini-list queue-list">
              {invoices.map((invoice) => (
                <article key={safeString(invoice.id)}>
                  <strong>{safeString(invoice.invoiceNumber)}</strong>
                  <span>{safeString(invoice.amountLabel)} | {safeString(invoice.status)}</span>
                  <small>{formatDate(safeString(invoice.invoiceDate))}</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
