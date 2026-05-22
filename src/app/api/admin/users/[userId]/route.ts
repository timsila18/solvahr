import { NextResponse } from "next/server";
import { getAdminUserDetail, updateAdminUser } from "@/lib/administration";
import { normalizeRole } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    return NextResponse.json({ user: await getAdminUserDetail(userId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({
      user: await updateAdminUser(userId, {
        ...(typeof body.fullName === "string" ? { fullName: body.fullName } : {}),
        ...(typeof body.phone === "string" || body.phone === null ? { phone: body.phone as string | null } : {}),
        ...(typeof body.role === "string" ? { role: normalizeRole(body.role) } : {}),
        ...(typeof body.employeeId === "string" || body.employeeId === null ? { employeeId: body.employeeId as string | null } : {}),
        ...(typeof body.branchId === "string" || body.branchId === null ? { branchId: body.branchId as string | null } : {}),
        ...(typeof body.departmentId === "string" || body.departmentId === null ? { departmentId: body.departmentId as string | null } : {}),
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
