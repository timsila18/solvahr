import { NextResponse } from "next/server";
import { getPayrollPackage, getPayrollVariance } from "@/lib/mock-platform-store";

export async function GET() {
  return NextResponse.json({
    payroll: getPayrollPackage(),
    variance: getPayrollVariance(),
  });
}
