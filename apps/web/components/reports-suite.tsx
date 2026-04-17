"use client";

import { useState } from "react";
import { ComplianceReportsWorkspace } from "./compliance-reports-workspace";
import { ExecutiveReportsWorkspace } from "./executive-reports-workspace";
import { TalentReportsWorkspace } from "./talent-reports-workspace";
import { WorkforceReportsWorkspace } from "./workforce-reports-workspace";

type ReportsView = "executive" | "workforce" | "compliance" | "talent";

const views: ReadonlyArray<{ key: ReportsView; title: string; hint: string }> = [
  { key: "executive", title: "Executive", hint: "Top-line headcount, payroll, approvals, and operating signals." },
  { key: "workforce", title: "Workforce", hint: "Directory, branch, department, and document coverage views." },
  { key: "compliance", title: "Compliance", hint: "Leave liability, statutory totals, document risk, and probation watch." },
  { key: "talent", title: "Talent", hint: "Vacancies, candidate stages, goals, reviews, and onboarding momentum." }
];

export function ReportsSuite() {
  const [activeView, setActiveView] = useState<ReportsView>("executive");

  return (
    <section aria-label="Reports suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Reports Hub</p>
          <h2>One reporting home across payroll, people, compliance, and talent operations.</h2>
          <span>This is the commercial heart of Solva HR: fast answers, export-ready views, and fewer custom Excel firefights.</span>
        </div>
        <div className="reportsSectionNav" role="tablist" aria-label="Reports screens">
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

      {activeView === "executive" ? <ExecutiveReportsWorkspace /> : null}
      {activeView === "workforce" ? <WorkforceReportsWorkspace /> : null}
      {activeView === "compliance" ? <ComplianceReportsWorkspace /> : null}
      {activeView === "talent" ? <TalentReportsWorkspace /> : null}
    </section>
  );
}
