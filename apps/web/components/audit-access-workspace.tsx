"use client";

import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useAuditLogs } from "./audit-activity-workspace";

export function AuditAccessWorkspace() {
  const { logs, message } = useAuditLogs();
  const exportLogs = logs.filter((log) => log.action.includes("export"));
  const systemLogs = logs.filter((log) => log.actorName === "System" || log.actorName === "System Export");

  return (
    <section className="employeeWorkspace" aria-label="Audit access workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Access and Exports</p>
          <h2>See export traces, source IPs, and system-generated actions in one operational view.</h2>
        </div>
        <span className="status">Access</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Exports" value={formatCount(exportLogs.length)} hint="Generated reports or files" />
        <MetricCard label="System Events" value={formatCount(systemLogs.length)} hint="Automated jobs and service actions" />
        <MetricCard label="IP Addresses" value={formatCount(new Set(logs.map((item) => item.ipAddress)).size)} hint="Distinct origin points" />
        <MetricCard label="Traceable Actions" value={formatCount(logs.filter((item) => item.ipAddress && item.ipAddress !== "unknown").length)} hint="Events with IP detail" />
      </div>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Actor</th>
              <th>Action</th>
              <th>Module</th>
              <th>IP Address</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.actorName}</td>
                <td>{log.action}</td>
                <td>{humanize(log.module)}</td>
                <td>{log.ipAddress}</td>
                <td>{new Date(log.createdAt).toLocaleString("en-KE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
