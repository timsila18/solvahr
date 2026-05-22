import { NextResponse } from "next/server";
import { createLeaveRequest, listHolidays, listLeaveBalances, listLeavePolicies, listLeaveRequests } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    if (view === "setup") {
      const [balances, holidays, policies] = await Promise.all([
        listLeaveBalances(),
        listHolidays(),
        listLeavePolicies(),
      ]);
      return NextResponse.json({ balances, holidays, policies });
    }

    const [requests, balances, holidays, policies] = await Promise.all([
      listLeaveRequests(),
      listLeaveBalances(),
      listHolidays(),
      listLeavePolicies(),
    ]);
    return NextResponse.json({ requests, balances, holidays, policies });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      leaveType?: string;
      startDate?: string;
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

    if (!body.leaveType || !body.startDate) {
      return NextResponse.json({ error: "missing_leave_request_fields" }, { status: 400 });
    }

    return NextResponse.json(
      await createLeaveRequest({
        employeeName: profile.full_name,
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
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "missing_leave_request_fields"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
