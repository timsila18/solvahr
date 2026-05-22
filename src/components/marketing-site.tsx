import Link from "next/link";
import type { ReactNode } from "react";
import { listPublicSubscriptionPlans } from "@/lib/saas";
import { PublicLeadForm } from "@/components/public-lead-form";

type MarketingVariant =
  | "home"
  | "features"
  | "payroll"
  | "hr-modules"
  | "pricing"
  | "security"
  | "about"
  | "contact-sales"
  | "book-demo"
  | "tools"
  | "insights"
  | "guided-setup";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/payroll", label: "Payroll" },
  { href: "/hr-modules", label: "HR Modules" },
  { href: "/cv-service", label: "Create CV" },
  { href: "/tools", label: "Tools" },
  { href: "/insights", label: "Insights" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" },
];

const PAGE_COPY: Record<
  MarketingVariant,
  {
    eyebrow: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  }
> = {
  home: {
    eyebrow: "Kenya-ready HR and payroll SaaS",
    title: "Run people operations, payroll, and compliance from one branded workspace.",
    description:
      "Solva HR helps employers onboard fast, run payroll accurately, invite teams, and generate branded reports without feeling like they are trapped in a shared system.",
    ctaLabel: "Start Free Trial",
    ctaHref: "/signup",
    secondaryLabel: "Book Demo",
    secondaryHref: "/book-demo",
  },
  features: {
    eyebrow: "Feature suite",
    title: "Everything HR, payroll, ESS, approvals, and reporting need to work together.",
    description:
      "From employee records to branded payroll outputs, Solva HR keeps operations live, auditable, and easier to manage across growing Kenyan organizations.",
    ctaLabel: "Explore Pricing",
    ctaHref: "/pricing",
    secondaryLabel: "Start Free Trial",
    secondaryHref: "/signup",
  },
  payroll: {
    eyebrow: "Payroll built for real operations",
    title: "Kenyan payroll that stays accurate, export-ready, and comfortable for finance teams.",
    description:
      "Open payroll periods, validate statutory gaps, approve runs, generate premium reports, and deliver employer-branded payslips from one controlled workflow.",
    ctaLabel: "Start Payroll Trial",
    ctaHref: "/signup?plan=growth",
    secondaryLabel: "Book Payroll Demo",
    secondaryHref: "/book-demo",
  },
  "hr-modules": {
    eyebrow: "Modular HRIS",
    title: "Choose the modules your team needs today and expand as you grow.",
    description:
      "Core HR, ESS, leave, reporting, performance, recruitment, and administration all sit on the same tenant-safe foundation, so teams do not outgrow the platform in six months.",
    ctaLabel: "See Plans",
    ctaHref: "/pricing",
    secondaryLabel: "Talk to Sales",
    secondaryHref: "/contact-sales",
  },
  pricing: {
    eyebrow: "Clear pricing",
    title: "Simple plans for smaller teams, fast-moving companies, and enterprise payroll-heavy operations.",
    description:
      "Start with a trial, pick monthly or annual billing, and upgrade gracefully as employee counts, admins, and modules grow.",
    ctaLabel: "Start Free Trial",
    ctaHref: "/signup",
    secondaryLabel: "Contact Sales",
    secondaryHref: "/contact-sales",
  },
  security: {
    eyebrow: "Security and trust",
    title: "Tenant isolation, branded workspaces, audit logs, and export controls built into the product.",
    description:
      "Solva HR keeps organization data scoped per employer, stores branding and exports safely, and gives administrators visibility into who changed or downloaded what.",
    ctaLabel: "Talk to Sales",
    ctaHref: "/contact-sales",
    secondaryLabel: "Start Free Trial",
    secondaryHref: "/signup",
  },
  about: {
    eyebrow: "About Solva HR",
    title: "We are building the easiest HR and payroll system to use for Kenyan employers.",
    description:
      "The product is shaped around payroll-heavy organizations, HR consultancies, and multi-branch companies that need reliability, visibility, and a clean operator experience.",
    ctaLabel: "Book Demo",
    ctaHref: "/book-demo",
    secondaryLabel: "View Pricing",
    secondaryHref: "/pricing",
  },
  "contact-sales": {
    eyebrow: "Sales support",
    title: "Let’s map the right Solva HR setup for your company.",
    description:
      "Share your company size, modules, and rollout goals. We’ll help you choose the right plan and onboarding path.",
    ctaLabel: "Start Free Trial",
    ctaHref: "/signup",
    secondaryLabel: "Book Demo",
    secondaryHref: "/book-demo",
  },
  "book-demo": {
    eyebrow: "Guided walkthrough",
    title: "Book a live demo focused on your payroll and HR workflows.",
    description:
      "We’ll tailor the session around your employee count, approvals, payroll exports, and rollout needs so your team can see exactly how the product fits.",
    ctaLabel: "Start Free Trial",
    ctaHref: "/signup",
    secondaryLabel: "Contact Sales",
    secondaryHref: "/contact-sales",
  },
  tools: {
    eyebrow: "Lead-generation tools",
    title: "Free HR and payroll calculators that help teams plan before they automate.",
    description:
      "Give finance, HR, and founders practical calculators they can use immediately, then guide them naturally into full payroll and HR automation with Solva HR.",
    ctaLabel: "Start Free Trial",
    ctaHref: "/signup",
    secondaryLabel: "Book Demo",
    secondaryHref: "/book-demo",
  },
  insights: {
    eyebrow: "Solva HR Insights",
    title: "Helpful payroll reminders, HR operating tips, and compliance thinking for modern teams.",
    description:
      "Use Solva HR Insights to stay sharp on payroll cycles, employee operations, and day-to-day HR workflow design while keeping teams informed without extra noise.",
    ctaLabel: "Start Free Trial",
    ctaHref: "/signup",
    secondaryLabel: "Contact Sales",
    secondaryHref: "/contact-sales",
  },
  "guided-setup": {
    eyebrow: "Guided setup",
    title: "Launch a new payroll and HR tenant with a clear checklist instead of a messy implementation scramble.",
    description:
      "Map employee data, payroll structures, leave settings, approvals, branding, and ESS activation in one guided setup path so teams can go live within hours.",
    ctaLabel: "Start Free Trial",
    ctaHref: "/signup",
    secondaryLabel: "Book Demo",
    secondaryHref: "/book-demo",
  },
};

