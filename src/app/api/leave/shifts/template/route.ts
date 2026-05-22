import { NextResponse } from "next/server";
import { downloadShiftRosterTemplate } from "@/lib/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workbook = await downloadShiftRosterTemplate({
      periodType: searchParams.get("periodType"),
      startDate: searchParams.get("startDate"),
    });

    return new NextResponse(workbook.buffer, {
      status: 200,
      headers: {
        "Content-Type": workbook.contentType,
        "Content-Disposition": `attachment; filename="${workbook.fileName}"`,
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
          : message === "no_roster_employees_available"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
