import { NextResponse } from "next/server";
import { createAttendanceAdjustmentRequest, listAttendanceAdjustments } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ adjustments: await listAttendanceAdjustments() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      workDate: string;
      requestedClockIn?: string;
      requestedClockOut?: string;
      reason: string;
    };

    return NextResponse.json({ task: await createAttendanceAdjustmentRequest(body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
