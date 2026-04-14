"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type EmployeeRow = {
  employeeId: string;
  employeeNumber: string;
  payrollNumber: string | null;
  displayName: string;
  legalName: string;
  department?: string | null;
  branch?: string | null;
  costCenter?: string | null;
  payGroup?: string | null;
  basicSalary?: number;
  status: string;
  statutory?: {
    paye: boolean;
    personalRelief: boolean;
    shif: boolean;
    nssf: boolean;
    housingLevy: boolean;
  };
};

function complianceScore(employee: EmployeeRow) {
  const statutory = employee.statutory;
  if (!statutory) {
    return 0;
  }

  return [statutory.paye, statutory.personalRelief, statutory.shif, statutory.nssf, statutory.housingLevy].filter(Boolean)
    .length;
}

export function EmployeeComplianceWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [message, setMessage] = useState("Loading employee compliance");

  useEffect(() => {
    async function loadEmployees() {
      const response = await fetch(`${apiBaseUrl}/api/employees`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load employee compliance");
      }

      const data = (await response.json()) as EmployeeRow[];
      setEmployees(data);
      setMessage(`${data.length} employee compliance records loaded`);
    }

    loadEmployees().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load employee compliance");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Employee compliance workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Compliance and Payroll Readiness</p>
          <h2>Check statutory coverage, payroll readiness, and employment status across the employee base.</h2>
        </div>
        <span className="status">Compliance</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Status</th>
              <th>Pay Group</th>
              <th>Salary</th>
              <th>Statutory Score</th>
              <th>Cost Center</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.employeeId}>
                <td>
                  {employee.displayName}
                  <br />
                  {employee.employeeNumber}
                </td>
                <td>{employee.status}</td>
                <td>{employee.payGroup ?? "monthly"}</td>
                <td>{employee.basicSalary ?? 0}</td>
                <td>{complianceScore(employee)}/5</td>
                <td>{employee.costCenter ?? "Pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
