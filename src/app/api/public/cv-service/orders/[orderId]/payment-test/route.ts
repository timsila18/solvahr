import { NextResponse } from "next/server";
import { simulateCvOrderPayment } from "@/lib/cv-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const body = (await request.json()) as { token?: string };
    return NextResponse.json({ order: await simulateCvOrderPayment(orderId, body.token ?? "") });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "cv_order_not_found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
