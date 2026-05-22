import { NextResponse } from "next/server";
import { roleCanAccessPeople } from "@/lib/auth";
import { generateEmployeeHrDocument } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

async function assertPeopleAdminAccess() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  if (!roleCanAccessPeople(profile.role)) {
    throw new Error("forbidden");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    await assertPeopleAdminAccess();
    const { employeeId } = await context.params;
    const body = (await request.json()) as {
      kind: string;
      currentSalary?: number;
      newSalary?: number;
      effectiveDate?: string;
      reason?: string;
      incidentDate?: string;
      facts?: string;
      desiredAction?: string;
      responseHours?: number;
      roleDutyOverrides?: string[];
      autoApprove?: boolean;
    };

    if (!body.kind) {
      return NextResponse.json({ error: "missing_document_kind" }, { status: 400 });
    }

    return NextResponse.json(
      await generateEmployeeHrDocument({
        employeeId,
        kind: body.kind as never,
        currentSalary: body.currentSalary,
        newSalary: body.newSalary,
        effectiveDate: body.effectiveDate,
        reason: body.reason,
        incidentDate: body.incidentDate,
        facts: body.facts,
        desiredAction: body.desiredAction,
        responseHours: body.responseHours,
        roleDutyOverrides: body.roleDutyOverrides,
        autoApprove: body.autoApprove,
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
          : message.startsWith("missing_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
