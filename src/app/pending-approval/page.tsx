import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/session";

export default async function PendingApprovalPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.status !== "pending_approval") {
    redirect("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card-header">
          <p className="section-eyebrow">Registration under review</p>
          <h2>Your organization is waiting for approval</h2>
          <p className="section-description">
            We have created the account for <strong>{profile.email}</strong>, but the workspace will stay locked until a Super Admin reviews and activates the organization.
          </p>
        </div>
        <section className="form-section-card">
          <div className="mini-list queue-list">
            <article>
              <strong>What happens next</strong>
              <span>Review, approval, then workspace activation</span>
              <small>Once approved, you can finish onboarding, add employees, configure payroll, and invite users.</small>
            </article>
            <article>
              <strong>Current status</strong>
              <span>Pending Approval</span>
              <small>We will notify you inside the platform as soon as the tenant is activated.</small>
            </article>
          </div>
          <div className="inline-actions">
            <Link className="ghost-button" href="/login">
              Back to login
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
