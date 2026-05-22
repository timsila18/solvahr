import { NextResponse } from "next/server";
import { createSalaryChangeRequest, listSalaryChangeRequests } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ requests: await listSalaryChangeRequests() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      employeeId?: string;
      proposedSalary?: number;
      effectiveDate?: string;
      reason?: string;
      supportingComments?: string;
    };

    if (!body.employeeId || !body.effectiveDate || !body.reason || typeof body.proposedSalary !== "number") {
      return NextResponse.json({ error: "missing_salary_change_fields" }, { status: 400 });
    }

    return NextResponse.json(
      {
        request: await createSalaryChangeRequest({
          employeeId: body.employeeId,
          proposedSalary: body.proposedSalary,
          effectiveDate: body.effectiveDate,
          reason: body.reason,
          supportingComments: body.supportingComments,
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
          : message.startsWith("missing_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
