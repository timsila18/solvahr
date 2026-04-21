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
} from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ tasks: await listApprovalTasks() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
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
        await createEmployeeActivationRequest({
          employeeName: body.employeeName,
          department: body.department,
          branch: body.branch,
          employmentType: body.employmentType,
        }),
        { status: 201 }
      );
    }

    if (body.kind === "leave_request") {
      return NextResponse.json(
        await createLeaveRequest({
          employeeName: body.employeeName,
          leaveType: body.leaveType,
          days: body.days,
          startDate: body.startDate,
        }),
        { status: 201 }
      );
    }

    if (body.kind === "requisition_approval") {
      return NextResponse.json(
        await createRequisitionApprovalRequest({
          roleTitle: body.roleTitle,
          headcount: body.headcount,
        }),
        { status: 201 }
      );
    }

    if (body.kind === "profile_update") {
      return NextResponse.json(
        await createProfileUpdateRequest({
          employeeName: body.employeeName,
          fieldName: body.fieldName,
          newValue: body.newValue,
        }),
        { status: 201 }
      );
    }

    if (body.kind === "training_request") {
      return NextResponse.json(
        await createTrainingRequest({
          employeeName: body.employeeName,
          programName: body.programName,
          schedule: body.schedule,
          budget: body.budget,
        }),
        { status: 201 }
      );
    }

    if (body.kind === "asset_request") {
      return NextResponse.json(
        await createAssetRequest({
          employeeName: body.employeeName,
          assetName: body.assetName,
          requestType: body.requestType,
          branch: body.branch,
        }),
        { status: 201 }
      );
    }

    return NextResponse.json(
      await createPayrollApprovalRequest({
        period: body.period,
        grossPay: body.grossPay,
        netPay: body.netPay,
        employeeCount: body.employeeCount,
      }),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
