import { NextResponse } from "next/server";
import { createPerformanceKpi, getPerformanceWorkspace } from "@/lib/performance-management";

export async function GET() {
  try {
    const workspace = await getPerformanceWorkspace();
    return NextResponse.json({
      kpis: workspace.kpis,
      settings: workspace.settings,
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
    const kpi = await createPerformanceKpi({
      title: String(body.title ?? ""),
      category: String(body.category ?? ""),
      employeeId: typeof body.employeeId === "string" ? body.employeeId : null,
      departmentId: typeof body.departmentId === "string" ? body.departmentId : null,
      designationId: typeof body.designationId === "string" ? body.designationId : null,
      supervisorEmployeeId:
        typeof body.supervisorEmployeeId === "string" ? body.supervisorEmployeeId : null,
      assignmentScope: typeof body.assignmentScope === "string" ? body.assignmentScope : undefined,
      roleTitle: typeof body.roleTitle === "string" ? body.roleTitle : undefined,
      measurementUnit: typeof body.measurementUnit === "string" ? body.measurementUnit : undefined,
      targetValue: typeof body.targetValue === "number" ? body.targetValue : undefined,
      weightPercent: typeof body.weightPercent === "number" ? body.weightPercent : undefined,
      periodLabel: String(body.periodLabel ?? ""),
      startDate: String(body.startDate ?? ""),
      endDate: String(body.endDate ?? ""),
      evidenceRequired: typeof body.evidenceRequired === "boolean" ? body.evidenceRequired : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });
    return NextResponse.json({ kpi }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
