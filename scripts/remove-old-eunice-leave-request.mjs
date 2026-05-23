import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const OLD_REQUEST_ID = "03429a57-024a-468e-99a4-fecac90c549d";
const OLD_APPROVAL_TASK_ID = "edbea11e-c568-4bfe-95d4-4469ed1cd537";

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

  const { data: request, error: requestLookupError } = await admin
    .from("leave_requests")
    .select("id, employee_id, leave_type, start_date, end_date, status")
    .eq("company_id", COMPANY_ID)
    .eq("id", OLD_REQUEST_ID)
    .maybeSingle();

  if (requestLookupError) {
    throw requestLookupError;
  }

  if (!request) {
    console.log(JSON.stringify({ removed: false, reason: "already_missing", requestId: OLD_REQUEST_ID }, null, 2));
    return;
  }

  const { error: deleteRequestError } = await admin
    .from("leave_requests")
    .delete()
    .eq("company_id", COMPANY_ID)
    .eq("id", OLD_REQUEST_ID);

  if (deleteRequestError) {
    throw deleteRequestError;
  }

  const { error: deleteTaskError } = await admin
    .from("approval_tasks")
    .delete()
    .eq("id", OLD_APPROVAL_TASK_ID);

  if (deleteTaskError) {
    throw deleteTaskError;
  }

  const { error: deleteAuditError } = await admin
    .from("audit_logs")
    .delete()
    .eq("company_id", COMPANY_ID)
    .eq("entity_id", OLD_REQUEST_ID);

  if (deleteAuditError) {
    throw deleteAuditError;
  }

  console.log(
    JSON.stringify(
      {
        removed: true,
        requestId: OLD_REQUEST_ID,
        approvalTaskId: OLD_APPROVAL_TASK_ID,
        request,
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
