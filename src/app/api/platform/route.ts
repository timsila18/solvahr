import { NextResponse } from "next/server";
import { getPlatformSnapshot } from "@/lib/solva-data";

export async function GET() {
  return NextResponse.json(getPlatformSnapshot());
}
