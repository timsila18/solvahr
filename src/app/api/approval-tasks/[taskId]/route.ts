import { NextResponse } from "next/server";
import { updateApprovalTask } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

async function assertNonEmployeeAccess() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  if (profile.role === "Employee") {
    throw new Error("forbidden");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await context.params;
  const body = (await request.json()) as {
    action: "approve" | "reject";
    actorEmail: string;
    actorRole: string;
    comment?: string;
  };

  try {
    await assertNonEmployeeAccess();
    const task = await updateApprovalTask(taskId, body.action, body.comment);
    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "forbidden" ? 403 : message === "task_not_found" ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
