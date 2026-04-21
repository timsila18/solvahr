import { AuthShell } from "@/components/auth-shell";
import { SignupScreen } from "@/components/signup-screen";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Employee Self Service"
      title="Create your Solva HR account"
      description="Join the live ESS workspace to view payslips, submit leave, access documents, and track profile updates."
    >
      <SignupScreen />
    </AuthShell>
  );
}
