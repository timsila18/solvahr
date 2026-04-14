"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type PayrollReportPayload = {
  run: {
    period: string;
    status: string;
    employeeCount: number;
  };
  reports: {
    payrollRegister: Record<string, string | number | null>[];
    grossToNet: Record<string, string | number | null>[];
    netToBank: Record<string, string | number | null>[];
    statutorySummary: Record<string, string | number | null>[];
    employerSpend: {
      grossPay: number;
      employerCosts: number;
      totalSpend: number;
    };
  };
};

const reportTabs = [
  ["payrollRegister", "Payroll Register"],
  ["grossToNet", "Gross to Net"],
  ["netToBank", "Net to Bank"],
  ["statutorySummary", "Statutory Summary"]
] as const;

type ReportKey = (typeof reportTabs)[number][0];

function formatHeader(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
}

function formatValue(value: string | number | null) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-KE", {
      maximumFractionDigits: 0
    }).format(value);
  }

  return value ?? "";
}

function toCsv(rows: Record<string, string | number | null>[]) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header] ?? null)).join(","))].join("\n");
}

export function PayrollReportsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [payload, setPayload] = useState<PayrollReportPayload | null>(null);
  const [activeReport, setActiveReport] = useState<ReportKey>("payrollRegister");
  const [message, setMessage] = useState("Loading payroll reports");

  useEffect(() => {
    async function loadReports() {
      const response = await fetch(`${apiBaseUrl}/api/payroll/reports/current`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load payroll reports");
      }

      const data = (await response.json()) as PayrollReportPayload;
      setPayload(data);
      setMessage(`${data.run.employeeCount} employee payroll rows ready for export`);
    }

    loadReports().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load payroll reports");
    });
  }, [apiBaseUrl, session.headers]);

  const rows = payload?.reports[activeReport] ?? [];
  const headers = Object.keys(rows[0] ?? {});
  const activeLabel = reportTabs.find(([key]) => key === activeReport)?.[1] ?? "Payroll Report";

  function downloadCsv() {
    const csv = toCsv(rows);
    if (!csv) {
      setMessage("No rows available for export");
      return;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeReport}-2026-04.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`${activeLabel} CSV prepared`);
  }

  return (
    <section className="payrollReportsWorkspace" id="payroll-reports" aria-label="Payroll reports">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Payroll Reports</p>
          <h2>Payroll register, gross-to-net, bank, and statutory views from one run.</h2>
        </div>
        <span className="status">{payload?.run.status.replaceAll("_", " ") ?? "Loading"}</span>
      </div>

      <div className="reportToolbar">
        <div className="reportTabs" role="tablist" aria-label="Payroll report tabs">
          {reportTabs.map(([key, label]) => (
            <button
              className={key === activeReport ? "activeReportTab" : ""}
              key={key}
              onClick={() => setActiveReport(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <button className="secondaryButton" onClick={downloadCsv} type="button">
          Export CSV
        </button>
      </div>

      <div className="reportMeta">
        <span>{payload?.run.period ?? "Loading period"}</span>
        <span>{message}</span>
        <span>
          Employer spend:{" "}
          {new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 0
          }).format(payload?.reports.employerSpend.totalSpend ?? 0)}
        </span>
      </div>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{formatHeader(header)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((row, index) => (
              <tr key={`${activeReport}-${index}`}>
                {headers.map((header) => (
                  <td key={header}>{formatValue(row[header] ?? null)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p>No report rows available.</p> : null}
      </div>
    </section>
  );
}
