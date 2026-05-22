import { NextResponse } from "next/server";
import { getCustomReportPreview } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      moduleKey?: string;
      fields?: string[];
      filters?: Record<string, unknown>;
    };

    return NextResponse.json({
      preview: await getCustomReportPreview({
        moduleKey: body.moduleKey ?? "employees",
        fields: body.fields ?? [],
        filters: body.filters ?? {},
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
