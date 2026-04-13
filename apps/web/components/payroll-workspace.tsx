"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";

type PayrollLine = {
  code: string;
  name: string;
  kind: "earning" | "deduction" | "employer_cost";
  amount: number;
};

type PayrollEmployeeResult = {
  employeeId: string;
  payrollNumber: string;
  displayName?: string;
  grossPay: number;
  taxablePay: number;
  totalDeductions: number;
  totalEmployerCosts: number;
  netPay: number;
  deductions: PayrollLine[];
  employerCosts: PayrollLine[];
  exceptions: string[];
};

type PayrollRun = {
  id: string;
  period: string;
  cycle: string;
  status: string;
  version: number;
  employeeCount: number;
  totals: {
    grossPay: number;
    deductions: number;
    employerCosts: number;
    netPay: number;
  };
  results: PayrollEmployeeResult[];
};

function money(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(value);
}

export function PayrollWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "approving">("loading");
  const [message, setMessage] = useState("Loading payroll run");

  async function loadPayrollRun() {
    setStatus("loading");
    const response = await fetch(`${apiBaseUrl}/api/payroll/runs/current`, {
      headers: {
        "x-user-roles": "payroll_admin"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load payroll run");
    }

    const data = (await response.json()) as PayrollRun;
    setRun(data);
    setStatus("idle");
    setMessage(`Payroll run ${data.status.replaceAll("_", " ")} with ${data.employeeCount} employees`);
  }

  useEffect(() => {
    loadPayrollRun().catch((error) => {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Unable to load payroll run");
    });
  }, [apiBaseUrl]);

  async function requestApproval() {
    setStatus("approving");
    setMessage("Requesting payroll approval");

    const response = await fetch(`${apiBaseUrl}/api/payroll/runs/current/approve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-roles": "payroll_admin"
      },
      body: "{}"
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Payroll approval could not be requested");
      return;
    }

    await loadPayrollRun();
    setMessage("Payroll approval workflow started");
  }

  const statutoryLines = run?.results
    .flatMap((result) => [...result.deductions, ...result.employerCosts])
    .filter((line) => ["PAYE", "SHIF", "NSSF_EE", "NSSF_ER", "AHL_EE", "AHL_ER"].includes(line.code))
    .reduce<Record<string, PayrollLine>>((accumulator, line) => {
      const existing = accumulator[line.code];
      accumulator[line.code] = existing
        ? { ...existing, amount: existing.amount + line.amount }
        : { ...line };
      return accumulator;
    }, {});

  return (
    <section className="payrollWorkspace" id="payroll-live" aria-label="Payroll run workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Payroll Run Workspace</p>
          <h2>Review live payroll totals from Supabase before approval.</h2>
        </div>
        <span className="status">{status === "approving" ? "Requesting" : run?.status.replaceAll("_", " ") ?? "Loading"}</span>
      </div>

      <div className="payrollRunGrid">
        <div className="payrollSummary">
          <div>
            <span>Period</span>
            <strong>{run?.period ?? "Loading"}</strong>
          </div>
          <div>
            <span>Gross Pay</span>
            <strong>{money(run?.totals.grossPay ?? 0)}</strong>
          </div>
          <div>
            <span>Deductions</span>
            <strong>{money(run?.totals.deductions ?? 0)}</strong>
          </div>
          <div>
            <span>Net To Bank</span>
            <strong>{money(run?.totals.netPay ?? 0)}</strong>
          </div>
        </div>

        <div className="payrollActions">
          <button
            className="primaryButton"
            disabled={status === "approving" || !run || run.status === "pending_approval"}
            onClick={requestApproval}
            type="button"
          >
            {status === "approving" ? "Requesting..." : "Request Approval"}
          </button>
          <p>{message}</p>
        </div>
      </div>

      <div className="payrollDetailGrid">
        <div className="employeeTableWrap">
          <table className="employeeTable">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {run?.results.slice(0, 8).map((result) => (
                <tr key={result.employeeId}>
                  <td>
                    <strong>{result.displayName ?? result.payrollNumber}</strong>
                    <span>{result.payrollNumber}</span>
                  </td>
                  <td>{money(result.grossPay)}</td>
                  <td>{money(result.totalDeductions)}</td>
                  <td>{money(result.netPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="statutoryList">
          <strong>Statutory Summary</strong>
          {Object.values(statutoryLines ?? {}).map((line) => (
            <span key={line.code}>
              {line.name}: {money(line.amount)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
