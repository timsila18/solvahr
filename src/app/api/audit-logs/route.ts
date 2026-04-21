import { NextResponse } from "next/server";
import { listAuditEvents } from "@/lib/mock-platform-store";

export async function GET() {
  return NextResponse.json({ events: listAuditEvents() });
}
