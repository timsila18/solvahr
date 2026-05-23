import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

async function loadLocalEnv() {
  try {
    const envFile = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore
  }
}

await loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const bucket = process.env.SUPABASE_PAYROLL_DOCUMENTS_BUCKET ?? "payroll-documents";
const demoPassword = process.env.SOLVA_DEMO_PASSWORD ?? "SolvaHR!2026";

const organizations = [
  {
    companyId: "11111111-1111-1111-1111-111111111111",
    displayName: "Northwind Logistics Ltd",
    employerIdentifier: "NWL",
    logoFile: resolve(process.cwd(), "public/tenant-logos/northwind.jpg"),
    accentColor: "#1d4ed8",
  },
  {
    companyId: "22222222-2222-2222-2222-222222222222",
    displayName: "Bluewave Consulting Ltd",
    employerIdentifier: "BWC",
    logoFile: resolve(process.cwd(), "public/tenant-logos/bluewave.jpg"),
    accentColor: "#0f766e",
  },
];

for (const organization of organizations) {
  const fileBuffer = await readFile(organization.logoFile);
  const path = `companies/${organization.companyId}/branding/logo-verification.jpg`;

  const upload = await supabase.storage.from(bucket).upload(path, fileBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });

  if (upload.error) {
    console.error("Failed to upload logo", organization.displayName, upload.error);
    process.exit(1);
  }

  const currentSettings = await supabase
    .from("company_settings")
    .select("branding")
    .eq("company_id", organization.companyId)
    .single();

  if (currentSettings.error) {
    console.error("Failed to read company settings", organization.displayName, currentSettings.error);
    process.exit(1);
  }

  const existingBranding =
    currentSettings.data && typeof currentSettings.data.branding === "object" && currentSettings.data.branding
      ? currentSettings.data.branding
      : {};

  const update = await supabase
    .from("company_settings")
    .update({
      branding: {
        ...existingBranding,
        displayName: organization.displayName,
        employerIdentifier: organization.employerIdentifier,
        logoPath: path,
        logoUrl: "",
        logoMark: organization.displayName
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0] ?? "")
          .join("")
          .toUpperCase(),
        reportFooter: "Powered by Solva HR",
        accentColor: organization.accentColor,
      },
    })
    .eq("company_id", organization.companyId);

  if (update.error) {
    console.error("Failed to update branding", organization.displayName, update.error);
    process.exit(1);
  }
}

const { data: employeeRows, error: employeeError } = await supabase
  .from("employees")
  .select("id, employee_number, company_id, branch_id, department_id")
  .in("employee_number", ["BLW-001", "BLW-003"]);

if (employeeError) {
  console.error("Failed to load verification employees", employeeError);
  process.exit(1);
}

const byNumber = new Map((employeeRows ?? []).map((row) => [row.employee_number, row]));

const orgBUsers = [
  {
    email: "bluewavepayroll@solvahr.app",
    fullName: "Bluewave Payroll Admin",
    role: "Payroll Admin",
    employeeNumber: "BLW-001",
  },
  {
    email: "bluewavehr@solvahr.app",
    fullName: "Bluewave HR Admin",
    role: "HR Admin",
    employeeNumber: "BLW-003",
  },
];

for (const userSeed of orgBUsers) {
  const employee = byNumber.get(userSeed.employeeNumber);
  if (!employee) {
    console.error("Missing seeded employee for org B user", userSeed.employeeNumber);
    process.exit(1);
  }

  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) {
    console.error("Failed to list auth users", listed.error);
    process.exit(1);
  }

  const existing = listed.data.users.find((user) => user.email === userSeed.email);
  let userId = existing?.id;

  if (!existing) {
    const created = await supabase.auth.admin.createUser({
      email: userSeed.email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        full_name: userSeed.fullName,
      },
      app_metadata: {
        role: userSeed.role,
      },
    });

    if (created.error || !created.data.user) {
      console.error("Failed to create auth user", userSeed.email, created.error);
      process.exit(1);
    }

    userId = created.data.user.id;
  } else {
    const updated = await supabase.auth.admin.updateUserById(existing.id, {
      password: demoPassword,
      user_metadata: {
        full_name: userSeed.fullName,
      },
      app_metadata: {
        role: userSeed.role,
      },
    });

    if (updated.error) {
      console.error("Failed to update auth user", userSeed.email, updated.error);
      process.exit(1);
    }
  }

  const upsert = await supabase.from("users").upsert({
    id: userId,
    company_id: "22222222-2222-2222-2222-222222222222",
    full_name: userSeed.fullName,
    email: userSeed.email,
    role: userSeed.role,
    employee_id: employee.id,
    branch_id: employee.branch_id,
    department_id: employee.department_id,
    status: "active",
  });

  if (upsert.error) {
    console.error("Failed to upsert org B profile", userSeed.email, upsert.error);
    process.exit(1);
  }
}

console.log("Multi-tenant verification data prepared.");
console.log(`Org B logins: ${orgBUsers.map((user) => user.email).join(", ")}`);
console.log(`Password: ${demoPassword}`);
