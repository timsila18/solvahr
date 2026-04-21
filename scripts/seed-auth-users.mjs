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

try {
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

  const demoPassword = process.env.SOLVA_DEMO_PASSWORD ?? "SolvaHR!2026";

  const employeeMap = {
    "HR Admin": "SOL-001",
    "Payroll Admin": "SOL-002",
    "Finance Officer": "SOL-003",
    "Manager": "SOL-004",
    "Recruiter": "SOL-005",
    "Employee": "SOL-006",
    "Auditor": "SOL-007",
    "Operator": "SOL-008",
    "Supervisor": "SOL-009",
  };

  const { data: employeeRows, error: employeeError } = await supabase
    .from("employees")
    .select("id, employee_number, branch_id, department_id")
    .in("employee_number", Object.values(employeeMap));

  if (employeeError) {
    console.error(employeeError);
    process.exit(1);
  }

  const byNumber = new Map((employeeRows ?? []).map((row) => [row.employee_number, row]));

  const demoUsers = [
  {
    email: "superadmin@solvahr.app",
    fullName: "Super Admin",
    role: "Super Admin",
  },
  {
    email: "hradmin@solvahr.app",
    fullName: "HR Admin",
    role: "HR Admin",
  },
  {
    email: "payrolladmin@solvahr.app",
    fullName: "Payroll Admin",
    role: "Payroll Admin",
  },
  {
    email: "finance@solvahr.app",
    fullName: "Finance Officer",
    role: "Finance Officer",
  },
  {
    email: "manager@solvahr.app",
    fullName: "Manager",
    role: "Manager",
  },
  {
    email: "recruiter@solvahr.app",
    fullName: "Recruiter",
    role: "Recruiter",
  },
  {
    email: "employee@solvahr.app",
    fullName: "Employee",
    role: "Employee",
  },
  {
    email: "auditor@solvahr.app",
    fullName: "Auditor",
    role: "Auditor",
  },
  {
    email: "operator@solvahr.app",
    fullName: "Operator",
    role: "Operator",
  },
  {
    email: "supervisor@solvahr.app",
    fullName: "Supervisor",
    role: "Supervisor",
  },
  ];

  for (const demoUser of demoUsers) {
    const employee = byNumber.get(employeeMap[demoUser.role] ?? "");

    const existingUsers = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (existingUsers.error) {
      console.error("Failed to list existing auth users", existingUsers.error);
      process.exit(1);
    }

    const existing = existingUsers.data.users.find((user) => user.email === demoUser.email);
    let userId = existing?.id;

    if (!existing) {
      const created = await supabase.auth.admin.createUser({
        email: demoUser.email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: demoUser.fullName,
        },
        app_metadata: {
          role: demoUser.role,
        },
      });

      if (created.error || !created.data.user) {
        console.error(`Failed to create ${demoUser.email}`, created.error);
        process.exit(1);
      }

      userId = created.data.user.id;
    } else {
      const updated = await supabase.auth.admin.updateUserById(existing.id, {
        password: demoPassword,
        user_metadata: {
          full_name: demoUser.fullName,
        },
        app_metadata: {
          role: demoUser.role,
        },
      });

      if (updated.error) {
        console.error(`Failed to update ${demoUser.email}`, updated.error);
        process.exit(1);
      }
    }

    const upsertResult = await supabase.from("users").upsert({
      id: userId,
      company_id: "11111111-1111-1111-1111-111111111111",
      full_name: demoUser.fullName,
      email: demoUser.email,
      role: demoUser.role,
      employee_id: employee?.id ?? null,
      branch_id: employee?.branch_id ?? null,
      department_id: employee?.department_id ?? null,
      status: "active",
    });

    if (upsertResult.error) {
      console.error(`Failed to upsert user profile for ${demoUser.email}`, upsertResult.error);
      process.exit(1);
    }
  }

  console.log(`Created or updated ${demoUsers.length} demo auth users.`);
  console.log(`Demo password: ${demoPassword}`);
} catch (error) {
  console.error("Unhandled auth seeding failure", error);
  process.exit(1);
}
