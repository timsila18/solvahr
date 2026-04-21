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
      exportType: "net_to_bank" | "paye_report" | "payroll_register" | "p9_forms";
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
