"use client";

import { useState } from "react";
import { RecruitmentOffersWorkspace } from "./recruitment-offers-workspace";
import { RecruitmentVacanciesWorkspace } from "./recruitment-vacancies-workspace";
import { RecruitmentWorkspace } from "./recruitment-workspace";

type RecruitmentView = "pipeline" | "vacancies" | "offers";

const views: ReadonlyArray<{ key: RecruitmentView; title: string; hint: string }> = [
  { key: "pipeline", title: "Pipeline", hint: "Create candidates and watch stage movement live." },
  { key: "vacancies", title: "Vacancies", hint: "Review requisitions, open roles, budget range, and hiring load." },
  { key: "offers", title: "Offers", hint: "Track interviews and approvals all the way to offer sign-off." }
];

export function RecruitmentSuite() {
  const [activeView, setActiveView] = useState<RecruitmentView>("pipeline");

  return (
    <section aria-label="Recruitment suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Recruitment Hub</p>
          <h2>Pipeline, planning, and offers now live inside one deeper ATS module.</h2>
          <span>Move from demand planning to candidate flow to interviews and offer approval without leaving recruitment.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Recruitment screens">
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

      {activeView === "pipeline" ? <RecruitmentWorkspace /> : null}
      {activeView === "vacancies" ? <RecruitmentVacanciesWorkspace /> : null}
      {activeView === "offers" ? <RecruitmentOffersWorkspace /> : null}
    </section>
  );
}
