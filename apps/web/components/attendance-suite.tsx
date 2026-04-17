"use client";

import { useState } from "react";
import { AttendanceOverviewWorkspace } from "./attendance-overview-workspace";
import { OvertimeWorkspace } from "./overtime-workspace";
import { TimesheetWorkspace } from "./timesheet-workspace";

type AttendanceView = "overview" | "timesheets" | "overtime";

const views: ReadonlyArray<{ key: AttendanceView; title: string; hint: string }> = [
  { key: "overview", title: "Overview", hint: "Presence, absence, lateness, and attendance exceptions." },
  { key: "timesheets", title: "Timesheets", hint: "Project or cost-center hours with submission status." },
  { key: "overtime", title: "Overtime", hint: "Overtime requests, approvals, and payroll-linked hours." }
];

export function AttendanceSuite() {
  const [activeView, setActiveView] = useState<AttendanceView>("overview");

  return (
    <section aria-label="Attendance suite">
      <section className="payrollSuiteIntro">
        <div>
          <p className="eyebrow">Attendance Hub</p>
          <h2>Presence, timesheets, and overtime in one operational module tied back to payroll.</h2>
          <span>This gives Solva a real attendance-ready surface even before biometric integrations arrive.</span>
        </div>
        <div className="payrollSectionNav" role="tablist" aria-label="Attendance screens">
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

      {activeView === "overview" ? <AttendanceOverviewWorkspace /> : null}
      {activeView === "timesheets" ? <TimesheetWorkspace /> : null}
      {activeView === "overtime" ? <OvertimeWorkspace /> : null}
    </section>
  );
}
