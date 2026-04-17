"use client";

import { useState } from "react";
import { WorkflowDefinitionsWorkspace } from "./workflow-definitions-workspace";
import { WorkflowEscalationsWorkspace } from "./workflow-escalations-workspace";
import { WorkflowQueueWorkspace } from "./workflow-queue-workspace";

type WorkflowView = "queue" | "definitions" | "escalations";

const views: ReadonlyArray<{ key: WorkflowView; title: string; hint: string }> = [
  { key: "queue", title: "Queue", hint: "Approvals across leave, payroll, recruitment, and probation." },
  { key: "definitions", title: "Definitions", hint: "Approval chains, approver roles, and escalation timing." },
  { key: "escalations", title: "Escalations", hint: "What needs attention soon or is already overdue." }
];

export function WorkflowSuite() {
  const [activeView, setActiveView] = useState<WorkflowView>("queue");

  return (
    <section aria-label="Workflow suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Workflow Center</p>
          <h2>One place to run approvals instead of chasing them across every module.</h2>
          <span>This is where Solva starts to feel operationally sharp: fewer missed approvals, clearer ownership, and better escalation visibility.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Workflow screens">
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

      {activeView === "queue" ? <WorkflowQueueWorkspace /> : null}
      {activeView === "definitions" ? <WorkflowDefinitionsWorkspace /> : null}
      {activeView === "escalations" ? <WorkflowEscalationsWorkspace /> : null}
    </section>
  );
}
