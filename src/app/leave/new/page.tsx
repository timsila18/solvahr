import { WorkflowPageShell } from "@/components/workflow-page-shell";
import { LeaveRequestCreateForm } from "@/components/workflow-forms";
import { requireAuthenticatedProfile } from "@/lib/session";
import { workflowRoutes } from "@/lib/workflow-routes";

export default async function NewLeaveRequestPage() {
  const profile = await requireAuthenticatedProfile();
  const leaveWorkspaceHref = profile.role === "Employee" ? workflowRoutes.essLeaveWorkspace : workflowRoutes.leaveWorkspace;

  return (
    <WorkflowPageShell
      breadcrumbs={[
        { label: profile.role === "Employee" ? "Employee Self Service" : "Leave & Attendance", href: leaveWorkspaceHref },
        { label: "Leave Requests", href: leaveWorkspaceHref },
        { label: "Apply Leave" },
      ]}
      description="Submit a live leave request with clean spacing, visible totals, and a predictable save flow."
      eyebrow="Leave Workflow"
      title="Apply Leave"
    >
      <LeaveRequestCreateForm employeeName={profile.full_name} returnHref={leaveWorkspaceHref} />
    </WorkflowPageShell>
  );
}
