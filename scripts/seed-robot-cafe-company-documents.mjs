import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROBOT_CAFE_COMPANY_ID = "33333333-3333-3333-3333-333333333333";
const BUCKET = process.env.SUPABASE_COMPANY_ASSETS_BUCKET ?? "company-assets";

const DOCUMENTS = [
  {
    title: "Robot Cafe & Bistro Discipline Policy",
    category: "Policy",
    description: "Official discipline policy for all team members.",
    sourcePath: "C:/Robots Docs/Robot Cafe & Bistro Discipline Policy.pdf",
  },
  {
    title: "Robot Cafe Code of Conduct",
    category: "Policy",
    description: "Code of conduct and workplace behaviour standards.",
    sourcePath: "C:/Robots Docs/Robot Cafe Code of Conduct.pdf",
  },
  {
    title: "Robot Cafe & Bistro Career Guidelines",
    category: "Guideline",
    description: "Career growth and progression guidance for Robot Cafe staff.",
    sourcePath: "C:/Robots Docs/Robots Cafe & Bistro Career Guidelines.pdf",
  },
  {
    title: "Robot Cafe HR Policy and Procedure Manual",
    category: "Manual",
    description: "Core HR policy and procedure manual for company operations.",
    sourcePath: "C:/Robots Docs/Robots Cafe & BistRO HR Policy and Procedure Manual .docx",
  },
  {
    title: "Clearance Form & Exit Interview",
    category: "Form",
    description: "Clearance and exit interview form for offboarding workflows.",
    sourcePath: "C:/Robots Docs/Clearance Form & Exit Interview Robot Cafe.docx",
  },
];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getMimeType(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (extension === ".doc") return "application/msword";
  return "application/octet-stream";
}

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
    // Ignore missing env file.
  }
}

await loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const document of DOCUMENTS) {
  const fileBuffer = await readFile(document.sourcePath);
  const extension = extname(document.sourcePath).toLowerCase();
  const fileName = `${slugify(document.title)}${extension}`;
  const storagePath = `companies/${ROBOT_CAFE_COMPANY_ID}/company-documents/${fileName}`;

  const uploadResult = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, {
    contentType: getMimeType(document.sourcePath),
    upsert: true,
  });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const { error } = await supabase.from("company_documents").upsert(
    {
      company_id: ROBOT_CAFE_COMPANY_ID,
      category: document.category,
      title: document.title,
      description: document.description,
      file_name: fileName,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      mime_type: getMimeType(document.sourcePath),
      size_bytes: fileBuffer.byteLength,
      is_published: true,
      metadata: {
        sourcePath: document.sourcePath,
        audience: "all_users",
      },
    },
    { onConflict: "company_id,file_name" }
  );

  if (error) {
    throw error;
  }

  console.log(`Seeded company document: ${document.title}`);
}

console.log("Robot Cafe company documents seeded successfully.");
