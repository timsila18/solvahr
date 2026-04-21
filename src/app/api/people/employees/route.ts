import { NextResponse } from "next/server";
import { createEmployeeRecord, listEmployeeRecords } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ employees: await listEmployeeRecords() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName: string;
      departmentId?: string | null;
      branchId?: string | null;
      employmentType: string;
    };

    return NextResponse.json(
      await createEmployeeRecord({
        fullName: body.fullName,
        departmentId: body.departmentId,
        branchId: body.branchId,
        employmentType: body.employmentType,
      }),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
