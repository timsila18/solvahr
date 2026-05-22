import { NextResponse } from "next/server";
import { markEssNotificationRead } from "@/lib/database";

export async function PATCH(_: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  try {
    const { notificationId } = await params;
    return NextResponse.json(await markEssNotificationRead(notificationId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
