"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize, money } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { PayrollDataTable, type PayrollTableColumn } from "./payroll-data-table";
import { PayrollBarChart, PayrollBreakdownChart, PayrollStatCards } from "./payroll-visuals";
import { useStagingSession } from "./staging-session";

type ChartDatum = {
  label: string;
  value: number;
  accent?: string;
};

type SimpleRow = Record<string, string | number | boolean | null | undefined>;

type PayrollModulePayload = {
  overview: {
    month: string;
    status: string;
    activeEmployees: number;
    grossPay: number;
    netPay: number;
    totalDeductions: number;
    employerCost: number;
    shifTotal: number;
    housingLevyTotal: number;
    nssfTotal: number;
    payeTotal: number;
    pendingApprovals: number;
    failedValidations: number;
    recentRuns: SimpleRow[];
    quickActions: string[];
    charts: {
      wageBillTrend: ChartDatum[];
      employerCostBreakdown: ChartDatum[];
      payrollCostByDepartment: ChartDatum[];
      deductionDistribution: ChartDatum[];
    };
  };
  periods: SimpleRow[];
  employeePayrollData: SimpleRow[];
  earnings: SimpleRow[];
  deductions: SimpleRow[];
  variableInputs: SimpleRow[];
  processing: {
    tracker: Array<{ step: string; status: string }>;
    checks: Array<{ label: string; count: number; severity: string; detail: string }>;
    failedTransactions: SimpleRow[];
    preview: SimpleRow[];
  };
  review: {
    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;
    approvalComments: string;
    approvalDate: string;
    summary: {
      grossVariance: string;
      netVariance: string;
      newEmployees: number;
      exits: number;
      salaryChanges: number;
      overtimeSpikes: number;
      deductionSpikes: number;
      zeroNetEmployees: number;
      negativeNetEmployees: number;
    };
    register: SimpleRow[];
  };
  payslips: {
    branding: string;
    passwordRule: string;
    items: SimpleRow[];
  };
  netToBank: SimpleRow[];
  statutoryReports: {
    summary: ChartDatum[];
    rows: SimpleRow[];
  };
  payrollReports: {
    catalogue: SimpleRow[];
    builderFilters: Record<string, string[]>;
  };
  auditTrail: SimpleRow[];
  settings: Record<string, string>;
  liveRun: {
    id: string;
    period: string;
    status: string;
    employeeCount: number;
    grossPay: number;
    netPay: number;
  };
  helperData: {
    filters: Record<string, string[]>;
    quickStats: Array<{ label: string; value: string }>;
  };
};

type PayrollView =
  | "dashboard"
  | "periods"
  | "employeeData"
  | "earnings"
  | "deductions"
  | "variableInputs"
  | "processing"
  | "review"
  | "payslips"
  | "netToBank"
  | "statutory"
  | "reports"
  | "audit"
  | "settings";

const payrollViews: Array<{ key: PayrollView; title: string; hint: string }> = [
  { key: "dashboard", title: "Dashboard", hint: "Payroll health, trends, actions" },
  { key: "periods", title: "Payroll Periods", hint: "Open, lock, clone, history" },
  { key: "employeeData", title: "Employee Payroll Data", hint: "Master data and bank setup" },
  { key: "earnings", title: "Earnings", hint: "Allowances, formulas, recurrence" },
  { key: "deductions", title: "Deductions", hint: "Statutory and custom logic" },
  { key: "variableInputs", title: "Variable Inputs", hint: "Overtime, bonuses, arrears" },
  { key: "processing", title: "Process Payroll", hint: "Checks, warnings, preview" },
  { key: "review", title: "Review & Approval", hint: "Variance, anomalies, workflow" },
  { key: "payslips", title: "Payslips", hint: "Generate, preview, release" },
  { key: "netToBank", title: "Net to Bank", hint: "Bank exports and validation" },
  { key: "statutory", title: "Statutory Reports", hint: "PAYE, SHIF, NSSF, AHL" },
  { key: "reports", title: "Payroll Reports", hint: "Register, summaries, builder" },
  { key: "audit", title: "Audit Trail", hint: "Changes and accountability" },
  { key: "settings", title: "Payroll Settings", hint: "Policies, tax, branding" }
];

function filterRows(query: string, rows: SimpleRow[]) {
  const lowered = query.trim().toLowerCase();
  if (!lowered) {
    return rows;
  }

  return rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(lowered)));
}

