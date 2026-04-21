import { NextResponse } from "next/server";
import { getEmployeeProfile } from "@/lib/mock-platform-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await context.params;
  const profile = getEmployeeProfile(employeeId);

  if (!profile) {
    return NextResponse.json({ error: "employee_not_found" }, { status: 404 });
  }

  return NextResponse.json({ employee: profile });
}
