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
      holidayName?: string;
      holidayDate?: string;
      holidayPayMode?: string;
      excludedEmployees?: Array<{ employeeId?: string; reason?: string }>;
    };

    if (!body.payrollType) {
      return NextResponse.json({ error: "missing_payroll_period_fields" }, { status: 400 });
    }

    if (body.payrollType !== "Holiday Payroll" && (!body.month || !body.year)) {
      return NextResponse.json({ error: "missing_payroll_period_fields" }, { status: 400 });
    }

    return NextResponse.json(
      {
        period: await createPayrollPeriod({
          month: body.month ?? "",
          year: body.year ?? "",
          payrollType: body.payrollType,
          holidayName: body.holidayName,
          holidayDate: body.holidayDate,
          holidayPayMode: body.holidayPayMode,
          excludedEmployees: body.excludedEmployees,
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
          : message.startsWith("missing_") ||
              message.startsWith("invalid_") ||
              message === "payroll_period_exists" ||
              message.startsWith("holiday_payroll_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
