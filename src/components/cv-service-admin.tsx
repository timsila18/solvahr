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
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9}>No CV service orders yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {message ? <div className="task-banner">{message}</div> : null}
      </div>
    </main>
  );
}
