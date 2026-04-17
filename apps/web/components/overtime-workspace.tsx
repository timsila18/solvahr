"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type OvertimeRequest = {
  id: string;
  employeeName: string;
  employeeNumber: string;
  shiftDate: string;
  hours: number;
  reason: string;
  approver: string;
  status: string;
};

export function OvertimeWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [rows, setRows] = useState<OvertimeRequest[]>([]);
  const [message, setMessage] = useState("Loading overtime requests");
  const [status, setStatus] = useState<"idle" | "acting">("idle");

  async function loadRequests() {
    const response = await fetch(`${apiBaseUrl}/api/attendance/overtime`, {
      headers: session.headers,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load overtime requests");
    }

    const data = (await response.json()) as OvertimeRequest[];
    setRows(data);
    setMessage(`${data.length} overtime requests loaded`);
  }

  useEffect(() => {
    loadRequests().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load overtime requests");
    });
  }, [apiBaseUrl, session.headers]);

  async function approveOvertime(id: string) {
    setStatus("acting");
    setMessage("Approving overtime request");

    const response = await fetch(`${apiBaseUrl}/api/attendance/overtime/${id}/approve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: "{}"
    });

    if (!response.ok) {
      setStatus("idle");
      setMessage("Overtime approval failed");
      return;
    }

    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, status: "approved" } : row))
    );
    setStatus("idle");
    setMessage("Overtime approval recorded");
  }

  return (
    <section className="employeeWorkspace" aria-label="Overtime workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Overtime</p>
          <h2>Review overtime requests before they flow into payroll calculations.</h2>
        </div>
        <span className="status">{status === "acting" ? "Approving" : "Overtime"}</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Requests" value={formatCount(rows.length)} hint="Tracked overtime submissions" />
        <MetricCard label="Submitted" value={formatCount(rows.filter((row) => row.status === "submitted").length)} hint="Waiting for approval" />
        <MetricCard label="Approved" value={formatCount(rows.filter((row) => row.status === "approved").length)} hint="Payroll-ready overtime" />
        <MetricCard label="Hours" value={formatCount(rows.reduce((total, row) => total + row.hours, 0))} hint="Total overtime hours in queue" />
      </div>

      <div className="offerList">
        {rows.map((row) => (
          <article key={row.id}>
            <div>
              <strong>{row.employeeName} - {row.hours} hrs</strong>
              <span>
                {row.shiftDate} - {row.employeeNumber} - {row.approver}
              </span>
              <span>{row.reason}</span>
            </div>
            <div className="decisionActions workflowActionStack">
              {row.status === "submitted" ? (
                <button
                  className="secondaryButton"
                  disabled={status === "acting"}
                  onClick={() => approveOvertime(row.id)}
                  type="button"
                >
                  Approve
                </button>
              ) : (
                <span className="tableBadge">{humanize(row.status)}</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
