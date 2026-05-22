import { NextResponse } from "next/server";
import { markCvOrderPaidByAdmin, regenerateCvOrderByAdmin } from "@/lib/cv-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const body = (await request.json()) as { action?: "mark_paid" | "regenerate" };
    if (body.action === "mark_paid") {
      return NextResponse.json({ order: await markCvOrderPaidByAdmin(orderId) });
    }
    if (body.action === "regenerate") {
      return NextResponse.json({ order: await regenerateCvOrderByAdmin(orderId) });
    }
    return NextResponse.json({ error: "invalid_cv_admin_action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "payment_required_before_generation"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
