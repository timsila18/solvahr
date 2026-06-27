"use client";

import { useState, type ReactNode } from "react";
import type { AppRole } from "@/lib/auth";

export type SetupStep = {
  title: string;
  detail?: string;
};

export type ERPPlaceholderContent = {
  module: string;
  title: string;
  description: string;
  emptyState: string;
  nextAction: string;
  setupSteps: SetupStep[];
  auditNotes?: string[];
  allowedRoles?: AppRole[];
};

const FINANCE_ROLES: AppRole[] = ["Super Admin", "Finance Officer", "Manager", "Auditor"];
const PROCUREMENT_ROLES: AppRole[] = ["Super Admin", "Manager", "Auditor"];
const ASSET_ROLES: AppRole[] = ["Super Admin", "HR Admin", "Manager", "Auditor"];
const BUDGET_ROLES: AppRole[] = ["Super Admin", "Finance Officer", "Manager", "Auditor"];
const BROAD_ERP_ROLES: AppRole[] = [
  "Super Admin",
  "HR Admin",
  "Payroll Admin",
  "Finance Officer",
  "Manager",
  "Auditor",
];

const DEFAULT_AUDIT_NOTES = [
  "Future records must include tenant scope, creator, updater, status, and timestamps.",
  "Approval actions will be captured before finance or operational posting is enabled.",
  "Audit events will use the existing Solva audit trail pattern where possible.",
];

