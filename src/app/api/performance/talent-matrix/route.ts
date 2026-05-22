import { NextResponse } from "next/server";
import { createTalentAssessment, getPerformanceWorkspace } from "@/lib/performance-management";

export async function GET() {
  try {
    const workspace = await getPerformanceWorkspace();
    return NextResponse.json({ talentAssessments: workspace.talentAssessments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const talentAssessment = await createTalentAssessment({
      employeeId: String(body.employeeId ?? ""),
      reviewId: typeof body.reviewId === "string" ? body.reviewId : null,
      performanceBand: String(body.performanceBand ?? ""),
      potentialRating: String(body.potentialRating ?? ""),
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });
    return NextResponse.json({ talentAssessment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
