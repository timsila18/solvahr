import { NextResponse } from "next/server";
import { createPerformanceWorkPlan, getPerformanceWorkspace } from "@/lib/performance-management";

export async function GET() {
  try {
    const workspace = await getPerformanceWorkspace();
    return NextResponse.json({ workPlans: workspace.workPlans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const workPlan = await createPerformanceWorkPlan({
      employeeId: String(body.employeeId ?? ""),
      goalId: typeof body.goalId === "string" ? body.goalId : null,
      quarterLabel: String(body.quarterLabel ?? ""),
      departmentObjective: String(body.departmentObjective ?? ""),
      individualTarget: String(body.individualTarget ?? ""),
      quarterlyActivities: Array.isArray(body.quarterlyActivities)
        ? (body.quarterlyActivities.filter((item) => Boolean(item) && typeof item === "object") as Array<Record<string, unknown>>)
        : undefined,
      expectedOutput: typeof body.expectedOutput === "string" ? body.expectedOutput : undefined,
      performanceIndicator:
        typeof body.performanceIndicator === "string" ? body.performanceIndicator : undefined,
      timeline: typeof body.timeline === "string" ? body.timeline : undefined,
      weighting: typeof body.weighting === "number" ? body.weighting : undefined,
      responsiblePerson: typeof body.responsiblePerson === "string" ? body.responsiblePerson : undefined,
      reviewStatus: typeof body.reviewStatus === "string" ? body.reviewStatus : undefined,
    });
    return NextResponse.json({ workPlan }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
