import { NextResponse } from "next/server";
import {
  createEmployeeActivationRequest,
  createPayrollApprovalRequest,
  listApprovalTasks,
} from "@/lib/mock-platform-store";

export async function GET() {
  return NextResponse.json({ tasks: listApprovalTasks() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as
    | {
        kind: "employee_activation";
        employeeName: string;
        department: string;
        branch: string;
        employmentType: string;
        actorEmail: string;
        actorRole: string;
      }
    | {
        kind: "payroll_approval";
        period: string;
        grossPay: string;
        netPay: string;
        employeeCount: string;
        actorEmail: string;
        actorRole: string;
      };

  if (body.kind === "employee_activation") {
    return NextResponse.json(
      createEmployeeActivationRequest({
        employeeName: body.employeeName,
        department: body.department,
        branch: body.branch,
        employmentType: body.employmentType,
        actorEmail: body.actorEmail,
        actorRole: body.actorRole,
      }),
      { status: 201 }
    );
  }

  return NextResponse.json(
    createPayrollApprovalRequest({
      period: body.period,
      grossPay: body.grossPay,
      netPay: body.netPay,
      employeeCount: body.employeeCount,
      actorEmail: body.actorEmail,
      actorRole: body.actorRole,
    }),
    { status: 201 }
  );
}
