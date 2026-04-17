"use client";

import { FormEvent, useEffect, useState } from "react";
import { useStagingSession } from "./staging-session";

const roleOptions = [
  ["operator", "Operator"],
  ["supervisor", "Supervisor"],
  ["company_admin", "Company Admin"],
  ["hr_admin", "HR Admin"],
  ["payroll_admin", "Payroll Admin"],
  ["finance_user", "Finance User"],
  ["recruiter", "Recruiter"],
  ["manager", "Manager"],
  ["employee", "Employee"],
  ["auditor", "Auditor"]
] as const;

const defaultEmails: Record<(typeof roleOptions)[number][0], string> = {
  operator: "operator@solvahr.app",
  supervisor: "supervisor@solvahr.app",
  company_admin: "companyadmin@solvahr.app",
  hr_admin: "hradmin@solvahr.app",
  payroll_admin: "payrolladmin@solvahr.app",
  finance_user: "finance@solvahr.app",
  recruiter: "recruiter@solvahr.app",
  manager: "manager@solvahr.app",
  employee: "employee@solvahr.app",
  auditor: "auditor@solvahr.app"
};

export function LoginScreen() {
  const { login } = useStagingSession();
  const [role, setRole] = useState<(typeof roleOptions)[number][0]>("operator");
  const [name, setName] = useState("Solva Demo User");
  const [email, setEmail] = useState(defaultEmails.operator);

  useEffect(() => {
    setEmail(defaultEmails[role]);
  }, [role]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login({
      role,
      name: name.trim() || "Solva Demo User",
      email: email.trim() || "operator@solvahr.app"
    });
  }

  return (
    <main className="loginShell">
      <section className="loginPanel" aria-label="Solva HR login">
        <img className="loginWordmark" src="/brand/solva-hr-wordmark-dark.svg" alt="Solva HR" />
        <div className="loginCopy">
          <p className="eyebrow">Welcome Back</p>
          <h1>People, payroll, compliance, and approvals in one place.</h1>
          <span>Operator creates. Supervisor approves. Every step is traceable.</span>
        </div>

        <form className="loginForm" onSubmit={submit}>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as (typeof roleOptions)[number][0])}>
              {roleOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="primaryButton" type="submit">
            Access Workspace
          </button>
        </form>

        <div className="loginCopy">
          <p className="eyebrow">Quick Personas</p>
          <span>Use operator@solvahr.app to submit requests and supervisor@solvahr.app to approve them.</span>
        </div>

        <div className="loginIconCard">
          <img src="/brand/solva-hr-app-icon.svg" alt="Solva HR app icon" />
        </div>
      </section>
    </main>
  );
}
