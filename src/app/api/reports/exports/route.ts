import { NextResponse } from "next/server";
import { createReportExportRecord, listReportExports } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ exports: await listReportExports() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      templateId?: string | null;
      category?: string;
      reportName?: string;
      reportKey?: string;
      filters?: Record<string, unknown>;
      exportType?: string;
    };

    return NextResponse.json(
      await createReportExportRecord({
        templateId: body.templateId ?? null,
        category: body.category ?? "Custom Report Builder",
        reportName: body.reportName ?? "Custom Report",
        reportKey: body.reportKey ?? "employee_master_list",
        filters: body.filters ?? {},
        exportType: body.exportType ?? "csv",
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
