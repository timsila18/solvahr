import { NextResponse } from "next/server";
import { getLeaveReportsSnapshot, getPayrollReadyAttendanceSummary } from "@/lib/database";

export async function GET() {
  try {
    const [reports, payrollLinkage] = await Promise.all([
      getLeaveReportsSnapshot(),
      getPayrollReadyAttendanceSummary(),
    ]);
    return NextResponse.json({ reports, payrollLinkage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

