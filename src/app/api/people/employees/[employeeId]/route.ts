import { NextResponse } from "next/server";
import { roleCanAccessPeople } from "@/lib/auth";
import { getEmployeeProfile, updateEmployeeRecord } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

async function assertPeopleAdminAccess() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  if (!roleCanAccessPeople(profile.role)) {
    throw new Error("forbidden");
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await context.params;
  try {
    await assertPeopleAdminAccess();
    const profile = await getEmployeeProfile(employeeId);
    if (!profile) {
      return NextResponse.json({ error: "employee_not_found" }, { status: 404 });
    }
    return NextResponse.json({ employee: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await context.params;

  try {
    await assertPeopleAdminAccess();
    const payload = (await request.json()) as Record<string, unknown>;
    const result = await updateEmployeeRecord(employeeId, payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "employee_not_found"
            ? 404
            : message === "no_employee_changes_submitted" || message === "employee_cannot_supervise_self"
              ? 400
            : message === "pending_assignment_change_request_exists"
              ? 409
              : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
