"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { downloadCsv, formatCount, groupCounts, humanize, isDueWithinDays, money } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type LeaveBalance = {
  id: string;
  leaveTypeName: string;
  closing: number;
  taken: number;
};

type PayrollReportsPayload = {
  reports: {
    statutorySummary: Array<{
      code: string;
      name: string;
      amount: number;
    }>;
  };
};

type ProbationReview = {
  id: string;
  employeeName: string;
  reviewDate: string;
  recommendation: string;
  status: string;
};

type EmployeeDocument = {
  id: string;
  employeeName: string;
  category: string;
  name: string;
  restricted: boolean;
  expiresAt: string | null;
};

export function ComplianceReportsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [statutoryRows, setStatutoryRows] = useState<PayrollReportsPayload["reports"]["statutorySummary"]>([]);
  const [probationReviews, setProbationReviews] = useState<ProbationReview[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [message, setMessage] = useState("Loading compliance reports");

  useEffect(() => {
    async function loadData() {
      const [leaveResponse, payrollResponse, probationResponse, documentResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/leave/balances`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/payroll/reports/current`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/probation/reviews`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/employees/documents`, {
          headers: session.headers,
          cache: "no-store"
        })
      ]);

      if (!leaveResponse.ok || !payrollResponse.ok || !probationResponse.ok || !documentResponse.ok) {
        throw new Error("Unable to load compliance reports");
      }

      const leaveData = (await leaveResponse.json()) as LeaveBalance[];
      const payrollData = (await payrollResponse.json()) as PayrollReportsPayload;
      const probationData = (await probationResponse.json()) as ProbationReview[];
      const documentData = (await documentResponse.json()) as EmployeeDocument[];

      setLeaveBalances(leaveData);
      setStatutoryRows(payrollData.reports.statutorySummary);
      setProbationReviews(probationData);
      setDocuments(documentData);
      setMessage("Compliance snapshot refreshed");
    }

    loadData().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load compliance reports");
    });
  }, [apiBaseUrl, session.headers]);

  const leaveLiabilityRows = groupCounts(leaveBalances, (balance) => balance.leaveTypeName)
    .map((row) => ({
      label: row.label,
      count: leaveBalances
        .filter((balance) => balance.leaveTypeName === row.label)
        .reduce((total, balance) => total + balance.closing, 0)
    }));

  const documentAlerts = documents.filter((document) => document.restricted || isDueWithinDays(document.expiresAt, 90));
  const totalLeaveLiabilityDays = leaveBalances.reduce((total, balance) => total + balance.closing, 0);

  function exportComplianceSnapshot() {
    const rows = [
      ...leaveLiabilityRows.map((row) => ({
        family: "Leave Liability",
        item: row.label,
        value: row.count
      })),
      ...statutoryRows.map((row) => ({
        family: "Statutory Summary",
        item: row.name,
        value: row.amount
      })),
      ...probationReviews.map((row) => ({
        family: "Probation Review",
        item: row.employeeName,
        value: `${humanize(row.status)} / ${humanize(row.recommendation)}`
      }))
    ];

    if (!downloadCsv("compliance-snapshot.csv", rows)) {
      setMessage("No compliance rows available for export");
      return;
    }

    setMessage("Compliance snapshot CSV prepared");
  }

  return (
    <section className="employeeWorkspace" aria-label="Compliance reports workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Compliance Reporting</p>
          <h2>Keep statutory, leave, probation, and document risk in one audit-friendly workspace.</h2>
        </div>
        <span className="status">Compliance</span>
      </div>

      <div className="reportActionRow">
        <p className="workspaceMessage">{message}</p>
        <button className="secondaryButton" onClick={exportComplianceSnapshot} type="button">
          Export Compliance CSV
        </button>
      </div>

      <div className="metrics">
        <MetricCard label="Leave Liability" value={formatCount(totalLeaveLiabilityDays)} hint="Closing balance days" />
        <MetricCard label="Statutory Lines" value={formatCount(statutoryRows.length)} hint="Current payroll statutory totals" />
        <MetricCard label="Probation Reviews" value={formatCount(probationReviews.length)} hint="Review and confirmation queue" />
        <MetricCard label="Document Alerts" value={formatCount(documentAlerts.length)} hint="Restricted or expiring records" />
      </div>

      <div className="reportPreviewGrid">
        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Leave Liability</p>
              <h3>Closing balances by leave type</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Closing Days</th>
                </tr>
              </thead>
              <tbody>
                {leaveLiabilityRows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{formatCount(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Statutory Summary</p>
              <h3>Current payroll obligations</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {statutoryRows.map((row) => (
                  <tr key={row.code}>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{money(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="reportPreviewGrid">
        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Probation Watch</p>
              <h3>Reviews that need action</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Review Date</th>
                  <th>Status</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {probationReviews.map((review) => (
                  <tr key={review.id}>
                    <td>{review.employeeName}</td>
                    <td>{review.reviewDate}</td>
                    <td>{humanize(review.status)}</td>
                    <td>{humanize(review.recommendation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Document Risk</p>
              <h3>Restricted and upcoming expiries</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {documentAlerts.length ? documentAlerts.map((document) => (
                  <tr key={document.id}>
                    <td>{document.employeeName}</td>
                    <td>{document.name}</td>
                    <td>{document.category}</td>
                    <td>{document.restricted ? "Restricted access" : `Expires ${document.expiresAt}`}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4}>No current document risk alerts.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
