"use client";

import { useState } from "react";
import { DocumentGenerationWorkspace } from "./document-generation-workspace";
import { OnboardingTasksWorkspace } from "./onboarding-tasks-workspace";
import { ProbationWorkspace } from "./probation-workspace";

type OnboardingView = "tasks" | "probation" | "documents";

const views: ReadonlyArray<{ key: OnboardingView; title: string; hint: string }> = [
  { key: "tasks", title: "Tasks", hint: "Track pre-boarding, induction, and activation work." },
  { key: "probation", title: "Probation", hint: "Manage review timing, scores, and confirmation decisions." },
  { key: "documents", title: "Documents", hint: "Generate onboarding, offer, and probation letters." }
];

export function OnboardingSuite() {
  const [activeView, setActiveView] = useState<OnboardingView>("tasks");

  return (
    <section aria-label="Onboarding suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Onboarding Hub</p>
          <h2>Onboarding, probation, and document generation now live as one connected HR workflow module.</h2>
          <span>This links hiring, employee activation, probation decisions, and HR templates in a way buyers actually care about.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Onboarding screens">
          {views.map((view) => (
            <button
              className={activeView === view.key ? "activePayrollNav" : ""}
              key={view.key}
              onClick={() => setActiveView(view.key)}
              type="button"
            >
              <strong>{view.title}</strong>
              <small>{view.hint}</small>
            </button>
          ))}
        </div>
      </section>

      {activeView === "tasks" ? <OnboardingTasksWorkspace /> : null}
      {activeView === "probation" ? <ProbationWorkspace /> : null}
      {activeView === "documents" ? <DocumentGenerationWorkspace /> : null}
    </section>
  );
}