function statusTone(value: string) {
  const lowered = value.toLowerCase();
  if (lowered.includes("approved") || lowered.includes("active") || lowered.includes("valid")) {
    return "success";
  }

  if (lowered.includes("pending") || lowered.includes("processing") || lowered.includes("warning")) {
    return "warning";
  }

  if (lowered.includes("failed") || lowered.includes("missing") || lowered.includes("negative") || lowered.includes("draft")) {
    return "danger";
  }

  return "neutral";
}

function badge(value: string) {
  return <span className={`payrollBadge payrollBadge${humanize(statusTone(value))}`}>{value}</span>;
}

function renderLabelValueCards(items: Array<{ label: string; value: string }>) {
  return (
    <div className="payrollSettingsGrid">
      {items.map((item) => (
        <article className="payrollSettingsCard" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

export function PayrollSuite() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [payload, setPayload] = useState<PayrollModulePayload | null>(null);
  const [activeView, setActiveView] = useState<PayrollView>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Loading payroll command center");

  useEffect(() => {
    async function loadModule() {
      const response = await fetch(`${apiBaseUrl}/api/payroll/module`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load payroll module");
      }

      const data = (await response.json()) as PayrollModulePayload;
      setPayload(data);
      setMessage(`Payroll module ready for ${data.overview.month}`);
    }

    loadModule().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load payroll module");
    });
  }, [apiBaseUrl, session.headers]);

  const filteredPeriods = useMemo(() => filterRows(query, payload?.periods ?? []), [payload?.periods, query]);
  const filteredEmployeeData = useMemo(() => filterRows(query, payload?.employeePayrollData ?? []), [payload?.employeePayrollData, query]);
  const filteredEarnings = useMemo(() => filterRows(query, payload?.earnings ?? []), [payload?.earnings, query]);
  const filteredDeductions = useMemo(() => filterRows(query, payload?.deductions ?? []), [payload?.deductions, query]);
  const filteredVariableInputs = useMemo(() => filterRows(query, payload?.variableInputs ?? []), [payload?.variableInputs, query]);
  const filteredReviewRegister = useMemo(() => filterRows(query, payload?.review.register ?? []), [payload?.review.register, query]);
  const filteredPayslips = useMemo(() => filterRows(query, payload?.payslips.items ?? []), [payload?.payslips.items, query]);
  const filteredNetToBank = useMemo(() => filterRows(query, payload?.netToBank ?? []), [payload?.netToBank, query]);
  const filteredStatutory = useMemo(() => filterRows(query, payload?.statutoryReports.rows ?? []), [payload?.statutoryReports.rows, query]);
  const filteredReports = useMemo(() => filterRows(query, payload?.payrollReports.catalogue ?? []), [payload?.payrollReports.catalogue, query]);
  const filteredAudit = useMemo(() => filterRows(query, payload?.auditTrail ?? []), [payload?.auditTrail, query]);

  const periodColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "month", label: "Payroll Month" },
    { key: "payrollType", label: "Payroll Type" },
    { key: "status", label: "Status", render: (value) => badge(String(value ?? "")) },
    { key: "payDate", label: "Pay Date" },
    { key: "employeeCount", label: "Employees", align: "right" },
    { key: "grossPay", label: "Gross Pay", align: "right", render: (value) => money(Number(value ?? 0)) }
  ];

  const employeeColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "employeeNumber", label: "Employee No." },
    { key: "fullName", label: "Full Name" },
    { key: "department", label: "Department" },
    { key: "designation", label: "Designation" },
    { key: "payrollGroup", label: "Payroll Group" },
    { key: "bankName", label: "Bank" },
    { key: "kraPin", label: "KRA PIN" },
    { key: "payrollStatus", label: "Status", render: (value) => badge(String(value ?? "")) }
  ];

  const earningsColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "taxable", label: "Taxable" },
    { key: "pensionable", label: "Pensionable" },
    { key: "calculation", label: "Calculation" },
    { key: "recurrence", label: "Recurrence" },
    { key: "applicability", label: "Applicability" }
  ];

  const deductionsColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "code", label: "Code" },
    { key: "type", label: "Type" },
    { key: "employeeContribution", label: "Employee" },
    { key: "employerContribution", label: "Employer" },
    { key: "formulaLogic", label: "Formula" },
    { key: "cap", label: "Cap / Threshold" },
    { key: "priority", label: "Priority", align: "right" }
  ];

  const variableColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "inputType", label: "Input Type" },
    { key: "employeeNumber", label: "Employee No." },
    { key: "employeeName", label: "Employee" },
    { key: "period", label: "Period" },
    { key: "amount", label: "Amount", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "validation", label: "Validation", render: (value) => badge(String(value ?? "")) },
    { key: "status", label: "Approval", render: (value) => badge(String(value ?? "")) }
  ];

  const processingPreviewColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "employee", label: "Employee" },
    { key: "grossPay", label: "Gross", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "deductions", label: "Deductions", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "netPay", label: "Net", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "status", label: "Status", render: (value) => badge(String(value ?? "")) }
  ];

  const reviewColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "employee", label: "Employee" },
    { key: "previousGross", label: "Previous Gross", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "currentGross", label: "Current Gross", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "previousNet", label: "Previous Net", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "currentNet", label: "Current Net", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "variance", label: "Variance" },
    { key: "note", label: "Commentary" }
  ];

  const payslipColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "employeeName", label: "Employee" },
    { key: "employeeNumber", label: "Employee No." },
    { key: "payrollMonth", label: "Payroll Month" },
    { key: "email", label: "Email" },
    { key: "netPay", label: "Net Pay", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "status", label: "Status", render: (value) => badge(String(value ?? "")) }
  ];

  const bankColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "bank", label: "Bank" },
    { key: "bankCode", label: "Bank Code" },
    { key: "branchCode", label: "Branch Code" },
    { key: "accountNumber", label: "Account Number" },
    { key: "employee", label: "Employee" },
    { key: "netPay", label: "Net Pay", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "validation", label: "Validation", render: (value) => badge(String(value ?? "")) }
  ];

  const statutoryColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "report", label: "Report" },
    { key: "month", label: "Month" },
    { key: "employees", label: "Employees", align: "right" },
    { key: "amount", label: "Amount", align: "right", render: (value) => money(Number(value ?? 0)) },
    { key: "filingStatus", label: "Filing Status", render: (value) => badge(String(value ?? "")) },
    { key: "dueDate", label: "Due Date" }
  ];

  const reportColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "report", label: "Report" },
    { key: "category", label: "Category" },
    { key: "lastRun", label: "Last Run" },
    { key: "format", label: "Formats" },
    { key: "owner", label: "Owner" }
  ];

  const auditColumns: PayrollTableColumn<SimpleRow>[] = [
    { key: "actor", label: "Actor" },
    { key: "action", label: "Action" },
    { key: "entityType", label: "Entity Type" },
    { key: "entityId", label: "Entity ID" },
    { key: "summary", label: "Summary" },
    { key: "beforeAfter", label: "Values" },
    { key: "timestamp", label: "Timestamp" }
  ];

  function renderDashboard() {
    if (!payload) {
      return null;
    }

    return (
      <>
        <section className="payrollHeroBand">
          <div>
            <p className="eyebrow">Payroll Command Center</p>
            <h2>{payload.overview.month} payroll is {payload.overview.status.toLowerCase()}.</h2>
            <span>
              {formatCount(payload.overview.activeEmployees)} payroll employees, {money(payload.overview.netPay)} net to bank,
              and {formatCount(payload.overview.pendingApprovals)} approvals still in flight.
            </span>
          </div>
          <div className="payrollQuickActions">
            {payload.overview.quickActions.map((action) => (
              <button className="primaryButton" key={action} type="button">
                {action}
              </button>
            ))}
          </div>
        </section>

        <section className="metrics">
          <MetricCard hint="Current gross payroll" label="Gross Pay" value={money(payload.overview.grossPay)} />
          <MetricCard hint="Net salary payout" label="Net Pay" value={money(payload.overview.netPay)} />
          <MetricCard hint="Employee deductions" label="Total Deductions" value={money(payload.overview.totalDeductions)} />
          <MetricCard hint="Employer burden" label="Employer Cost" value={money(payload.overview.employerCost)} />
          <MetricCard hint="Employee medical contribution" label="SHIF" value={money(payload.overview.shifTotal)} />
          <MetricCard hint="Combined AHL exposure" label="Housing Levy" value={money(payload.overview.housingLevyTotal)} />
          <MetricCard hint="Employee and employer tiers" label="NSSF" value={money(payload.overview.nssfTotal)} />
          <MetricCard hint="Income tax withheld" label="PAYE" value={money(payload.overview.payeTotal)} />
        </section>

        <section className="payrollContentGrid">
          <PayrollBarChart
            data={payload.overview.charts.wageBillTrend}
            subtitle="Monthly wage bill trend"
            title="Trend"
          />
          <PayrollBreakdownChart
            data={payload.overview.charts.employerCostBreakdown}
            subtitle="Employer cost breakdown"
            title="Cost Mix"
          />
          <PayrollBarChart
            data={payload.overview.charts.payrollCostByDepartment}
            subtitle="Payroll cost by department"
            title="Department Cost"
          />
          <PayrollBreakdownChart
            data={payload.overview.charts.deductionDistribution}
            subtitle="Deduction distribution"
            title="Deduction Mix"
          />
        </section>

        <PayrollStatCards
          data={[
            { label: "Pending approvals", value: payload.overview.pendingApprovals, accent: "#f59e0b" },
            { label: "Failed validations", value: payload.overview.failedValidations, accent: "#ef4444" },
            { label: "Employees", value: payload.liveRun.employeeCount, accent: "#0f4fd9" }
          ]}
          formatter={formatCount}
        />

        <PayrollDataTable
          bulkActions={["Clone Previous Month", "Open Selected"]}
          columns={periodColumns}
          exportFilename="solva-payroll-period-history.csv"
          filters={[{ key: "status", label: "Status" }, { key: "payrollType", label: "Payroll Type" }]}
          rows={filteredPeriods}
          searchPlaceholder="Search payroll periods"
          subtitle="Recently processed payrolls and period history"
          title="Recent Payrolls"
        />
      </>
    );
  }

  function renderPeriods() {
    if (!payload) {
      return null;
    }

    return (
      <>
        <section className="metrics">
          <MetricCard hint="Open for edits" label="Open" value={formatCount(filteredPeriods.filter((item) => String(item.status) === "Open").length)} />
          <MetricCard hint="In workflow" label="Pending Approval" value={formatCount(filteredPeriods.filter((item) => String(item.status).includes("Pending")).length)} />
          <MetricCard hint="Processing and draft periods" label="In Motion" value={formatCount(filteredPeriods.filter((item) => ["Processing", "Draft"].includes(String(item.status))).length)} />
          <MetricCard hint="Historic payrolls" label="History" value={formatCount(filteredPeriods.length)} />
        </section>

        {renderLabelValueCards([
          { label: "Available actions", value: "Open period, lock period, reopen period, clone previous month, delete draft payroll" },
          { label: "Current open calendar", value: `${payload.overview.month} / ${payload.overview.status}` }
        ])}

        <PayrollDataTable
          bulkActions={["Open Selected", "Lock Selected", "Clone Selected"]}
          columns={periodColumns}
          exportFilename="solva-payroll-periods.csv"
          filters={[{ key: "status", label: "Status" }, { key: "payrollType", label: "Payroll Type" }]}
          rows={filteredPeriods}
          searchPlaceholder="Search month, type, or status"
          subtitle="Manage payroll months, half-months, off-cycle runs, and historical runs"
          title="Payroll Periods"
        />
      </>
    );
  }

  function renderEmployeeData() {
    if (!payload) {
      return null;
    }

    return (
      <>
        <section className="metrics">
          <MetricCard hint="Employees in payroll master" label="Payroll Profiles" value={formatCount(filteredEmployeeData.length)} />
          <MetricCard hint="Awaiting bank correction" label="Bank Issues" value="1" />
          <MetricCard hint="Linked pension schemes" label="Pension Schemes" value="2" />
          <MetricCard hint="Payroll profiles changed this month" label="Audit Changes" value="6" />
        </section>

        <PayrollDataTable
          bulkActions={["Bulk Update", "Export Selected", "Request Approval"]}
          columns={employeeColumns}
          exportFilename="solva-employee-payroll-master.csv"
          filters={[{ key: "department", label: "Department" }, { key: "payrollStatus", label: "Payroll Status" }]}
          rows={filteredEmployeeData}
          searchPlaceholder="Search employee, bank, statutory number, or cost center"
          subtitle="Employee payroll master data, statutory identifiers, bank setup, and effective history"
          title="Employee Payroll Data"
        />
      </>
    );
  }

  function renderEarnings() {
    return (
      <PayrollDataTable
        bulkActions={["Add Earning", "Archive Selected", "Export Selected"]}
        columns={earningsColumns}
        exportFilename="solva-payroll-earnings.csv"
        filters={[{ key: "recurrence", label: "Recurrence" }, { key: "taxable", label: "Tax Treatment" }]}
        rows={filteredEarnings}
        searchPlaceholder="Search earning code, name, or applicability"
        subtitle="Configure payroll earnings, tax treatment, formulas, recurrence, and departmental applicability"
        title="Earnings"
      />
    );
  }

  function renderDeductions() {
    return (
      <PayrollDataTable
        bulkActions={["Add Deduction", "Reorder Priority", "Export Selected"]}
        columns={deductionsColumns}
        exportFilename="solva-payroll-deductions.csv"
        filters={[{ key: "type", label: "Deduction Type" }, { key: "statutory", label: "Statutory" }]}
        rows={filteredDeductions}
        searchPlaceholder="Search deduction code, type, or formula"
        subtitle="Configure statutory and custom deductions, contribution logic, caps, and priority order"
        title="Deductions"
      />
    );
  }

  function renderVariableInputs() {
    if (!payload) {
      return null;
    }

    return (
      <>
        <section className="metrics">
          <MetricCard hint="Rows in current batch" label="Rows" value={formatCount(filteredVariableInputs.length)} />
          <MetricCard hint="Awaiting approval" label="Pending Approval" value={formatCount(filteredVariableInputs.filter((item) => String(item.status).includes("Pending")).length)} />
          <MetricCard hint="Input validation gaps" label="Validation Errors" value={formatCount(filteredVariableInputs.filter((item) => String(item.validation) !== "Valid").length)} />
          <MetricCard hint="Import groups" label="Batches" value={formatCount(new Set(filteredVariableInputs.map((item) => String(item.batch))).size)} />
        </section>

        {renderLabelValueCards([
          { label: "Upload options", value: "Bulk Excel/CSV import, editable table entry, template download" },
          { label: "Workflow", value: "Variable inputs route through audit and approval before payroll processing" }
        ])}

        <PayrollDataTable
          bulkActions={["Download Template", "Submit for Approval", "Export Errors"]}
          columns={variableColumns}
          exportFilename="solva-variable-inputs.csv"
          filters={[{ key: "inputType", label: "Input Type" }, { key: "status", label: "Status" }]}
          rows={filteredVariableInputs}
          searchPlaceholder="Search employee, batch, input type, or validation"
          subtitle="One-time overtime, arrears, bonuses, unpaid leave, and manual payroll adjustments"
          title="Variable Inputs"
        />
      </>
    );
  }

  function renderProcessing() {
    if (!payload) {
      return null;
    }

    return (
      <>
        <section className="payrollTrackerPanel">
          <div className="payrollSectionHeader">
            <div>
              <p className="eyebrow">Payroll Engine</p>
              <h3>Validate and preview payroll before the run is finalized.</h3>
            </div>
            <div className="payrollSectionActions">
              <button className="primaryButton" type="button">Run Payroll</button>
              <button className="secondaryButton" type="button">Rerun Payroll</button>
            </div>
          </div>

          <div className="payrollTracker">
            {payload.processing.tracker.map((item) => (
              <article className={`payrollTrackerStep payrollTracker${humanize(item.status)}`} key={item.step}>
                <span>{item.step}</span>
                <strong>{humanize(item.status)}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="payrollValidationGrid">
          {payload.processing.checks.map((check) => (
            <article className={`payrollValidationCard payrollValidation${humanize(check.severity)}`} key={check.label}>
              <span>{check.label}</span>
              <strong>{formatCount(check.count)}</strong>
              <small>{check.detail}</small>
            </article>
          ))}
        </section>

        <PayrollDataTable
          bulkActions={["Resolve Selected", "Export Preview", "Escalate Exceptions"]}
          columns={processingPreviewColumns}
          exportFilename="solva-payroll-processing-preview.csv"
          filters={[{ key: "status", label: "Status" }]}
          rows={filterRows(query, payload.processing.preview)}
          searchPlaceholder="Search employee or validation state"
          subtitle="Preview payroll calculations, warnings, and run readiness before final processing"
          title="Processing Preview"
        />

        <PayrollDataTable
          bulkActions={["Assign Fix", "Export Failures"]}
          columns={[
            { key: "employee", label: "Employee" },
            { key: "issue", label: "Issue" },
            { key: "action", label: "Recommended Action" }
          ]}
          exportFilename="solva-failed-payroll-transactions.csv"
          rows={filterRows(query, payload.processing.failedTransactions)}
          searchPlaceholder="Search failed transaction"
          subtitle="Failed transactions and blocking issues found during pre-payroll validation"
          title="Failed Transactions"
        />
      </>
    );
  }

  function renderReview() {
    if (!payload) {
      return null;
    }

    return (
      <>
        <section className="metrics">
          <MetricCard hint="Against previous month" label="Gross Variance" value={payload.review.summary.grossVariance} />
          <MetricCard hint="Against previous month" label="Net Variance" value={payload.review.summary.netVariance} />
          <MetricCard hint="Added this cycle" label="New Employees" value={formatCount(payload.review.summary.newEmployees)} />
          <MetricCard hint="Salary movement cases" label="Salary Changes" value={formatCount(payload.review.summary.salaryChanges)} />
          <MetricCard hint="High overtime cases" label="Overtime Spikes" value={formatCount(payload.review.summary.overtimeSpikes)} />
          <MetricCard hint="High deduction cases" label="Deduction Spikes" value={formatCount(payload.review.summary.deductionSpikes)} />
          <MetricCard hint="Employees with no payout" label="Zero Net Pay" value={formatCount(payload.review.summary.zeroNetEmployees)} />
          <MetricCard hint="Needs override or adjustment" label="Negative Net Pay" value={formatCount(payload.review.summary.negativeNetEmployees)} />
        </section>

        <div className="payrollApprovalGrid">
          <article className="payrollApprovalCard">
            <p className="eyebrow">Approval Workflow</p>
            <div className="payrollApprovalChain">
              <div><span>Prepared By</span><strong>{payload.review.preparedBy}</strong></div>
              <div><span>Reviewed By</span><strong>{payload.review.reviewedBy}</strong></div>
              <div><span>Approved By</span><strong>{payload.review.approvedBy}</strong></div>
              <div><span>Approval Date</span><strong>{payload.review.approvalDate}</strong></div>
            </div>
            <p>{payload.review.approvalComments}</p>
            <button className="primaryButton" type="button">Final Approval</button>
          </article>

          <article className="payrollApprovalCard">
            <p className="eyebrow">Exceptions</p>
            <div className="compactList">
              <article>
                <strong>New employees</strong>
                <span>{payload.review.summary.newEmployees} employees added after last payroll.</span>
              </article>
              <article>
                <strong>Exits</strong>
                <span>{payload.review.summary.exits} employees exited this period.</span>
              </article>
              <article>
                <strong>High-risk cases</strong>
                <span>{payload.review.summary.negativeNetEmployees} negative-net and {payload.review.summary.overtimeSpikes} overtime spike cases.</span>
              </article>
            </div>
          </article>
        </div>

        <PayrollDataTable
          bulkActions={["Export Variance", "Request Clarification"]}
          columns={reviewColumns}
          exportFilename="solva-payroll-review-register.csv"
          filters={[{ key: "variance", label: "Variance" }]}
          rows={filteredReviewRegister}
          searchPlaceholder="Search employee or variance note"
          subtitle="Payroll register preview with gross-to-net variance against previous month"
          title="Review Register"
        />
      </>
    );
  }

  function renderPayslips() {
    if (!payload) {
      return null;
    }

    const selectedPayslip = filteredPayslips[0];

    return (
      <>
        <section className="metrics">
          <MetricCard hint="Records available for generation" label="Payslips" value={formatCount(filteredPayslips.length)} />
          <MetricCard hint="Branding standard" label="Branding" value={payload.payslips.branding} />
          <MetricCard hint="Protected PDF rule" label="Password Rule" value={payload.payslips.passwordRule} />
          <MetricCard hint="Dispatch option" label="Email" value="Enabled" />
        </section>

        <div className="payrollApprovalGrid">
          <article className="payrollApprovalCard">
            <p className="eyebrow">Payslip Actions</p>
            <div className="payrollQuickActions payrollQuickActionsStack">
              <button className="primaryButton" type="button">Bulk Generate Payslips</button>
              <button className="secondaryButton" type="button">Download PDF</button>
              <button className="secondaryButton" type="button">Email Payslips</button>
            </div>
          </article>

          <article className="payrollApprovalCard">
            <p className="eyebrow">Preview</p>
            <strong>{String(selectedPayslip?.employeeName ?? "No payslip selected")}</strong>
            <span>{String(selectedPayslip?.payrollMonth ?? "Pending month")}</span>
            <p>
              Net pay {money(Number(selectedPayslip?.netPay ?? 0))}. Branded with Solva HR logo and password protected per policy.
            </p>
          </article>
        </div>

        <PayrollDataTable
          bulkActions={["Generate Selected", "Email Selected", "Download Selected"]}
          columns={payslipColumns}
          exportFilename="solva-payslips.csv"
          filters={[{ key: "status", label: "Status" }, { key: "payrollMonth", label: "Payroll Month" }]}
          rows={filteredPayslips}
          searchPlaceholder="Search employee or payroll month"
          subtitle="Payslip preview, release workflow, PDF generation, and email dispatch"
          title="Payslips"
        />
      </>
    );
  }

  function renderNetToBank() {
    if (!payload) {
      return null;
    }

    const bankSummary = payload.netToBank.reduce<Record<string, number>>((accumulator, row) => {
      const label = String(row.bank);
      accumulator[label] = (accumulator[label] ?? 0) + Number(row.netPay ?? 0);
      return accumulator;
    }, {});

    return (
      <>
        <section className="metrics">
          <MetricCard hint="Exportable bank lines" label="Rows" value={formatCount(filteredNetToBank.length)} />
          <MetricCard hint="Bank records missing details" label="Missing Details" value={formatCount(filteredNetToBank.filter((item) => String(item.validation).includes("Missing")).length)} />
          <MetricCard hint="Total salary payout" label="Net to Bank" value={money(filteredNetToBank.reduce((sum, row) => sum + Number(row.netPay ?? 0), 0))} />
          <MetricCard hint="Grouped bank outputs" label="Banks" value={formatCount(Object.keys(bankSummary).length)} />
        </section>

        <PayrollBarChart
          data={Object.entries(bankSummary).map(([label, value]) => ({ label, value }))}
          subtitle="Bank grouping by value"
          title="Bank Summary"
        />

        <PayrollDataTable
          bulkActions={["Export Excel", "Export CSV", "Generate Bank Format"]}
          columns={bankColumns}
          exportFilename="solva-net-to-bank.csv"
          filters={[{ key: "bank", label: "Bank" }, { key: "validation", label: "Validation" }]}
          rows={filteredNetToBank}
          searchPlaceholder="Search bank, employee, account, or validation"
          subtitle="Net-to-bank exports, bank-specific layouts, and validation of missing bank details"
          title="Net to Bank"
        />
      </>
    );
  }

  function renderStatutory() {
    if (!payload) {
      return null;
    }

    return (
      <>
        <PayrollStatCards data={payload.statutoryReports.summary} />

        <PayrollBreakdownChart
          data={payload.statutoryReports.summary}
          subtitle="Statutory deduction breakdown for the current payroll month"
          title="Statutory Summary"
        />

        <PayrollDataTable
          bulkActions={["Export Excel", "Export CSV", "Prepare Filing Format"]}
          columns={statutoryColumns}
          exportFilename="solva-statutory-reports.csv"
          filters={[{ key: "report", label: "Report" }, { key: "filingStatus", label: "Filing Status" }]}
          rows={filteredStatutory}
          searchPlaceholder="Search statutory report or month"
          subtitle="PAYE, SHIF, NSSF, Housing Levy, pension, and filing-ready statutory exports"
          title="Statutory Reports"
        />
      </>
    );
  }

  function renderReports() {
    if (!payload) {
      return null;
    }

    return (
      <>
        <div className="payrollApprovalGrid">
          <article className="payrollApprovalCard">
            <p className="eyebrow">Custom Report Builder</p>
            <div className="payrollBuilderFilters">
              {Object.entries(payload.payrollReports.builderFilters).map(([label, options]) => (
                <div className="payrollBuilderGroup" key={label}>
                  <span>{humanize(label)}</span>
                  <strong>{options.join(", ")}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="payrollApprovalCard">
            <p className="eyebrow">Export Stack</p>
            <div className="compactList">
              <article>
                <strong>Formats</strong>
                <span>Excel, CSV, PDF, filing-ready templates, bank-specific outputs</span>
              </article>
              <article>
                <strong>Dimensions</strong>
                <span>Month, department, branch, payroll group, employment type</span>
              </article>
            </div>
          </article>
        </div>

        <PayrollDataTable
          bulkActions={["Run Report", "Schedule Export", "Save Template"]}
          columns={reportColumns}
          exportFilename="solva-payroll-report-catalogue.csv"
          filters={[{ key: "category", label: "Category" }, { key: "owner", label: "Owner" }]}
          rows={filteredReports}
          searchPlaceholder="Search payroll report catalogue"
          subtitle="Payroll register, wage bill, employer cost, statutory summaries, and custom reports"
          title="Payroll Reports"
        />
      </>
    );
  }

  function renderAudit() {
    return (
      <PayrollDataTable
        bulkActions={["Export Audit", "Filter Sensitive Changes"]}
        columns={auditColumns}
        exportFilename="solva-payroll-audit.csv"
        filters={[{ key: "action", label: "Action" }, { key: "entityType", label: "Entity Type" }]}
        rows={filteredAudit}
        searchPlaceholder="Search actor, change, entity, or timestamp"
        subtitle="Who changed salary, bank details, deductions, overtime, payroll approval, and reopen actions"
        title="Audit Trail"
      />
    );
  }

  function renderSettings() {
    if (!payload) {
      return null;
    }

    return renderLabelValueCards(
      Object.entries(payload.settings).map(([label, value]) => ({
        label: humanize(label),
        value
      }))
    );
  }

  function renderContent() {
    switch (activeView) {
      case "dashboard":
        return renderDashboard();
      case "periods":
        return renderPeriods();
      case "employeeData":
        return renderEmployeeData();
      case "earnings":
        return renderEarnings();
      case "deductions":
        return renderDeductions();
      case "variableInputs":
        return renderVariableInputs();
      case "processing":
        return renderProcessing();
      case "review":
        return renderReview();
      case "payslips":
        return renderPayslips();
      case "netToBank":
        return renderNetToBank();
      case "statutory":
        return renderStatutory();
      case "reports":
        return renderReports();
      case "audit":
        return renderAudit();
      case "settings":
        return renderSettings();
      default:
        return null;
    }
  }

  const viewMeta = payrollViews.find((item) => item.key === activeView);

  return (
    <section className="payrollModuleShell" data-payroll-theme={theme} aria-label="Solva HR payroll module">
      <div className="payrollModuleTopbar">
        <div>
          <p className="eyebrow">Solva HR Payroll</p>
          <h2>{viewMeta?.title}</h2>
          <span>{viewMeta?.hint}</span>
        </div>

        <div className="payrollUtilityRow">
          <label className="payrollGlobalSearch">
            <span className="srOnly">Search payroll</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search employees, payroll periods, reports, banks, statutory items"
              type="search"
              value={query}
            />
          </label>
          <button className="secondaryButton payrollUtilityButton" type="button">
            {payload ? `${payload.overview.pendingApprovals} Notifications` : "Notifications"}
          </button>
          <button
            className="secondaryButton payrollUtilityButton"
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
            type="button"
          >
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
          <button className="secondaryButton payrollUtilityButton payrollProfileChip" type="button">
            {session.name} / {humanize(session.role)}
          </button>
        </div>
      </div>

      <div className="payrollModuleLayout">
        <aside className="payrollModuleSidebar" aria-label="Payroll sections">
          {payrollViews.map((view) => (
            <button
              className={activeView === view.key ? "activePayrollModuleNav" : ""}
              key={view.key}
              onClick={() => setActiveView(view.key)}
              type="button"
            >
              <strong>{view.title}</strong>
              <small>{view.hint}</small>
            </button>
          ))}
        </aside>

        <div className="payrollModuleContent">
          <section className="payrollCommandBand">
            <div>
              <strong>{payload?.overview.month ?? "Loading payroll"}</strong>
              <span>{payload?.overview.status ?? "Preparing module"}</span>
            </div>
            <div>
              <strong>{payload ? `${formatCount(payload.overview.activeEmployees)} employees` : "Loading employees"}</strong>
              <span>{payload ? money(payload.overview.netPay) : "Loading net pay"}</span>
            </div>
            <div>
              <strong>{message}</strong>
              <span>{payload ? `${payload.liveRun.period} / ${humanize(payload.liveRun.status)}` : "Loading live run"}</span>
            </div>
          </section>

          {renderContent()}
        </div>
      </div>
    </section>
  );
}
