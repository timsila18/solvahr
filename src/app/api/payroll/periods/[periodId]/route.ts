import { NextResponse } from "next/server";
import { deletePayrollPeriod, transitionPayrollPeriod } from "@/lib/database";

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ periodId: string }>;
  }
) {
  try {
    const { periodId } = await context.params;
    const body = (await request.json()) as {
      action?: "process" | "preview" | "close" | "reopen" | "undo";
      reason?: string;
    };

    if (!body.action) {
      return NextResponse.json({ error: "missing_payroll_period_action" }, { status: 400 });
    }

    return NextResponse.json({
      period: await transitionPayrollPeriod(periodId, body.action, body.reason),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("missing_") || message.startsWith("invalid_") || message.includes("not_")
            ? 400
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ periodId: string }>;
  }
) {
  try {
    const { periodId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      reason?: string;
    };

    return NextResponse.json({
      period: await deletePayrollPeriod(periodId, body.reason),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("missing_") || message.startsWith("invalid_") || message.includes("not_")
            ? 400
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
