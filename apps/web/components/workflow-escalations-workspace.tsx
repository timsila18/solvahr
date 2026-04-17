"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type WorkflowQueueItem = {
  id: string;
  module: string;
  entityId: string;
  subject: string;
  title: string;
  status: string;
  currentStep: string;
  ownerRole: string;
  dueAt?: string | null;
  summary: string;
  availableActions: string[];
};

type WorkflowOverview = {
  queue: WorkflowQueueItem[];
  escalations: WorkflowQueueItem[];
  definitions: unknown[];
};

export function WorkflowEscalationsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [items, setItems] = useState<WorkflowQueueItem[]>([]);
  const [message, setMessage] = useState("Loading workflow escalations");

  useEffect(() => {
    async function loadOverview() {
      const response = await fetch(`${apiBaseUrl}/api/workflows/overview`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load workflow escalations");
      }

      const data = (await response.json()) as WorkflowOverview;
      setItems(data.escalations);
      setMessage(`${data.escalations.length} escalation items loaded`);
    }

    loadOverview().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load workflow escalations");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Workflow escalations workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Escalations</p>
          <h2>Keep near-due approvals in one watchlist so deadlines stop slipping quietly.</h2>
        </div>
        <span className="status">Escalations</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Escalations" value={formatCount(items.length)} hint="Needs attention soon" />
        <MetricCard label="Leave" value={formatCount(items.filter((item) => item.module === "leave").length)} hint="Leave approval pressure" />
        <MetricCard label="Recruitment" value={formatCount(items.filter((item) => item.module === "recruitment").length)} hint="Offer timing pressure" />
        <MetricCard label="Payroll / Probation" value={formatCount(items.filter((item) => ["payroll", "probation"].includes(item.module)).length)} hint="Operational deadlines" />
      </div>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Module</th>
              <th>Current Step</th>
              <th>Owner Role</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.subject}
                  <br />
                  {item.title}
                </td>
                <td>{humanize(item.module)}</td>
                <td>{item.currentStep}</td>
                <td>{humanize(item.ownerRole)}</td>
                <td>{item.dueAt ?? "TBC"}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5}>No current escalation items.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
