import { NextResponse } from "next/server";
import { getPayslip } from "@/lib/database";

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;
    const payslip = await getPayslip(employeeId);

    if (!payslip) {
      return NextResponse.json({ error: "payslip_not_found" }, { status: 404 });
    }

    return NextResponse.json({ payslip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
