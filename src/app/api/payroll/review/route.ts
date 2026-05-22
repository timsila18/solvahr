import { NextResponse } from "next/server";
import { createPayrollApprovalRequest, getPayrollPackage, getPayrollVariance } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({
      payroll: await getPayrollPackage(),
      variance: await getPayrollVariance(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST() {
  try {
    const payroll = await getPayrollPackage();
    if (!payroll) {
      return NextResponse.json({ error: "payroll_run_not_found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        task: await createPayrollApprovalRequest({
          period: payroll.period,
          grossPay: payroll.grossPay,
          netPay: payroll.netPay,
          employeeCount: payroll.employeeCount,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("invalid_") || message.includes("not_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
