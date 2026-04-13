"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";

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
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("loading");
  const [message, setMessage] = useState("Loading employee records");

  async function loadEmployees() {
    setStatus("loading");
    const response = await fetch(`${apiBaseUrl}/api/employees`, {
      headers: {
        "x-user-roles": "company_admin"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load employee records");
    }

    const data = (await response.json()) as EmployeeRow[];
    setEmployees(data);
    setStatus("idle");
    setMessage(`${data.length} employee records loaded from Supabase`);
  }

  useEffect(() => {
    loadEmployees().catch((error) => {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Unable to load employee records");
    });
  }, [apiBaseUrl]);

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
        "x-user-roles": "company_admin"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Employee record could not be created");
      return;
    }

    setForm({
      ...initialForm,
      hireDate: form.hireDate
    });
    await loadEmployees();
    setMessage("Employee record created in Supabase");
  }

  return (
    <section className="employeeWorkspace" id="employees" aria-label="Employee workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Employee Workspace</p>
          <h2>Live employee records connected to Supabase.</h2>
        </div>
        <span className="status">{status === "saving" ? "Saving" : "Live"}</span>
      </div>

      <div className="employeeGrid">
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
            {status === "saving" ? "Creating..." : "Create Employee"}
          </button>
          <p>{message}</p>
        </form>

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
    </section>
  );
}
