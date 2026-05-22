import { NextResponse } from "next/server";
import { updateLeaveApprovalTask } from "@/lib/database";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = (await request.json()) as {
      action: "approve" | "reject" | "reduce" | "cancel" | "request_clarification";
      comments?: string;
      approvedDays?: number;
    };

    return NextResponse.json({
      task: await updateLeaveApprovalTask(taskId, {
        action: body.action,
        comments: body.comments,
        approvedDays: body.approvedDays,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
