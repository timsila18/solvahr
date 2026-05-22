import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Solva HR",
  description: "Privacy Policy for Solva HR.",
};

const sections = [
  {
    title: "Information we process",
    body:
      "Solva HR processes organization, employee, payroll, leave, approval, and reporting data that customers choose to store in the platform. For public services such as the CV revamp flow, we may also process contact details, uploaded documents, and service-order metadata needed to fulfill the request.",
  },
  {
    title: "How we use information",
    body:
      "We use information to provide payroll and HR workflows, support authorized users, generate reports and exports, improve reliability, fulfill support requests, and secure the platform. We do not sell customer data.",
  },
  {
    title: "Tenant isolation and access control",
    body:
      "Customer workspaces are designed to operate as separate tenant environments. Access to data is controlled through user roles, authentication, and organization-scoped permissions.",
  },
  {
    title: "Retention",
    body:
      "Operational HR and payroll records are retained according to the customer’s usage of the platform and applicable legal or compliance obligations. Temporary files used for public CV processing are intended to expire after twenty-four hours, while lightweight order metadata may be retained for support, reporting, and audit purposes.",
  },
  {
    title: "Security",
    body:
      "Solva HR uses role-based access controls, audit visibility, secure hosted infrastructure, and operational safeguards intended to protect customer data. No system can guarantee absolute security, but we work to reduce unnecessary exposure and limit access appropriately.",
  },
  {
    title: "Third-party services",
    body:
      "Solva HR may rely on third-party infrastructure and service providers for hosting, authentication, communications, payments, analytics, document generation, and AI-assisted workflows. Those providers process data only as needed to support the service.",
  },
  {
    title: "Your choices and support",
    body:
      "If you have questions about privacy, access, corrections, or support, contact Solva Business Group at solvabusinessgroup@gmail.com.",
  },
];

export default function PrivacyPolicyPage() {
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
          <h1>Privacy Policy</h1>
          <p className="section-description">
            This Privacy Policy explains, in general terms, how Solva HR handles information across its HR, payroll, ESS, reporting, and public service workflows.
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
          <small>Privacy and data handling information.</small>
        </div>
        <div className="marketing-footer__links">
          <Link href="/terms">Terms</Link>
          <Link href="/security">Security</Link>
          <Link href="/contact-sales">Contact Sales</Link>
        </div>
      </footer>
    </main>
  );
}
