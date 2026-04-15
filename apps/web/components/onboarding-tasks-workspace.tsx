"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type OnboardingTask = {
  id: string;
  personName: string;
  category: string;
  title: string;
  ownerRole: string;
  dueDate: string | null;
  status: string;
};

export function OnboardingTasksWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [message, setMessage] = useState("Loading onboarding tasks");

  useEffect(() => {
    async function loadTasks() {
      const response = await fetch(`${apiBaseUrl}/api/onboarding/tasks`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load onboarding tasks");
      }

      const data = (await response.json()) as OnboardingTask[];
      setTasks(data);
      setMessage(`${data.length} onboarding and induction tasks loaded`);
    }

    loadTasks().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load onboarding tasks");
    });
  }, [apiBaseUrl, session.headers]);

  const openTasks = tasks.filter((task) => task.status !== "completed").length;

  return (
    <section className="recruitmentWorkspace" aria-label="Onboarding tasks workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Onboarding Tasks</p>
          <h2>Pre-boarding, induction, IT readiness, and departmental tasks all stay visible from one launchpad.</h2>
        </div>
        <span className="status">{openTasks} open</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="leavePolicyGrid">
        {tasks.map((task) => (
          <article className="leavePolicyCard" key={task.id}>
            <span>{task.category}</span>
            <strong>{task.title}</strong>
            <small>
              {task.personName} - {task.ownerRole}
            </small>
            <b>{task.status.replaceAll("_", " ")}</b>
            <p>{task.dueDate ? `Due ${task.dueDate}` : "No due date set"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
