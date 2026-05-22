import { redirect } from "next/navigation";
import { WorkflowPageShell } from "@/components/workflow-page-shell";
import { EmployeeEditForm } from "@/components/workflow-forms";
import { roleCanAccessPeople } from "@/lib/auth";
import { requireAuthenticatedProfile } from "@/lib/session";
import { workflowRoutes } from "@/lib/workflow-routes";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const profile = await requireAuthenticatedProfile();

  if (!roleCanAccessPeople(profile.role) || profile.role === "Employee") {
    redirect("/forbidden");
  }

  const { employeeId } = await params;
  const canDirectSalaryReview = ["Manager", "HR Admin", "Payroll Admin", "Super Admin"].includes(profile.role);

  return (
    <WorkflowPageShell
      breadcrumbs={[
        { label: "People", href: workflowRoutes.peopleWorkspace },
        { label: "Employees", href: workflowRoutes.peopleWorkspace },
        { label: "Edit Employee" },
      ]}
      description="Use the full-page editor for employee updates instead of editing inside a crowded side panel."
      eyebrow="People Workflow"
      title="Edit Employee"
    >
      <EmployeeEditForm
        employeeId={employeeId}
        canDirectSalaryReview={canDirectSalaryReview}
        viewerRole={profile.role}
      />
    </WorkflowPageShell>
  );
}
