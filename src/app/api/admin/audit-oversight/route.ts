import { NextResponse } from "next/server";
import { listAuditOversight } from "@/lib/administration";

export async function GET() {
  try {
    return NextResponse.json({ audits: await listAuditOversight() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
