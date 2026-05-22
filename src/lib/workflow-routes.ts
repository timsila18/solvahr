export function buildWorkspaceHref(moduleKey: string, item: string) {
  const params = new URLSearchParams({
    module: moduleKey,
    item,
  });

  return `/?${params.toString()}`;
}

export const workflowRoutes = {
  employeeCreate: "/people/employees/new",
  employeeEdit: (employeeId: string) => `/people/employees/${employeeId}/edit`,
  employeeSalaryReview: (employeeId: string) => `/people/employees/${employeeId}/edit#salary-review`,
  employeeEditWithDocument: (employeeId: string, kind: string) =>
    `/people/employees/${employeeId}/edit?doc=${encodeURIComponent(kind)}`,
  payrollPeriodCreate: "/payroll/periods/new",
  leaveCreate: "/leave/new",
  appraisalCreate: "/performance/appraisals/new",
  peopleWorkspace: buildWorkspaceHref("people", "Staff Register"),
  payrollPeriodsWorkspace: buildWorkspaceHref("payroll", "Payroll Periods"),
  leaveWorkspace: buildWorkspaceHref("leave", "Leave Requests"),
  essLeaveWorkspace: buildWorkspaceHref("ess", "My Leave"),
  performanceWorkspace: buildWorkspaceHref("performance", "Performance Reviews"),
};
