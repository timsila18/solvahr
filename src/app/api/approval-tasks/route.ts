import { NextResponse } from "next/server";
import {
  createAssetRequest,
  createEmployeeActivationRequest,
  createLeaveRequest,
  createPayrollApprovalRequest,
  createProfileUpdateRequest,
  createRequisitionApprovalRequest,
  createTrainingRequest,
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
      }
    | {
        kind: "leave_request";
        employeeName: string;
        leaveType: string;
        days: string;
        startDate: string;
        actorEmail: string;
        actorRole: string;
      }
    | {
        kind: "requisition_approval";
        roleTitle: string;
        department: string;
        branch: string;
        headcount: string;
        actorEmail: string;
        actorRole: string;
      }
    | {
        kind: "profile_update";
        employeeName: string;
        fieldName: string;
        newValue: string;
        actorEmail: string;
        actorRole: string;
      }
    | {
        kind: "training_request";
        employeeName: string;
        programName: string;
        schedule: string;
        budget: string;
        actorEmail: string;
        actorRole: string;
      }
    | {
        kind: "asset_request";
        employeeName: string;
        assetName: string;
        requestType: string;
        branch: string;
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

  if (body.kind === "leave_request") {
    return NextResponse.json(
      createLeaveRequest({
        employeeName: body.employeeName,
        leaveType: body.leaveType,
        days: body.days,
        startDate: body.startDate,
        actorEmail: body.actorEmail,
        actorRole: body.actorRole,
      }),
      { status: 201 }
    );
  }

  if (body.kind === "requisition_approval") {
    return NextResponse.json(
      createRequisitionApprovalRequest({
        roleTitle: body.roleTitle,
        department: body.department,
        branch: body.branch,
        headcount: body.headcount,
        actorEmail: body.actorEmail,
        actorRole: body.actorRole,
      }),
      { status: 201 }
    );
  }

  if (body.kind === "profile_update") {
    return NextResponse.json(
      createProfileUpdateRequest({
        employeeName: body.employeeName,
        fieldName: body.fieldName,
        newValue: body.newValue,
        actorEmail: body.actorEmail,
        actorRole: body.actorRole,
      }),
      { status: 201 }
    );
  }

  if (body.kind === "training_request") {
    return NextResponse.json(
      createTrainingRequest({
        employeeName: body.employeeName,
        programName: body.programName,
        schedule: body.schedule,
        budget: body.budget,
        actorEmail: body.actorEmail,
        actorRole: body.actorRole,
      }),
      { status: 201 }
    );
  }

  if (body.kind === "asset_request") {
    return NextResponse.json(
      createAssetRequest({
        employeeName: body.employeeName,
        assetName: body.assetName,
        requestType: body.requestType,
        branch: body.branch,
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
