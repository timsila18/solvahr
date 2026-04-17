"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { downloadCsv, formatCount, humanize, money } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type EmployeeRow = {
  employeeId: string;
  status: string;
};

type LeaveRequest = {
  id: string;
  employeeName: string;
  type: string;
  status: string;
  approver?: string | null;
};

type Vacancy = {
  id: string;
  title: string;
  status: string;
  candidateCount: number;
};

type PayrollRun = {
  period: string;
  status: string;
  employeeCount: number;
  totals: {
    grossPay: number;
    deductions: number;
    employerCosts: number;
    netPay: number;
  };
};

type SnapshotRow = {
  metric: string;
  value: string;
  detail: string;
};

export function ExecutiveReportsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [headline, setHeadline] = useState<{
    headcount: number;
    pendingApprovals: number;
    openVacancies: number;
    payrollCost: number;
    netToBank: number;
  } | null>(null);
  const [message, setMessage] = useState("Loading executive reporting view");

  useEffect(() => {
    async function loadData() {
      const [employeeResponse, leaveResponse, payrollResponse, vacancyResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/employees`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/leave/requests`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/payroll/runs/current`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/recruitment/vacancies`, {
          headers: session.headers,
          cache: "no-store"
        })
      ]);

      if (!employeeResponse.ok || !leaveResponse.ok || !payrollResponse.ok || !vacancyResponse.ok) {
        throw new Error("Unable to load executive reporting view");
      }

      const employees = (await employeeResponse.json()) as EmployeeRow[];
      const leaveRequests = (await leaveResponse.json()) as LeaveRequest[];
      const payrollRun = (await payrollResponse.json()) as PayrollRun;
      const vacancies = (await vacancyResponse.json()) as Vacancy[];

      const activeEmployees = employees.filter((employee) => employee.status === "active").length;
      const submittedLeaves = leaveRequests.filter((request) => request.status === "submitted").length;
      const openVacancies = vacancies.filter((vacancy) => vacancy.status === "open").length;
      const pendingApprovals = submittedLeaves + (payrollRun.status === "pending_approval" ? 1 : 0);

      const snapshotRows: SnapshotRow[] = [
        {
          metric: "Headcount",
          value: formatCount(employees.length),
          detail: `${activeEmployees} active employees`
        },
        {
          metric: "Payroll Cost",
          value: money(payrollRun.totals.grossPay + payrollRun.totals.employerCosts),
          detail: `${humanize(payrollRun.status)} payroll for ${payrollRun.period}`
        },
        {
          metric: "Net To Bank",
          value: money(payrollRun.totals.netPay),
          detail: `${formatCount(payrollRun.employeeCount)} employees in current run`
        },
        {
          metric: "Pending Approvals",
          value: formatCount(pendingApprovals),
          detail: `${submittedLeaves} leave items, payroll ${humanize(payrollRun.status)}`
        },
        {
          metric: "Open Vacancies",
          value: formatCount(openVacancies),
          detail: `${vacancies.reduce((total, vacancy) => total + vacancy.candidateCount, 0)} tracked candidates`
        }
      ];

      setHeadline({
        headcount: employees.length,
        pendingApprovals,
        openVacancies,
        payrollCost: payrollRun.totals.grossPay + payrollRun.totals.employerCosts,
        netToBank: payrollRun.totals.netPay
      });
      setRows(snapshotRows);
      setMessage(`Executive snapshot refreshed for ${payrollRun.period}`);
    }

    loadData().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load executive reporting view");
    });
  }, [apiBaseUrl, session.headers]);

  function exportSnapshot() {
    if (!downloadCsv("executive-snapshot.csv", rows)) {
      setMessage("No executive rows available for export");
      return;
    }

    setMessage("Executive snapshot CSV prepared");
  }

  return (
    <section className="employeeWorkspace" aria-label="Executive reports workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Executive Reporting</p>
          <h2>Quick answers for leadership on people cost, approvals, vacancies, and current operating pressure.</h2>
        </div>
        <span className="status">Executive</span>
      </div>

      <div className="reportActionRow">
        <p className="workspaceMessage">{message}</p>
        <button className="secondaryButton" onClick={exportSnapshot} type="button">
          Export Snapshot CSV
        </button>
      </div>

      <div className="metrics" aria-label="Executive report metrics">
        <MetricCard label="Headcount" value={formatCount(headline?.headcount ?? 0)} hint="Current workforce" />
        <MetricCard label="Payroll Cost" value={money(headline?.payrollCost ?? 0)} hint="Gross plus employer costs" />
        <MetricCard label="Net To Bank" value={money(headline?.netToBank ?? 0)} hint="Current payroll cash impact" />
        <MetricCard label="Open Vacancies" value={formatCount(headline?.openVacancies ?? 0)} hint={`${formatCount(headline?.pendingApprovals ?? 0)} pending approvals`} />
      </div>

      <div className="reportPreviewGrid">
        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Snapshot</p>
              <h3>Board-style summary</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.metric}>
                    <td>{row.metric}</td>
                    <td>{row.value}</td>
                    <td>{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Signals</p>
              <h3>What deserves attention now</h3>
            </div>
          </div>
          <div className="compactList">
            {rows.map((row) => (
              <article key={`signal-${row.metric}`}>
                <strong>{row.metric}</strong>
                <span>{row.detail}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
