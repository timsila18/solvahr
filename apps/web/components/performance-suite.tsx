"use client";

import { useState } from "react";
import { PerformanceGoalsWorkspace } from "./performance-goals-workspace";
import { PerformancePlansWorkspace } from "./performance-plans-workspace";
import { PerformanceReviewsWorkspace } from "./performance-reviews-workspace";

type PerformanceView = "goals" | "reviews" | "plans";

const views: ReadonlyArray<{ key: PerformanceView; title: string; hint: string }> = [
  { key: "goals", title: "Goals", hint: "Track weighted objectives, progress, and department focus." },
  { key: "reviews", title: "Reviews", hint: "See cycle progress, ratings, and manager review flow." },
  { key: "plans", title: "Plans", hint: "Manage development plans, PIPs, and follow-up actions." }
];

export function PerformanceSuite() {
  const [activeView, setActiveView] = useState<PerformanceView>("goals");

  return (
    <section aria-label="Performance suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Performance Hub</p>
          <h2>Goals, reviews, and development plans sit together as one real performance module.</h2>
          <span>That mirrors the stronger HRIS products, but we can tie it tighter to Solva payroll, workflows, and Kenya HR operations.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Performance screens">
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

      {activeView === "goals" ? <PerformanceGoalsWorkspace /> : null}
      {activeView === "reviews" ? <PerformanceReviewsWorkspace /> : null}
      {activeView === "plans" ? <PerformancePlansWorkspace /> : null}
    </section>
  );
}
