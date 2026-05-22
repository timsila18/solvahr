import { NextResponse } from "next/server";
import { listMyNotifications, markEssNotificationRead } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ notifications: await listMyNotifications() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH() {
  try {
    return NextResponse.json(await markEssNotificationRead(null));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
