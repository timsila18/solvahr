"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type AttendanceSummary = {
  trackedEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  overtimeHours: number;
  openExceptions: number;
};

export function AttendanceOverviewWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [message, setMessage] = useState("Loading attendance overview");

  useEffect(() => {
    async function loadSummary() {
      const response = await fetch(`${apiBaseUrl}/api/attendance/summary`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load attendance overview");
      }

      const data = (await response.json()) as AttendanceSummary;
      setSummary(data);
      setMessage("Attendance overview refreshed");
    }

    loadSummary().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load attendance overview");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Attendance overview workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Attendance Overview</p>
          <h2>Daily workforce presence and exception pressure in one glance.</h2>
        </div>
        <span className="status">Attendance</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Tracked" value={formatCount(summary?.trackedEmployees ?? 0)} hint="Employees on attendance watch" />
        <MetricCard label="Present" value={formatCount(summary?.presentToday ?? 0)} hint="Marked in for today" />
        <MetricCard label="Absent" value={formatCount(summary?.absentToday ?? 0)} hint="Unplanned attendance gaps" />
        <MetricCard label="Late" value={formatCount(summary?.lateToday ?? 0)} hint="Clock-in exceptions" />
      </div>

      <div className="leavePolicyGrid">
        <article className="leavePolicyCard">
          <span>Overtime Hours</span>
          <strong>{summary?.overtimeHours ?? 0}</strong>
          <small>Captured and ready for approval review.</small>
          <b>Payroll ready</b>
        </article>
        <article className="leavePolicyCard">
          <span>Open Exceptions</span>
          <strong>{summary?.openExceptions ?? 0}</strong>
          <small>Attendance issues needing manager or HR follow-up.</small>
          <b>Needs action</b>
        </article>
        <article className="leavePolicyCard">
          <span>Biometric Readiness</span>
          <strong>API Ready</strong>
          <small>Manual import first, device integration later.</small>
          <b>Phase-ready</b>
        </article>
      </div>
    </section>
  );
}
