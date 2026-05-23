import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const TARGETS = [
  { label: "Edwin kisaka", aliases: ["Edwin kisaka", "Edwin Kisaka"] },
  { label: "Lavender kanguha", aliases: ["Lavender kanguha", "Lavender Kanguha"] },
  { label: "Judy bundi", aliases: ["Judy bundi", "Judy Bundi"] },
  { label: "Janis maina", aliases: ["Janis maina", "Janis Maina"] },
  { label: "Jane kinyua", aliases: ["Jane kinyua", "Jane Kinyua"] },
  { label: "Austin Nga'nga Gathoni", aliases: ["Austin Nga'nga Gathoni", "Austin Gathoni"] },
  { label: "Wilkister shivoko", aliases: ["Wilkister shivoko", "Willkister Shivoko", "Wilkister Shivoko"] },
  { label: "Ali Mapesa", aliases: ["Ali Mapesa"] },
  { label: "Brian Steve munyi", aliases: ["Brian Steve munyi", "Brian Steve", "Brian Munyi"] },
  { label: "Bonaventure Amboko", aliases: ["Bonaventure Amboko", "Bonventure Amboko"] },
  { label: "Nickson odinga", aliases: ["Nickson odinga", "Nick Odinga"] },
  { label: "Linus mulimo", aliases: ["Linus mulimo", "Linus Muhemo"] },
  { label: "Christine Syombua Mwongela", aliases: ["Christine Syombua Mwongela"] },
];

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

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildMatcher(aliases) {
  const normalizedAliases = aliases.map((value) => normalize(value)).filter(Boolean);
  return (employee) => {
    const fullName = normalize(employee.fullName ?? `${employee.first_name ?? ""} ${employee.last_name ?? ""}`);
    return normalizedAliases.some((alias) => fullName === alias);
  };
}

async function main() {
  await loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("supabase_admin_env_missing");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, name, slug")
    .ilike("name", "%Robot Cafe%")
    .limit(1)
    .maybeSingle();

  if (companyError || !company) {
    throw companyError ?? new Error("robot_cafe_company_not_found");
  }

  const { data: employees, error } = await admin
    .from("employees")
    .select("id, employee_number, first_name, last_name, status")
    .eq("company_id", company.id)
    .order("first_name", { ascending: true });

  if (error) throw error;

  const rows = (employees ?? []).map((employee) => ({
    id: employee.id,
    employeeNumber: employee.employee_number,
    fullName: `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim(),
    status: employee.status,
  }));

  const results = TARGETS.map((target) => {
    const matches = rows.filter(buildMatcher(target.aliases));
    return {
      target: target.label,
      aliases: target.aliases,
      matches,
    };
  });

  console.log(
    JSON.stringify(
      {
        company,
        employeeCount: rows.length,
        sampleEmployees: rows.slice(0, 25),
        results,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
