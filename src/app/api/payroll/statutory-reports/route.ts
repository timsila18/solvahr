import { NextResponse } from "next/server";
import { getStatutorySummary } from "@/lib/database";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");
    return NextResponse.json({ reports: await getStatutorySummary({ periodId }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
