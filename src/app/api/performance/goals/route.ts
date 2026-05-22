import { NextResponse } from "next/server";
import { createPerformanceGoal, getPerformanceWorkspace } from "@/lib/performance-management";

export async function GET() {
  try {
    const workspace = await getPerformanceWorkspace();
    return NextResponse.json({ goals: workspace.goals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const goal = await createPerformanceGoal({
      kpiId: typeof body.kpiId === "string" ? body.kpiId : null,
      employeeId: String(body.employeeId ?? ""),
      title: String(body.title ?? ""),
      target: String(body.target ?? ""),
      activities: Array.isArray(body.activities)
        ? (body.activities.filter((item) => Boolean(item) && typeof item === "object") as Array<Record<string, unknown>>)
        : undefined,
      dueDate: typeof body.dueDate === "string" ? body.dueDate : undefined,
      progressPercent: typeof body.progressPercent === "number" ? body.progressPercent : undefined,
      evidenceComments: typeof body.evidenceComments === "string" ? body.evidenceComments : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      departmentObjective: typeof body.departmentObjective === "string" ? body.departmentObjective : undefined,
      expectedOutput: typeof body.expectedOutput === "string" ? body.expectedOutput : undefined,
      performanceIndicator:
        typeof body.performanceIndicator === "string" ? body.performanceIndicator : undefined,
      timeline: typeof body.timeline === "string" ? body.timeline : undefined,
      weighting: typeof body.weighting === "number" ? body.weighting : undefined,
      responsiblePerson: typeof body.responsiblePerson === "string" ? body.responsiblePerson : undefined,
      reviewStatus: typeof body.reviewStatus === "string" ? body.reviewStatus : undefined,
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
