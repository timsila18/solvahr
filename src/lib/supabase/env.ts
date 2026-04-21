function readEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseUrl() {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey() {
  return readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey() {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getAuthCallbackUrl(next = "/reset-password") {
  const url = new URL("/auth/callback", getAppUrl());
  url.searchParams.set("next", next);
  return url.toString();
}

export function getAuthRedirectUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL ?? getAuthCallbackUrl();
}

export function getStorageBucketNames() {
  return {
    employeeDocuments:
      process.env.SUPABASE_EMPLOYEE_DOCUMENTS_BUCKET ?? "employee-documents",
    payrollDocuments:
      process.env.SUPABASE_PAYROLL_DOCUMENTS_BUCKET ?? "payroll-documents",
    payslips: process.env.SUPABASE_PAYSLIPS_BUCKET ?? "payslips",
    companyAssets: process.env.SUPABASE_COMPANY_ASSETS_BUCKET ?? "company-assets",
    attachments: process.env.SUPABASE_ATTACHMENTS_BUCKET ?? "attachments",
  };
}
