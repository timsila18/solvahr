import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { LoginScreen } from "@/components/login-screen";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Secure Access"
      title="Run HR and payroll from one live workspace"
      description="Sign in to manage employee records, payroll, leave, attendance, approvals, and employee self service on the real Supabase backend."
    >
      <Suspense
        fallback={
          <section className="auth-card">
            <p className="section-description">Loading sign-in...</p>
          </section>
        }
      >
        <LoginScreen />
      </Suspense>
    </AuthShell>
  );
}
