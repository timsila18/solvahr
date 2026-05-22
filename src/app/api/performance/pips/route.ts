import { NextResponse } from "next/server";
import { createPerformancePip, getPerformanceWorkspace } from "@/lib/performance-management";

export async function GET() {
  try {
    const workspace = await getPerformanceWorkspace();
    return NextResponse.json({ pips: workspace.pips });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const pip = await createPerformancePip({
      employeeId: String(body.employeeId ?? ""),
      reviewId: typeof body.reviewId === "string" ? body.reviewId : null,
      issue: String(body.issue ?? ""),
      improvementTarget: String(body.improvementTarget ?? ""),
      supportRequired: typeof body.supportRequired === "string" ? body.supportRequired : undefined,
      reviewDate: typeof body.reviewDate === "string" ? body.reviewDate : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      outcome: typeof body.outcome === "string" ? body.outcome : undefined,
    });
    return NextResponse.json({ pip }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
