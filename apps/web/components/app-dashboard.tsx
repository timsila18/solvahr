"use client";

import { useState } from "react";
import { EmployeeSuite } from "./employee-suite";
import { EmployeeRelationsSuite } from "./employee-relations-suite";
import { AttendanceSuite } from "./attendance-suite";
import { LeaveSuite } from "./leave-suite";
import { MetricCard } from "./metric-card";
import { OnboardingSuite } from "./onboarding-suite";
import { PayrollSuite } from "./payroll-suite";
import { PerformanceSuite } from "./performance-suite";
import { RecruitmentSuite } from "./recruitment-suite";
import { ReportsSuite } from "./reports-suite";
import { AuditSuite } from "./audit-suite";
import { TrainingSuite } from "./training-suite";
import { WorkflowSuite } from "./workflow-suite";
import { LoginScreen } from "./login-screen";
import { useStagingSession } from "./staging-session";

type ActiveScreen =
  | "home"
  | "employees"
  | "leave"
  | "attendance"
  | "payroll"
  | "reports"
  | "relations"
  | "workflow"
  | "audit"
  | "training"
  | "performance"
  | "recruitment"
  | "onboarding";

const moduleWidgets = [
  { key: "employees", title: "Employees", value: "Live records", hint: "Create and view staff files" },
  { key: "leave", title: "Leave", value: "Requests", hint: "Submit, approve, reject" },
  { key: "attendance", title: "Attendance", value: "Presence, timesheets, overtime", hint: "Track time and payroll-linked hours" },
  { key: "payroll", title: "Payroll", value: "Run, payslips, reports", hint: "Open the full payroll hub" },
  { key: "reports", title: "Reports", value: "Executive, workforce, compliance", hint: "Open the universal report hub" },
  { key: "relations", title: "Relations", value: "Welfare, grievances, discipline", hint: "Manage employee relations and casework" },
  { key: "workflow", title: "Workflow", value: "Queue, definitions, escalations", hint: "Run approvals from one center" },
  { key: "audit", title: "Audit", value: "Activity, sensitive changes, access", hint: "Trace who changed what and when" },
  { key: "training", title: "Training", value: "Catalog, requests, records", hint: "Manage learning and development" },
  { key: "performance", title: "Performance", value: "Goals, reviews, plans", hint: "Manage the full performance cycle" },
  { key: "recruitment", title: "Recruitment", value: "Pipeline", hint: "Vacancies and candidates" },
  { key: "onboarding", title: "Onboarding", value: "Tasks, probation, docs", hint: "Launch the onboarding and probation hub" }
] as const satisfies ReadonlyArray<{ key: ActiveScreen; title: string; value: string; hint: string }>;

const buildSlices = [
  ["Slice 1", "API foundation", "Done"],
  ["Slice 2", "Supabase activation", "Done"],
  ["Slice 3", "Employee workspace", "Done"],
  ["Slice 4", "Leave workflow", "Done"],
  ["Slice 5", "Leave approval", "Done"],
  ["Slice 6", "Payroll run", "Done"],
  ["Slice 7", "Payroll reports", "Done"],
  ["Slice 8", "App-style navigation", "Done"],
  ["Slice 9", "Login and staging session", "Done"],
  ["Slice 10", "Detailed payroll suite", "Done"],
  ["Slice 11", "Detailed leave suite", "Done"],
  ["Slice 12", "Detailed recruitment suite", "Done"],
  ["Slice 13", "Performance management suite", "Done"],
  ["Slice 14", "Employee records hub", "Done"],
  ["Slice 15", "Onboarding and probation hub", "Done"],
  ["Slice 16", "Universal reports hub", "Done"],
  ["Slice 17", "Employee relations hub", "Done"],
  ["Slice 18", "Workflow center", "Done"],
  ["Slice 19", "Audit log center", "Done"],
  ["Slice 20", "Attendance hub", "Done"],
  ["Slice 21", "Training hub", "Done"],
  ["Slice 22", "Approval controls and accountability", "Active"]
] as const;

function money(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(value);
}

