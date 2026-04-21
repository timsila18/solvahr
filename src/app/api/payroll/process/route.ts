import { NextResponse } from "next/server";
import { getPayrollProcessData } from "@/lib/mock-platform-store";

export async function GET() {
  return NextResponse.json({
    process: getPayrollProcessData(),
  });
}
