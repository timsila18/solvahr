"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type DisciplinaryCase = {
  id: string;
  employeeName: string;
  allegation: string;
  stage: string;
  owner: string;
  hearingDate: string;
  status: string;
  outcome: string;
  evidenceCount: number;
};

export function DisciplineWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [cases, setCases] = useState<DisciplinaryCase[]>([]);
  const [message, setMessage] = useState("Loading disciplinary cases");

  useEffect(() => {
    async function loadCases() {
      const response = await fetch(`${apiBaseUrl}/api/disciplinary/cases`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load disciplinary cases");
      }

      const data = (await response.json()) as DisciplinaryCase[];
      setCases(data);
      setMessage(`${data.length} disciplinary cases loaded`);
    }

    loadCases().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load disciplinary cases");
    });
  }, [apiBaseUrl, session.headers]);

  const activeCases = cases.filter((item) => item.status === "active").length;
  const hearingsDue = cases.filter((item) => item.stage === "hearing" || item.stage === "show_cause").length;
  const evidenceTotal = cases.reduce((total, item) => total + item.evidenceCount, 0);

  return (
    <section className="employeeWorkspace" aria-label="Discipline workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Disciplinary Cases</p>
          <h2>Manage show-cause, hearing schedules, evidence, and final outcomes without losing the case timeline.</h2>
        </div>
        <span className="status">Discipline</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Active Cases" value={formatCount(activeCases)} hint="Currently in motion" />
        <MetricCard label="Hearings Due" value={formatCount(hearingsDue)} hint="Show-cause or hearing stage" />
        <MetricCard label="Evidence Items" value={formatCount(evidenceTotal)} hint="Logged across cases" />
        <MetricCard label="Owners" value={formatCount(new Set(cases.map((item) => item.owner)).size)} hint="Case managers assigned" />
      </div>

      <div className="reportPreviewGrid">
        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Case Register</p>
              <h3>Active and closed disciplinary matters</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Stage</th>
                  <th>Hearing Date</th>
                  <th>Owner</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id}>
                    <td>{item.employeeName}</td>
                    <td>{humanize(item.stage)}</td>
                    <td>{item.hearingDate}</td>
                    <td>{item.owner}</td>
                    <td>{humanize(item.outcome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Allegations</p>
              <h3>What each case is about</h3>
            </div>
          </div>
          <div className="compactList">
            {cases.map((item) => (
              <article key={`${item.id}-allegation`}>
                <strong>{item.employeeName} · {humanize(item.status)}</strong>
                <span>{item.allegation}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
