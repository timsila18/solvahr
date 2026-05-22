import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { SignupScreen } from "@/components/signup-screen";

export default function StartFreeTrialPage() {
  return (
    <AuthShell
      eyebrow="Free trial"
      title="Start your Solva HR trial"
      description="Choose a plan, create your organization, upload your logo, and land in a private tenant with payroll and HR onboarding ready."
    >
      <Suspense fallback={<div className="auth-card">Loading signup...</div>}>
        <SignupScreen />
      </Suspense>
    </AuthShell>
  );
}
