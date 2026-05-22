import { NextResponse } from "next/server";
import { createLeaveRequest, listLeaveRequests } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ requests: await listLeaveRequests() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      employeeName: string;
      leaveType: string;
      startDate: string;
      endDate?: string;
      days?: string;
      reason?: string;
      requestCategory?: string;
      leaveAddress?: string;
      contactPhone?: string;
      cellPhone?: string;
      relievingOfficer?: string;
      attachmentNote?: string;
    };

    return NextResponse.json(
      await createLeaveRequest({
        employeeName: body.employeeName,
        leaveType: body.leaveType,
        days: body.days,
        startDate: body.startDate,
        endDate: body.endDate,
        reason: body.reason,
        requestCategory: body.requestCategory,
        leaveAddress: body.leaveAddress,
        contactPhone: body.contactPhone,
        cellPhone: body.cellPhone,
        relievingOfficer: body.relievingOfficer,
        attachmentNote: body.attachmentNote,
      }),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
