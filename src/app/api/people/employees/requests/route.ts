import { NextResponse } from "next/server";
import { requestEmployeeExit, requestEmployeeHire } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as
      | {
          type: "hire";
          fullName?: string;
          employmentType?: string;
          salary?: number;
          hireDate?: string;
          designationId?: string;
          phone?: string;
          kraPin?: string;
          shifNumber?: string;
          nssfNumber?: string;
          departmentId?: string | null;
          branchId?: string | null;
          supervisorEmployeeId?: string | null;
          probationMonths?: number;
          contractDurationMonths?: number | null;
        }
      | {
          type: "exit";
          employeeId?: string;
          reason?: string;
          effectiveDate?: string;
          comments?: string;
        };

    if (body.type === "hire") {
      if (
        !body.fullName ||
        !body.employmentType ||
        typeof body.salary !== "number" ||
        !body.hireDate ||
        !body.designationId
      ) {
        return NextResponse.json({ error: "missing_hire_request_fields" }, { status: 400 });
      }

      return NextResponse.json(
        {
          request: await requestEmployeeHire({
            fullName: body.fullName,
            employmentType: body.employmentType,
            salary: body.salary,
            hireDate: body.hireDate,
            designationId: body.designationId,
            phone: body.phone,
            kraPin: body.kraPin,
            shifNumber: body.shifNumber,
            nssfNumber: body.nssfNumber,
            departmentId: body.departmentId ?? null,
            branchId: body.branchId ?? null,
            supervisorEmployeeId: body.supervisorEmployeeId ?? null,
            probationMonths: body.probationMonths,
            contractDurationMonths: body.contractDurationMonths ?? null,
          }),
        },
        { status: 201 }
      );
    }

    if (body.type === "exit") {
      if (!body.employeeId || !body.reason) {
        return NextResponse.json({ error: "missing_exit_request_fields" }, { status: 400 });
      }

      return NextResponse.json(
        {
          request: await requestEmployeeExit({
            employeeId: body.employeeId,
            reason: body.reason,
            effectiveDate: body.effectiveDate,
            comments: body.comments,
          }),
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "unsupported_employee_request_type" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("missing_") || message.endsWith("_not_found")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
