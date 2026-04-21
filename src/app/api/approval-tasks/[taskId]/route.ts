import { NextResponse } from "next/server";
import { updateApprovalTask } from "@/lib/mock-platform-store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await context.params;
  const body = (await request.json()) as {
    action: "approve" | "reject";
    actorEmail: string;
    actorRole: string;
  };

  try {
    const task = updateApprovalTask(taskId, body.action, body.actorEmail, body.actorRole);
    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "forbidden" ? 403 : message === "task_not_found" ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
