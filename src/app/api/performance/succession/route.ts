import { NextResponse } from "next/server";
import {
  createSuccessionCandidate,
  createSuccessionRole,
  getPerformanceWorkspace,
} from "@/lib/performance-management";

export async function GET() {
  try {
    const workspace = await getPerformanceWorkspace();
    return NextResponse.json({
      successionRoles: workspace.successionRoles,
      successionCandidates: workspace.successionCandidates,
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
    const entityType = typeof body.entityType === "string" ? body.entityType : "role";
    if (entityType === "candidate") {
      const successionCandidate = await createSuccessionCandidate({
        successionRoleId: String(body.successionRoleId ?? ""),
        employeeId: String(body.employeeId ?? ""),
        readinessLevel: String(body.readinessLevel ?? ""),
        developmentActions:
          typeof body.developmentActions === "string" ? body.developmentActions : undefined,
        gmComments: typeof body.gmComments === "string" ? body.gmComments : undefined,
        riskLevel: typeof body.riskLevel === "string" ? body.riskLevel : undefined,
        status: typeof body.status === "string" ? body.status : undefined,
      });
      return NextResponse.json({ successionCandidate }, { status: 201 });
    }

    const successionRole = await createSuccessionRole({
      roleTitle: String(body.roleTitle ?? ""),
      departmentId: typeof body.departmentId === "string" ? body.departmentId : null,
      incumbentEmployeeId:
        typeof body.incumbentEmployeeId === "string" ? body.incumbentEmployeeId : null,
      criticality: typeof body.criticality === "string" ? body.criticality : undefined,
      riskLevel: typeof body.riskLevel === "string" ? body.riskLevel : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });
    return NextResponse.json({ successionRole }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