const FEATURE_COLUMNS = [
  {
    title: "People and ESS",
    items: ["Employee records", "Documents", "Employee self service", "User creation from employee register"],
  },
  {
    title: "Payroll and compliance",
    items: ["Payroll periods", "Kenyan statutory exports", "Employer-branded reports", "Payslips and P9 outputs"],
  },
  {
    title: "Governance and scale",
    items: ["Tenant isolation", "Role-aware access", "Organization branding", "Approvals and audit trail"],
  },
];

export async function MarketingSite({
  variant,
  children,
}: {
  variant: MarketingVariant;
  children?: ReactNode;
}) {
  const copy = PAGE_COPY[variant];
  const plans = await listPublicSubscriptionPlans();

  return (
    <main className="marketing-shell">
      <header className="marketing-topbar">
        <Link className="marketing-brand" href="/">
          <span className="marketing-brand__mark">S</span>
          <span>
            <strong>Solva HR</strong>
            <small>Payroll and HR SaaS</small>
          </span>
        </Link>
        <nav className="marketing-nav">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="marketing-topbar__actions">
          <Link className="ghost-button" href="/cv-service">
            Revamp CV
          </Link>
          <Link className="ghost-button" href="/login">
            Login
          </Link>
          <Link className="primary-button" href="/signup">
            Start Free Trial
          </Link>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero__copy">
          <p className="section-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="section-description">{copy.description}</p>
          <div className="inline-actions">
            <Link className="primary-button" href={copy.ctaHref}>
              {copy.ctaLabel}
            </Link>
            <Link className="ghost-button" href={copy.secondaryHref}>
              {copy.secondaryLabel}
            </Link>
          </div>
          <div className="marketing-proof-strip">
            <span>Employer-branded reports</span>
            <span>Tenant-safe workspaces</span>
            <span>Kenya-ready payroll exports</span>
          </div>
        </div>
        <div className="marketing-hero__visual">
          <img
            alt="HR and payroll operations workspace"
            className="marketing-hero__image"
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
          />
          <article className="marketing-floating-card">
            <strong>Go live faster</strong>
            <span>Trial signup, onboarding wizard, branded shell, and payroll-ready setup in one flow.</span>
          </article>
        </div>
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Why teams switch</p>
            <h2>Less spreadsheet glue. More confidence in every monthly cycle.</h2>
          </div>
        </div>
        <div className="marketing-feature-grid">
          {FEATURE_COLUMNS.map((column) => (
            <article className="marketing-feature-card" key={column.title}>
              <strong>{column.title}</strong>
              <ul>
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {(variant === "pricing" || variant === "home") && (
        <section className="marketing-section">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Plans</p>
              <h2>Choose a plan that matches your payroll and people complexity.</h2>
            </div>
          </div>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <article className="pricing-card" key={plan.id}>
                <p className="pricing-card__eyebrow">{plan.name}</p>
                <h3>{plan.monthlyPriceLabel}</h3>
                <p className="section-description">{plan.description}</p>
                <div className="pricing-card__meta">
                  <span>{plan.billingModel === "per_employee" ? plan.perEmployeeLabel : "Flat billing option"}</span>
                  <span>{plan.trialDays} day trial</span>
                  <span>
                    {plan.employeeLimit ? `Up to ${plan.employeeLimit} employees` : "Unlimited employees"}
                  </span>
                </div>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link className="primary-button" href={`/signup?plan=${plan.id}`}>
                  Start {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {(variant === "contact-sales" || variant === "book-demo") && (
        <section className="marketing-section">
          <PublicLeadForm
            description={
              variant === "book-demo"
                ? "Tell us about your team and preferred timing. We’ll tailor the walkthrough to your payroll and HR flows."
                : "Share the basics and we’ll recommend the right plan, rollout shape, and support path."
            }
            leadType={variant === "book-demo" ? "book_demo" : "contact_sales"}
            title={variant === "book-demo" ? "Book your tailored demo" : "Talk to the Solva HR team"}
          />
        </section>
      )}

      {(variant === "features" || variant === "payroll" || variant === "hr-modules" || variant === "security" || variant === "about") && (
        <section className="marketing-section marketing-story-grid">
          <div className="marketing-story-copy">
            <p className="section-eyebrow">Built for modern employers</p>
            <h2>Employers get a private, branded HR and payroll system from day one.</h2>
            <p className="section-description">
              Trials create a tenant, set up default structures, provision the first admin, and keep users inside their own organization. The product looks and feels like their own workspace, not a demo environment.
            </p>
            <div className="compact-shortcut-list">
              <article className="compact-shortcut-item">
                <strong>Trials with structure</strong>
                <small>Plan selection, onboarding checklist, and guided launch mode.</small>
              </article>
              <article className="compact-shortcut-item">
                <strong>Usage visibility</strong>
                <small>Employee counts, admin counts, billing status, and upgrade prompts.</small>
              </article>
              <article className="compact-shortcut-item">
                <strong>Premium outputs</strong>
                <small>Payslips, payroll reports, and branded exports aligned to employer identity.</small>
              </article>
            </div>
          </div>
          <div className="marketing-story-visual">
            <img
              alt="Professional payroll and HR collaboration"
              className="marketing-story-visual__image"
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
            />
          </div>
        </section>
      )}

      {children}

      <footer className="marketing-footer">
        <div>
          <strong>Solva HR</strong>
          <small>Private HR and payroll workspaces for Kenyan employers.</small>
        </div>
        <div className="marketing-footer__links">
          <Link href="/tools">Tools</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/guided-setup">Guided Setup</Link>
          <Link href="/security">Security</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact-sales">Contact Sales</Link>
          <Link href="/login">Login</Link>
        </div>
      </footer>
    </main>
  );
}
