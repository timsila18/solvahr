import { APP_ROLES, type AppRole, type AuthUserProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStorageBucketNames } from "@/lib/supabase/env";

type RequestContext = {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  profile: AuthUserProfile;
};

const ADMIN_LIMIT_ROLES: AppRole[] = ["Super Admin", "HR Admin", "Payroll Admin", "Finance Officer", "Auditor"];
const FALLBACK_PLAN_ROWS = [
  {
    id: "starter",
    name: "Starter",
    description: "For growing teams that need core HR, ESS, and simple reporting.",
    billing_model: "flat",
    monthly_price: 12500,
    annual_price: 125000,
    price_per_employee: 0,
    currency: "KES",
    employee_limit: 25,
    admin_limit: 2,
    trial_days: 14,
    modules: ["dashboard", "people", "ess", "reports"],
    features: ["Core HR", "ESS", "Basic reports", "Employee onboarding"],
    add_ons: ["Extra employees", "Payroll add-on"],
    status: "active",
    sort_order: 1,
  },
  {
    id: "growth",
    name: "Growth",
    description: "Payroll-ready plan for organizations running monthly HR and payroll operations.",
    billing_model: "flat",
    monthly_price: 28500,
    annual_price: 285000,
    price_per_employee: 0,
    currency: "KES",
    employee_limit: 100,
    admin_limit: 5,
    trial_days: 21,
    modules: ["dashboard", "people", "payroll", "leave", "ess", "reports", "administration"],
    features: ["Payroll", "Leave", "Reports", "Multi-admin", "Branded exports"],
    add_ons: ["Additional admins", "Training add-on", "Recruitment add-on"],
    status: "active",
    sort_order: 2,
  },
  {
    id: "business",
    name: "Business",
    description: "Full HRIS with approvals, branding, and deeper controls for multi-branch operations.",
    billing_model: "per_employee",
    monthly_price: 0,
    annual_price: 0,
    price_per_employee: 650,
    currency: "KES",
    employee_limit: 500,
    admin_limit: 15,
    trial_days: 30,
    modules: ["dashboard", "people", "payroll", "leave", "recruitment", "performance", "training", "assets", "ess", "reports", "administration", "integrations"],
    features: ["Full HRIS", "Advanced approvals", "Branded reports", "Imports", "Multi-branch setup"],
    add_ons: ["API access", "Consultancy layer", "Priority support"],
    status: "active",
    sort_order: 3,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited usage with premium support and custom onboarding.",
    billing_model: "custom",
    monthly_price: 0,
    annual_price: 0,
    price_per_employee: 0,
    currency: "KES",
    employee_limit: null,
    admin_limit: null,
    trial_days: 30,
    modules: ["dashboard", "people", "payroll", "leave", "recruitment", "performance", "training", "assets", "ess", "reports", "administration", "integrations", "consultancy"],
    features: ["Unlimited employees", "Priority support", "Custom onboarding", "Advanced controls"],
    add_ons: ["Custom SLAs", "Custom billing", "API access"],
    status: "active",
    sort_order: 4,
  },
] as const;

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
}

function safeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function currencyFormatter(currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatMoney(amount: number, currency = "KES") {
  return currencyFormatter(currency).format(amount);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isPlatformOwner(profile: AuthUserProfile) {
  return safeString(profile.email).toLowerCase().endsWith("@solvahr.app");
}

function isRelationMissing(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : asRecord(error)?.message && typeof asRecord(error)?.message === "string"
        ? String(asRecord(error)?.message)
        : "";
  const code = safeString(asRecord(error)?.code);
  return code === "42P01" || /does not exist|relation .* does not exist/i.test(message);
}

async function createSignedStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) {
    return "";
  }

  const admin = createSupabaseAdminClient();
  const result = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 12);
  if (result.error || !result.data?.signedUrl) {
    return "";
  }

  return result.data.signedUrl;
}

async function getRequestContext(): Promise<RequestContext> {
  const authSupabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    throw new Error("unauthorized");
  }

  const { data, error } = await admin
    .from("users")
    .select("id, company_id, full_name, email, phone, role, employee_id, branch_id, department_id, last_login, status")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw error ?? new Error("forbidden");
  }

  const metadataStatus =
    typeof user.app_metadata.status === "string"
      ? user.app_metadata.status
      : typeof user.user_metadata.status === "string"
        ? user.user_metadata.status
        : "active";
  const resolvedStatus =
    safeString(data.status).toLowerCase() === "pending_approval" || metadataStatus === "pending_approval"
      ? "pending_approval"
      : safeString(data.status, metadataStatus);

  if (["pending_approval", "suspended", "deactivated", "revoked"].includes(resolvedStatus.toLowerCase())) {
    throw new Error("forbidden");
  }

  return {
    admin,
    profile: {
      id: safeString(data.id),
      company_id: safeString(data.company_id) || null,
      full_name: safeString(data.full_name, safeString(user.user_metadata.full_name, user.email ?? "Solva User")),
      email: safeString(data.email, user.email ?? ""),
      phone: safeString(data.phone) || null,
      role: (safeString(data.role, "Employee") as AppRole) || "Employee",
      employee_id: safeString(data.employee_id) || null,
      branch_id: safeString(data.branch_id) || null,
      department_id: safeString(data.department_id) || null,
      last_login: safeString(data.last_login) || null,
      status: resolvedStatus,
    },
  };
}

function ensureCompanyScoped(profile: AuthUserProfile) {
  if (!profile.company_id) {
    throw new Error("forbidden");
  }
}

function ensureBillingManageAccess(profile: AuthUserProfile) {
  if (!["Super Admin", "HR Admin", "Payroll Admin", "Finance Officer"].includes(profile.role)) {
    throw new Error("forbidden");
  }
}

