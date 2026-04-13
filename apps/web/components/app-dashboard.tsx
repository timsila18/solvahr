"use client";

import {
  calculatePayroll,
  activeRulesForDate,
  createWorkflowInstance,
  kenyaStatutoryRules2026,
  phaseTwoWorkflowDefinitions,
  summarizePipeline
} from "@solva/shared";
import { useState } from "react";
import { EmployeeWorkspace } from "./employee-workspace";
import { LeaveWorkspace } from "./leave-workspace";
import { MetricCard } from "./metric-card";
import { ModuleTile } from "./module-tile";
import { PayrollReportsWorkspace } from "./payroll-reports-workspace";
import { PayrollTable } from "./payroll-table";
import { PayrollWorkspace } from "./payroll-workspace";
import { PhaseTwoPanel } from "./phase-two-panel";
import { RecruitmentWorkspace } from "./recruitment-workspace";

type ActiveScreen = "home" | "employees" | "leave" | "payroll" | "payrollReports" | "recruitment" | "phaseTwo";

const employee = {
  tenantId: "tenant-solva-demo",
  employeeId: "emp-001",
  payrollNumber: "SOL-001",
  displayName: "Amina Otieno",
  department: "People Operations",
  branch: "Nairobi HQ",
  costCenter: "HR-001",
  payGroup: "monthly",
  basicSalary: 120000,
  statutory: {
    paye: true,
    personalRelief: true,
    shif: true,
    nssf: true,
    housingLevy: true
  }
};

const payrollResult = calculatePayroll({
  tenantId: "tenant-solva-demo",
  country: "KE",
  period: "2026-04",
  cycle: "monthly",
  employee,
  rules: activeRulesForDate(kenyaStatutoryRules2026, "2026-04-30"),
  components: [
    { code: "BASIC", name: "Basic Salary", kind: "earning", amount: 120000, taxTreatment: "taxable" },
    { code: "COMMUTER", name: "Commuter Allowance", kind: "earning", amount: 10000, taxTreatment: "taxable" },
    { code: "WELFARE", name: "Staff Welfare", kind: "deduction", amount: 500 }
  ]
});

const moduleWidgets = [
  { key: "employees", title: "Employees", value: "Live records", hint: "Create and view staff files" },
  { key: "leave", title: "Leave", value: "Requests", hint: "Submit, approve, reject" },
  { key: "payroll", title: "Payroll", value: "Current run", hint: "Review totals and approval" },
  { key: "payrollReports", title: "Reports", value: "Payroll exports", hint: "Register, bank, statutory" },
  { key: "recruitment", title: "Recruitment", value: "Pipeline", hint: "Vacancies and candidates" },
  { key: "phaseTwo", title: "Documents", value: "Workflows", hint: "Onboarding and approvals" }
] as const satisfies ReadonlyArray<{ key: ActiveScreen; title: string; value: string; hint: string }>;

const buildSlices = [
  ["Slice 1", "API foundation", "Done"],
  ["Slice 2", "Supabase activation", "Done"],
  ["Slice 3", "Employee workspace", "Done"],
  ["Slice 4", "Leave workflow", "Done"],
  ["Slice 5", "Payroll run", "Done"],
  ["Slice 6", "Payroll reports", "Done"],
  ["Slice 7", "Recruitment", "Done"],
  ["Slice 8", "App-style navigation", "Active"]
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
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("home");

  function openScreen(screen: ActiveScreen) {
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Primary">
        <button className="brand brandButton" onClick={() => openScreen("home")} type="button">
          <span className="brandMark">S</span>
          <div>
            <strong>Solva HRIS</strong>
            <span>Enterprise Suite</span>
          </div>
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
            <p className="eyebrow">Solva Demo Manufacturing</p>
            <h1>{activeScreen === "home" ? "Choose a workspace." : moduleWidgets.find((item) => item.key === activeScreen)?.title}</h1>
          </div>
          {activeScreen !== "home" ? (
            <button className="secondaryButton" onClick={() => openScreen("home")} type="button">
              Back Home
            </button>
          ) : null}
        </header>

        {activeScreen === "home" ? (
          <>
            <section className="homeHero" aria-label="Workspace chooser">
              <div>
                <p className="eyebrow">Command Home</p>
                <h2>Open a module, work the task, come back home.</h2>
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
                <span className="status">Slice 8</span>
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
        {activeScreen === "leave" ? <LeaveWorkspace /> : null}
        {activeScreen === "payroll" ? <PayrollWorkspace /> : null}
        {activeScreen === "payrollReports" ? <PayrollReportsWorkspace /> : null}
        {activeScreen === "recruitment" ? <RecruitmentWorkspace /> : null}
        {activeScreen === "phaseTwo" ? (
          <PhaseTwoPanel
            pipeline={summarizePipeline(candidates.map((candidate) => candidate.stage))}
            candidates={[...candidates]}
            tasks={[...onboardingTasks]}
            workflowSteps={offerWorkflow.steps}
          />
        ) : null}

        {activeScreen === "payroll" ? (
          <section className="contentGrid">
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <p className="eyebrow">Demo Payroll Result</p>
                  <h2>Amina Otieno</h2>
                </div>
                <span className="status">Ready</span>
              </div>
              <PayrollTable result={payrollResult} />
            </div>

            <div className="panel">
              <div className="panelHeader">
                <div>
                  <p className="eyebrow">Module Map</p>
                  <h2>Operational Coverage</h2>
                </div>
              </div>
              <div className="moduleGrid">
                {moduleWidgets.map((item) => (
                  <ModuleTile key={item.title} title={item.title} value={item.value} hint={item.hint} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
