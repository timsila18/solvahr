"use client";

import { useState } from "react";
import { AuditActivityWorkspace } from "./audit-activity-workspace";
import { AuditAccessWorkspace } from "./audit-access-workspace";
import { AuditSensitiveWorkspace } from "./audit-sensitive-workspace";

type AuditView = "activity" | "sensitive" | "access";

const views: ReadonlyArray<{ key: AuditView; title: string; hint: string }> = [
  { key: "activity", title: "Activity", hint: "Recent actions across payroll, HR, recruitment, and reports." },
  { key: "sensitive", title: "Sensitive", hint: "High-risk approvals and changes worth extra scrutiny." },
  { key: "access", title: "Access & Exports", hint: "Who exported, where it happened, and system trace points." }
];

export function AuditSuite() {
  const [activeView, setActiveView] = useState<AuditView>("activity");

  return (
    <section aria-label="Audit suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Audit Center</p>
          <h2>Follow what changed, who did it, and where the operational risk sits.</h2>
          <span>This is the trust layer for Solva HR: approvals, exports, sensitive updates, and traceability in one place.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Audit screens">
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

      {activeView === "activity" ? <AuditActivityWorkspace /> : null}
      {activeView === "sensitive" ? <AuditSensitiveWorkspace /> : null}
      {activeView === "access" ? <AuditAccessWorkspace /> : null}
    </section>
  );
}
