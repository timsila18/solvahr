"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type LeaveBalanceRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  periodYear: number;
  opening: number;
  accrued: number;
  taken: number;
  adjusted: number;
  closing: number;
};

export function LeaveBalancesWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [balances, setBalances] = useState<LeaveBalanceRow[]>([]);
  const [message, setMessage] = useState("Loading leave balances");

  useEffect(() => {
    async function loadBalances() {
      const response = await fetch(`${apiBaseUrl}/api/leave/balances`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load leave balances");
      }

      const data = (await response.json()) as LeaveBalanceRow[];
      setBalances(data);
      setMessage(`${data.length} leave balance rows ready`);
    }

    loadBalances().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load leave balances");
    });
  }, [apiBaseUrl, session.headers]);

  const summary = balances.reduce(
    (accumulator, balance) => ({
      accrued: accumulator.accrued + balance.accrued,
      taken: accumulator.taken + balance.taken,
      closing: accumulator.closing + balance.closing
    }),
    { accrued: 0, taken: 0, closing: 0 }
  );

  return (
    <section className="leaveWorkspace" aria-label="Leave balances">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Leave Balances</p>
          <h2>See entitlement movement, taken days, and closing balances across employees.</h2>
        </div>
        <span className="status">Live</span>
      </div>

      <div className="leaveSummaryGrid">
        <article>
          <span>Accrued Days</span>
          <strong>{summary.accrued}</strong>
        </article>
        <article>
          <span>Taken Days</span>
          <strong>{summary.taken}</strong>
        </article>
        <article>
          <span>Closing Balance</span>
          <strong>{summary.closing}</strong>
        </article>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>Opening</th>
              <th>Accrued</th>
              <th>Taken</th>
              <th>Adjusted</th>
              <th>Closing</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <tr key={balance.id}>
                <td>
                  {balance.employeeName}
                  <br />
                  {balance.employeeNumber}
                </td>
                <td>{balance.leaveTypeName}</td>
                <td>{balance.opening}</td>
                <td>{balance.accrued}</td>
                <td>{balance.taken}</td>
                <td>{balance.adjusted}</td>
                <td>{balance.closing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
