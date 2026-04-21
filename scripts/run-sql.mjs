import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

const [,, sqlFile] = process.argv;

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
    // Ignore missing local env file; process env may already be populated.
  }
}

await loadLocalEnv();

if (!sqlFile) {
  console.error("Usage: node scripts/run-sql.mjs <sql-file>");
  process.exit(1);
}

const databaseUrl =
  process.env.SUPABASE_DB_URL ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing SUPABASE_DB_URL, DIRECT_URL, or DATABASE_URL.");
  process.exit(1);
}

const filePath = resolve(process.cwd(), sqlFile);
const sql = await readFile(filePath, "utf8");

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

try {
  await client.connect();
  await client.query(sql);
  console.log(`Executed SQL file: ${filePath}`);
} finally {
  await client.end();
}
