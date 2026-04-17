"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type AuditLog = {
  id: string;
  actorName: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  module: string;
  riskLevel: string;
  summary: string;
  createdAt: string;
  ipAddress: string;
};

function useAuditLogs() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState("Loading audit logs");

  useEffect(() => {
    async function loadLogs() {
      const response = await fetch(`${apiBaseUrl}/api/audit/logs`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load audit logs");
      }

      const data = (await response.json()) as AuditLog[];
      setLogs(data);
      setMessage(`${data.length} audit events loaded`);
    }

    loadLogs().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load audit logs");
    });
  }, [apiBaseUrl, session.headers]);

  return { logs, message };
}

export function AuditActivityWorkspace() {
  const { logs, message } = useAuditLogs();

  return (
    <section className="employeeWorkspace" aria-label="Audit activity workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Audit Activity</p>
          <h2>Recent actions across the product with actor, module, and change summary.</h2>
        </div>
        <span className="status">Activity</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Events" value={formatCount(logs.length)} hint="Recent audit activity" />
        <MetricCard label="Modules" value={formatCount(new Set(logs.map((item) => item.module)).size)} hint="Coverage across the app" />
        <MetricCard label="Actors" value={formatCount(new Set(logs.map((item) => item.actorEmail)).size)} hint="Distinct users or system jobs" />
        <MetricCard label="High Risk" value={formatCount(logs.filter((item) => item.riskLevel === "high").length)} hint="Sensitive actions flagged" />
      </div>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Module</th>
              <th>Action</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString("en-KE")}</td>
                <td>
                  {log.actorName}
                  <br />
                  {log.actorEmail}
                </td>
                <td>{humanize(log.module)}</td>
                <td>{log.action}</td>
                <td>{log.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export { useAuditLogs };