const ERP_CONTENT: Record<string, ERPPlaceholderContent> = {
  "finance:Finance Overview": {
    module: "Solva Finance",
    title: "Finance Overview",
    description: "Manage chart of accounts, financial periods, journals, ledgers, and financial reports for your organization.",
    emptyState: "Finance setup has not started.",
    nextAction: "Start finance setup",
    allowedRoles: FINANCE_ROLES,
    setupSteps: [
      { title: "Create financial periods." },
      { title: "Set up chart of accounts." },
      { title: "Configure approval workflows." },
      { title: "Begin posting journals after the accounting engine is implemented." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "finance:Chart of Accounts": {
    module: "Solva Finance",
    title: "Chart of Accounts",
    description: "Prepare account categories, account codes, control accounts, and reporting mappings for double-entry accounting.",
    emptyState: "No chart of accounts exists yet.",
    nextAction: "Prepare account structure",
    allowedRoles: FINANCE_ROLES,
    setupSteps: [
      { title: "Define account classes and numbering rules." },
      { title: "Create control accounts for payroll, statutory liabilities, suppliers, banks, and assets." },
      { title: "Map accounts to future financial reports." },
      { title: "Lock account usage rules before posting is enabled." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "finance:Journals": {
    module: "Solva Finance",
    title: "Journals",
    description: "Prepare journal entry capture, approval, posting, reversal, and attachment rules for future immutable finance transactions.",
    emptyState: "No journal workflow has been configured.",
    nextAction: "Configure journal workflow",
    allowedRoles: FINANCE_ROLES,
    setupSteps: [
      { title: "Define journal types and numbering." },
      { title: "Configure maker-checker approvals." },
      { title: "Require balanced debit and credit lines." },
      { title: "Prepare reversal rules for posted journals." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "finance:General Ledger": {
    module: "Solva Finance",
    title: "General Ledger",
    description: "Prepare ledger viewing, account activity filters, source document links, and audit drill-downs.",
    emptyState: "No ledger postings exist yet.",
    nextAction: "Plan ledger controls",
    allowedRoles: FINANCE_ROLES,
    setupSteps: [
      { title: "Complete financial period setup." },
      { title: "Finalize chart of accounts." },
      { title: "Define posting sources." },
      { title: "Enable ledger reports after journal posting exists." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "finance:Trial Balance": {
    module: "Solva Finance",
    title: "Trial Balance",
    description: "Prepare period-based trial balance reporting after ledger postings are available.",
    emptyState: "Trial balance cannot run before ledger setup.",
    nextAction: "Prepare trial balance mapping",
    allowedRoles: FINANCE_ROLES,
    setupSteps: [
      { title: "Create financial periods." },
      { title: "Map all posting accounts." },
      { title: "Define report filters." },
      { title: "Run trial balance only from posted ledger entries." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "finance:Financial Reports": {
    module: "Solva Finance",
    title: "Financial Reports",
    description: "Prepare income statement, balance sheet, cash flow, and supporting schedules for future ledger data.",
    emptyState: "No financial report templates exist yet.",
    nextAction: "Plan report templates",
    allowedRoles: FINANCE_ROLES,
    setupSteps: [
      { title: "Define statement templates." },
      { title: "Map accounts to report lines." },
      { title: "Configure review and export permissions." },
      { title: "Publish reports only after posted ledger data exists." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "expenses:Expense Requests": {
    module: "Expenses",
    title: "Expense Requests",
    description: "Prepare employee and department expense request workflows with approvals, attachments, and finance review.",
    emptyState: "No expense requests yet.",
    nextAction: "Configure expense requests",
    allowedRoles: BUDGET_ROLES,
    setupSteps: [
      { title: "Define expense categories." },
      { title: "Configure approval levels." },
      { title: "Set attachment requirements." },
      { title: "Connect approved requests to payment voucher preparation later." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "expenses:Payment Vouchers": {
    module: "Expenses",
    title: "Payment Vouchers",
    description: "Prepare voucher review, approval, supporting document, and future finance posting controls.",
    emptyState: "No payment vouchers yet.",
    nextAction: "Prepare voucher controls",
    allowedRoles: FINANCE_ROLES,
    setupSteps: [
      { title: "Define voucher numbering rules." },
      { title: "Configure maker-checker approval." },
      { title: "Require source documents." },
      { title: "Post approved vouchers to Finance in a later phase." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "expenses:Imprest": {
    module: "Expenses",
    title: "Imprest",
    description: "Prepare imprest requests, approval limits, employee accountability, and settlement rules.",
    emptyState: "No imprest requests yet.",
    nextAction: "Configure imprest rules",
    allowedRoles: BUDGET_ROLES,
    setupSteps: [
      { title: "Define eligible roles and departments." },
      { title: "Configure approval and cash advance limits." },
      { title: "Set surrender timelines." },
      { title: "Plan finance posting for approved imprest advances." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "expenses:Surrenders": {
    module: "Expenses",
    title: "Surrenders",
    description: "Prepare imprest surrender reviews, receipts, balances, and settlement approvals.",
    emptyState: "No surrender records yet.",
    nextAction: "Prepare surrender workflow",
    allowedRoles: BUDGET_ROLES,
    setupSteps: [
      { title: "Set receipt and attachment rules." },
      { title: "Define over-spend and refund handling." },
      { title: "Configure finance review." },
      { title: "Audit every surrender outcome." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "budgets:Department Budgets": {
    module: "Budgeting",
    title: "Department Budgets",
    description: "Prepare department-level budget ownership, periods, lines, and approval controls.",
    emptyState: "No department budgets yet.",
    nextAction: "Create budget structure",
    allowedRoles: BUDGET_ROLES,
    setupSteps: [
      { title: "Define budget periods." },
      { title: "Assign department budget holders." },
      { title: "Create budget line categories." },
      { title: "Configure approval workflows." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "budgets:Budget Allocations": {
    module: "Budgeting",
    title: "Budget Allocations",
    description: "Prepare budget allocation rules, revisions, transfers, and approval history.",
    emptyState: "No budget allocations yet.",
    nextAction: "Configure allocations",
    allowedRoles: BUDGET_ROLES,
    setupSteps: [
      { title: "Create approved budget envelopes." },
      { title: "Assign allocations to departments or projects." },
      { title: "Define revision controls." },
      { title: "Audit movements and approvals." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "budgets:Budget Variance": {
    module: "Budgeting",
    title: "Budget Variance",
    description: "Prepare variance reporting once budgets, expenses, procurement commitments, and finance postings exist.",
    emptyState: "Budget variance is not available before setup.",
    nextAction: "Plan variance rules",
    allowedRoles: BUDGET_ROLES,
    setupSteps: [
      { title: "Complete budget setup." },
      { title: "Define actual and commitment sources." },
      { title: "Set variance thresholds." },
      { title: "Publish role-aware variance reports." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "procurement:Suppliers": {
    module: "Procurement",
    title: "Suppliers",
    description: "Manage supplier onboarding, compliance documents, approval status, and future invoice linkage.",
    emptyState: "No supplier records yet.",
    nextAction: "Prepare supplier onboarding",
    allowedRoles: PROCUREMENT_ROLES,
    setupSteps: [
      { title: "Define supplier categories." },
      { title: "Set required compliance documents." },
      { title: "Configure supplier approval levels." },
      { title: "Prepare supplier invoice linkage to Finance." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "procurement:Purchase Requisitions": {
    module: "Procurement",
    title: "Purchase Requisitions",
    description: "Prepare purchase request capture, budget checks, approvals, and conversion to LPOs.",
    emptyState: "No purchase requisitions yet.",
    nextAction: "Configure requisitions",
    allowedRoles: PROCUREMENT_ROLES,
    setupSteps: [
      { title: "Configure approval levels." },
      { title: "Map requisitions to departments and budgets." },
      { title: "Define required line details." },
      { title: "Convert approved requests to LPOs in a later phase." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "procurement:LPOs": {
    module: "Procurement",
    title: "LPOs",
    description: "Prepare local purchase order numbering, approval, supplier, and receiving controls.",
    emptyState: "No LPOs yet.",
    nextAction: "Prepare LPO controls",
    allowedRoles: PROCUREMENT_ROLES,
    setupSteps: [
      { title: "Define LPO numbering." },
      { title: "Require approved requisition source." },
      { title: "Set supplier and delivery terms." },
      { title: "Link receiving and invoicing later." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "procurement:GRNs": {
    module: "Procurement",
    title: "GRNs",
    description: "Prepare goods received notes for matching purchase orders, received quantities, and supplier invoices.",
    emptyState: "No GRNs yet.",
    nextAction: "Configure receiving workflow",
    allowedRoles: PROCUREMENT_ROLES,
    setupSteps: [
      { title: "Define receiving roles." },
      { title: "Map GRNs to LPO lines." },
      { title: "Capture quantity and quality checks." },
      { title: "Prepare three-way matching with invoices." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "procurement:Supplier Invoices": {
    module: "Procurement",
    title: "Supplier Invoices",
    description: "Prepare supplier invoice capture, matching, approval, and future finance posting.",
    emptyState: "No supplier invoices yet.",
    nextAction: "Prepare invoice controls",
    allowedRoles: PROCUREMENT_ROLES,
    setupSteps: [
      { title: "Require supplier and purchase source." },
      { title: "Match invoice lines to GRNs where applicable." },
      { title: "Configure approval and payment readiness." },
      { title: "Post approved invoices to Finance later." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "assets:Asset Overview": {
    module: "Solva Assets",
    title: "Asset Overview",
    description: "Manage asset classes, register setup, assignments, maintenance, and depreciation planning.",
    emptyState: "Asset ERP setup has not started.",
    nextAction: "Start asset setup",
    allowedRoles: ASSET_ROLES,
    setupSteps: [
      { title: "Define asset classes." },
      { title: "Prepare the asset register." },
      { title: "Configure assignment and maintenance approvals." },
      { title: "Define depreciation policies for Finance integration." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "assets:Asset Register": {
    module: "Solva Assets",
    title: "Asset Register",
    description: "Prepare the central register for asset identity, ownership, acquisition, status, and location tracking.",
    emptyState: "No ERP asset register records yet.",
    nextAction: "Prepare asset register",
    allowedRoles: ASSET_ROLES,
    setupSteps: [
      { title: "Define required asset fields." },
      { title: "Map branches, departments, and custodians." },
      { title: "Set capitalization and tagging rules." },
      { title: "Audit all future asset lifecycle changes." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "assets:Asset Assignments": {
    module: "Solva Assets",
    title: "Asset Assignments",
    description: "Prepare custody assignment, employee handover, return, and clearance controls.",
    emptyState: "No asset assignment records yet.",
    nextAction: "Configure assignment workflow",
    allowedRoles: ASSET_ROLES,
    setupSteps: [
      { title: "Define custodian rules." },
      { title: "Configure assignment approvals." },
      { title: "Prepare return and clearance checks." },
      { title: "Link employee asset history without changing ESS restrictions." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "assets:Maintenance": {
    module: "Solva Assets",
    title: "Maintenance",
    description: "Prepare maintenance scheduling, work logs, costs, and supplier/service provider references.",
    emptyState: "No maintenance records yet.",
    nextAction: "Prepare maintenance setup",
    allowedRoles: ASSET_ROLES,
    setupSteps: [
      { title: "Define maintenance categories." },
      { title: "Set reminder and approval rules." },
      { title: "Capture service costs for future Finance posting." },
      { title: "Audit maintenance history." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "assets:Depreciation": {
    module: "Solva Assets",
    title: "Depreciation",
    description: "Prepare depreciation policy setup and future summarized postings into Solva Finance.",
    emptyState: "No depreciation policies yet.",
    nextAction: "Define depreciation policies",
    allowedRoles: ASSET_ROLES,
    setupSteps: [
      { title: "Define asset classes and useful lives." },
      { title: "Set depreciation methods." },
      { title: "Map depreciation accounts." },
      { title: "Post depreciation journals only after Finance is ready." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "banking:Cashbook": {
    module: "Banking",
    title: "Cashbook",
    description: "Prepare cashbook capture, payment and receipt classification, approvals, and reconciliation links.",
    emptyState: "No cashbook entries yet.",
    nextAction: "Prepare cashbook controls",
    allowedRoles: FINANCE_ROLES,
    setupSteps: [
      { title: "Define cashbook sources." },
      { title: "Configure receipt and payment approvals." },
      { title: "Map bank accounts and ledger accounts." },
      { title: "Audit all future cashbook entries." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "banking:Bank Accounts": {
    module: "Banking",
    title: "Bank Accounts",
    description: "Prepare bank account setup for finance-controlled accounts, currencies, owners, and reconciliation rules.",
    emptyState: "No ERP bank accounts configured yet.",
    nextAction: "Configure bank accounts",
    allowedRoles: FINANCE_ROLES,
    setupSteps: [
      { title: "Define bank account ownership." },
      { title: "Map each bank account to a ledger account." },
      { title: "Set authorized roles." },
      { title: "Prepare reconciliation import rules." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "banking:Bank Reconciliation": {
    module: "Banking",
    title: "Bank Reconciliation",
    description: "Prepare statement import, matching, exceptions, and approval workflow for bank reconciliation.",
    emptyState: "No bank reconciliations yet.",
    nextAction: "Prepare reconciliation workflow",
    allowedRoles: FINANCE_ROLES,
    setupSteps: [
      { title: "Configure bank accounts first." },
      { title: "Define statement formats." },
      { title: "Set matching and exception rules." },
      { title: "Approve reconciliations before period close." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "analytics:Analytics Overview": {
    module: "Analytics",
    title: "Analytics Overview",
    description: "Prepare ERP-wide analytics that consume real HR, payroll, finance, procurement, expenses, banking, and asset data.",
    emptyState: "ERP analytics setup has not started.",
    nextAction: "Plan analytics catalog",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Map approved data sources." },
      { title: "Define role-based report access." },
      { title: "Prepare insight categories." },
      { title: "Publish dashboards only after source modules are live." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "analytics:Reports": {
    module: "Analytics",
    title: "Reports",
    description: "Prepare ERP report catalog and exports without duplicating existing HR and payroll reports.",
    emptyState: "No ERP analytics reports yet.",
    nextAction: "Define ERP report catalog",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Keep existing HR and payroll reports in place." },
      { title: "Define finance, procurement, expense, budget, banking, and asset reports." },
      { title: "Configure export permissions." },
      { title: "Audit report generation and downloads." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "analytics:Insights": {
    module: "Analytics",
    title: "Insights",
    description: "Prepare governed insights based on real module data, approval history, and audit-safe signals.",
    emptyState: "No ERP insights yet.",
    nextAction: "Prepare insight rules",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Define insight categories." },
      { title: "Map source data and permissions." },
      { title: "Set review and approval controls for sensitive insights." },
      { title: "Avoid insights from incomplete setup or fake balances." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "ai:AI Assistant": {
    module: "Solva AI",
    title: "AI Assistant",
    description: "Prepare ERP assistant capabilities scoped by tenant, role, module, and audit policy.",
    emptyState: "ERP AI assistant setup has not started.",
    nextAction: "Define assistant guardrails",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Define allowed ERP domains." },
      { title: "Map role-aware context access." },
      { title: "Log AI-assisted sensitive actions." },
      { title: "Keep payroll calculations controlled by existing payroll logic." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "ai:Report Writer": {
    module: "Solva AI",
    title: "Report Writer",
    description: "Prepare AI-assisted report drafting from authorized ERP reports and summaries.",
    emptyState: "AI report writer is not configured yet.",
    nextAction: "Prepare report writer sources",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Define report templates." },
      { title: "Restrict source data by role." },
      { title: "Require user review before sharing." },
      { title: "Audit generated report activity." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "ai:Anomaly Detection": {
    module: "Solva AI",
    title: "Anomaly Detection",
    description: "Prepare anomaly monitoring for finance, procurement, expenses, banking, payroll summaries, and assets after real data exists.",
    emptyState: "No anomaly rules configured yet.",
    nextAction: "Define anomaly rules",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Identify sensitive transaction patterns." },
      { title: "Map source modules." },
      { title: "Set alert ownership and escalation." },
      { title: "Review anomalies before operational action." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "communication:Communication Overview": {
    module: "Communication",
    title: "Communication Overview",
    description: "Prepare announcements, meetings, messages, and Solco Communication integration with tenant and audience controls.",
    emptyState: "Communication setup has not started.",
    nextAction: "Plan communication setup",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Define communication channels." },
      { title: "Map audiences and roles." },
      { title: "Prepare Solco integration settings." },
      { title: "Audit official notices and integration events." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "communication:Announcements": {
    module: "Communication",
    title: "Announcements",
    description: "Prepare audience-scoped announcements for ERP users without replacing existing HR notices.",
    emptyState: "No ERP announcements yet.",
    nextAction: "Configure announcement approvals",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Define announcement audiences." },
      { title: "Set publisher and approval roles." },
      { title: "Prepare acknowledgement tracking." },
      { title: "Keep official communication auditable." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "communication:Meetings": {
    module: "Communication",
    title: "Meetings",
    description: "Prepare meeting coordination and records for ERP governance and operational follow-up.",
    emptyState: "No ERP meetings yet.",
    nextAction: "Prepare meeting workflow",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Define meeting categories." },
      { title: "Map participants and roles." },
      { title: "Capture decisions and action items." },
      { title: "Link meeting actions to approvals where needed." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "communication:Messages": {
    module: "Communication",
    title: "Messages",
    description: "Prepare controlled messaging for ERP workflows, alerts, and role-aware communication.",
    emptyState: "No ERP messages yet.",
    nextAction: "Configure messaging controls",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Define message types." },
      { title: "Map internal and external channels." },
      { title: "Set retention and audit rules." },
      { title: "Connect workflow alerts later." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
  "communication:Solco Integration": {
    module: "Communication",
    title: "Solco Integration",
    description: "Prepare Solco Communication integration settings, tenant mapping, and message governance.",
    emptyState: "Solco integration is not configured yet.",
    nextAction: "Prepare Solco integration",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Confirm Solco tenant mapping." },
      { title: "Define allowed communication channels." },
      { title: "Configure approval and audit rules." },
      { title: "Test integration only after credentials are provided." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  },
};

export function getERPPlaceholderContent(moduleKey: string, item: string, moduleTitle: string): ERPPlaceholderContent {
  return ERP_CONTENT[`${moduleKey}:${item}`] ?? {
    module: moduleTitle,
    title: item,
    description: `${item} is prepared as part of Solva ERP Suite. Live records will appear after tenant-scoped setup, permissions, approvals, and audit controls are configured.`,
    emptyState: "No ERP records yet.",
    nextAction: "Prepare setup",
    allowedRoles: BROAD_ERP_ROLES,
    setupSteps: [
      { title: "Confirm organization scope." },
      { title: "Configure roles and approvals." },
      { title: "Prepare required master data." },
      { title: "Enable live transactions in a later implementation phase." },
    ],
    auditNotes: DEFAULT_AUDIT_NOTES,
  };
}

export function ERPPageHeader({
  title,
  description,
  eyebrow = "Solva ERP Suite",
  actionLabel,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actionLabel?: string;
}) {
  return (
    <div className="section-heading erp-page-header">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p className="section-description">{description}</p>
      </div>
      {actionLabel ? (
        <button className="primary-button" disabled type="button">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ModuleCard({
  title,
  description,
  status = "Planned",
}: {
  title: string;
  description: string;
  status?: string;
}) {
  return (
    <article className="surface-card erp-module-card">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <ApprovalStatusBadge status={status} />
    </article>
  );
}

export function ERPEmptyState({
  title,
  description,
  actionLabel,
}: {
  title: string;
  description: string;
  actionLabel: string;
}) {
  return (
    <section className="empty-state-card erp-empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
      <button className="ghost-button" disabled type="button">
        {actionLabel}
      </button>
    </section>
  );
}

export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  return (
    <section className="surface-card erp-setup-card">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Setup Guidance</p>
          <h3>Before Transactions Begin</h3>
        </div>
      </div>
      <div className="mini-list queue-list">
        {steps.map((step, index) => (
          <article key={step.title}>
            <strong>{index + 1}. {step.title}</strong>
            {step.detail ? <small>{step.detail}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function ApprovalStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes("approved")
    ? "positive"
    : normalized.includes("blocked") || normalized.includes("rejected")
      ? "critical"
      : normalized.includes("pending")
        ? "warning"
        : "live";

  return <span className={`tone-pill tone-${tone}`}>{status}</span>;
}

export function AuditTrailPreview({ notes = [] }: { notes?: string[] }) {
  return (
    <section className="surface-card erp-audit-preview">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Audit Readiness</p>
          <h3>Controls Prepared</h3>
        </div>
      </div>
      <div className="note-list">
        {(notes.length ? notes : ["Future transactions will be tenant-scoped, role-checked, and audit logged."]).map((note) => (
          <article key={note}>
            <span className="note-dot" />
            <p>{note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RoleGate({
  role,
  allowedRoles,
  children,
}: {
  role: AppRole;
  allowedRoles?: AppRole[];
  children: ReactNode;
}) {
  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return (
      <ERPEmptyState
        actionLabel="Request access"
        description="This ERP workspace is prepared for restricted finance and operations roles. Your current role is not enabled for this setup area."
        title="Access is restricted"
      />
    );
  }

  return <>{children}</>;
}

export function TenantGuard({
  hasTenant,
  children,
}: {
  hasTenant: boolean;
  children: ReactNode;
}) {
  if (!hasTenant) {
    return (
      <ERPEmptyState
        actionLabel="Select organization"
        description="ERP records must belong to an organization before setup or posting can begin."
        title="Organization context required"
      />
    );
  }

  return <>{children}</>;
}

export function ERPModulePlaceholder({
  content,
  role,
  hasTenant,
}: {
  content: ERPPlaceholderContent;
  role: AppRole;
  hasTenant: boolean;
}) {
  const showAiWorkspace = content.module === "Solva AI";

  return (
    <RoleGate allowedRoles={content.allowedRoles} role={role}>
      <TenantGuard hasTenant={hasTenant}>
        <section className="workspace-section erp-placeholder-page">
          <ERPPageHeader
            actionLabel={content.nextAction}
            description={content.description}
            eyebrow={content.module}
            title={content.title}
          />
          <div className="erp-placeholder-grid">
            <ERPEmptyState
              actionLabel={content.nextAction}
              description="No production records have been created for this ERP area yet."
              title={content.emptyState}
            />
            <SetupChecklist steps={content.setupSteps} />
          </div>
          <AuditTrailPreview notes={content.auditNotes} />
          {showAiWorkspace ? <ERPAiWorkspace activeItem={content.title} moduleTitle={content.module} /> : null}
        </section>
      </TenantGuard>
    </RoleGate>
  );
}

function getAiMode(activeItem: string): "assistant" | "report_writer" | "anomaly_detection" {
  const normalized = activeItem.toLowerCase();
  if (normalized.includes("report")) return "report_writer";
  if (normalized.includes("anomaly")) return "anomaly_detection";
  return "assistant";
}

function ERPAiWorkspace({ activeItem, moduleTitle }: { activeItem: string; moduleTitle: string }) {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [missingData, setMissingData] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function runErpAi() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Add a request for Solva AI first.");
      return;
    }

    setBusy(true);
    setError("");
    setAnswer("");
    setSuggestedActions([]);
    setMissingData([]);

    try {
      const response = await fetch("/api/erp-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          mode: getAiMode(activeItem),
          moduleTitle,
          activeItem,
        }),
      });
      const payload = (await response.json()) as {
        answer?: string;
        suggestedActions?: string[];
        missingData?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Solva AI request failed.");
      }

      setAnswer(payload.answer ?? "");
      setSuggestedActions(Array.isArray(payload.suggestedActions) ? payload.suggestedActions : []);
      setMissingData(Array.isArray(payload.missingData) ? payload.missingData : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Solva AI request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface-card erp-ai-workspace">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Live OpenAI Connection</p>
          <h3>{activeItem}</h3>
        </div>
      </div>
      <p className="section-description">
        Ask for ERP setup guidance, report drafting, or anomaly review. Solva AI will stay inside role, tenant, and payroll preservation rules.
      </p>
      <div className="action-form">
        <label>
          <span>Prompt</span>
          <textarea
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Draft a finance setup checklist for a new organization without creating fake balances."
            rows={4}
            value={prompt}
          />
        </label>
        <div className="inline-actions">
          <button className="primary-button" disabled={busy || !prompt.trim()} onClick={() => void runErpAi()} type="button">
            {busy ? "Thinking..." : "Run Solva AI"}
          </button>
          <button
            className="ghost-button"
            disabled={busy || (!prompt && !answer)}
            onClick={() => {
              setPrompt("");
              setAnswer("");
              setSuggestedActions([]);
              setMissingData([]);
              setError("");
            }}
            type="button"
          >
            Clear
          </button>
        </div>
      </div>
      {error ? <p className="section-description">{error}</p> : null}
      {answer ? (
        <div className="mini-list queue-list erp-ai-results">
          <article>
            <strong>Solva AI response</strong>
            <small>{answer}</small>
          </article>
          {suggestedActions.length ? (
            <article>
              <strong>Suggested actions</strong>
              <div className="filter-row">
                {suggestedActions.map((action) => (
                  <span className="filter-pill" key={action}>{action}</span>
                ))}
              </div>
            </article>
          ) : null}
          {missingData.length ? (
            <article>
              <strong>Missing data</strong>
              <div className="filter-row">
                {missingData.map((item) => (
                  <span className="filter-pill" key={item}>{item}</span>
                ))}
              </div>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
