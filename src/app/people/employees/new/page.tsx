import { redirect } from "next/navigation";
import { WorkflowPageShell } from "@/components/workflow-page-shell";
import { EmployeeCreateForm } from "@/components/workflow-forms";
import { roleCanAccessPeople } from "@/lib/auth";
import { requireAuthenticatedProfile } from "@/lib/session";
import { workflowRoutes } from "@/lib/workflow-routes";

export default async function NewEmployeePage() {
  const profile = await requireAuthenticatedProfile();

  if (!roleCanAccessPeople(profile.role) || profile.role === "Employee") {
    redirect("/forbidden");
  }

  return (
    <WorkflowPageShell
      breadcrumbs={[
        { label: "People", href: workflowRoutes.peopleWorkspace },
        { label: "Employees", href: workflowRoutes.peopleWorkspace },
        { label: "Add Employee" },
      ]}
      description="Create a live employee record with real branch and department assignments from Supabase."
      eyebrow="People Workflow"
      title="Add Employee"
    >
      <EmployeeCreateForm />
    </WorkflowPageShell>
  );
}

