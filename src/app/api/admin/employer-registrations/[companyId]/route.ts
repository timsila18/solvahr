import { NextResponse } from "next/server";
import { reviewEmployerRegistration } from "@/lib/saas";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await context.params;
    const body = (await request.json()) as {
      action?: "approve" | "reject";
      reason?: string;
    };

    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    return NextResponse.json({
      result: await reviewEmployerRegistration({
        companyId,
        action: body.action,
        reason: body.reason,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "company_not_found"
            ? 404
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
