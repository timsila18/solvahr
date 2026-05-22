import { NextResponse } from "next/server";
import { generateLeaveApplicationForm } from "@/lib/database";

export async function GET(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await context.params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") === "preview" ? "preview" : "download";
    const file = await generateLeaveApplicationForm(requestId);

    return new NextResponse(Buffer.from(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `${mode === "preview" ? "inline" : "attachment"}; filename="${file.fileName}"`,
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
          : message === "leave_request_not_found"
            ? 404
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
