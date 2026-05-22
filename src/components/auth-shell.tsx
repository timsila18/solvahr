import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  leftRailExtra,
  tenantBranding,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  leftRailExtra?: ReactNode;
  tenantBranding?: {
    displayName: string;
    companyShortName?: string;
    welcomeMessage?: string;
    logoUrl?: string | null;
    logoMark?: string;
    accentColor?: string;
    secondaryColor?: string;
    poweredByLabel?: string;
  } | null;
}) {
  const accentColor = tenantBranding?.accentColor || "#1243d0";
  const secondaryColor = tenantBranding?.secondaryColor || "#0f172a";
  const brandName = tenantBranding?.displayName || "Solva HR";
  const brandTagline =
    tenantBranding?.welcomeMessage || "Smart people operations for payroll-heavy organizations.";
  const poweredByLabel = tenantBranding?.poweredByLabel || "Powered by Solva HR";

  return (
    <main className="auth-screen">
      <section className="auth-hero">
        <div className="auth-brand-block" style={{ borderColor: `${accentColor}22` }}>
          {tenantBranding?.logoUrl ? (
            <div className="solva-logo workspace-logo-image-shell" aria-hidden="true">
              <img alt={`${brandName} logo`} className="workspace-logo-image" src={tenantBranding.logoUrl} />
            </div>
          ) : (
            <div className="solva-logo" aria-hidden="true" style={{ color: accentColor }}>
              <span className="solva-logo-mark">{tenantBranding?.logoMark || "S"}</span>
              <span className="solva-logo-ring" />
            </div>
          )}
          <div>
            <p className="auth-brand-name">{brandName}</p>
            <p className="auth-brand-tagline">{brandTagline}</p>
            {tenantBranding ? (
              <small className="section-description" style={{ color: secondaryColor }}>
                {poweredByLabel}
              </small>
            ) : null}
          </div>
        </div>

        <div className="auth-story">
          <p className="section-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="section-description">{description}</p>
        </div>

        {leftRailExtra ? <div className="auth-hero-feature-slot">{leftRailExtra}</div> : null}

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
