import { NextResponse } from "next/server";
import { updateLeaveRequestRecord } from "@/lib/database";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await context.params;
    const body = (await request.json()) as {
      action: "cancel" | "update";
      leaveType?: string;
      startDate?: string;
      endDate?: string;
      days?: string;
      reason?: string;
    };

    return NextResponse.json({
      request: await updateLeaveRequestRecord({
        requestId,
        action: body.action,
        leaveType: body.leaveType,
        startDate: body.startDate,
        endDate: body.endDate,
        days: body.days,
        reason: body.reason,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message === "leave_request_not_found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

