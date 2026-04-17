"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { downloadCsv, formatCount, groupCounts, humanize, isDueWithinDays } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type EmployeeRow = {
  employeeId: string;
  employeeNumber: string;
  payrollNumber: string | null;
  displayName: string;
  department?: string | null;
  branch?: string | null;
  costCenter?: string | null;
  status: string;
};

type EmployeeDocument = {
  id: string;
  employeeName: string;
  category: string;
  name: string;
  restricted: boolean;
  expiresAt: string | null;
  version: number;
};

export function WorkforceReportsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [message, setMessage] = useState("Loading workforce reports");

  useEffect(() => {
    async function loadData() {
      const [employeeResponse, documentResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/employees`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/employees/documents`, {
          headers: session.headers,
          cache: "no-store"
        })
      ]);

      if (!employeeResponse.ok || !documentResponse.ok) {
        throw new Error("Unable to load workforce reports");
      }

      const employeeData = (await employeeResponse.json()) as EmployeeRow[];
      const documentData = (await documentResponse.json()) as EmployeeDocument[];
      setEmployees(employeeData);
      setDocuments(documentData);
      setMessage(`${employeeData.length} employees and ${documentData.length} employee documents loaded`);
    }

    loadData().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load workforce reports");
    });
  }, [apiBaseUrl, session.headers]);

  const departmentRows = groupCounts(employees, (employee) => employee.department);
  const branchRows = groupCounts(employees, (employee) => employee.branch);
  const expiringDocuments = documents
    .filter((document) => document.expiresAt && isDueWithinDays(document.expiresAt, 90))
    .sort((left, right) => String(left.expiresAt).localeCompare(String(right.expiresAt)));
  const activeEmployees = employees.filter((employee) => employee.status === "active").length;

  function exportDirectory() {
    const exportRows = employees.map((employee) => ({
      employeeNumber: employee.employeeNumber,
      payrollNumber: employee.payrollNumber,
      employeeName: employee.displayName,
      department: employee.department ?? "Unassigned",
      branch: employee.branch ?? "Unassigned",
      costCenter: employee.costCenter ?? "Unassigned",
      status: humanize(employee.status)
    }));

    if (!downloadCsv("workforce-directory.csv", exportRows)) {
      setMessage("No workforce rows available for export");
      return;
    }

    setMessage("Workforce directory CSV prepared");
  }

  return (
    <section className="employeeWorkspace" aria-label="Workforce reports workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Workforce Reporting</p>
          <h2>Track headcount, structure, and document coverage without leaving the reports hub.</h2>
        </div>
        <span className="status">Workforce</span>
      </div>

      <div className="reportActionRow">
        <p className="workspaceMessage">{message}</p>
        <button className="secondaryButton" onClick={exportDirectory} type="button">
          Export Directory CSV
        </button>
      </div>

      <div className="metrics">
        <MetricCard label="Employees" value={formatCount(employees.length)} hint={`${formatCount(activeEmployees)} active employees`} />
        <MetricCard label="Departments" value={formatCount(departmentRows.length)} hint="Organization coverage" />
        <MetricCard label="Branches" value={formatCount(branchRows.length)} hint="Location spread" />
        <MetricCard label="Document Alerts" value={formatCount(expiringDocuments.length)} hint="Expiring in 90 days" />
      </div>

      <div className="reportPreviewGrid">
        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Department Headcount</p>
              <h3>Where the workforce sits</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Employees</th>
                </tr>
              </thead>
              <tbody>
                {departmentRows.map((row) => (
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
              <p className="eyebrow">Branch Headcount</p>
              <h3>Location distribution</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Employees</th>
                </tr>
              </thead>
              <tbody>
                {branchRows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{formatCount(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="reportPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Employee Directory Preview</p>
            <h3>Operational employee master list</h3>
          </div>
        </div>
        <div className="reportTableWrap">
          <table className="reportTable">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Branch</th>
                <th>Cost Center</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 10).map((employee) => (
                <tr key={employee.employeeId}>
                  <td>
                    {employee.displayName}
                    <br />
                    {employee.employeeNumber}
                  </td>
                  <td>{employee.department ?? "Unassigned"}</td>
                  <td>{employee.branch ?? "Unassigned"}</td>
                  <td>{employee.costCenter ?? "Unassigned"}</td>
                  <td>{humanize(employee.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="reportPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Document Watchlist</p>
            <h3>Upcoming document expiry and access risk</h3>
          </div>
        </div>
        <div className="reportTableWrap">
          <table className="reportTable">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Document</th>
                <th>Category</th>
                <th>Restricted</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {expiringDocuments.length ? expiringDocuments.map((document) => (
                <tr key={document.id}>
                  <td>{document.employeeName}</td>
                  <td>{document.name}</td>
                  <td>{document.category}</td>
                  <td>{document.restricted ? "Yes" : "No"}</td>
                  <td>{document.expiresAt ?? "N/A"}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5}>No employee document alerts in the next 90 days.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
