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
  workflow?: {
    currentStepLabel?: string;
    currentOwnerRole?: string;
  } | null;
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

  async function decideOvertime(id: string, decision: "approve" | "reject") {
    setStatus("acting");
    setMessage(`${decision === "approve" ? "Approving" : "Rejecting"} overtime request`);

    const response = await fetch(`${apiBaseUrl}/api/attendance/overtime/${id}/${decision}-step`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify({
        comments: `${decision === "approve" ? "Approved" : "Rejected"} from overtime workspace`
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Overtime approval failed");
      return;
    }

    const updated = (await response.json()) as OvertimeRequest;
    setRows((current) => current.map((row) => (row.id === id ? updated : row)));
    setStatus("idle");
    setMessage(`Overtime ${decision} step recorded`);
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
              {row.workflow?.currentStepLabel ? (
                <span>
                  {row.workflow.currentStepLabel} - {row.workflow.currentOwnerRole ?? "pending owner"}
                </span>
              ) : null}
              <span>{row.reason}</span>
            </div>
            <div className="decisionActions workflowActionStack">
              {["submitted", "pending_approval"].includes(row.status) ? (
                <>
                  <button
                    className="secondaryButton"
                    disabled={
                      status === "acting" ||
                      !!row.workflow?.currentOwnerRole &&
                        session.role !== row.workflow.currentOwnerRole &&
                        session.role !== "company_admin"
                    }
                    onClick={() => decideOvertime(row.id, "approve")}
                    type="button"
                  >
                    Approve Step
                  </button>
                  <button
                    className="secondaryButton"
                    disabled={
                      status === "acting" ||
                      !!row.workflow?.currentOwnerRole &&
                        session.role !== row.workflow.currentOwnerRole &&
                        session.role !== "company_admin"
                    }
                    onClick={() => decideOvertime(row.id, "reject")}
                    type="button"
                  >
                    Reject
                  </button>
                </>
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
