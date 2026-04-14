"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type PayslipLine = {
  code: string;
  name: string;
  kind: "earning" | "deduction" | "employer_cost";
  amount: number;
};

type Payslip = {
  payslipId: string;
  runId: string;
  runEmployeeId: string;
  status: string;
  generatedAt: string;
  releasedAt: string | null;
  company: {
    name: string;
    country: string;
  };
  period: {
    label: string;
    code: string;
    cycle: string;
    startDate: string | null;
    endDate: string | null;
    payDate: string | null;
  };
  employee: {
    employeeId: string;
    displayName: string;
    legalName: string;
    employeeNumber: string;
    payrollNumber: string | null;
    department: string | null;
    branch: string | null;
    paymentMode: string;
    bankName: string;
    accountNumber: string;
  };
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  employerCosts: PayslipLine[];
  totals: {
    grossPay: number;
    taxablePay: number;
    totalDeductions: number;
    totalEmployerCosts: number;
    netPay: number;
  };
};

function money(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(value);
}

function renderPayslipHtml(payslip: Payslip) {
  const renderRows = (rows: PayslipLine[]) =>
    rows
      .map(
        (row) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #d8e0e3;">${row.name}</td>
            <td style="padding:8px 0;border-bottom:1px solid #d8e0e3;text-align:right;">${money(row.amount)}</td>
          </tr>
        `
      )
      .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${payslip.employee.displayName} Payslip</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; margin: 32px; color: #192024;">
      <div style="max-width: 860px; margin: 0 auto; border: 1px solid #d8e0e3; border-radius: 8px; padding: 28px;">
        <div style="display:flex; justify-content:space-between; gap: 24px; align-items:flex-start; margin-bottom:24px;">
          <div>
            <img src="https://solva-hris-web-staging.onrender.com/brand/solva-hr-wordmark-dark.svg" alt="Solva HR" style="width: 220px; height:auto;" />
            <p style="margin:12px 0 0; color:#65727a;">${payslip.company.name}</p>
          </div>
          <div style="text-align:right;">
            <strong style="display:block; font-size:24px;">Payslip</strong>
            <span style="color:#65727a;">${payslip.period.label}</span>
          </div>
        </div>
        <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-bottom: 24px;">
          <div>
            <strong style="display:block;">${payslip.employee.displayName}</strong>
            <span style="display:block; color:#65727a;">${payslip.employee.department ?? "Department pending"}</span>
            <span style="display:block; color:#65727a;">Payroll No: ${payslip.employee.payrollNumber ?? payslip.employee.employeeNumber}</span>
          </div>
          <div style="text-align:right;">
            <span style="display:block; color:#65727a;">Pay Date: ${payslip.period.payDate ?? "Pending"}</span>
            <span style="display:block; color:#65727a;">Bank: ${payslip.employee.bankName}</span>
            <span style="display:block; color:#65727a;">Account: ${payslip.employee.accountNumber}</span>
          </div>
        </div>
        <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px;">
          <div>
            <strong style="display:block; margin-bottom: 12px;">Earnings</strong>
            <table style="width:100%; border-collapse: collapse;">${renderRows(payslip.earnings)}</table>
          </div>
          <div>
            <strong style="display:block; margin-bottom: 12px;">Deductions</strong>
            <table style="width:100%; border-collapse: collapse;">${renderRows(payslip.deductions)}</table>
          </div>
        </div>
        <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 24px;">
          <div style="border:1px solid #d8e0e3; border-radius:8px; padding:14px;">
            <span style="display:block; color:#65727a;">Gross Pay</span>
            <strong>${money(payslip.totals.grossPay)}</strong>
          </div>
          <div style="border:1px solid #d8e0e3; border-radius:8px; padding:14px;">
            <span style="display:block; color:#65727a;">Total Deductions</span>
            <strong>${money(payslip.totals.totalDeductions)}</strong>
          </div>
          <div style="border:1px solid #d8e0e3; border-radius:8px; padding:14px;">
            <span style="display:block; color:#65727a;">Net Pay</span>
            <strong>${money(payslip.totals.netPay)}</strong>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

export function PayslipWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "idle" | "releasing">("loading");
  const [message, setMessage] = useState("Loading payslips");

  async function loadPayslips() {
    setStatus("loading");
    const response = await fetch(`${apiBaseUrl}/api/payroll/payslips/current`, {
      headers: session.headers,
      cache: "no-store"
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.error?.message ?? "Unable to load payslips");
    }

    const data = (await response.json()) as Payslip[];
    setPayslips(data);
    setSelectedPayslipId((current) => current || data[0]?.payslipId || "");
    setStatus("idle");
    setMessage(`${data.length} payslips ready for review`);
  }

  useEffect(() => {
    loadPayslips().catch((error) => {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Unable to load payslips");
    });
  }, [apiBaseUrl, session.headers]);

  async function releasePayslips() {
    setStatus("releasing");
    setMessage("Releasing current payslips");

    const response = await fetch(`${apiBaseUrl}/api/payroll/payslips/current/release`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: "{}"
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Payslips could not be released");
      return;
    }

    await loadPayslips();
    setMessage("Payslips released and ready for download");
  }

  function downloadPayslip(payslip: Payslip) {
    const html = renderPayslipHtml(payslip);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payslip.employee.payrollNumber ?? payslip.employee.employeeNumber}-${payslip.period.code}-payslip.html`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Payslip downloaded for ${payslip.employee.displayName}`);
  }

  const selectedPayslip = payslips.find((item) => item.payslipId === selectedPayslipId) ?? payslips[0] ?? null;

  return (
    <section className="payslipWorkspace" id="payslips" aria-label="Payslip workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Payslip Workspace</p>
          <h2>Generate, release, and download branded payslips from the active payroll run.</h2>
        </div>
        <span className="status">{status === "releasing" ? "Releasing" : selectedPayslip?.status ?? "Loading"}</span>
      </div>

      <div className="payslipGrid">
        <div className="payslipList">
          <div className="payslipToolbar">
            <button className="primaryButton" disabled={status === "releasing" || !payslips.length} onClick={releasePayslips} type="button">
              {status === "releasing" ? "Releasing..." : "Release Payslips"}
            </button>
            <p>{message}</p>
          </div>

          {payslips.map((payslip) => (
            <button
              className={`payslipListItem${selectedPayslip?.payslipId === payslip.payslipId ? " activePayslip" : ""}`}
              key={payslip.payslipId}
              onClick={() => setSelectedPayslipId(payslip.payslipId)}
              type="button"
            >
              <strong>{payslip.employee.displayName}</strong>
              <span>{payslip.employee.payrollNumber ?? payslip.employee.employeeNumber}</span>
              <small>{money(payslip.totals.netPay)} net pay</small>
            </button>
          ))}
        </div>

        <div className="payslipCard">
          {selectedPayslip ? (
            <>
              <div className="payslipHeader">
                <div>
                  <img className="payslipWordmark" src="/brand/solva-hr-wordmark-dark.svg" alt="Solva HR" />
                  <p>{selectedPayslip.company.name}</p>
                </div>
                <div>
                  <strong>{selectedPayslip.employee.displayName}</strong>
                  <span>{selectedPayslip.period.label}</span>
                </div>
              </div>

              <div className="payslipMeta">
                <div>
                  <span>Department</span>
                  <strong>{selectedPayslip.employee.department ?? "Pending department"}</strong>
                </div>
                <div>
                  <span>Pay Date</span>
                  <strong>{selectedPayslip.period.payDate ?? "Pending"}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>
                    {selectedPayslip.employee.bankName} / {selectedPayslip.employee.accountNumber}
                  </strong>
                </div>
              </div>

              <div className="payslipColumns">
                <div className="payslipSection">
                  <strong>Earnings</strong>
                  {selectedPayslip.earnings.map((line) => (
                    <div className="payslipLine" key={line.code}>
                      <span>{line.name}</span>
                      <b>{money(line.amount)}</b>
                    </div>
                  ))}
                </div>
                <div className="payslipSection">
                  <strong>Deductions</strong>
                  {selectedPayslip.deductions.map((line) => (
                    <div className="payslipLine" key={line.code}>
                      <span>{line.name}</span>
                      <b>{money(line.amount)}</b>
                    </div>
                  ))}
                </div>
              </div>

              <div className="payslipTotals">
                <div>
                  <span>Gross Pay</span>
                  <strong>{money(selectedPayslip.totals.grossPay)}</strong>
                </div>
                <div>
                  <span>Total Deductions</span>
                  <strong>{money(selectedPayslip.totals.totalDeductions)}</strong>
                </div>
                <div>
                  <span>Net Pay</span>
                  <strong>{money(selectedPayslip.totals.netPay)}</strong>
                </div>
              </div>

              <div className="payslipActions">
                <button className="secondaryButton" onClick={() => downloadPayslip(selectedPayslip)} type="button">
                  Download Payslip
                </button>
                <span>{selectedPayslip.releasedAt ? `Released ${selectedPayslip.releasedAt.slice(0, 10)}` : "Draft payslip"}</span>
              </div>
            </>
          ) : (
            <p>No payslips available yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
