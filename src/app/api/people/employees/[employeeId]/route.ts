import { NextResponse } from "next/server";
import { getEmployeeProfile, updateEmployeeRecord } from "@/lib/database";

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await context.params;
  try {
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
    const payload = (await request.json()) as Record<string, unknown>;
    const employee = await updateEmployeeRecord(employeeId, payload);
    return NextResponse.json({ employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message === "employee_not_found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
