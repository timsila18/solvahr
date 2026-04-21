import { NextResponse } from "next/server";
import { createEmployeeRecord, listEmployeeRecords } from "@/lib/mock-platform-store";

export async function GET() {
  return NextResponse.json({ employees: listEmployeeRecords() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    fullName: string;
    department: string;
    branch: string;
    employmentType: string;
    actorEmail: string;
    actorRole: string;
  };

  return NextResponse.json(
    createEmployeeRecord({
      fullName: body.fullName,
      department: body.department,
      branch: body.branch,
      employmentType: body.employmentType,
      actorEmail: body.actorEmail,
      actorRole: body.actorRole,
    }),
    { status: 201 }
  );
}
