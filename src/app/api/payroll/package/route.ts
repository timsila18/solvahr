import { NextResponse } from "next/server";
import { getPayrollPackage, recordPayrollExport } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ payroll: await getPayrollPackage() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      exportType:
        | "wagebill_report"
        | "earnings_deductions_analysis"
        | "monthly_deduction_posting_list"
        | "net_to_bank"
        | "paye_report"
        | "nssf_report"
        | "shif_report"
        | "helb_report"
        | "payroll_register"
        | "p9_forms"
        | "housing_levy_report";
    };

    return NextResponse.json(
      await recordPayrollExport({
        exportType: body.exportType,
      }),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
