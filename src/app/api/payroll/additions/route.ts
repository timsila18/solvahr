import { NextResponse } from "next/server";
import { createPayrollAddition, listPayrollAdditions } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ additions: await listPayrollAdditions() });
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
      earningCategory?: string;
      amount?: number | string;
      effectiveDate?: string;
      targetPayrollRunId?: string;
      targetPayrollLabel?: string;
      reason?: string;
      notes?: string;
    };

    if (!body.employeeId || !body.effectiveDate || !body.reason || body.amount == null) {
      return NextResponse.json({ error: "missing_payroll_addition_fields" }, { status: 400 });
    }

    return NextResponse.json(
      {
        addition: await createPayrollAddition({
          employeeId: body.employeeId,
          earningCategory: body.earningCategory ?? "Bonus",
          amount: body.amount,
          effectiveDate: body.effectiveDate,
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
