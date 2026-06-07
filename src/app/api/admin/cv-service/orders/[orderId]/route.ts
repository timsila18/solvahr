import { NextResponse } from "next/server";
import {
  approveCvOrderByAdmin,
  markCvOrderPaidByAdmin,
  refreshCvOrderDownloadsByAdmin,
  regenerateCvOrderByAdmin,
  saveCvOrderManualEditByAdmin,
} from "@/lib/cv-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const body = (await request.json()) as {
      action?: "mark_paid" | "regenerate" | "approve_final" | "refresh_links" | "manual_edit";
      professionalHeadline?: string;
      professionalSummary?: string;
      keyAchievements?: string[];
      adminNotes?: string;
    };
    if (body.action === "mark_paid") {
      return NextResponse.json({ order: await markCvOrderPaidByAdmin(orderId) });
    }
    if (body.action === "regenerate") {
      return NextResponse.json({ order: await regenerateCvOrderByAdmin(orderId) });
    }
    if (body.action === "approve_final") {
      return NextResponse.json({ order: await approveCvOrderByAdmin(orderId) });
    }
    if (body.action === "refresh_links") {
      return NextResponse.json({ order: await refreshCvOrderDownloadsByAdmin(orderId) });
    }
    if (body.action === "manual_edit") {
      return NextResponse.json({
        order: await saveCvOrderManualEditByAdmin(orderId, {
          professionalHeadline: body.professionalHeadline,
          professionalSummary: body.professionalSummary,
          keyAchievements: body.keyAchievements,
          adminNotes: body.adminNotes,
        }),
      });
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
