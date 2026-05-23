import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";

async function loadLocalEnv() {
  try {
    const envFile = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }
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

async function loadSupabaseAdmin() {
  await loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("supabase_admin_env_missing");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const admin = await loadSupabaseAdmin();

  const existingBranches = await admin
    .from("branches")
    .select("id, code, name")
    .eq("company_id", COMPANY_ID)
    .order("created_at", { ascending: true });

  if (existingBranches.error) {
    throw existingBranches.error;
  }

  const lanaCandidate =
    (existingBranches.data ?? []).find((row) => row.code === "RCB-LANA") ??
    (existingBranches.data ?? []).find((row) => row.code === "RCB-NBO") ??
    (existingBranches.data ?? [])[0];

  if (!lanaCandidate) {
    throw new Error("robot_cafe_branch_not_found");
  }

  const { data: lanaBranch, error: lanaError } = await admin
    .from("branches")
    .update({
      code: "RCB-LANA",
      name: "Robot Cafe & Bistro Lana Plaza",
      location: "Lana Plaza, Nairobi, Kenya",
      status: "active",
    })
    .eq("id", lanaCandidate.id)
    .select("id, code, name")
    .single();

  if (lanaError || !lanaBranch) {
    throw lanaError ?? new Error("failed_to_update_lana_branch");
  }

  const { data: imaaraBranch, error: imaaraError } = await admin
    .from("branches")
    .upsert(
      {
        company_id: COMPANY_ID,
        code: "RCB-IMAARA",
        name: "Robot Cafe & Bistro Imaara Mall",
        location: "Imaara Mall, Nairobi, Kenya",
        status: "active",
      },
      { onConflict: "company_id,code" }
    )
    .select("id, code, name")
    .single();

  if (imaaraError || !imaaraBranch) {
    throw imaaraError ?? new Error("failed_to_upsert_imaara_branch");
  }

  console.log(
    JSON.stringify(
      {
        lanaBranch,
        imaaraBranch,
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
