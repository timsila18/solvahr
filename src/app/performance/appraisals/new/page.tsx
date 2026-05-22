import { redirect } from "next/navigation";
import { WorkflowPageShell } from "@/components/workflow-page-shell";
import { AppraisalCreateForm } from "@/components/workflow-forms";
import { roleCanAccessModule } from "@/lib/auth";
import { requireAuthenticatedProfile } from "@/lib/session";
import { workflowRoutes } from "@/lib/workflow-routes";

export default async function NewAppraisalPage() {
  const profile = await requireAuthenticatedProfile();

  if (!roleCanAccessModule(profile.role, "performance")) {
    redirect("/forbidden");
  }

  return (
    <WorkflowPageShell
      breadcrumbs={[
        { label: "Performance", href: workflowRoutes.performanceWorkspace },
        { label: "Performance Reviews", href: workflowRoutes.performanceWorkspace },
        { label: "Launch Appraisal" },
      ]}
      description="Launch a live appraisal from a dedicated page instead of squeezing the form into the workspace list."
      eyebrow="Performance Workflow"
      title="Launch Appraisal"
    >
      <AppraisalCreateForm isEmployeeRole={profile.role === "Employee"} />
    </WorkflowPageShell>
  );
}
