import { NextResponse } from "next/server";
import { getReportExportDownload } from "@/lib/database";

export async function GET(
  _request: Request,
  context: { params: Promise<{ exportId: string }> }
) {
  try {
    const { exportId } = await context.params;
    const file = await getReportExportDownload(exportId);

    return new NextResponse(file.content, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
