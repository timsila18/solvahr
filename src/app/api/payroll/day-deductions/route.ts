import { NextResponse } from "next/server";
import { createPayrollDayDeduction, listPayrollDayDeductions } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ deductions: await listPayrollDayDeductions() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      employeeId?: string;
      deductionMode?: string;
      deductionCategory?: string;
      deductionDays?: number | string;
      fixedAmount?: number | string;
      startDate?: string;
      endDate?: string;
      targetPayrollRunId?: string;
      targetPayrollLabel?: string;
      reason?: string;
      notes?: string;
    };

    if (!body.employeeId || !body.startDate || !body.reason) {
      return NextResponse.json({ error: "missing_payroll_day_deduction_fields" }, { status: 400 });
    }

    return NextResponse.json(
      {
        deduction: await createPayrollDayDeduction({
          employeeId: body.employeeId,
          deductionMode: body.deductionMode,
          deductionCategory: body.deductionCategory ?? "Unworked Days",
          deductionDays: body.deductionDays,
          fixedAmount: body.fixedAmount,
          startDate: body.startDate,
          endDate: body.endDate,
          targetPayrollRunId: body.targetPayrollRunId,
          targetPayrollLabel: body.targetPayrollLabel,
          reason: body.reason,
          notes: body.notes,
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
          : message.startsWith("missing_") || message.startsWith("invalid_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
