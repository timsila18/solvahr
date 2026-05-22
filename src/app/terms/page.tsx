import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Solva HR",
  description: "Terms of Service for Solva HR.",
};

const sections = [
  {
    title: "Service scope",
    body:
      "Solva HR provides payroll, HR, ESS, approvals, reporting, and related business workflows through a hosted software service. Access to some features may depend on the subscribed plan, implementation scope, or administrative configuration.",
  },
  {
    title: "Customer responsibilities",
    body:
      "Customers are responsible for the accuracy, legality, and appropriateness of the data they upload or manage in Solva HR, including payroll, statutory, employee, and organizational data. Customers are also responsible for controlling who is authorized to access their workspace.",
  },
  {
    title: "Acceptable use",
    body:
      "You may not use Solva HR to violate applicable laws, interfere with the platform, gain unauthorized access, misuse third-party integrations, or upload content you do not have the right to process.",
  },
  {
    title: "Availability and changes",
    body:
      "We work to keep Solva HR available and reliable, but service interruptions, maintenance, and feature changes may occur. We may improve, update, or retire features as the platform evolves.",
  },
  {
    title: "Data and confidentiality",
    body:
      "Customer data remains under the customer’s control, subject to the operation of the service, applicable law, and these terms. Solva HR is intended to respect tenant separation and role-based access boundaries.",
  },
  {
    title: "Payments and commercial services",
    body:
      "Paid subscriptions, implementations, advisory services, or CV-related services may be subject to separate commercial terms, pricing, or invoices. Failure to meet payment obligations may affect access to some services.",
  },
  {
    title: "Disclaimers and liability",
    body:
      "Solva HR is provided on a commercial best-effort basis. While we work toward accuracy and reliability, customers remain responsible for reviewing payroll, compliance, and HR decisions before relying on them operationally.",
  },
  {
    title: "Contact",
    body:
      "For support or legal questions related to these terms, contact Solva Business Group at solvabusinessgroup@gmail.com.",
  },
];

export default function TermsPage() {
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
        <div className="marketing-topbar__actions">
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
          <p className="section-eyebrow">Legal</p>
          <h1>Terms of Service</h1>
          <p className="section-description">
            These Terms describe the general rules for using Solva HR and related public service workflows.
          </p>
        </div>
      </section>

      <section className="marketing-section">
        <div className="marketing-feature-grid">
          {sections.map((section) => (
            <article className="marketing-feature-card" key={section.title}>
              <strong>{section.title}</strong>
              <p className="section-description">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="marketing-footer">
        <div>
          <strong>Solva HR</strong>
          <small>Terms governing use of the platform.</small>
        </div>
        <div className="marketing-footer__links">
          <Link href="/privacy">Privacy</Link>
          <Link href="/security">Security</Link>
          <Link href="/contact-sales">Contact Sales</Link>
        </div>
      </footer>
    </main>
  );
}
