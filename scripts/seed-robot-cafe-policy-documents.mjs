import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const FILES = [
  {
    path: "C:/Robots Docs/Robot Cafe & Bistro Discipline Policy.pdf",
    title: "Robot Cafe & Bistro Discipline Policy",
    category: "Policy",
    description: "Official discipline policy for Robot Cafe & Bistro.",
  },
  {
    path: "C:/Robots Docs/Robot Cafe Code of Conduct.pdf",
    title: "Robot Cafe Code of Conduct",
    category: "Policy",
    description: "Code of conduct and expected workplace standards.",
  },
  {
    path: "C:/Robots Docs/Robots Cafe & Bistro Career Guidelines.pdf",
    title: "Robot Cafe & Bistro Career Guidelines",
    category: "Guidelines",
    description: "Career development and progression guidelines.",
  },
  {
    path: "C:/Robots Docs/Robots Cafe & BistRO HR Policy and Procedure Manual .docx",
    title: "Robot Cafe & Bistro HR Policy and Procedure Manual",
    category: "Manual",
    description: "Main HR policy and procedure manual.",
  },
  {
    path: "C:/Robots Docs/Clearance Form & Exit Interview Robot Cafe.docx",
    title: "Clearance Form & Exit Interview Robot Cafe",
    category: "Forms",
    description: "Clearance and exit interview form.",
  },
];

async function loadLocalEnv() {
  try {
    const envFile = await readFile(".env.local", "utf8");
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

function getMimeType(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".doc") return "application/msword";
  return "application/octet-stream";
}

async function main() {
  await loadLocalEnv();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const bucket = process.env.SUPABASE_COMPANY_ASSETS_BUCKET ?? "company-assets";

  for (const file of FILES) {
    const bytes = await readFile(file.path);
    const fileName = basename(file.path);
    const storagePath = `companies/${COMPANY_ID}/company-documents/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]+/g, "-")}`;

    const existing = await supabase
      .from("company_documents")
      .select("id, storage_bucket, storage_path")
      .eq("company_id", COMPANY_ID)
      .eq("title", file.title)
      .maybeSingle();

    if (existing.error) {
      throw existing.error;
    }

    if (existing.data?.storage_bucket && existing.data?.storage_path) {
      await supabase.storage.from(String(existing.data.storage_bucket)).remove([String(existing.data.storage_path)]);
    }

    const upload = await supabase.storage.from(bucket).upload(storagePath, bytes, {
      contentType: getMimeType(file.path),
      upsert: true,
    });
    if (upload.error) {
      throw upload.error;
    }

    const payload = {
      company_id: COMPANY_ID,
      category: file.category,
      title: file.title,
      description: file.description,
      file_name: fileName,
      storage_bucket: bucket,
      storage_path: storagePath,
      mime_type: getMimeType(file.path),
      size_bytes: bytes.byteLength,
      issue_date: new Date().toISOString().slice(0, 10),
      is_published: true,
      metadata: { audience: "all_users" },
    };

    if (existing.data?.id) {
      const updated = await supabase.from("company_documents").update(payload).eq("id", existing.data.id);
      if (updated.error) {
        throw updated.error;
      }
    } else {
      const inserted = await supabase.from("company_documents").insert(payload);
      if (inserted.error) {
        throw inserted.error;
      }
    }
  }

  console.log(JSON.stringify({ seeded: FILES.map((file) => file.title) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
