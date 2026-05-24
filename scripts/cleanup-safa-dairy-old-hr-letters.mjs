import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "46604299-3e3b-43b5-8722-d088082ed3bd";
const SINGLETON_TYPES = new Set(["contract", "appointment_letter"]);

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
    // ignore missing env
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

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function createAdminClient() {
  await loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("missing_admin_environment");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getKeepAndDelete(rows) {
  const buckets = new Map();
  for (const row of rows) {
    const employeeId = safeString(row.employee_id);
    const documentType = safeString(row.document_type);
    if (!employeeId || !SINGLETON_TYPES.has(documentType)) continue;
    const key = `${employeeId}:${documentType}`;
    const current = buckets.get(key) ?? [];
    current.push(row);
    buckets.set(key, current);
  }

  const keep = [];
  const remove = [];
  for (const grouped of buckets.values()) {
    grouped.sort((left, right) => {
      const versionDelta = safeNumber(right.version_number) - safeNumber(left.version_number);
      if (versionDelta !== 0) return versionDelta;
      return safeString(right.uploaded_at).localeCompare(safeString(left.uploaded_at));
    });
    keep.push(grouped[0]);
    remove.push(...grouped.slice(1));
  }

  return { keep, remove };
}

async function main() {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("employee_documents")
    .select("id, employee_id, document_type, file_name, storage_bucket, storage_path, uploaded_at, version_number")
    .eq("company_id", COMPANY_ID)
    .in("document_type", [...SINGLETON_TYPES]);

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const { keep, remove } = getKeepAndDelete(rows);

  if (!remove.length) {
    console.log(JSON.stringify({ kept: keep.length, removed: 0 }, null, 2));
    return;
  }

  const storageGroups = new Map();
  for (const row of remove) {
    const bucket = safeString(row.storage_bucket);
    const path = safeString(row.storage_path);
    if (!bucket || !path) continue;
    const existing = storageGroups.get(bucket) ?? [];
    existing.push(path);
    storageGroups.set(bucket, existing);
  }

  for (const [bucket, paths] of storageGroups.entries()) {
    const { error: storageError } = await admin.storage.from(bucket).remove(paths);
    if (storageError) {
      throw storageError;
    }
  }

  const ids = remove.map((row) => safeString(row.id)).filter(Boolean);
  const { error: deleteError } = await admin.from("employee_documents").delete().in("id", ids);
  if (deleteError) {
    throw deleteError;
  }

  console.log(
    JSON.stringify(
      {
        kept: keep.length,
        removed: remove.length,
        removedFiles: remove.map((row) => ({
          id: safeString(row.id),
          employeeId: safeString(row.employee_id),
          documentType: safeString(row.document_type),
          fileName: safeString(row.file_name),
          versionNumber: safeNumber(row.version_number),
        })),
      },
      null,
      2
    )
  );
}

await main();
