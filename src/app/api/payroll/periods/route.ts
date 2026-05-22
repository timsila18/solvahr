import { NextResponse } from "next/server";
import { createPayrollPeriod, listPayrollPeriods } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ periods: await listPayrollPeriods() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      month?: string;
      year?: string;
      payrollType?: string;
    };

    if (!body.month || !body.year || !body.payrollType) {
      return NextResponse.json({ error: "missing_payroll_period_fields" }, { status: 400 });
    }

    return NextResponse.json(
      { period: await createPayrollPeriod({ month: body.month, year: body.year, payrollType: body.payrollType }) },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("missing_") || message.startsWith("invalid_") || message === "payroll_period_exists"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
