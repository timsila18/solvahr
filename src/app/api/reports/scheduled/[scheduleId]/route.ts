import { NextResponse } from "next/server";
import { updateScheduledReportRecord } from "@/lib/database";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await context.params;
    const body = (await request.json()) as {
      status?: "active" | "paused";
    };

    return NextResponse.json(
      await updateScheduledReportRecord({
        scheduleId,
        status: body.status ?? "paused",
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
