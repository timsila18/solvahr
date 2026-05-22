import { NextResponse } from "next/server";
import { getCvServiceDraft, updateCvServiceDraft, type CvServiceWizardPayload } from "@/lib/cv-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const url = new URL(_request.url);
    const token = url.searchParams.get("token") ?? "";
    return NextResponse.json({ order: await getCvServiceDraft(orderId, token) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "cv_order_not_found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const body = (await request.json()) as CvServiceWizardPayload & { token?: string };
    return NextResponse.json({
      order: await updateCvServiceDraft(orderId, body.token ?? "", body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "cv_order_not_found"
        ? 404
        : message === "invalid_cv_package" || message === "minimum_three_referees_required"
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
