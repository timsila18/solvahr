import { NextResponse } from "next/server";
import { updateEssComplaint } from "@/lib/database";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ complaintId: string }> }
) {
  try {
    const { complaintId } = await context.params;
    const body = (await request.json()) as {
      status?: "pending" | "in_review" | "resolved";
      response?: string;
      privateNotes?: string;
    };

    return NextResponse.json({
      complaint: await updateEssComplaint(complaintId, body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "complaint_not_found"
            ? 404
            : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
