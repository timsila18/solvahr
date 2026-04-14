"use client";

import { useState } from "react";
import { LeaveBalancesWorkspace } from "./leave-balances-workspace";
import { LeavePolicyWorkspace } from "./leave-policy-workspace";
import { LeaveWorkspace } from "./leave-workspace";

type LeaveView = "requests" | "balances" | "policies";

const views: ReadonlyArray<{ key: LeaveView; title: string; hint: string }> = [
  { key: "requests", title: "Requests", hint: "Submit, approve, and track the live approval queue." },
  { key: "balances", title: "Balances", hint: "See openings, accruals, usage, and closing entitlement." },
  { key: "policies", title: "Policies", hint: "Review leave types, entitlements, and current usage pressure." }
];

export function LeaveSuite() {
  const [activeView, setActiveView] = useState<LeaveView>("requests");

  return (
    <section aria-label="Leave suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Leave Hub</p>
          <h2>Requests, balances, and policy detail stay together in one leave module.</h2>
          <span>Move between operations, balances, and policy views without leaving leave management.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Leave screens">
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

      {activeView === "requests" ? <LeaveWorkspace /> : null}
      {activeView === "balances" ? <LeaveBalancesWorkspace /> : null}
      {activeView === "policies" ? <LeavePolicyWorkspace /> : null}
    </section>
  );
}
