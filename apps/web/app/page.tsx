import {
  calculatePayroll,
  activeRulesForDate,
  createWorkflowInstance,
  kenyaStatutoryRules2026,
  phaseTwoWorkflowDefinitions,
  summarizePipeline
} from "@solva/shared";
import { MetricCard } from "../components/metric-card";
import { ModuleTile } from "../components/module-tile";
import { PayrollTable } from "../components/payroll-table";
import { PhaseTwoPanel } from "../components/phase-two-panel";
import { EmployeeWorkspace } from "../components/employee-workspace";
import { LeaveWorkspace } from "../components/leave-workspace";

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

const modules = [
  ["Employees", "248 records", "Missing documents: 31"],
  ["Leave", "18 pending", "Annual liability ready"],
  ["Payroll", "April 2026", "Ready for review"],
  ["Reports", "42 templates", "Exports protected"],
  ["Recruitment", "12 vacancies", "5 interviews this week"],
  ["Performance", "Q2 cycle", "73% goal completion"],
  ["Welfare", "5 active cases", "Confidential access"],
  ["Audit Logs", "1,284 events", "Payroll changes tracked"]
] as const;

const buildSlices = [
  {
    label: "Slice 1",
    title: "API foundation",
    status: "Ready for staging",
    detail: "Auth context, RBAC guards, validation, write endpoints, and audit hooks."
  },
  {
    label: "Slice 2",
    title: "Supabase activation",
    status: "Active",
    detail: "Initial schema migrated, demo tenant seeded, and API writes verified."
  },
  {
    label: "Slice 3",
    title: "Employee workspace",
    status: "Active",
    detail: "Create employees and view live Supabase employee records."
  },
  {
    label: "Slice 4",
    title: "Leave workflow",
    status: "Active",
    detail: "Submit, approve, reject, and view the live Supabase request queue."
  }
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

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <span className="brandMark">S</span>
          <div>
            <strong>Solva HRIS</strong>
            <span>Enterprise Suite</span>
          </div>
        </div>
        <nav className="nav">
          {["Dashboard", "Organization", "Employees", "Leave", "Payroll", "Reports", "Settings"].map((item) => (
            <a href={`#${item.toLowerCase()}`} key={item}>
              {item}
            </a>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Solva Demo Manufacturing</p>
            <h1>HR, payroll, compliance, and reporting in one operating system.</h1>
          </div>
          <button className="primaryButton">Run Payroll Checks</button>
        </header>

        <section className="commandBand" aria-label="Payroll command center">
          <div className="commandCopy">
            <p className="eyebrow">April 2026 Payroll</p>
            <h2>Review gross-to-net, statutory deductions, employer spend, and exceptions before approval.</h2>
            <div className="actions">
              <button className="primaryButton">Approve Draft</button>
              <button className="secondaryButton">Export Register</button>
            </div>
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

        <section className="progressPanel" aria-label="Build progress">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Build Progress</p>
              <h2>Small slices, visible checkpoints.</h2>
            </div>
            <span className="status">Slice 1</span>
          </div>
          <div className="sliceGrid">
            {buildSlices.map((slice) => (
              <article className="sliceCard" key={slice.label}>
                <div>
                  <span>{slice.label}</span>
                  <strong>{slice.title}</strong>
                </div>
                <b>{slice.status}</b>
                <p>{slice.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <PhaseTwoPanel
          pipeline={summarizePipeline(candidates.map((candidate) => candidate.stage))}
          candidates={[...candidates]}
          tasks={[...onboardingTasks]}
          workflowSteps={offerWorkflow.steps}
        />

        <EmployeeWorkspace />

        <LeaveWorkspace />

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
              {modules.map(([title, value, hint]) => (
                <ModuleTile key={title} title={title} value={value} hint={hint} />
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
