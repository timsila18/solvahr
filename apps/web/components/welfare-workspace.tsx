"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type WelfareCase = {
  id: string;
  employeeName: string;
  category: string;
  location: string;
  severity: string;
  status: string;
  caseOwner: string;
  openedAt: string;
  nextActionDue: string;
  notes: string;
};

export function WelfareWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [cases, setCases] = useState<WelfareCase[]>([]);
  const [message, setMessage] = useState("Loading welfare cases");

  useEffect(() => {
    async function loadCases() {
      const response = await fetch(`${apiBaseUrl}/api/welfare/cases`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load welfare cases");
      }

      const data = (await response.json()) as WelfareCase[];
      setCases(data);
      setMessage(`${data.length} welfare cases loaded`);
    }

    loadCases().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load welfare cases");
    });
  }, [apiBaseUrl, session.headers]);

  const activeCases = cases.filter((item) => item.status !== "closed").length;
  const highRiskCases = cases.filter((item) => ["high", "critical"].includes(item.severity)).length;

  return (
    <section className="employeeWorkspace" aria-label="Welfare workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Welfare Cases</p>
          <h2>Capture support cases, wellbeing incidents, and follow-up commitments with a clear owner and next action.</h2>
        </div>
        <span className="status">Welfare</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Active Cases" value={formatCount(activeCases)} hint="Open support queue" />
        <MetricCard label="High Risk" value={formatCount(highRiskCases)} hint="Needs faster follow-up" />
        <MetricCard label="Locations" value={formatCount(new Set(cases.map((item) => item.location)).size)} hint="Coverage across sites" />
        <MetricCard label="Case Owners" value={formatCount(new Set(cases.map((item) => item.caseOwner)).size)} hint="Assigned support leads" />
      </div>

      <div className="reportPreviewGrid">
        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Case Queue</p>
              <h3>Current welfare interventions</h3>
            </div>
          </div>
          <div className="offerList">
            {cases.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.employeeName}</strong>
                  <span>
                    {humanize(item.category)} · {item.location} · due {item.nextActionDue}
                  </span>
                </div>
                <span className="tableBadge">{humanize(item.severity)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Case Notes</p>
              <h3>Support narrative and next steps</h3>
            </div>
          </div>
          <div className="compactList">
            {cases.map((item) => (
              <article key={`${item.id}-note`}>
                <strong>{item.employeeName} · {humanize(item.status)}</strong>
                <span>{item.notes}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
