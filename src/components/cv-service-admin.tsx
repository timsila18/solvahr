"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardPayload = {
  metrics: {
    totalOrders: number;
    uploadedCvOrders: number;
    formCreatedOrders: number;
    pendingPayments: number;
    paidOrders: number;
    generatedCvs: number;
    failedPayments: number;
    failedGenerations: number;
    abandonedApplications: number;
    downloads: number;
    revenueByPackage: Array<{ packageName: string; revenue: number; count: number }>;
  };
  orders: Array<Record<string, unknown>>;
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });
  const payload = (await response.json().catch(() => ({ error: "request_failed" }))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}`);
  }
  return payload;
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : Number(value ?? fallback);
}

function formatCurrency(value: number) {
  return `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value)}`;
}

export function CvServiceAdmin() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [editor, setEditor] = useState({
    professionalHeadline: "",
    professionalSummary: "",
    keyAchievements: "",
    adminNotes: "",
  });

  async function loadDashboard() {
    const payload = await readJson<{ dashboard: DashboardPayload }>("/api/admin/cv-service/dashboard");
    setDashboard(payload.dashboard);
  }

  useEffect(() => {
    void loadDashboard().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Could not load the CV service dashboard.");
    });
  }, []);

  async function handleOrderAction(orderId: string, action: "mark_paid" | "regenerate") {
    setBusyAction(`${action}-${orderId}`);
    setMessage("");
    try {
      await readJson(`/api/admin/cv-service/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await loadDashboard();
      setMessage(action === "mark_paid" ? "Order marked as paid." : "CV regenerated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete the CV admin action.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleAdvancedAction(
    orderId: string,
    action: "approve_final" | "refresh_links" | "manual_edit"
  ) {
    setBusyAction(`${action}-${orderId}`);
    setMessage("");
    try {
      await readJson(`/api/admin/cv-service/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "manual_edit"
            ? {
                action,
                professionalHeadline: editor.professionalHeadline,
                professionalSummary: editor.professionalSummary,
                keyAchievements: editor.keyAchievements
                  .split(/\r?\n+/)
                  .map((entry) => entry.trim())
                  .filter(Boolean),
                adminNotes: editor.adminNotes,
              }
            : { action }
        ),
      });
      await loadDashboard();
      setMessage(
        action === "approve_final"
          ? "CV approved for final release."
          : action === "refresh_links"
            ? "Download links refreshed for another 24 hours."
            : "Manual edits saved."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete the CV admin action.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCleanup() {
    setBusyAction("cleanup");
    setMessage("");
    try {
      await readJson("/api/admin/cv-service/cleanup", { method: "POST" });
      await loadDashboard();
      setMessage("Expired CV files cleaned successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not clean expired CV files.");
    } finally {
      setBusyAction("");
    }
  }

  const metricCards = useMemo(() => {
    if (!dashboard) return [];
    return [
      { label: "Total orders", value: dashboard.metrics.totalOrders },
      { label: "Upload-first orders", value: dashboard.metrics.uploadedCvOrders },
      { label: "Manual build orders", value: dashboard.metrics.formCreatedOrders },
      { label: "Pending payments", value: dashboard.metrics.pendingPayments },
      { label: "Paid orders", value: dashboard.metrics.paidOrders },
      { label: "Generated CVs", value: dashboard.metrics.generatedCvs },
      { label: "Failed payments", value: dashboard.metrics.failedPayments },
      { label: "Failed generations", value: dashboard.metrics.failedGenerations },
      { label: "Abandoned drafts", value: dashboard.metrics.abandonedApplications },
      { label: "Downloads", value: dashboard.metrics.downloads },
    ];
  }, [dashboard]);

  const selectedOrder = useMemo(
    () => dashboard?.orders.find((row) => safeString(row.id) === selectedOrderId) ?? null,
    [dashboard, selectedOrderId]
  );

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }
    const preview = (selectedOrder.generatedPreview as Record<string, unknown> | null) ?? null;
    setEditor({
      professionalHeadline: safeString(preview?.professionalHeadline),
      professionalSummary: safeString(preview?.professionalSummary),
      keyAchievements: Array.isArray(preview?.keyAchievements)
        ? (preview?.keyAchievements as unknown[]).map((item) => safeString(item)).filter(Boolean).join("\n")
        : "",
      adminNotes: safeString(selectedOrder.adminNotes),
    });
  }, [selectedOrder]);

  return (
    <main className="workflow-page">
      <div className="workflow-page__inner cv-admin-shell">
        <section className="surface-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">CV service dashboard</p>
              <h2>Track orders, payments, generation, downloads, and cleanup.</h2>
            </div>
            <div className="inline-actions">
              <a className="ghost-button" href="/api/admin/cv-service/export">
                Export Excel
              </a>
              <button className="primary-button" disabled={busyAction === "cleanup"} onClick={() => void handleCleanup()} type="button">
                {busyAction === "cleanup" ? "Cleaning..." : "Delete expired files"}
              </button>
            </div>
          </div>
          <div className="metric-grid compact-grid">
            {metricCards.map((card) => (
              <article className="metric-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="surface-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Revenue by package</p>
              <h3>Paid orders only</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.metrics.revenueByPackage.length ? (
                  dashboard.metrics.revenueByPackage.map((row) => (
                    <tr key={row.packageName}>
                      <td>{row.packageName}</td>
                      <td>{row.count}</td>
                      <td>{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>No paid CV orders yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Orders</p>
              <h3>Customer list and order actions</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>Flow</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Generation</th>
                  <th>ATS</th>
                  <th>Quality</th>
                  <th>Downloads</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.orders.length ? (
                  dashboard.orders.map((row) => {
                    const id = safeString(row.id);
                    return (
                      <tr key={id}>
                        <td>
                          <strong>{safeString(row.customerName, "Customer")}</strong>
                          <div>{safeString(row.phone)}</div>
                          <small>{safeString(row.email)}</small>
                        </td>
                        <td>{safeString(row.packageName)}</td>
                        <td>{safeString(row.sourceMode)}</td>
                        <td>{formatCurrency(safeNumber(row.amount))}</td>
                        <td>{safeString(row.paymentStatus)}</td>
                        <td>{safeString(row.generationStatus)}</td>
                        <td>{safeNumber(row.atsScore)}</td>
                        <td>{safeString(row.qualityStatus, "pending")}</td>
                        <td>{safeNumber(row.downloadCount)}</td>
                        <td>{safeString(row.createdAt)}</td>
                        <td>
                          <div className="inline-actions">
                            <button
                              className="ghost-button"
                              disabled={busyAction === `mark_paid-${id}` || safeString(row.paymentStatus) === "paid"}
                              onClick={() => void handleOrderAction(id, "mark_paid")}
                              type="button"
                            >
                              Mark paid
                            </button>
                            <button
                              className="primary-button"
                              disabled={busyAction === `regenerate-${id}`}
                              onClick={() => void handleOrderAction(id, "regenerate")}
                              type="button"
                            >
                              Regenerate
                            </button>
                            <button className="ghost-button" onClick={() => setSelectedOrderId(id)} type="button">
                              Review
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11}>No CV service orders yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedOrder ? (
          <section className="surface-card">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Order review</p>
                <h3>{safeString(selectedOrder.customerName, "Customer")} - {safeString(selectedOrder.packageName)}</h3>
              </div>
              <div className="inline-actions">
                <button
                  className="ghost-button"
                  disabled={busyAction === `refresh_links-${safeString(selectedOrder.id)}`}
                  onClick={() => void handleAdvancedAction(safeString(selectedOrder.id), "refresh_links")}
                  type="button"
                >
                  Refresh links
                </button>
                <button
                  className="primary-button"
                  disabled={busyAction === `approve_final-${safeString(selectedOrder.id)}`}
                  onClick={() => void handleAdvancedAction(safeString(selectedOrder.id), "approve_final")}
                  type="button"
                >
                  Approve final CV
                </button>
              </div>
            </div>
            <div className="cv-summary-grid">
              <article className="cv-download-card">
                <strong>ATS score</strong>
                <span>{safeNumber(selectedOrder.atsScore)} / 100</span>
                <small>{safeString(selectedOrder.qualityStatus, "pending")}</small>
              </article>
              <article className="cv-download-card">
                <strong>Customer notes</strong>
                <span>{safeString(selectedOrder.customerNotes, "None supplied")}</span>
                <small>{safeString(selectedOrder.sourceMode)} flow</small>
              </article>
              <article className="cv-download-card">
                <strong>Uploaded CV</strong>
                <span>{safeString(selectedOrder.uploadedCvName, "No upload")}</span>
                <small>{safeString(selectedOrder.uploadedCvUrl) ? "Source file available" : "No source file stored"}</small>
                {safeString(selectedOrder.uploadedCvUrl) ? (
                  <a className="ghost-button" href={safeString(selectedOrder.uploadedCvUrl)} rel="noreferrer" target="_blank">
                    Open uploaded CV
                  </a>
                ) : null}
              </article>
            </div>
            {Array.isArray(selectedOrder.qualityIssues) && selectedOrder.qualityIssues.length ? (
              <ul className="cv-note-list">
                {(selectedOrder.qualityIssues as unknown[]).map((issue, index) => (
                  <li key={`quality-issue-${index}`}>{safeString(issue)}</li>
                ))}
              </ul>
            ) : null}
            <div className="cv-form-grid">
              <label className="cv-field-span-2">
                <span>Professional headline</span>
                <input value={editor.professionalHeadline} onChange={(event) => setEditor((current) => ({ ...current, professionalHeadline: event.target.value }))} />
              </label>
              <label className="cv-field-span-2">
                <span>Professional summary</span>
                <textarea rows={6} value={editor.professionalSummary} onChange={(event) => setEditor((current) => ({ ...current, professionalSummary: event.target.value }))} />
              </label>
              <label className="cv-field-span-2">
                <span>Key achievements (one per line)</span>
                <textarea rows={6} value={editor.keyAchievements} onChange={(event) => setEditor((current) => ({ ...current, keyAchievements: event.target.value }))} />
              </label>
              <label className="cv-field-span-2">
                <span>Admin notes</span>
                <textarea rows={4} value={editor.adminNotes} onChange={(event) => setEditor((current) => ({ ...current, adminNotes: event.target.value }))} />
              </label>
            </div>
            <div className="inline-actions">
              <button
                className="ghost-button"
                disabled={busyAction === `manual_edit-${safeString(selectedOrder.id)}`}
                onClick={() => void handleAdvancedAction(safeString(selectedOrder.id), "manual_edit")}
                type="button"
              >
                Save manual edits
              </button>
              {safeString(selectedOrder.generatedDocxLink) ? (
                <a className="primary-button" href={safeString(selectedOrder.generatedDocxLink)}>
                  Download DOCX
                </a>
              ) : null}
              {safeString(selectedOrder.generatedPdfLink) ? (
                <a className="ghost-button" href={safeString(selectedOrder.generatedPdfLink)}>
                  Download PDF
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        {message ? <div className="task-banner">{message}</div> : null}
      </div>
    </main>
  );
}
