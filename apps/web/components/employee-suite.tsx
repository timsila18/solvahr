"use client";

import { useState } from "react";
import { EmployeeComplianceWorkspace } from "./employee-compliance-workspace";
import { EmployeeDocumentsWorkspace } from "./employee-documents-workspace";
import { EmployeeWorkspace } from "./employee-workspace";

type EmployeeView = "directory" | "compliance" | "documents";

const views: ReadonlyArray<{ key: EmployeeView; title: string; hint: string }> = [
  { key: "directory", title: "Directory", hint: "Create employees and manage the live master file." },
  { key: "compliance", title: "Compliance", hint: "See statutory readiness, salary basis, and payroll alignment." },
  { key: "documents", title: "Documents", hint: "Manage contracts, IDs, certificates, and restricted records." }
];

export function EmployeeSuite() {
  const [activeView, setActiveView] = useState<EmployeeView>("directory");

  return (
    <section aria-label="Employee suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Employee Records Hub</p>
          <h2>The employee master file now has separate views for records, compliance, and documents.</h2>
          <span>That gives Solva a stronger HR operations core instead of treating employee records like a flat directory.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Employee screens">
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

      {activeView === "directory" ? <EmployeeWorkspace /> : null}
      {activeView === "compliance" ? <EmployeeComplianceWorkspace /> : null}
      {activeView === "documents" ? <EmployeeDocumentsWorkspace /> : null}
    </section>
  );
}
