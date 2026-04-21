import { NextResponse } from "next/server";
import { createLeaveRequest, listLeaveRequests } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ requests: await listLeaveRequests() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      employeeName: string;
      leaveType: string;
      days: string;
      startDate: string;
    };

    return NextResponse.json(
      await createLeaveRequest({
        employeeName: body.employeeName,
        leaveType: body.leaveType,
        days: body.days,
        startDate: body.startDate,
      }),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
