import { redirect } from "next/navigation";
import { WorkflowPageShell } from "@/components/workflow-page-shell";
import { PayrollPeriodCreateForm } from "@/components/workflow-forms";
import { roleCanAccessPayroll } from "@/lib/auth";
import { requireAuthenticatedProfile } from "@/lib/session";
import { workflowRoutes } from "@/lib/workflow-routes";

export default async function NewPayrollPeriodPage() {
  const profile = await requireAuthenticatedProfile();

  if (!roleCanAccessPayroll(profile.role)) {
    redirect("/forbidden");
  }

  return (
    <WorkflowPageShell
      breadcrumbs={[
        { label: "Payroll", href: workflowRoutes.payrollPeriodsWorkspace },
        { label: "Payroll Periods", href: workflowRoutes.payrollPeriodsWorkspace },
        { label: "Open Payroll Period" },
      ]}
      description="Open a new payroll cycle from a full workspace page, with enough room for validation and period setup."
      eyebrow="Payroll Workflow"
      title="Open Payroll Period"
    >
      <PayrollPeriodCreateForm />
    </WorkflowPageShell>
  );
}

