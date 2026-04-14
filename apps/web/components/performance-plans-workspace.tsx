"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type Plan = {
  id: string;
  employeeName: string;
  planType: string;
  owner: string;
  status: string;
  dueDate: string;
  focusArea: string;
};

export function PerformancePlansWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [message, setMessage] = useState("Loading development plans");

  useEffect(() => {
    async function loadPlans() {
      const response = await fetch(`${apiBaseUrl}/api/performance/plans`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load development plans");
      }

      const data = (await response.json()) as Plan[];
      setPlans(data);
      setMessage(`${data.length} plans loaded`);
    }

    loadPlans().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load development plans");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Performance plans">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Development and PIP Plans</p>
          <h2>Track improvement plans, coaching actions, and development follow-through from one place.</h2>
        </div>
        <span className="status">Plans</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="compactList recruitmentInsightList">
        {plans.map((plan) => (
          <article key={plan.id}>
            <strong>
              {plan.employeeName} - {plan.planType.toUpperCase()}
            </strong>
            <span>
              {plan.focusArea} - owner: {plan.owner} - due: {plan.dueDate} - {plan.status}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
