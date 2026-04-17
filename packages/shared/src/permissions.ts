export const permissions = [
  "tenants.manage",
  "companies.view",
  "companies.manage",
  "organization.manage",
  "employees.view",
  "employees.create",
  "employees.approve",
  "employees.edit_bio",
  "employees.edit_bank",
  "employees.edit_statutory",
  "employees.archive",
  "documents.view",
  "documents.upload",
  "documents.restrict",
  "documents.generate",
  "leave.configure",
  "leave.apply",
  "leave.approve",
  "leave.adjust",
  "payroll.configure",
  "payroll.upload_inputs",
  "payroll.process",
  "payroll.review",
  "payroll.approve",
  "payroll.lock",
  "payroll.release_payslips",
  "payroll.view_sensitive",
  "payroll.export_bank",
  "payroll.export_statutory",
  "reports.build",
  "reports.export",
  "recruitment.manage",
  "recruitment.approve_requisitions",
  "recruitment.approve_offers",
  "onboarding.manage",
  "probation.manage",
  "performance.manage",
  "welfare.manage",
  "discipline.manage",
  "audit.view",
  "settings.manage"
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissionMatrix: Record<string, Permission[]> = {
  super_admin: [...permissions],
  company_admin: permissions.filter((permission) => permission !== "tenants.manage"),
  hr_admin: [
    "companies.view",
    "organization.manage",
    "employees.view",
    "employees.create",
    "employees.edit_bio",
    "employees.archive",
    "documents.view",
    "documents.upload",
    "documents.generate",
    "leave.configure",
    "leave.approve",
    "reports.build",
    "reports.export",
    "recruitment.manage",
    "recruitment.approve_requisitions",
    "recruitment.approve_offers",
    "onboarding.manage",
    "probation.manage",
    "performance.manage",
    "welfare.manage",
    "discipline.manage",
    "audit.view"
  ],
  payroll_admin: [
    "companies.view",
    "employees.view",
    "employees.edit_bank",
    "employees.edit_statutory",
    "payroll.configure",
    "payroll.upload_inputs",
    "payroll.process",
    "payroll.review",
    "payroll.approve",
    "payroll.lock",
    "payroll.release_payslips",
    "payroll.view_sensitive",
    "payroll.export_bank",
    "payroll.export_statutory",
    "recruitment.approve_offers",
    "reports.build",
    "reports.export",
    "audit.view"
  ],
  operator: [
    "companies.view",
    "employees.view",
    "employees.create",
    "documents.upload",
    "leave.apply"
  ],
  supervisor: [
    "companies.view",
    "employees.view",
    "employees.approve",
    "employees.edit_bio",
    "documents.view",
    "documents.generate",
    "leave.approve",
    "probation.manage",
    "performance.manage",
    "reports.export",
    "audit.view"
  ],
  finance_user: [
    "companies.view",
    "employees.view",
    "payroll.review",
    "payroll.export_bank",
    "recruitment.approve_requisitions",
    "reports.export"
  ],
  manager: [
    "employees.view",
    "leave.approve",
    "recruitment.approve_requisitions",
    "probation.manage",
    "performance.manage",
    "reports.export"
  ],
  employee: [
    "leave.apply"
  ],
  recruiter: [
    "employees.view",
    "documents.generate",
    "recruitment.manage",
    "onboarding.manage",
    "reports.export"
  ],
  auditor: [
    "companies.view",
    "employees.view",
    "documents.view",
    "payroll.review",
    "reports.export",
    "audit.view"
  ]
};

export function roleHasPermission(role: string, permission: Permission): boolean {
  return rolePermissionMatrix[role]?.includes(permission) ?? false;
}
