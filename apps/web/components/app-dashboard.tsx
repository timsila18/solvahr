"use client";

import {
  createWorkflowInstance,
  phaseTwoWorkflowDefinitions,
  summarizePipeline
} from "@solva/shared";
import { useState } from "react";
import { EmployeeWorkspace } from "./employee-workspace";
import { LeaveSuite } from "./leave-suite";
import { MetricCard } from "./metric-card";
import { PayrollSuite } from "./payroll-suite";
import { PhaseTwoPanel } from "./phase-two-panel";
import { RecruitmentSuite } from "./recruitment-suite";
import { LoginScreen } from "./login-screen";
import { useStagingSession } from "./staging-session";

type ActiveScreen =
  | "home"
  | "employees"
  | "leave"
  | "payroll"
  | "recruitment"
  | "phaseTwo";

const moduleWidgets = [
  { key: "employees", title: "Employees", value: "Live records", hint: "Create and view staff files" },
  { key: "leave", title: "Leave", value: "Requests", hint: "Submit, approve, reject" },
  { key: "payroll", title: "Payroll", value: "Run, payslips, reports", hint: "Open the full payroll hub" },
  { key: "recruitment", title: "Recruitment", value: "Pipeline", hint: "Vacancies and candidates" },
  { key: "phaseTwo", title: "Documents", value: "Workflows", hint: "Onboarding and approvals" }
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
  ["Slice 12", "Detailed recruitment suite", "Active"]
] as const;

const candidates = [
  { fullName: "Mercy Njeri", stage: "interview", screeningScore: 87, source: "LinkedIn" },
  { fullName: "Daniel Otieno", stage: "shortlisted", screeningScore: 81, source: "Referral" },
  { fullName: "Faith Wambui", stage: "offer", screeningScore: 91, source: "Careers Page" }
] as const;

const onboardingTasks = [
  {
    personName: "Faith Wambui",
    title: "Submit KRA PIN, SHA, NSSF, and bank details",
    ownerRole: "candidate",
    dueDate: "2026-04-25",
    status: "in progress"
  },
  {
    personName: "Faith Wambui",
    title: "Prepare laptop, email, and HRIS employee account",
    ownerRole: "admin officer",
    dueDate: "2026-05-02",
    status: "not started"
  },
  {
    personName: "Brian Mwangi",
    title: "Complete 90-day probation review",
    ownerRole: "manager",
    dueDate: "2026-04-18",
    status: "in progress"
  }
] as const;

const offerWorkflowDefinition = phaseTwoWorkflowDefinitions.find((workflow) => workflow.code === "offer-approval");

if (!offerWorkflowDefinition) {
  throw new Error("Missing offer approval workflow definition");
}

const offerWorkflow = createWorkflowInstance(offerWorkflowDefinition, "job_offer", "offer-001");

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
                <span className="status">Slice 12</span>
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

        {activeScreen === "employees" ? <EmployeeWorkspace /> : null}
        {activeScreen === "leave" ? <LeaveSuite /> : null}
        {activeScreen === "payroll" ? <PayrollSuite /> : null}
        {activeScreen === "recruitment" ? <RecruitmentSuite /> : null}
        {activeScreen === "phaseTwo" ? (
          <PhaseTwoPanel
            pipeline={summarizePipeline(candidates.map((candidate) => candidate.stage))}
            candidates={[...candidates]}
            tasks={[...onboardingTasks]}
            workflowSteps={offerWorkflow.steps}
          />
        ) : null}
      </section>
    </main>
  );
}

