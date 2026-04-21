import { NextResponse } from "next/server";
import { deleteLookupRecord, updateLookupRecord } from "@/lib/database";

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ table: string; recordId: string }> }
) {
  const { table, recordId } = await context.params;

  if (!isValidTable(table)) {
    return NextResponse.json({ error: "invalid_lookup_table" }, { status: 400 });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({
      record: await updateLookupRecord(table as never, recordId, payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ table: string; recordId: string }> }
) {
  const { table, recordId } = await context.params;

  if (!isValidTable(table)) {
    return NextResponse.json({ error: "invalid_lookup_table" }, { status: 400 });
  }

  try {
    return NextResponse.json(await deleteLookupRecord(table as never, recordId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
