import { NextResponse } from "next/server";
import { getPlatformOwnerDashboard } from "@/lib/saas";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "unknown_error";
}

export async function GET() {
  try {
    return NextResponse.json({ hq: await getPlatformOwnerDashboard() });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
