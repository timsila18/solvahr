import { NextResponse } from "next/server";
import { listScheduledReports, saveScheduledReport } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ schedules: await listScheduledReports() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      templateId?: string;
      name?: string;
      frequency?: string;
      exportType?: string;
      recipients?: string[];
    };

    return NextResponse.json(
      await saveScheduledReport({
        templateId: body.templateId ?? "",
        name: body.name ?? "Scheduled Report",
        frequency: body.frequency ?? "Monthly",
        exportType: body.exportType ?? "csv",
        recipients: body.recipients ?? [],
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
