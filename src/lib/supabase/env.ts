function readEnv(name: string) {
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : name === "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        : name === "SUPABASE_SERVICE_ROLE_KEY"
          ? process.env.SUPABASE_SERVICE_ROLE_KEY
          : process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export type AppEnvironment = "development" | "staging" | "production";

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

export function getAppEnvironment(): AppEnvironment {
  const raw =
    process.env.NEXT_PUBLIC_APP_ENV ??
    process.env.APP_ENV ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    "development";
  const normalized = raw.toLowerCase();

  if (normalized === "production") {
    return "production";
  }

  if (normalized === "preview" || normalized === "staging") {
    return "staging";
  }

  return "development";
}

export function isProductionEnvironment() {
  return getAppEnvironment() === "production";
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
