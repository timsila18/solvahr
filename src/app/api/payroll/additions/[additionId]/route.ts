import { NextResponse } from "next/server";
import { approvePayrollAddition, voidPayrollAddition } from "@/lib/database";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ additionId: string }> }
) {
  try {
    const { additionId } = await context.params;
    const body = (await request.json()) as { action?: "void" | "approve"; reason?: string; comments?: string };

    if (!body.action || !["void", "approve"].includes(body.action)) {
      return NextResponse.json({ error: "missing_payroll_addition_action" }, { status: 400 });
    }

    return NextResponse.json({
      result:
        body.action === "approve"
          ? await approvePayrollAddition(additionId, body.comments)
          : await voidPayrollAddition(additionId, body.reason),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.includes("not_found")
            ? 404
            : message.startsWith("missing_") || message.startsWith("invalid_")
              ? 400
              : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
