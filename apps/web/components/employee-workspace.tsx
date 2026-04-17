"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  status: string;
};

type EmployeeRequest = {
  id: string;
  requestedByEmail: string;
  requestedByName?: string;
  status: string;
  approverRole: string;
  createdAt: string;
  decidedAt: string | null;
  decisionComments?: string | null;
  payload: {
    employeeNumber: string;
    legalName: string;
    companyEmail?: string;
    hireDate: string;
  };
};

type EmployeeForm = {
  employeeNumber: string;
  legalName: string;
  companyEmail: string;
  hireDate: string;
};

const initialForm: EmployeeForm = {
  employeeNumber: "",
  legalName: "",
  companyEmail: "",
  hireDate: new Date().toISOString().slice(0, 10)
};

export function EmployeeWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "approving">("loading");
  const [message, setMessage] = useState("Loading employee records");
  const canApproveEmployees = session.role === "supervisor" || session.role === "company_admin";
  const canSubmitEmployees = session.role === "operator" || session.role === "company_admin" || session.role === "hr_admin";

  async function loadEmployees() {
    setStatus("loading");
    const [employeeResponse, requestResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/employees`, {
        headers: session.headers,
        cache: "no-store"
      }),
      fetch(`${apiBaseUrl}/api/employee-requests`, {
        headers: session.headers,
        cache: "no-store"
      })
    ]);

    if (!employeeResponse.ok || !requestResponse.ok) {
      throw new Error("Unable to load employee records");
    }

    const employeeData = (await employeeResponse.json()) as EmployeeRow[];
    const requestData = (await requestResponse.json()) as EmployeeRequest[];
    setEmployees(employeeData);
    setRequests(requestData);
    setStatus("idle");
    setMessage(`${employeeData.length} employee records and ${requestData.length} approval requests loaded`);
  }

  useEffect(() => {
    loadEmployees().catch((error) => {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Unable to load employee records");
    });
  }, [apiBaseUrl, session.headers]);

  async function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("Creating employee record");

    const payload = {
      employeeNumber: form.employeeNumber.trim(),
      legalName: form.legalName.trim(),
      companyEmail: form.companyEmail.trim() || undefined,
      hireDate: form.hireDate
    };

    const response = await fetch(`${apiBaseUrl}/api/employees`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Employee record could not be created");
      return;
    }

    const result = await response.json().catch(() => null);
    setForm({
      ...initialForm,
      hireDate: form.hireDate
    });
    await loadEmployees();
    setMessage(
      result?.status === "pending_approval"
        ? "Employee request submitted for supervisor approval"
        : "Employee record created in Supabase"
    );
  }

  async function decideEmployeeRequest(id: string, decision: "approve" | "reject") {
    setStatus("approving");
    setMessage(`${decision === "approve" ? "Approving" : "Rejecting"} employee request`);

    const response = await fetch(`${apiBaseUrl}/api/employee-requests/${id}/${decision}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify({
        comments: `Employee request ${decision} from employee workspace`
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Employee approval action failed");
      return;
    }

    await loadEmployees();
    setMessage(`Employee request ${decision}d`);
  }

  return (
    <section className="employeeWorkspace" id="employees" aria-label="Employee workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Employee Workspace</p>
          <h2>Live employee records connected to Supabase.</h2>
        </div>
        <span className="status">{status === "saving" ? "Saving" : status === "approving" ? "Approving" : "Live"}</span>
      </div>

      <div className="employeeGrid">
        {canSubmitEmployees ? (
          <form className="employeeForm" onSubmit={submitEmployee}>
            <label>
              Employee number
              <input
                required
                value={form.employeeNumber}
                onChange={(event) => setForm((current) => ({ ...current, employeeNumber: event.target.value }))}
                placeholder="EMP-1002"
              />
            </label>
            <label>
              Legal name
              <input
                required
                minLength={2}
                value={form.legalName}
                onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))}
                placeholder="Jane Wanjiku"
              />
            </label>
            <label>
              Company email
              <input
                type="email"
                value={form.companyEmail}
                onChange={(event) => setForm((current) => ({ ...current, companyEmail: event.target.value }))}
                placeholder="jane@company.co.ke"
              />
            </label>
            <label>
              Hire date
              <input
                required
                type="date"
                value={form.hireDate}
                onChange={(event) => setForm((current) => ({ ...current, hireDate: event.target.value }))}
              />
            </label>
            <button className="primaryButton" disabled={status === "saving"} type="submit">
              {status === "saving" ? "Submitting..." : canApproveEmployees ? "Create Employee" : "Submit For Approval"}
            </button>
            <p>{message}</p>
          </form>
        ) : (
          <div className="employeeForm">
            <strong>Restricted</strong>
            <p>You can view employee records, but creation is limited to operators and approved HR roles.</p>
          </div>
        )}

        <div className="employeeTableWrap">
          <table className="employeeTable">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Number</th>
                <th>Branch</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 8).map((employee) => (
                <tr key={employee.employeeId}>
                  <td>
                    <strong>{employee.displayName}</strong>
                    <span>{employee.department ?? "Unassigned department"}</span>
                  </td>
                  <td>{employee.employeeNumber}</td>
                  <td>{employee.branch ?? "Unassigned"}</td>
                  <td>{employee.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="reportPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Employee Approval Queue</p>
            <h2>Operator submissions and supervisor decisions.</h2>
          </div>
        </div>
        <div className="offerList">
          {requests.map((request) => (
            <article key={request.id}>
              <div>
                <strong>{request.payload.legalName} - {request.payload.employeeNumber}</strong>
                <span>
                  {request.requestedByName ?? request.requestedByEmail} - {request.requestedByEmail}
                </span>
                <span>
                  Hire date {request.payload.hireDate} - Approver {request.approverRole} - Status {request.status}
                </span>
                {request.decidedAt ? <span>Decision logged at {new Date(request.decidedAt).toLocaleString()}</span> : null}
                {request.decisionComments ? <span>Comments: {request.decisionComments}</span> : null}
              </div>
              <div className="decisionActions workflowActionStack">
                {(session.role === request.approverRole || session.role === "company_admin") && request.status === "pending_approval" ? (
                  <>
                    <button className="secondaryButton" disabled={status === "approving"} onClick={() => decideEmployeeRequest(request.id, "approve")} type="button">
                      Approve
                    </button>
                    <button className="secondaryButton" disabled={status === "approving"} onClick={() => decideEmployeeRequest(request.id, "reject")} type="button">
                      Reject
                    </button>
                  </>
                ) : (
                  <span className="tableBadge">{request.status}</span>
                )}
              </div>
            </article>
          ))}
          {!requests.length ? <p>No employee approval requests yet.</p> : null}
        </div>
      </section>
    </section>
  );
}
