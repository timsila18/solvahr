import { NextResponse } from "next/server";
import { listAttendanceRecords } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ records: await listAttendanceRecords() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
