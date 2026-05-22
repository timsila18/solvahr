import { NextResponse } from "next/server";
import { streamCvOrderFile } from "@/lib/cv-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ orderId: string; format: string }> }
) {
  try {
    const { orderId, format } = await context.params;
    if (format !== "docx" && format !== "pdf") {
      return NextResponse.json({ error: "invalid_cv_download_format" }, { status: 400 });
    }
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const file = await streamCvOrderFile(orderId, token, format);
    return new NextResponse(file.bytes, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "cv_order_not_found"
        ? 404
        : [
              "payment_required_before_download",
              "cv_not_generated_yet",
              "cv_download_expired",
              "cv_file_missing",
              "invalid_cv_download_format",
            ].includes(message)
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
