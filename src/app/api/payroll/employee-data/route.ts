import { NextResponse } from "next/server";
import { listEmployeePayrollData } from "@/lib/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get("periodId");
    return NextResponse.json({ rows: await listEmployeePayrollData({ periodId }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
