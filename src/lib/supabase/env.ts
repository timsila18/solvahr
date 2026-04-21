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

export function getAuthRedirectUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL ??
    `${getAppUrl()}/reset-password`
  );
}

export function getStorageBucketNames() {
  return {
    employeeDocuments:
      process.env.SUPABASE_EMPLOYEE_DOCUMENTS_BUCKET ?? "employee-documents",
    payrollDocuments:
      process.env.SUPABASE_PAYROLL_DOCUMENTS_BUCKET ?? "payroll-documents",
    attachments: process.env.SUPABASE_ATTACHMENTS_BUCKET ?? "attachments",
  };
}
