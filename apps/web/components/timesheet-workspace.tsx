"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type Timesheet = {
  id: string;
  employeeName: string;
  employeeNumber: string;
  project: string;
  costCenter: string;
  weekEnding: string;
  hoursWorked: number;
  overtimeHours: number;
  status: string;
};

export function TimesheetWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [rows, setRows] = useState<Timesheet[]>([]);
  const [message, setMessage] = useState("Loading timesheets");

  useEffect(() => {
    async function loadTimesheets() {
      const response = await fetch(`${apiBaseUrl}/api/attendance/timesheets`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load timesheets");
      }

      const data = (await response.json()) as Timesheet[];
      setRows(data);
      setMessage(`${data.length} timesheets loaded`);
    }

    loadTimesheets().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load timesheets");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Timesheet workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Timesheets</p>
          <h2>Capture hours by project or cost center and see what is still waiting for sign-off.</h2>
        </div>
        <span className="status">Timesheets</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Rows" value={formatCount(rows.length)} hint="Tracked weekly timesheets" />
        <MetricCard label="Submitted" value={formatCount(rows.filter((row) => row.status === "submitted").length)} hint="Pending manager review" />
        <MetricCard label="Approved" value={formatCount(rows.filter((row) => row.status === "approved").length)} hint="Ready for payroll or costing" />
        <MetricCard label="Overtime Hrs" value={formatCount(rows.reduce((total, row) => total + row.overtimeHours, 0))} hint="Included in weekly sheets" />
      </div>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Project</th>
              <th>Cost Center</th>
              <th>Week Ending</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.employeeName}
                  <br />
                  {row.employeeNumber}
                </td>
                <td>{row.project}</td>
                <td>{row.costCenter}</td>
                <td>{row.weekEnding}</td>
                <td>{row.hoursWorked} / OT {row.overtimeHours}</td>
                <td>{humanize(row.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