function normalisePlanRow(row: Record<string, unknown>) {
  const currency = safeString(row.currency, "KES");
  const monthlyPrice = safeNumber(row.monthly_price);
  const annualPrice = safeNumber(row.annual_price);
  const pricePerEmployee = safeNumber(row.price_per_employee);

  return {
    id: safeString(row.id),
    name: safeString(row.name),
    description: safeString(row.description),
    billingModel: safeString(row.billing_model, "flat"),
    monthlyPrice,
    annualPrice,
    pricePerEmployee,
    monthlyPriceLabel: monthlyPrice ? formatMoney(monthlyPrice, currency) : "Custom",
    annualPriceLabel: annualPrice ? formatMoney(annualPrice, currency) : "Custom",
    perEmployeeLabel: pricePerEmployee ? `${formatMoney(pricePerEmployee, currency)} / employee` : "Included",
    currency,
    employeeLimit: row.employee_limit == null ? null : safeNumber(row.employee_limit),
    adminLimit: row.admin_limit == null ? null : safeNumber(row.admin_limit),
    trialDays: safeNumber(row.trial_days, 14),
    modules: asStringArray(row.modules),
    features: asStringArray(row.features),
    addOns: asStringArray(row.add_ons),
    status: safeString(row.status, "active"),
    sortOrder: safeNumber(row.sort_order),
  };
}

function buildModuleEntitlements(planModules: string[], selectedModules: string[]) {
  const requested = selectedModules.length ? selectedModules : planModules;
  const allowed = requested.filter((moduleKey) => planModules.includes(moduleKey));
  return Object.fromEntries(planModules.map((moduleKey) => [moduleKey, allowed.includes(moduleKey)]));
}

function choosePlanForUsage(
  plans: Array<ReturnType<typeof normalisePlanRow>>,
  usage: {
    employeeCount: number;
    adminCount: number;
    payrollRuns: number;
    reportExports: number;
    generatedPdfs: number;
  }
) {
  const needsPayroll = usage.payrollRuns > 0 || usage.generatedPdfs > 0 || usage.reportExports > 0;
  const ordered = [...plans].sort((left, right) => left.sortOrder - right.sortOrder);

  const match = ordered.find((plan) => {
    const employeeFits = plan.employeeLimit == null || usage.employeeCount <= plan.employeeLimit;
    const adminFits = plan.adminLimit == null || usage.adminCount <= plan.adminLimit;
    const payrollFits = !needsPayroll || plan.modules.includes("payroll");
    return employeeFits && adminFits && payrollFits;
  });

  return match ?? ordered[ordered.length - 1] ?? null;
}

function buildOnboardingChecklist(selectedModules: string[]) {
  const checklist = [
    {
      key: "company_profile",
      label: "Complete company profile",
      description: "Confirm your workspace name, contact details, timezone, and payroll currency.",
      moduleKey: "administration",
      item: "Company Settings",
    },
    {
      key: "branding",
      label: "Upload logo and branding",
      description: "Add your logo so the app shell and reports feel like your own system.",
      moduleKey: "administration",
      item: "Company Settings",
    },
    {
      key: "branches",
      label: "Create branches",
      description: "Set up the operating branches your teams and payroll should use.",
      moduleKey: "administration",
      item: "Branch Management",
    },
    {
      key: "departments",
      label: "Create departments",
      description: "Map departments before inviting users or importing employees.",
      moduleKey: "administration",
      item: "Department Management",
    },
    {
      key: "employees",
      label: "Import employees",
      description: "Bring in your employee register so ESS, payroll, and reports have live records.",
      moduleKey: "people",
      item: "Employee Directory",
    },
    {
      key: "payroll_setup",
      label: "Configure payroll",
      description: "Confirm payroll groups, statutory defaults, and ready-to-run payroll settings.",
      moduleKey: "payroll",
      item: "Payroll Dashboard",
    },
    {
      key: "invite_users",
      label: "Invite your team",
      description: "Create admin and employee accounts so your organization can go live together.",
      moduleKey: "administration",
      item: "User Management",
    },
  ];

  if (!selectedModules.includes("payroll")) {
    return checklist.filter((item) => item.key !== "payroll_setup");
  }

  return checklist;
}

function calculateOrganizationHealthScore(input: {
  employeeCount: number;
  adminCount: number;
  reportExports: number;
  payrollRuns: number;
  progressPercent: number;
  missingDataPoints: number;
  failedExports: number;
}) {
  const { progressPercent, missingDataPoints, failedExports, payrollRuns, employeeCount } = input;
  return Math.max(
    35,
    Math.min(
      100,
      Math.round(
        55 +
          Math.min(20, progressPercent / 5) +
          Math.min(10, payrollRuns) +
          Math.min(5, Math.max(1, employeeCount) / 25) -
          Math.min(20, missingDataPoints * 2) -
          Math.min(20, failedExports * 5)
      )
    )
  );
}

function calculateProgressPercent(total: number, completed: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function buildInvoiceNumber(companyId: string) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `INV-${stamp}-${companyId.slice(0, 6).toUpperCase()}`;
}

