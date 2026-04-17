"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type WorkflowDefinition = {
  code: string;
  name: string;
  module: string;
  trigger: string;
  steps: Array<{
    step: number;
    label: string;
    approverRole: string;
    escalationHours?: number;
  }>;
};

type WorkflowOverview = {
  queue: unknown[];
  escalations: unknown[];
  definitions: WorkflowDefinition[];
};

export function WorkflowDefinitionsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [message, setMessage] = useState("Loading workflow definitions");

  useEffect(() => {
    async function loadOverview() {
      const response = await fetch(`${apiBaseUrl}/api/workflows/overview`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load workflow definitions");
      }

      const data = (await response.json()) as WorkflowOverview;
      setDefinitions(data.definitions);
      setMessage(`${data.definitions.length} workflow definitions loaded`);
    }

    loadOverview().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load workflow definitions");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Workflow definitions workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Workflow Definitions</p>
          <h2>See approval chains, responsible roles, and escalation timing without opening developer docs.</h2>
        </div>
        <span className="status">Definitions</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Definitions" value={formatCount(definitions.length)} hint="Active approval models" />
        <MetricCard label="Modules" value={formatCount(new Set(definitions.map((item) => item.module)).size)} hint="Workflow coverage" />
        <MetricCard label="Steps" value={formatCount(definitions.reduce((total, item) => total + item.steps.length, 0))} hint="Configured approval steps" />
        <MetricCard label="Escalations" value={formatCount(definitions.filter((item) => item.steps.some((step) => step.escalationHours)).length)} hint="Definitions with escalation timing" />
      </div>

      <div className="leavePolicyGrid">
        {definitions.map((definition) => (
          <article className="leavePolicyCard" key={definition.code}>
            <span>{humanize(definition.module)}</span>
            <strong>{definition.name}</strong>
            <small>{definition.trigger}</small>
            <b>{definition.steps.length} steps</b>
            <div className="workflowSteps workflowStepsCompact">
              {definition.steps.map((step) => (
                <article key={`${definition.code}-${step.step}`}>
                  <span>{step.step}</span>
                  <div>
                    <strong>{step.label}</strong>
                    <small>
                      {humanize(step.approverRole)}
                      {step.escalationHours ? ` · escalate in ${step.escalationHours}h` : ""}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
