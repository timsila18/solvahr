import { NextResponse } from "next/server";
import { getPerformanceReportFile } from "@/lib/performance-management";

export async function GET(
  request: Request,
  context: { params: Promise<{ reviewId: string }> }
) {
  const url = new URL(request.url);
  const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  try {
    const { reviewId } = await context.params;
    const file = await getPerformanceReportFile(reviewId, { disposition });
    return new Response(Buffer.from(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `${disposition}; filename="${file.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "appraisal_review_not_found"
            ? 404
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
