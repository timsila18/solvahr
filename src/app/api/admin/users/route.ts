import { NextResponse } from "next/server";
import { createAdminUser, listAdminUsers } from "@/lib/administration";
import { normalizeRole } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      users: await listAdminUsers({
        role: searchParams.get("role"),
        status: searchParams.get("status"),
        branchId: searchParams.get("branchId"),
        departmentId: searchParams.get("departmentId"),
        linkage: (searchParams.get("linkage") as "linked" | "standalone" | null) ?? null,
        search: searchParams.get("search"),
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("admin_limit_reached:")
            ? 409
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json(
      {
        user: await createAdminUser({
          fullName: String(body.fullName ?? ""),
          email: String(body.email ?? ""),
          phone: typeof body.phone === "string" ? body.phone : null,
          role: normalizeRole(String(body.role ?? "Employee")),
          employeeId: typeof body.employeeId === "string" && body.employeeId ? body.employeeId : null,
          branchId: typeof body.branchId === "string" && body.branchId ? body.branchId : null,
          departmentId: typeof body.departmentId === "string" && body.departmentId ? body.departmentId : null,
          inviteOnly: Boolean(body.inviteOnly),
          temporaryPassword: typeof body.temporaryPassword === "string" ? body.temporaryPassword : null,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
