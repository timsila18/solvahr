"use client";

import { useState } from "react";
import { DisciplineWorkspace } from "./discipline-workspace";
import { GrievanceWorkspace } from "./grievance-workspace";
import { WelfareWorkspace } from "./welfare-workspace";

type RelationsView = "welfare" | "grievances" | "discipline";

const views: ReadonlyArray<{ key: RelationsView; title: string; hint: string }> = [
  { key: "welfare", title: "Welfare", hint: "Wellness, incidents, support, and follow-up actions." },
  { key: "grievances", title: "Grievances", hint: "Confidential complaints, escalation, and resolution pace." },
  { key: "discipline", title: "Discipline", hint: "Show-cause, hearings, outcomes, and evidence control." }
];

export function EmployeeRelationsSuite() {
  const [activeView, setActiveView] = useState<RelationsView>("welfare");

  return (
    <section aria-label="Employee relations suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Employee Relations Hub</p>
          <h2>Welfare, grievances, and discipline stay together where HR teams actually manage risk.</h2>
          <span>This turns Solva HR into more than payroll and leave. It becomes the operating system for employee relations and case follow-through.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Employee relations screens">
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

      {activeView === "welfare" ? <WelfareWorkspace /> : null}
      {activeView === "grievances" ? <GrievanceWorkspace /> : null}
      {activeView === "discipline" ? <DisciplineWorkspace /> : null}
    </section>
  );
}
