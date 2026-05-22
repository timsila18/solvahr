import { NextResponse } from "next/server";
import { listDataImportJobs, runDataImport } from "@/lib/administration";

export async function GET() {
  try {
    return NextResponse.json({ jobs: await listDataImportJobs() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({
      job: await runDataImport({
        importType: body.importType as never,
        fileName: String(body.fileName ?? "import.csv"),
        content: String(body.content ?? ""),
        previewOnly: Boolean(body.previewOnly),
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