export function AppDashboard() {
  const session = useStagingSession();
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("home");

  function openScreen(screen: ActiveScreen) {
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!session.ready) {
    return (
      <main className="loginShell">
        <section className="loginPanel loginPanelLoading" aria-label="Loading session">
          <img className="loginWordmark" src="/brand/solva-hr-wordmark-dark.svg" alt="Solva HR" />
          <div className="loginCopy">
            <p className="eyebrow">Preparing Workspace</p>
            <h1>Loading your Solva HR session.</h1>
            <span>Bringing payroll, people, and approvals together.</span>
          </div>
        </section>
      </main>
    );
  }

  if (!session.loggedIn) {
    return <LoginScreen />;
  }

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Primary">
        <button className="brand brandButton" onClick={() => openScreen("home")} type="button">
          <img className="brandIcon" src="/brand/solva-hr-icon-light.svg" alt="Solva HR icon" />
          <img className="brandWordmark" src="/brand/solva-hr-wordmark-light.svg" alt="Solva HR" />
        </button>
        <nav className="nav">
          {moduleWidgets.map((item) => (
            <button
              className={activeScreen === item.key ? "activeNav" : ""}
              key={item.key}
              onClick={() => openScreen(item.key)}
              type="button"
            >
              {item.title}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{session.name} - {session.role.replaceAll("_", " ")}</p>
            <h1>{activeScreen === "home" ? "Choose a workspace." : moduleWidgets.find((item) => item.key === activeScreen)?.title}</h1>
          </div>
          <div className="topbarActions">
            {activeScreen !== "home" ? (
              <button className="secondaryButton" onClick={() => openScreen("home")} type="button">
                Back Home
              </button>
            ) : null}
            <button className="secondaryButton" onClick={session.logout} type="button">
              Sign Out
            </button>
          </div>
        </header>

        {activeScreen === "home" ? (
          <>
            <section className="homeHero" aria-label="Workspace chooser">
              <div>
                <p className="eyebrow">Command Home</p>
                <h2>Open a module, work the task, come back home.</h2>
                <img className="homeWordmark" src="/brand/solva-hr-wordmark-dark.svg" alt="Solva HR wordmark" />
              </div>
              <img
                className="teamImage"
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80"
                alt="HR team reviewing workforce planning"
              />
            </section>

            <section className="metrics" aria-label="Key metrics">
              <MetricCard label="Headcount" value="248" hint="3 branches" />
              <MetricCard label="Payroll Cost" value={money(18450000)} hint="+3.8% variance" />
              <MetricCard label="Net To Bank" value={money(13944000)} hint="Bank file pending" />
              <MetricCard label="Approvals" value="29" hint="Leave, offers, payroll" />
            </section>

            <section className="appWidgetGrid" aria-label="Module widgets">
              {moduleWidgets.map((item) => (
                <button className="appWidget" key={item.key} onClick={() => openScreen(item.key)} type="button">
                  <span>{item.title}</span>
                  <strong>{item.value}</strong>
                  <small>{item.hint}</small>
                </button>
              ))}
            </section>

            <section className="progressPanel" aria-label="Build progress">
              <div className="panelHeader">
                <div>
                  <p className="eyebrow">Build Progress</p>
                  <h2>Small slices, visible checkpoints.</h2>
                </div>
                <span className="status">Slice 22</span>
              </div>
              <div className="sliceGrid">
                {buildSlices.map(([label, title, status]) => (
                  <article className="sliceCard" key={label}>
                    <div>
                      <span>{label}</span>
                      <strong>{title}</strong>
                    </div>
                    <b>{status}</b>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {activeScreen === "employees" ? <EmployeeSuite /> : null}
        {activeScreen === "leave" ? <LeaveSuite /> : null}
        {activeScreen === "attendance" ? <AttendanceSuite /> : null}
        {activeScreen === "payroll" ? <PayrollSuite /> : null}
        {activeScreen === "reports" ? <ReportsSuite /> : null}
        {activeScreen === "relations" ? <EmployeeRelationsSuite /> : null}
        {activeScreen === "workflow" ? <WorkflowSuite /> : null}
        {activeScreen === "audit" ? <AuditSuite /> : null}
        {activeScreen === "training" ? <TrainingSuite /> : null}
        {activeScreen === "performance" ? <PerformanceSuite /> : null}
        {activeScreen === "recruitment" ? <RecruitmentSuite /> : null}
        {activeScreen === "onboarding" ? <OnboardingSuite /> : null}
      </section>
    </main>
  );
}

