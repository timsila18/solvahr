import { NextResponse } from "next/server";
import { listApprovalWorkflowSettings, saveApprovalWorkflow } from "@/lib/administration";

export async function GET() {
  try {
    return NextResponse.json({ workflows: await listApprovalWorkflowSettings() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({
      workflow: await saveApprovalWorkflow({
        id: typeof body.id === "string" ? body.id : null,
        moduleKey: String(body.moduleKey ?? "people"),
        name: String(body.name ?? "Approval Workflow"),
        steps: Array.isArray(body.steps) ? (body.steps as Array<Record<string, unknown>>) : [],
        moduleScope: typeof body.moduleScope === "string" ? body.moduleScope : undefined,
        makerCheckerEnabled: typeof body.makerCheckerEnabled === "boolean" ? body.makerCheckerEnabled : undefined,
        finalApprovalRequired: typeof body.finalApprovalRequired === "boolean" ? body.finalApprovalRequired : undefined,
        escalationRule:
          body.escalationRule && typeof body.escalationRule === "object"
            ? (body.escalationRule as Record<string, unknown>)
            : undefined,
        status: typeof body.status === "string" ? body.status : undefined,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
