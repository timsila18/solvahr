import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const TARGET_TITLES = new Set([
  "Approve Refresh service excellence coaching and operational coordination support.",
  "Approve Advanced upselling and guest experience coaching",
]);
const TARGET_DESCRIPTION_PREFIXES = [
  "Faith Nakhumicha | 2026-06-05 | Budget KES 0",
  "Faith Chepkorir | 2026-06-05 | Budget KES 0",
  "Faith Chepkorir | 2026-05-23 | Budget KES 0",
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

function safeString(value, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value == null) return fallback;
  return String(value).trim() || fallback;
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

  const { data: tasks, error: tasksError } = await admin
    .from("approval_tasks")
    .select("id, entity_id, title, description, status, owner_role, created_at")
    .eq("company_id", COMPANY_ID)
    .eq("module_key", "training")
    .eq("entity_type", "training_request")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (tasksError) throw tasksError;

  const taskRows = (tasks ?? []).filter((row) => {
    const title = safeString(row.title);
    const description = safeString(row.description);
    return TARGET_TITLES.has(title) && TARGET_DESCRIPTION_PREFIXES.includes(description);
  });

  const taskIds = taskRows.map((row) => safeString(row.id)).filter(Boolean);
  const trainingRequestIds = taskRows.map((row) => safeString(row.entity_id)).filter(Boolean);

  if (trainingRequestIds.length) {
    const { error } = await admin.from("training_requests").delete().in("id", trainingRequestIds);
    if (error) throw error;
  }

  if (taskIds.length) {
    const { error } = await admin.from("approval_tasks").delete().in("id", taskIds);
    if (error) throw error;
  }

  console.log(
    JSON.stringify(
      {
        deletedApprovalTaskCount: taskIds.length,
        deletedTrainingRequestCount: trainingRequestIds.length,
        deletedTitles: taskRows.map((row) => safeString(row.title)),
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
