import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { SignupScreen } from "@/components/signup-screen";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Employer Self-Onboarding"
      title="Launch your Solva HR organization"
      description="Register your company, upload branding, create the first admin, and enter a private tenant ready for payroll and HR setup."
    >
      <Suspense fallback={<div className="auth-card">Loading signup...</div>}>
        <SignupScreen />
      </Suspense>
    </AuthShell>
  );
}
