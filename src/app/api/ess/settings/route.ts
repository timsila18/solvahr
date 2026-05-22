import { NextResponse } from "next/server";
import { getEssSettings, updateEssSettings } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ settings: await getEssSettings() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      themeMode?: string;
      emailNotifications?: boolean;
      smsNotifications?: boolean;
      inAppNotifications?: boolean;
      language?: string;
    };

    return NextResponse.json({ settings: await updateEssSettings(body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
