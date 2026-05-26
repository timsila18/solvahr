import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginScreen } from "@/components/login-screen";
import { getPublicTenantBranding } from "@/lib/administration";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const inboundMessage = typeof params.message === "string" ? params.message : "";
  const redirectTo = typeof params.redirectTo === "string" ? params.redirectTo : "/";
  const tenantSlug = typeof params.tenant === "string" ? params.tenant : "";
  const tenantBranding = tenantSlug ? await getPublicTenantBranding(tenantSlug) : null;

  return (
    <AuthShell
      eyebrow="Secure Access"
      title={tenantBranding ? `Sign in to ${tenantBranding.displayName}` : "Run HR and payroll from one live workspace"}
      description={
        tenantBranding
          ? `${tenantBranding.displayName} is powered by Solva HR. Sign in to manage payroll, approvals, employee records, and self service in one secure workspace.`
          : "Sign in to manage employee records, payroll, leave, attendance, approvals, and employee self service in one secure live workspace."
      }
      leftRailExtra={
        <section className="auth-cv-feature-card">
          <div>
            <p className="section-eyebrow">Career services</p>
            <h3>Create or Revamp Your CV</h3>
            <p className="section-description">
              Get a professional ATS-compliant CV designed for Kenyan and international job applications.
            </p>
          </div>
          <Link className="primary-button auth-cv-feature-card__button" href="/cv-service">
            Start CV Revamp
          </Link>
        </section>
      }
      tenantBranding={tenantBranding}
    >
      <div className="auth-panel-stack">
        <section className="auth-inline-cta">
          <div>
            <p className="section-eyebrow">New here?</p>
            <strong>Create your ESS account</strong>
            <p className="section-description">
              Employees can sign up to access payslips, leave requests, documents, and profile updates.
            </p>
          </div>
          <Link className="primary-button auth-cta-button" href="/signup">
            Sign up
          </Link>
        </section>
        <LoginScreen inboundMessage={inboundMessage} redirectTo={redirectTo} />
      </div>
    </AuthShell>
  );
}
