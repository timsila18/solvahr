"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type Goal = {
  id: string;
  employeeName: string;
  department: string;
  title: string;
  category: string;
  weight: number;
  progress: number;
  status: string;
};

export function PerformanceGoalsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [message, setMessage] = useState("Loading performance goals");

  useEffect(() => {
    async function loadGoals() {
      const response = await fetch(`${apiBaseUrl}/api/performance/goals`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load performance goals");
      }

      const data = (await response.json()) as Goal[];
      setGoals(data);
      setMessage(`${data.length} performance goals loaded`);
    }

    loadGoals().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load performance goals");
    });
  }, [apiBaseUrl, session.headers]);

  const averageProgress = goals.length
    ? Math.round(goals.reduce((total, goal) => total + goal.progress, 0) / goals.length)
    : 0;

  return (
    <section className="employeeWorkspace" aria-label="Performance goals">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Goals and KPIs</p>
          <h2>Weighted goals, departmental focus, and execution progress across the performance cycle.</h2>
        </div>
        <span className="status">Average {averageProgress}%</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="leaveSummaryGrid">
        <article>
          <span>Total Goals</span>
          <strong>{goals.length}</strong>
        </article>
        <article>
          <span>Average Progress</span>
          <strong>{averageProgress}%</strong>
        </article>
        <article>
          <span>At Risk</span>
          <strong>{goals.filter((goal) => goal.status === "watch").length}</strong>
        </article>
      </div>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Goal</th>
              <th>Category</th>
              <th>Weight</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => (
              <tr key={goal.id}>
                <td>
                  {goal.employeeName}
                  <br />
                  {goal.department}
                </td>
                <td>{goal.title}</td>
                <td>{goal.category}</td>
                <td>{goal.weight}%</td>
                <td>{goal.progress}%</td>
                <td>{goal.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
