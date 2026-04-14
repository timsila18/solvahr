"use client";

import { FormEvent, useState } from "react";
import { useStagingSession } from "./staging-session";

const roleOptions = [
  ["company_admin", "Company Admin"],
  ["hr_admin", "HR Admin"],
  ["payroll_admin", "Payroll Admin"],
  ["recruiter", "Recruiter"],
  ["manager", "Manager"]
] as const;

export function LoginScreen() {
  const { login } = useStagingSession();
  const [role, setRole] = useState<(typeof roleOptions)[number][0]>("company_admin");
  const [name, setName] = useState("Solva Demo User");
  const [email, setEmail] = useState("admin@solvahr.app");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login({
      role,
      name: name.trim() || "Solva Demo User",
      email: email.trim() || "admin@solvahr.app"
    });
  }

  return (
    <main className="loginShell">
      <section className="loginPanel" aria-label="Solva HR login">
        <img className="loginWordmark" src="/brand/solva-hr-wordmark-dark.svg" alt="Solva HR" />
        <div className="loginCopy">
          <p className="eyebrow">Welcome Back</p>
          <h1>People, payroll, compliance, and approvals in one place.</h1>
          <span>Smart People. Smarter Payroll.</span>
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

        <div className="loginIconCard">
          <img src="/brand/solva-hr-app-icon.svg" alt="Solva HR app icon" />
        </div>
      </section>
    </main>
  );
}
