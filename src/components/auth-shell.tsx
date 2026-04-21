import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-screen">
      <section className="auth-hero">
        <div className="auth-brand-block">
          <div className="solva-logo" aria-hidden="true">
            <span className="solva-logo-mark">S</span>
            <span className="solva-logo-ring" />
          </div>
          <div>
            <p className="auth-brand-name">Solva HR</p>
            <p className="auth-brand-tagline">Smart people operations for payroll-heavy organizations.</p>
          </div>
        </div>

        <div className="auth-story">
          <p className="section-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="section-description">{description}</p>
        </div>

        <div className="auth-stat-grid">
          <article className="auth-stat-card">
            <strong>Payroll</strong>
            <span>Kenya-ready runs, payslips, statutory exports, and approvals.</span>
          </article>
          <article className="auth-stat-card">
            <strong>People</strong>
            <span>Employee records, documents, leave, and attendance on one live backend.</span>
          </article>
          <article className="auth-stat-card">
            <strong>Self Service</strong>
            <span>Employees can view payslips, requests, documents, and profile activity.</span>
          </article>
        </div>
      </section>

      <section className="auth-panel">
        {children}
      </section>
    </main>
  );
}
