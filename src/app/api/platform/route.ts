import { NextResponse } from "next/server";
import { getPlatformSnapshot } from "@/lib/mock-platform-store";

export async function GET() {
  return NextResponse.json(getPlatformSnapshot());
}
