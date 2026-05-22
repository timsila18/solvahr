import { NextResponse } from "next/server";
import { exportCvServiceOrdersWorkbook } from "@/lib/cv-service";

export async function GET() {
  try {
    const workbook = await exportCvServiceOrdersWorkbook();
    return new NextResponse(workbook, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="cv-service-orders.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
