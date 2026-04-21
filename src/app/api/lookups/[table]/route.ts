import { NextResponse } from "next/server";
import { createLookupRecord, listLookupRecords } from "@/lib/database";

const VALID_TABLES = new Set([
  "branches",
  "departments",
  "designations",
  "job_grades",
  "payroll_groups",
]);

function isValidTable(table: string) {
  return VALID_TABLES.has(table);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ table: string }> }
) {
  const { table } = await context.params;

  if (!isValidTable(table)) {
    return NextResponse.json({ error: "invalid_lookup_table" }, { status: 400 });
  }

  try {
    return NextResponse.json({
      records: await listLookupRecords(table as never),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ table: string }> }
) {
  const { table } = await context.params;

  if (!isValidTable(table)) {
    return NextResponse.json({ error: "invalid_lookup_table" }, { status: 400 });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    return NextResponse.json(
      {
        record: await createLookupRecord(table as never, payload),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
