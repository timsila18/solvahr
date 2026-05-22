export const APP_ROLES = [
  "Super Admin",
  "HR Admin",
  "Payroll Admin",
  "Finance Officer",
  "Manager",
  "Recruiter",
  "Employee",
  "Auditor",
  "Operator",
  "Supervisor",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AuthUserProfile = {
  id: string;
  company_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  employee_id: string | null;
  branch_id: string | null;
  department_id: string | null;
  last_login: string | null;
  status: string;
};

const roleWeights: Record<AppRole, number> = {
  "Employee": 1,
  "Operator": 2,
  "Supervisor": 3,
  "Manager": 4,
  "Recruiter": 4,
  "Finance Officer": 5,
  "Payroll Admin": 6,
  "HR Admin": 7,
  "Auditor": 7,
  "Super Admin": 9,
};

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function canAccessRole(currentRole: AppRole, minimumRole: AppRole) {
  return roleWeights[currentRole] >= roleWeights[minimumRole];
}

export function normalizeRole(value: string | null | undefined): AppRole {
  if (value && isAppRole(value)) {
    return value;
  }

  return "Employee";
}

export function roleCanAccessPeople(role: AppRole) {
  return ["Super Admin", "HR Admin", "Payroll Admin", "Supervisor", "Manager", "Operator", "Auditor"].includes(role);
}

export function roleCanAccessPayroll(role: AppRole) {
  return ["Super Admin", "Payroll Admin", "Finance Officer", "Manager", "HR Admin", "Auditor"].includes(role);
}

export function roleCanAccessRecruitment(role: AppRole) {
  return ["Super Admin", "HR Admin", "Recruiter", "Manager", "Auditor"].includes(role);
}

export function roleCanApproveFinance(role: AppRole) {
  return ["Super Admin", "Finance Officer", "Payroll Admin"].includes(role);
}

const moduleAccess: Record<string, AppRole[]> = {
  dashboard: ["Super Admin", "HR Admin", "Payroll Admin", "Finance Officer", "Manager", "Recruiter", "Auditor", "Operator", "Supervisor", "Employee"],
  people: ["Super Admin", "HR Admin", "Payroll Admin", "Auditor", "Manager", "Supervisor"],
  payroll: ["Super Admin", "Payroll Admin", "Finance Officer", "Manager", "HR Admin", "Auditor"],
  leave: ["Super Admin", "HR Admin", "Supervisor", "Manager", "Auditor", "Operator"],
  recruitment: ["Super Admin", "HR Admin", "Recruiter", "Manager", "Auditor"],
  performance: ["Super Admin", "HR Admin", "Payroll Admin", "Manager", "Supervisor", "Auditor"],
  training: ["Super Admin", "HR Admin", "Manager", "Auditor"],
  assets: ["Super Admin", "HR Admin", "Auditor"],
  ess: APP_ROLES as unknown as AppRole[],
  reports: ["Super Admin", "HR Admin", "Payroll Admin", "Finance Officer", "Auditor", "Manager"],
  settings: ["Super Admin", "HR Admin"],
  audit: ["Super Admin", "HR Admin", "Auditor"],
  integrations: ["Super Admin", "HR Admin"],
  consultancy: ["Super Admin", "Finance Officer", "Auditor"],
  administration: ["Super Admin", "HR Admin"],
};

export function roleCanAccessModule(role: AppRole, moduleKey: string) {
  return (moduleAccess[moduleKey] ?? ["Super Admin"]).includes(role);
}

export function roleShouldUseEssWorkspace(role: AppRole) {
  return !["Manager", "HR Admin", "Payroll Admin"].includes(role);
}
