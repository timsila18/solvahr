"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type Grievance = {
  id: string;
  employeeName: string;
  category: string;
  channel: string;
  priority: string;
  status: string;
  assignedTo: string;
  filedAt: string;
  lastUpdatedAt: string;
  summary: string;
};

export function GrievanceWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [items, setItems] = useState<Grievance[]>([]);
  const [message, setMessage] = useState("Loading grievances");

  useEffect(() => {
    async function loadItems() {
      const response = await fetch(`${apiBaseUrl}/api/welfare/grievances`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load grievances");
      }

      const data = (await response.json()) as Grievance[];
      setItems(data);
      setMessage(`${data.length} grievances loaded`);
    }

    loadItems().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load grievances");
    });
  }, [apiBaseUrl, session.headers]);

  const openItems = items.filter((item) => !["resolved", "closed"].includes(item.status)).length;
  const criticalItems = items.filter((item) => ["high", "critical"].includes(item.priority)).length;

  return (
    <section className="employeeWorkspace" aria-label="Grievance workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Grievances</p>
          <h2>Track confidential complaints from intake to outcome with ownership, priority, and escalation visibility.</h2>
        </div>
        <span className="status">Grievances</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Open" value={formatCount(openItems)} hint="Still under review" />
        <MetricCard label="Critical" value={formatCount(criticalItems)} hint="Needs senior attention" />
        <MetricCard label="Channels" value={formatCount(new Set(items.map((item) => item.channel)).size)} hint="Intake sources in use" />
        <MetricCard label="Owners" value={formatCount(new Set(items.map((item) => item.assignedTo)).size)} hint="Assigned investigators" />
      </div>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Category</th>
              <th>Channel</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.employeeName}</td>
                <td>{humanize(item.category)}</td>
                <td>{humanize(item.channel)}</td>
                <td>{humanize(item.priority)}</td>
                <td>{humanize(item.status)}</td>
                <td>{item.assignedTo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="reportPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Investigation Notes</p>
            <h3>Current summaries and recent movement</h3>
          </div>
        </div>
        <div className="compactList">
          {items.map((item) => (
            <article key={`${item.id}-summary`}>
              <strong>{item.employeeName} · updated {item.lastUpdatedAt}</strong>
              <span>{item.summary}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
