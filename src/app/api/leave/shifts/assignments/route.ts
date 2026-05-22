import { NextResponse } from "next/server";
import { createManualShiftAssignment } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      employeeId?: string;
      assignmentDate?: string;
      shiftCode?: string;
    };

    if (!body.employeeId || !body.assignmentDate || !body.shiftCode) {
      return NextResponse.json({ error: "missing_shift_assignment_fields" }, { status: 400 });
    }

    return NextResponse.json(
      {
        assignment: await createManualShiftAssignment({
          employeeId: body.employeeId,
          assignmentDate: body.assignmentDate,
          shiftCode: body.shiftCode as never,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("missing_") || message.startsWith("invalid_") || message.endsWith("_not_found")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