function buildReceiptNumber(companyId: string) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RCPT-${stamp}-${companyId.slice(0, 6).toUpperCase()}`;
}

async function fetchPlanById(planId: string) {
  const plans = await listPublicSubscriptionPlans();
  const plan = plans.find((entry) => entry.id === planId) ?? null;
  if (!plan) {
    throw new Error("plan_not_found");
  }
  return plan;
}

async function getSubscriptionRecord(admin: ReturnType<typeof createSupabaseAdminClient>, companyId: string) {
  const result = await admin
    .from("organization_subscriptions")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return (result.data as Record<string, unknown> | null) ?? null;
}

async function countCompanyUsage(admin: ReturnType<typeof createSupabaseAdminClient>, companyId: string) {
  const [employees, users, payrollRuns, reportExports, generatedPdfs] = await Promise.all([
    admin.from("employees").select("*", { count: "exact", head: true }).eq("company_id", companyId),
    admin.from("users").select("role", { count: "exact", head: true }).eq("company_id", companyId).in("role", ADMIN_LIMIT_ROLES),
    admin.from("payroll_runs").select("*", { count: "exact", head: true }).eq("company_id", companyId),
    admin
      .from("payroll_exports")
      .select("id, payroll_runs!inner(company_id)", { count: "exact", head: true })
      .eq("payroll_runs.company_id", companyId),
    admin
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("action", ["generated_payslip_pdf", "generated_bulk_payslips_pdf", "downloaded_payslip_pdf"]),
  ]);

  if (employees.error) {
    throw employees.error;
  }

  if (users.error) {
    throw users.error;
  }

  if (payrollRuns.error) {
    throw payrollRuns.error;
  }

  if (reportExports.error && !isRelationMissing(reportExports.error)) {
    throw reportExports.error;
  }

  if (generatedPdfs.error && !isRelationMissing(generatedPdfs.error)) {
    throw generatedPdfs.error;
  }

  return {
    employeeCount: employees.count ?? 0,
    adminCount: users.count ?? 0,
    payrollRuns: payrollRuns.count ?? 0,
    reportExports: reportExports.error ? 0 : reportExports.count ?? 0,
    generatedPdfs: generatedPdfs.error ? 0 : generatedPdfs.count ?? 0,
  };
}

async function upsertUsageSnapshot(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  companyId: string,
  usage: {
    employeeCount: number;
    adminCount: number;
    payrollRuns: number;
    reportExports: number;
    generatedPdfs: number;
  }
) {
  await admin.from("usage_snapshots").upsert(
    {
      company_id: companyId,
      snapshot_date: new Date().toISOString().slice(0, 10),
      employee_count: usage.employeeCount,
      admin_count: usage.adminCount,
      payroll_runs: usage.payrollRuns,
      report_exports: usage.reportExports,
      generated_payslips: usage.generatedPdfs,
      metadata: {
        refreshedAt: new Date().toISOString(),
      },
    },
    { onConflict: "company_id,snapshot_date" }
  );
}

async function getCompanyBranding(admin: ReturnType<typeof createSupabaseAdminClient>, companyId: string) {
  const [companyResult, settingsResult] = await Promise.all([
    admin.from("companies").select("id, name, slug, status").eq("id", companyId).maybeSingle(),
    admin.from("company_settings").select("primary_email, phone, branding").eq("company_id", companyId).maybeSingle(),
  ]);

  if (companyResult.error) {
    throw companyResult.error;
  }

  if (settingsResult.error) {
    throw settingsResult.error;
  }

  const company = (companyResult.data as Record<string, unknown> | null) ?? null;
  const settings = (settingsResult.data as Record<string, unknown> | null) ?? null;
  const branding = asRecord(settings?.branding);
  const logoPath = safeString(branding?.logoPath);

  return {
    companyId,
    name: safeString(branding?.displayName, safeString(company?.name, "Solva HR Workspace")),
    slug: safeString(company?.slug),
    identifier: safeString(branding?.employerIdentifier, safeString(company?.slug).toUpperCase()),
    status: safeString(company?.status, "active"),
    primaryEmail: safeString(settings?.primary_email),
    phone: safeString(settings?.phone),
    logoUrl:
      safeString(branding?.logoUrl) ||
      (await createSignedStorageUrl(getStorageBucketNames().payrollDocuments, logoPath)) ||
      null,
    logoMark: safeString(branding?.logoMark, safeString(company?.name, "S").slice(0, 2).toUpperCase()),
  };
}

export async function listPublicSubscriptionPlans() {
  const admin = createSupabaseAdminClient();
  try {
    const result = await admin
      .from("subscription_plans")
      .select("*")
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (result.error) {
      throw result.error;
    }

    return (result.data ?? []).map((row) => normalisePlanRow(row as Record<string, unknown>));
  } catch (error) {
    if (isRelationMissing(error)) {
      return FALLBACK_PLAN_ROWS.map((row) => normalisePlanRow(row as unknown as Record<string, unknown>));
    }

    throw error;
  }
}

export async function createSalesLead(input: {
  leadType: "contact_sales" | "book_demo";
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string | null;
  employeeCount?: number | null;
  modules?: string[];
  preferredDate?: string | null;
  country?: string | null;
  notes?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const companyName = safeString(input.companyName).trim();
  const contactPerson = safeString(input.contactPerson).trim();
  const email = safeString(input.email).trim().toLowerCase();

  if (!companyName || !contactPerson || !email) {
    throw new Error("missing_lead_fields");
  }

  const { data, error } = await admin
    .from("sales_leads")
    .insert({
      source: "website",
      lead_type: input.leadType,
      company_name: companyName,
      contact_person: contactPerson,
      email,
      phone: safeString(input.phone) || null,
      employee_count: input.employeeCount ?? null,
      modules: dedupe(input.modules ?? []),
      preferred_date: safeString(input.preferredDate) || null,
      country: safeString(input.country, "Kenya"),
      notes: safeString(input.notes) || null,
      status: "new",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("lead_create_failed");
  }

  return {
    id: safeString(data.id),
    status: safeString(data.status, "new"),
  };
}

export async function initializeCompanySubscription(input: {
  companyId: string;
  organizationName: string;
  planId?: string | null;
  billingCycle?: "monthly" | "annual";
  estimatedEmployeeCount?: number | null;
  selectedModules?: string[];
  trialDays?: number | null;
}) {
  const admin = createSupabaseAdminClient();
  const billingCycle = input.billingCycle === "annual" ? "annual" : "monthly";
  const plan = await fetchPlanById(safeString(input.planId, "growth") || "growth");
  const trialDays = input.trialDays && input.trialDays > 0 ? input.trialDays : plan.trialDays;
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const selectedModules = dedupe((input.selectedModules ?? []).filter((moduleKey) => plan.modules.includes(moduleKey)));
  const entitledModules = buildModuleEntitlements(plan.modules, selectedModules);
  const onboardingChecklist = buildOnboardingChecklist(Object.keys(entitledModules).filter((key) => entitledModules[key]));
  const baseAmount =
    plan.billingModel === "flat"
      ? billingCycle === "annual"
        ? plan.annualPrice || plan.monthlyPrice * 12
        : plan.monthlyPrice
      : plan.billingModel === "per_employee"
        ? safeNumber(input.estimatedEmployeeCount) * plan.pricePerEmployee
        : 0;

  const invoiceNumber = buildInvoiceNumber(input.companyId);

  const subscriptionPayload = {
    company_id: input.companyId,
    plan_id: plan.id,
    status: "trialing",
    billing_cycle: billingCycle,
    currency: plan.currency,
    employee_count: safeNumber(input.estimatedEmployeeCount),
    employee_limit: plan.employeeLimit,
    admin_count: 1,
    admin_limit: plan.adminLimit,
    selected_modules: selectedModules.length ? selectedModules : plan.modules,
    module_entitlements: entitledModules,
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEndsAt.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: trialEndsAt.toISOString(),
    renewal_date: trialEndsAt.toISOString(),
    cancel_at_period_end: false,
    payment_status: "trial",
    payment_method: "trial",
    plan_snapshot: {
      name: plan.name,
      description: plan.description,
      billingModel: plan.billingModel,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      pricePerEmployee: plan.pricePerEmployee,
      currency: plan.currency,
      features: plan.features,
      addOns: plan.addOns,
    },
  };

  const onboardingPayload = {
    company_id: input.companyId,
    current_step: "company_profile",
    completed_steps: [],
    progress_percent: 0,
    launch_status: "setup",
    checklist: onboardingChecklist,
    notes: {
      organizationName: input.organizationName,
      estimatedEmployeeCount: safeNumber(input.estimatedEmployeeCount),
      modules: selectedModules.length ? selectedModules : plan.modules,
    },
  };

  let subscriptionResult;
  let onboardingResult;
  try {
    [subscriptionResult, onboardingResult] = await Promise.all([
      admin
        .from("organization_subscriptions")
        .upsert(subscriptionPayload, { onConflict: "company_id" })
        .select("*")
        .single(),
      admin
        .from("organization_onboarding")
        .upsert(onboardingPayload, { onConflict: "company_id" })
        .select("*")
        .single(),
    ]);
  } catch (error) {
    if (!isRelationMissing(error)) {
      throw error;
    }

    return {
      subscriptionId: `fallback-${input.companyId}`,
      planId: plan.id,
      planName: plan.name,
      status: "trialing",
      trialEndsAt: trialEndsAt.toISOString(),
      checklist: onboardingChecklist,
    };
  }

  if (subscriptionResult.error || !subscriptionResult.data) {
    if (isRelationMissing(subscriptionResult.error)) {
      return {
        subscriptionId: `fallback-${input.companyId}`,
        planId: plan.id,
        planName: plan.name,
        status: "trialing",
        trialEndsAt: trialEndsAt.toISOString(),
        checklist: onboardingChecklist,
      };
    }

    throw subscriptionResult.error ?? new Error("subscription_setup_failed");
  }

  if (onboardingResult.error || !onboardingResult.data) {
    if (isRelationMissing(onboardingResult.error)) {
      return {
        subscriptionId: `fallback-${input.companyId}`,
        planId: plan.id,
        planName: plan.name,
        status: "trialing",
        trialEndsAt: trialEndsAt.toISOString(),
        checklist: onboardingChecklist,
      };
    }

    throw onboardingResult.error ?? new Error("onboarding_setup_failed");
  }

  const invoiceInsert = await admin.from("billing_invoices").insert({
    company_id: input.companyId,
    subscription_id: subscriptionResult.data.id,
    invoice_number: invoiceNumber,
    amount: baseAmount,
    currency: plan.currency,
    status: "trial",
    invoice_date: now.toISOString(),
    due_date: trialEndsAt.toISOString(),
    metadata: {
      kind: "trial",
      planId: plan.id,
      planName: plan.name,
      employeeEstimate: safeNumber(input.estimatedEmployeeCount),
      selectedModules: selectedModules.length ? selectedModules : plan.modules,
    },
  });

  if (invoiceInsert.error && !isRelationMissing(invoiceInsert.error)) {
    throw invoiceInsert.error;
  }

  return {
    subscriptionId: safeString(subscriptionResult.data.id),
    planId: plan.id,
    planName: plan.name,
    status: "trialing",
    trialEndsAt: trialEndsAt.toISOString(),
    checklist: onboardingChecklist,
  };
}

export async function getCompanyModuleEntitlements(companyId: string | null | undefined) {
  if (!companyId) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  let subscription: Record<string, unknown> | null = null;
  try {
    subscription = await getSubscriptionRecord(admin, companyId);
  } catch (error) {
    if (isRelationMissing(error)) {
      return null;
    }
    throw error;
  }
  if (!subscription) {
    return null;
  }

  const entitlements = asRecord(subscription.module_entitlements);
  return entitlements ? Object.fromEntries(Object.entries(entitlements).map(([key, value]) => [key, safeBoolean(value)])) : null;
}

export async function assertEmployeePlanCapacity(companyId: string | null | undefined) {
  if (!companyId) {
    return;
  }

  const admin = createSupabaseAdminClient();
  let subscription: Record<string, unknown> | null = null;
  try {
    subscription = await getSubscriptionRecord(admin, companyId);
  } catch (error) {
    if (isRelationMissing(error)) {
      return;
    }
    throw error;
  }
  if (!subscription) {
    return;
  }

  const employeeLimit = subscription.employee_limit == null ? null : safeNumber(subscription.employee_limit);
  if (!employeeLimit) {
    return;
  }

  const usage = await countCompanyUsage(admin, companyId);
  if (usage.employeeCount >= employeeLimit) {
    throw new Error(`employee_limit_reached:${employeeLimit}`);
  }
}

export async function assertAdminPlanCapacity(companyId: string | null | undefined) {
  if (!companyId) {
    return;
  }

  const admin = createSupabaseAdminClient();
  let subscription: Record<string, unknown> | null = null;
  try {
    subscription = await getSubscriptionRecord(admin, companyId);
  } catch (error) {
    if (isRelationMissing(error)) {
      return;
    }
    throw error;
  }
  if (!subscription) {
    return;
  }

  const adminLimit = subscription.admin_limit == null ? null : safeNumber(subscription.admin_limit);
  if (!adminLimit) {
    return;
  }

  const usage = await countCompanyUsage(admin, companyId);
  if (usage.adminCount >= adminLimit) {
    throw new Error(`admin_limit_reached:${adminLimit}`);
  }
}

export async function getCompanyBillingDashboard() {
  const context = await getRequestContext();
  ensureCompanyScoped(context.profile);
  ensureBillingManageAccess(context.profile);

  const companyId = context.profile.company_id as string;
  const [branding, subscriptionRow, invoiceResult, plans, usage] = await Promise.all([
    getCompanyBranding(context.admin, companyId),
    getSubscriptionRecord(context.admin, companyId),
    context.admin
      .from("billing_invoices")
      .select("*")
      .eq("company_id", companyId)
      .order("invoice_date", { ascending: false })
      .limit(12),
    listPublicSubscriptionPlans(),
    countCompanyUsage(context.admin, companyId),
  ]);

  if (invoiceResult.error) {
    throw invoiceResult.error;
  }

  await upsertUsageSnapshot(context.admin, companyId, usage);

  const subscription = subscriptionRow ? asRecord(subscriptionRow) : null;
  const plan =
    plans.find((item) => item.id === safeString(subscription?.plan_id)) ?? choosePlanForUsage(plans, usage) ?? plans[0] ?? null;
  const now = new Date();
  const trialEndsAt = safeString(subscription?.trial_ends_at);
  const renewalDate = safeString(subscription?.renewal_date);
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : null;
  const employeeLimit = subscription?.employee_limit == null ? plan?.employeeLimit ?? null : safeNumber(subscription?.employee_limit);
  const adminLimit = subscription?.admin_limit == null ? plan?.adminLimit ?? null : safeNumber(subscription?.admin_limit);
  const selectedModules = asStringArray(subscription?.selected_modules);

  return {
    company: branding,
    subscription: {
      id: safeString(subscription?.id),
      planId: plan?.id ?? "",
      planName: plan?.name ?? "Custom",
      description: plan?.description ?? "",
      status: safeString(subscription?.status, "trialing"),
      billingCycle: safeString(subscription?.billing_cycle, "monthly"),
      currency: plan?.currency ?? safeString(subscription?.currency, "KES"),
      paymentStatus: safeString(subscription?.payment_status, "trial"),
      paymentMethod: safeString(subscription?.payment_method, "Trial"),
      trialEndsAt: trialEndsAt || null,
      trialDaysRemaining: daysRemaining,
      renewalDate: renewalDate || null,
      employeeLimit,
      adminLimit,
      selectedModules: selectedModules.length ? selectedModules : plan?.modules ?? [],
      features: plan?.features ?? [],
      addOns: plan?.addOns ?? [],
      monthlyPriceLabel: plan?.monthlyPriceLabel ?? "Custom",
      annualPriceLabel: plan?.annualPriceLabel ?? "Custom",
      perEmployeeLabel: plan?.perEmployeeLabel ?? "Included",
      upgradePrompt:
        employeeLimit && usage.employeeCount >= employeeLimit
          ? `You have reached the ${plan?.name ?? "current"} employee limit. Upgrade to keep adding employees.`
          : adminLimit && usage.adminCount >= adminLimit
            ? `You have reached the ${plan?.name ?? "current"} admin limit. Upgrade to invite more admins.`
            : null,
    },
    usage: {
      employees: usage.employeeCount,
      admins: usage.adminCount,
      payrollRuns: usage.payrollRuns,
      reportExports: usage.reportExports,
      generatedPayslips: usage.generatedPdfs,
      employeeLimit,
      adminLimit,
      employeeUsageLabel: employeeLimit ? `${usage.employeeCount} / ${employeeLimit}` : `${usage.employeeCount} active`,
      adminUsageLabel: adminLimit ? `${usage.adminCount} / ${adminLimit}` : `${usage.adminCount} active`,
    },
    plans,
    invoices: (invoiceResult.data ?? []).map((row) => ({
      id: safeString((row as Record<string, unknown>).id),
      invoiceNumber: safeString((row as Record<string, unknown>).invoice_number),
      amount: safeNumber((row as Record<string, unknown>).amount),
      amountLabel: formatMoney(
        safeNumber((row as Record<string, unknown>).amount),
        safeString((row as Record<string, unknown>).currency, "KES")
      ),
      status: safeString((row as Record<string, unknown>).status),
      invoiceDate: safeString((row as Record<string, unknown>).invoice_date),
      dueDate: safeString((row as Record<string, unknown>).due_date),
      receiptNumber: safeString((row as Record<string, unknown>).receipt_number),
      paymentMethod: safeString((row as Record<string, unknown>).payment_method),
    })),
    paymentMethods: [
      { key: "mpesa", label: "M-Pesa STK Push", status: "prepared" },
      { key: "card", label: "Card payments", status: "coming_soon" },
      { key: "bank_transfer", label: "Bank transfer", status: "manual_review" },
      { key: "manual_invoice", label: "Manual invoice approval", status: "prepared" },
    ],
  };
}

export async function updateCompanySubscription(input: {
  planId: string;
  billingCycle?: "monthly" | "annual";
  selectedModules?: string[];
}) {
  const context = await getRequestContext();
  ensureCompanyScoped(context.profile);
  ensureBillingManageAccess(context.profile);

  const companyId = context.profile.company_id as string;
  const plan = await fetchPlanById(input.planId);
  const billingCycle = input.billingCycle === "annual" ? "annual" : "monthly";
  const selectedModules = dedupe((input.selectedModules ?? []).filter((moduleKey) => plan.modules.includes(moduleKey)));
  const moduleEntitlements = buildModuleEntitlements(plan.modules, selectedModules);
  const currentUsage = await countCompanyUsage(context.admin, companyId);
  const now = new Date();
  const renewalDate = new Date(now.getTime() + (billingCycle === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000);
  const amount =
    plan.billingModel === "flat"
      ? billingCycle === "annual"
        ? plan.annualPrice || plan.monthlyPrice * 12
        : plan.monthlyPrice
      : plan.billingModel === "per_employee"
        ? currentUsage.employeeCount * plan.pricePerEmployee
        : 0;

  const updateResult = await context.admin
    .from("organization_subscriptions")
    .update({
      plan_id: plan.id,
      billing_cycle: billingCycle,
      status: "active",
      payment_status: "pending",
      payment_method: "invoice_pending",
      selected_modules: selectedModules.length ? selectedModules : plan.modules,
      module_entitlements: moduleEntitlements,
      employee_limit: plan.employeeLimit,
      admin_limit: plan.adminLimit,
      current_period_start: now.toISOString(),
      current_period_end: renewalDate.toISOString(),
      renewal_date: renewalDate.toISOString(),
      plan_snapshot: {
        name: plan.name,
        description: plan.description,
        billingModel: plan.billingModel,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        pricePerEmployee: plan.pricePerEmployee,
        currency: plan.currency,
        features: plan.features,
        addOns: plan.addOns,
      },
      updated_at: now.toISOString(),
    })
    .eq("company_id", companyId)
    .select("*")
    .single();

  if (updateResult.error || !updateResult.data) {
    throw updateResult.error ?? new Error("subscription_update_failed");
  }

  await context.admin.from("billing_invoices").insert({
    company_id: companyId,
    subscription_id: safeString(updateResult.data.id),
    invoice_number: buildInvoiceNumber(companyId),
    amount,
    currency: plan.currency,
    status: "pending",
    invoice_date: now.toISOString(),
    due_date: renewalDate.toISOString(),
    receipt_number: buildReceiptNumber(companyId),
    payment_method: "Pending payment",
    metadata: {
      kind: "upgrade",
      planId: plan.id,
      planName: plan.name,
      selectedModules: selectedModules.length ? selectedModules : plan.modules,
    },
  });

  return getCompanyBillingDashboard();
}

export async function getCompanyOnboardingDashboard() {
  const context = await getRequestContext();
  ensureCompanyScoped(context.profile);
  ensureBillingManageAccess(context.profile);

  const companyId = context.profile.company_id as string;
  const [branding, onboardingResult, branchCount, departmentCount, employeeCount, userCount, payrollGroups, payrollRuns, settingsResult] =
    await Promise.all([
      getCompanyBranding(context.admin, companyId),
      context.admin.from("organization_onboarding").select("*").eq("company_id", companyId).maybeSingle(),
      context.admin.from("branches").select("*", { count: "exact", head: true }).eq("company_id", companyId),
      context.admin.from("departments").select("*", { count: "exact", head: true }).eq("company_id", companyId),
      context.admin.from("employees").select("*", { count: "exact", head: true }).eq("company_id", companyId),
      context.admin.from("users").select("*", { count: "exact", head: true }).eq("company_id", companyId),
      context.admin.from("payroll_groups").select("*", { count: "exact", head: true }).eq("company_id", companyId),
      context.admin.from("payroll_runs").select("*", { count: "exact", head: true }).eq("company_id", companyId),
      context.admin.from("company_settings").select("branding").eq("company_id", companyId).maybeSingle(),
    ]);

  if (onboardingResult.error) {
    throw onboardingResult.error;
  }

  if (settingsResult.error) {
    throw settingsResult.error;
  }

  const onboarding = (onboardingResult.data as Record<string, unknown> | null) ?? null;
  const brandingSettings = asRecord((settingsResult.data as Record<string, unknown> | null)?.branding);
  const completedSteps = new Set(asStringArray(onboarding?.completed_steps));
  const checklistSource = asRecord(onboarding)?.checklist;
  const checklist = Array.isArray(checklistSource)
    ? checklistSource.map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item))
    : buildOnboardingChecklist([]);

  const liveChecklist = checklist.map((item) => {
    const key = safeString(item.key);
    const completed =
      key === "company_profile"
        ? Boolean(branding.name && branding.primaryEmail)
        : key === "branding"
          ? Boolean(branding.logoUrl)
          : key === "branches"
            ? (branchCount.count ?? 0) > 1
            : key === "departments"
              ? (departmentCount.count ?? 0) > 1
              : key === "employees"
                ? (employeeCount.count ?? 0) > 0
                : key === "payroll_setup"
                  ? (payrollGroups.count ?? 0) > 0
                  : key === "invite_users"
                    ? (userCount.count ?? 0) > 1
                    : completedSteps.has(key);

    return {
      key,
      label: safeString(item.label),
      description: safeString(item.description),
      moduleKey: safeString(item.moduleKey),
      item: safeString(item.item),
      completed,
    };
  });

  const completedCount = liveChecklist.filter((item) => item.completed).length;
  const progressPercent = calculateProgressPercent(liveChecklist.length, completedCount);
  const nextItem = liveChecklist.find((item) => !item.completed) ?? null;
  const currentStep = nextItem?.key ?? safeString(onboarding?.current_step, "go_live");
  const launchStatus = progressPercent >= 100 ? "ready_to_launch" : safeString(onboarding?.launch_status, "setup");

  await context.admin
    .from("organization_onboarding")
    .upsert(
      {
        company_id: companyId,
        current_step: currentStep,
        completed_steps: liveChecklist.filter((item) => item.completed).map((item) => item.key),
        progress_percent: progressPercent,
        launch_status: launchStatus,
        checklist: liveChecklist,
      },
      { onConflict: "company_id" }
    );

  return {
    company: branding,
    onboarding: {
      progressPercent,
      currentStep,
      launchStatus,
      nextAction: nextItem,
      checklist: liveChecklist,
      counts: {
        branches: branchCount.count ?? 0,
        departments: departmentCount.count ?? 0,
        employees: employeeCount.count ?? 0,
        users: userCount.count ?? 0,
        payrollGroups: payrollGroups.count ?? 0,
        payrollRuns: payrollRuns.count ?? 0,
      },
      guidedLaunch:
        progressPercent >= 100
          ? "Your workspace is ready to launch with a branded tenant, user access, and payroll flows."
          : `You are ${progressPercent}% through setup. Finish the remaining steps before your first payroll run.`,
    },
  };
}

export async function updateCompanyOnboarding(input: {
  completedStep?: string | null;
  currentStep?: string | null;
}) {
  const context = await getRequestContext();
  ensureCompanyScoped(context.profile);
  ensureBillingManageAccess(context.profile);

  const companyId = context.profile.company_id as string;
  const existing = await context.admin
    .from("organization_onboarding")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  const record = (existing.data as Record<string, unknown> | null) ?? null;
  const completed = new Set(asStringArray(record?.completed_steps));
  if (input.completedStep) {
    if (completed.has(input.completedStep)) {
      completed.delete(input.completedStep);
    } else {
      completed.add(input.completedStep);
    }
  }

  await context.admin
    .from("organization_onboarding")
    .upsert(
      {
        company_id: companyId,
        current_step: safeString(input.currentStep, safeString(record?.current_step, "company_profile")),
        completed_steps: Array.from(completed),
      },
      { onConflict: "company_id" }
    );

  return getCompanyOnboardingDashboard();
}

export async function getPlatformOwnerDashboard() {
  const context = await getRequestContext();
  if (!isPlatformOwner(context.profile)) {
    throw new Error("forbidden");
  }

  const [companies, subscriptions, leads, invoices, payrollExports, payrollRuns] = await Promise.all([
    context.admin.from("companies").select("id, name, slug, status, created_at").order("created_at", { ascending: false }).limit(24),
    context.admin
      .from("organization_subscriptions")
      .select("company_id, plan_id, status, payment_status, trial_ends_at, renewal_date, employee_count, admin_count, updated_at")
      .order("updated_at", { ascending: false }),
    context.admin.from("sales_leads").select("*").order("created_at", { ascending: false }).limit(12),
    context.admin.from("billing_invoices").select("*").order("invoice_date", { ascending: false }).limit(12),
    context.admin.from("payroll_exports").select("*", { count: "exact", head: true }),
    context.admin.from("payroll_runs").select("*", { count: "exact", head: true }),
  ]);

  if (companies.error) throw companies.error;
  if (subscriptions.error && !isRelationMissing(subscriptions.error)) throw subscriptions.error;
  if (leads.error && !isRelationMissing(leads.error)) throw leads.error;
  if (invoices.error && !isRelationMissing(invoices.error)) throw invoices.error;
  if (payrollExports.error && !isRelationMissing(payrollExports.error)) throw payrollExports.error;
  if (payrollRuns.error) throw payrollRuns.error;

  const plans = await listPublicSubscriptionPlans();
  const subscriptionByCompany = new Map(
    ((subscriptions.error ? [] : subscriptions.data) ?? []).map((row) => [
      safeString((row as Record<string, unknown>).company_id),
      row as Record<string, unknown>,
    ])
  );

  const organizations = await Promise.all(
    (companies.data ?? []).map(async (row) => {
      const company = row as Record<string, unknown>;
      const companyId = safeString(company.id);
      try {
        const branding = await getCompanyBranding(context.admin, companyId);
        const subscription = subscriptionByCompany.get(companyId) ?? null;
        const usage = await countCompanyUsage(context.admin, companyId);
        const [onboardingResult, failedExportsResult, employeeRowsResult] = await Promise.all([
          context.admin
            .from("organization_onboarding")
            .select("completed_steps")
            .eq("company_id", companyId)
            .maybeSingle(),
        context.admin
          .from("payroll_exports")
          .select("id, payroll_runs!inner(company_id)", { count: "exact", head: true })
          .eq("payroll_runs.company_id", companyId)
          .eq("status", "failed"),
          context.admin
            .from("employees")
            .select("kra_pin, shif_number, nssf_number, bank_name, bank_account")
            .eq("company_id", companyId)
            .limit(2000),
        ]);
        const plan =
          plans.find((item) => item.id === safeString(subscription?.plan_id)) ?? choosePlanForUsage(plans, usage) ?? null;
        if (onboardingResult.error && !isRelationMissing(onboardingResult.error)) throw onboardingResult.error;
        if (failedExportsResult.error && !isRelationMissing(failedExportsResult.error)) throw failedExportsResult.error;
        if (employeeRowsResult.error) throw employeeRowsResult.error;
        const completedSteps = Array.isArray(onboardingResult.data?.completed_steps)
          ? onboardingResult.data.completed_steps.filter((item): item is string => typeof item === "string")
          : [];
        const progressPercent = completedSteps.length
          ? Math.round((completedSteps.length / 8) * 100)
          : 0;
        const employeeRows = (employeeRowsResult.data ?? []) as Array<Record<string, unknown>>;
        const missingDataPoints = employeeRows.reduce((total, row) => {
          return (
            total +
            (!safeString(row.kra_pin) ? 1 : 0) +
            (!safeString(row.shif_number) ? 1 : 0) +
            (!safeString(row.nssf_number) ? 1 : 0) +
            (!safeString(row.bank_name) || !safeString(row.bank_account) ? 1 : 0)
          );
        }, 0);
        const failedExports = failedExportsResult.error ? 0 : failedExportsResult.count ?? 0;
        const healthScore = calculateOrganizationHealthScore({
          employeeCount: usage.employeeCount,
          adminCount: usage.adminCount,
          reportExports: usage.reportExports,
          payrollRuns: usage.payrollRuns,
          progressPercent,
          missingDataPoints,
          failedExports,
        });

        return {
          companyId,
          name: branding.name,
          logoUrl: branding.logoUrl,
          logoMark: branding.logoMark,
          status: safeString(company.status, "active"),
          planName: plan?.name ?? "Unassigned",
          subscriptionStatus: safeString(subscription?.status, plan ? "recommended" : "inactive"),
          paymentStatus: safeString(subscription?.payment_status, plan ? "not_started" : "unknown"),
          renewalDate: safeString(subscription?.renewal_date),
          trialEndsAt: safeString(subscription?.trial_ends_at),
          employeeCount: usage.employeeCount,
          adminCount: usage.adminCount,
          reportExports: usage.reportExports,
          payrollRuns: usage.payrollRuns,
          healthScore,
          onboardingProgress: progressPercent,
          failedExports,
          missingDataPoints,
        };
      } catch {
        return {
          companyId,
          name: safeString(company.name, "Organization"),
          logoUrl: null,
          logoMark: safeString(company.name, "O").slice(0, 2).toUpperCase(),
          status: safeString(company.status, "active"),
          planName: "Unassigned",
          subscriptionStatus: "inactive",
          paymentStatus: "unknown",
          renewalDate: "",
          trialEndsAt: "",
          employeeCount: 0,
          adminCount: 0,
          reportExports: 0,
          payrollRuns: 0,
          healthScore: 0,
          onboardingProgress: 0,
          failedExports: 0,
          missingDataPoints: 0,
        };
      }
    })
  );

  const activeSubscriptions = organizations.filter((item) => ["trialing", "active", "past_due"].includes(item.subscriptionStatus)).length;
  const trialAccounts = organizations.filter((item) => item.subscriptionStatus === "trialing").length;
  const pendingApprovals = organizations.filter((item) => item.status === "pending_approval").length;
  const totalMRR = organizations.reduce((sum, item) => {
    const plan = plans.find((entry) => entry.name === item.planName);
    return sum + (plan?.monthlyPrice ?? 0);
  }, 0);

  return {
    cards: [
      { label: "Organizations", value: String(organizations.length), hint: "Live tenants on Solva HR" },
      { label: "Active subscriptions", value: String(activeSubscriptions), hint: "Trialing and paid workspaces" },
      { label: "MRR", value: formatMoney(totalMRR), hint: "Estimated monthly recurring revenue" },
      { label: "Trial accounts", value: String(trialAccounts), hint: "Organizations still in trial mode" },
      { label: "Pending approvals", value: String(pendingApprovals), hint: "Employer registrations awaiting activation" },
      { label: "Payroll volume", value: String(payrollRuns.count ?? 0), hint: "Payroll runs captured platform-wide" },
      {
        label: "Report volume",
        value: String(payrollExports.error ? 0 : payrollExports.count ?? 0),
        hint: "Exports generated across tenants",
      },
    ],
    organizations,
    leads: ((leads.error ? [] : leads.data) ?? []).map((row) => ({
      id: safeString((row as Record<string, unknown>).id),
      leadType: safeString((row as Record<string, unknown>).lead_type),
      companyName: safeString((row as Record<string, unknown>).company_name),
      contactPerson: safeString((row as Record<string, unknown>).contact_person),
      email: safeString((row as Record<string, unknown>).email),
      phone: safeString((row as Record<string, unknown>).phone),
      status: safeString((row as Record<string, unknown>).status),
      employeeCount: safeNumber((row as Record<string, unknown>).employee_count),
      createdAt: safeString((row as Record<string, unknown>).created_at),
    })),
    invoices: ((invoices.error ? [] : invoices.data) ?? []).map((row) => ({
      id: safeString((row as Record<string, unknown>).id),
      invoiceNumber: safeString((row as Record<string, unknown>).invoice_number),
      companyId: safeString((row as Record<string, unknown>).company_id),
      amountLabel: formatMoney(
        safeNumber((row as Record<string, unknown>).amount),
        safeString((row as Record<string, unknown>).currency, "KES")
      ),
      status: safeString((row as Record<string, unknown>).status),
      invoiceDate: safeString((row as Record<string, unknown>).invoice_date),
    })),
  };
}

export async function reviewEmployerRegistration(input: {
  companyId: string;
  action: "approve" | "reject";
  reason?: string;
}) {
  const context = await getRequestContext();
  if (!isPlatformOwner(context.profile)) {
    throw new Error("forbidden");
  }

  const companyId = safeString(input.companyId);
  if (!companyId) {
    throw new Error("company_not_found");
  }

  const companyResult = await context.admin
    .from("companies")
    .select("id, name, status")
    .eq("id", companyId)
    .single();

  if (companyResult.error || !companyResult.data) {
    throw companyResult.error ?? new Error("company_not_found");
  }

  const usersResult = await context.admin
    .from("users")
    .select("id, email, full_name, role")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (usersResult.error) {
    throw usersResult.error;
  }

  const companyName = safeString((companyResult.data as Record<string, unknown>).name);
  const userRows = (usersResult.data ?? []) as Array<Record<string, unknown>>;
  const timestamp = new Date().toISOString();
  const approved = input.action === "approve";
  const nextStatus = approved ? "active" : "rejected";
  const nextActivationState = approved ? "active" : "deactivated";

  await context.admin.from("companies").update({ status: nextStatus }).eq("id", companyId);
  await context.admin
    .from("users")
    .update({
      status: nextStatus,
      activation_state: nextActivationState,
      activated_at: approved ? timestamp : null,
      deactivated_at: approved ? null : timestamp,
    })
    .eq("company_id", companyId);

  await Promise.all(
    userRows.map(async (userRow) => {
      await context.admin.auth.admin.updateUserById(safeString(userRow.id), {
        app_metadata: {
          role: safeString(userRow.role, "Super Admin"),
          status: nextStatus,
        },
        user_metadata: {
          full_name: safeString(userRow.full_name),
          status: nextStatus,
        },
      });

      await context.admin.from("notifications").insert({
        company_id: companyId,
        user_id: safeString(userRow.id),
        title: approved ? "Organization approved" : "Organization registration declined",
        message: approved
          ? "Your Solva HR workspace has been approved. You can now complete onboarding and begin operations."
          : safeString(input.reason)
            ? `The organization registration was declined. Reason: ${safeString(input.reason)}`
            : "The organization registration was declined. Please contact Solva HR support for more detail.",
        category: "onboarding",
        link_href: approved ? "/" : "/pending-approval",
        status: "unread",
      });
    })
  );

  await context.admin.from("audit_logs").insert({
    company_id: companyId,
    module_key: "administration",
    entity_type: "company_registration",
    entity_id: companyId,
    action: approved ? "approved_employer_registration" : "rejected_employer_registration",
    actor_id: context.profile.id,
    actor_email: context.profile.email,
    actor_role: context.profile.role,
    after_value: {
      companyName,
      status: nextStatus,
      reason: safeString(input.reason),
    },
    approval_action: approved ? "tenant_activation" : "tenant_rejection",
  });

  return {
    companyId,
    companyName,
    status: nextStatus,
    usersUpdated: userRows.length,
  };
}
