import { NextResponse } from "next/server";
import { buildPlatformSnapshot } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const snapshot = await buildPlatformSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
