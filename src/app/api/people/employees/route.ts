import { NextResponse } from "next/server";
import { roleCanAccessPeople } from "@/lib/auth";
import { createEmployeeRecord, listEmployeeRecords, requestEmployeeHire } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "unknown_error";
}

async function assertPeopleAdminAccess() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  if (!roleCanAccessPeople(profile.role)) {
    throw new Error("forbidden");
  }
  return profile;
}

export async function GET() {
  try {
    await assertPeopleAdminAccess();
    return NextResponse.json({ employees: await listEmployeeRecords() });
  } catch (error) {
    const message = getErrorMessage(error);
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("employee_limit_reached:")
            ? 409
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await assertPeopleAdminAccess();
    const body = (await request.json()) as {
      fullName: string;
      departmentId?: string | null;
      branchId?: string | null;
      department?: string;
      branch?: string;
      employmentType: string;
      salary?: number;
      hireDate?: string;
      designationId?: string;
      phone?: string;
      kraPin?: string;
      shifNumber?: string;
      nssfNumber?: string;
      supervisorEmployeeId?: string | null;
      probationMonths?: number;
      contractDurationMonths?: number | null;
    };

    if (profile.role === "Supervisor") {
      if (!body.hireDate || !body.designationId || typeof body.salary !== "number") {
        return NextResponse.json({ error: "missing_hire_request_fields" }, { status: 400 });
      }

      return NextResponse.json(
        await requestEmployeeHire({
          fullName: body.fullName,
          departmentId: body.departmentId,
          branchId: body.branchId,
          employmentType: body.employmentType,
          salary: body.salary,
          hireDate: body.hireDate,
          designationId: body.designationId,
          phone: body.phone,
          kraPin: body.kraPin,
          shifNumber: body.shifNumber,
          nssfNumber: body.nssfNumber,
          supervisorEmployeeId: body.supervisorEmployeeId ?? null,
          probationMonths: body.probationMonths,
          contractDurationMonths: body.contractDurationMonths ?? null,
        }),
        { status: 201 }
      );
    }

    return NextResponse.json(
      await createEmployeeRecord({
        fullName: body.fullName,
        departmentId: body.departmentId,
        branchId: body.branchId,
        department: body.department,
        branch: body.branch,
        employmentType: body.employmentType,
        salary: body.salary,
        hireDate: body.hireDate,
        designationId: body.designationId,
        phone: body.phone,
        kraPin: body.kraPin,
        shifNumber: body.shifNumber,
        nssfNumber: body.nssfNumber,
        supervisorEmployeeId: body.supervisorEmployeeId ?? null,
        probationMonths: body.probationMonths,
        contractDurationMonths: body.contractDurationMonths ?? null,
      }),
      { status: 201 }
    );
  } catch (error) {
    const message = getErrorMessage(error);
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
