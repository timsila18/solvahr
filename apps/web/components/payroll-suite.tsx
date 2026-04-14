"use client";

import { useState } from "react";
import { PayslipWorkspace } from "./payslip-workspace";
import { PayrollReportsWorkspace } from "./payroll-reports-workspace";
import { PayrollWorkspace } from "./payroll-workspace";

type PayrollView = "run" | "payslips" | "reports";

const views: ReadonlyArray<{ key: PayrollView; title: string; hint: string }> = [
  { key: "run", title: "Payroll Run", hint: "Review totals, approvals, and live employee results." },
  { key: "payslips", title: "Payslips", hint: "Release branded payslips and download employee copies." },
  { key: "reports", title: "Payroll Reports", hint: "Register, gross-to-net, net-to-bank, and statutory views." }
];

export function PayrollSuite() {
  const [activeView, setActiveView] = useState<PayrollView>("run");

  return (
    <section aria-label="Payroll suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Payroll Hub</p>
          <h2>Everything payroll stays inside one detailed module.</h2>
          <span>Run payroll, release payslips, and open export-ready reports without leaving payroll.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Payroll screens">
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

      {activeView === "run" ? <PayrollWorkspace /> : null}
      {activeView === "payslips" ? <PayslipWorkspace /> : null}
      {activeView === "reports" ? <PayrollReportsWorkspace /> : null}
    </section>
  );
}
