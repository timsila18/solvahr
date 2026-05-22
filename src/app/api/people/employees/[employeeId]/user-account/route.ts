import { NextResponse } from "next/server";
import { roleCanAccessPeople } from "@/lib/auth";
import { createEmployeeLinkedUserAccounts } from "@/lib/administration";
import { normalizeRole } from "@/lib/auth";
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

export async function POST(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    await assertPeopleAdminAccess();
    const { employeeId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { role?: string };

    const result = await createEmployeeLinkedUserAccounts({
      employeeIds: [employeeId],
      role: normalizeRole(body.role ?? "Employee"),
    });

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "employee_selection_required"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
