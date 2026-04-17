"use client";

import { useState } from "react";
import { TrainingCatalogWorkspace } from "./training-catalog-workspace";
import { TrainingRecordsWorkspace } from "./training-records-workspace";
import { TrainingRequestsWorkspace } from "./training-requests-workspace";

type TrainingView = "catalog" | "requests" | "records";

const views: ReadonlyArray<{ key: TrainingView; title: string; hint: string }> = [
  { key: "catalog", title: "Catalog", hint: "Courses, providers, delivery modes, and seats." },
  { key: "requests", title: "Requests", hint: "Training demand, budget tags, and approval status." },
  { key: "records", title: "Records", hint: "Completed learning, certificates, and CPD hours." }
];

export function TrainingSuite() {
  const [activeView, setActiveView] = useState<TrainingView>("catalog");

  return (
    <section aria-label="Training suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Training Hub</p>
          <h2>Training demand, course catalogue, and learning history in one module.</h2>
          <span>This gives Solva HR a real learning surface tied to performance, onboarding, and compliance growth.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Training screens">
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

      {activeView === "catalog" ? <TrainingCatalogWorkspace /> : null}
      {activeView === "requests" ? <TrainingRequestsWorkspace /> : null}
      {activeView === "records" ? <TrainingRecordsWorkspace /> : null}
    </section>
  );
}
