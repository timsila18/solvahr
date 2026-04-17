"use client";

import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useAuditLogs } from "./audit-activity-workspace";

export function AuditSensitiveWorkspace() {
  const { logs, message } = useAuditLogs();
  const sensitiveLogs = logs.filter((log) => log.riskLevel === "high");

  return (
    <section className="employeeWorkspace" aria-label="Audit sensitive workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Sensitive Changes</p>
          <h2>Focus on approvals, payroll actions, employee-relations updates, and other higher-risk events.</h2>
        </div>
        <span className="status">Sensitive</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="High Risk" value={formatCount(sensitiveLogs.length)} hint="Flagged events" />
        <MetricCard label="Payroll" value={formatCount(sensitiveLogs.filter((item) => item.module === "payroll").length)} hint="Payroll control trail" />
        <MetricCard label="Recruitment" value={formatCount(sensitiveLogs.filter((item) => item.module === "recruitment").length)} hint="Offer and hiring approvals" />
        <MetricCard label="Relations" value={formatCount(sensitiveLogs.filter((item) => item.module === "relations").length)} hint="Employee relations activity" />
      </div>

      <div className="offerList">
        {sensitiveLogs.map((log) => (
          <article key={log.id}>
            <div>
              <strong>{log.actorName} - {log.action}</strong>
              <span>
                {humanize(log.module)} - {log.entityType} - {new Date(log.createdAt).toLocaleString("en-KE")}
              </span>
              <span>{log.summary}</span>
            </div>
            <span className="tableBadge">{humanize(log.riskLevel)}</span>
          </article>
        ))}
        {!sensitiveLogs.length ? <p>No high-risk events found.</p> : null}
      </div>
    </section>
  );
}
