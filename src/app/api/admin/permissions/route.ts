import { NextResponse } from "next/server";
import { listPermissionsMatrix, updateRolePermission } from "@/lib/administration";

export async function GET() {
  try {
    return NextResponse.json(await listPermissionsMatrix());
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({
      permission: await updateRolePermission(String(body.roleKey ?? ""), String(body.moduleKey ?? ""), {
        ...(typeof body.scopeType === "string" ? { scopeType: body.scopeType } : {}),
        ...(typeof body.canView === "boolean" ? { canView: body.canView } : {}),
        ...(typeof body.canCreate === "boolean" ? { canCreate: body.canCreate } : {}),
        ...(typeof body.canEdit === "boolean" ? { canEdit: body.canEdit } : {}),
        ...(typeof body.canApprove === "boolean" ? { canApprove: body.canApprove } : {}),
        ...(typeof body.canExport === "boolean" ? { canExport: body.canExport } : {}),
        ...(typeof body.canDelete === "boolean" ? { canDelete: body.canDelete } : {}),
        ...(typeof body.canAdmin === "boolean" ? { canAdmin: body.canAdmin } : {}),
        ...(typeof body.status === "string" ? { status: body.status } : {}),
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
