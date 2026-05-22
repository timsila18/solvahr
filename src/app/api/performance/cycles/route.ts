import { NextResponse } from "next/server";
import { createAppraisalCycle, getPerformanceWorkspace } from "@/lib/performance-management";

export async function GET() {
  try {
    const workspace = await getPerformanceWorkspace();
    return NextResponse.json({
      cycles: workspace.cycles,
      reviews: workspace.reviews,
      summary: workspace.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const cycle = await createAppraisalCycle({
      title: String(body.title ?? ""),
      cycleType: String(body.cycleType ?? ""),
      periodStart: String(body.periodStart ?? ""),
      periodEnd: String(body.periodEnd ?? ""),
      departmentIds: Array.isArray(body.departmentIds)
        ? body.departmentIds.filter((item): item is string => typeof item === "string")
        : undefined,
      roleTitles: Array.isArray(body.roleTitles)
        ? body.roleTitles.filter((item): item is string => typeof item === "string")
        : undefined,
      employeeIds: Array.isArray(body.employeeIds)
        ? body.employeeIds.filter((item): item is string => typeof item === "string")
        : undefined,
      scoringModel: typeof body.scoringModel === "string" ? body.scoringModel : undefined,
      selfEvaluationEnabled:
        typeof body.selfEvaluationEnabled === "boolean" ? body.selfEvaluationEnabled : undefined,
      supervisorEvaluationEnabled:
        typeof body.supervisorEvaluationEnabled === "boolean" ? body.supervisorEvaluationEnabled : undefined,
      gmEvaluationEnabled:
        typeof body.gmEvaluationEnabled === "boolean" ? body.gmEvaluationEnabled : undefined,
      payrollAdminVisibilityEnabled:
        typeof body.payrollAdminVisibilityEnabled === "boolean" ? body.payrollAdminVisibilityEnabled : undefined,
      payrollAdminActionEnabled:
        typeof body.payrollAdminActionEnabled === "boolean" ? body.payrollAdminActionEnabled : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
    });
    return NextResponse.json({ cycle }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
