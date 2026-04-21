import { NextResponse } from "next/server";
import { getPayrollPackage, recordPayrollExport } from "@/lib/mock-platform-store";

export async function GET() {
  return NextResponse.json({ payroll: getPayrollPackage() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    exportType: "net_to_bank" | "paye_report" | "payroll_register" | "p9_forms";
    actorEmail: string;
    actorRole: string;
  };

  return NextResponse.json(
    recordPayrollExport({
      exportType: body.exportType,
      actorEmail: body.actorEmail,
      actorRole: body.actorRole,
    }),
    { status: 201 }
  );
}
