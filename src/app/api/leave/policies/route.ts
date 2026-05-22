import { NextResponse } from "next/server";
import { createLeavePolicy, listLeavePolicies, listLeaveTypes } from "@/lib/database";

export async function GET() {
  try {
    const [policies, leaveTypes] = await Promise.all([listLeavePolicies(), listLeaveTypes()]);
    return NextResponse.json({ policies, leaveTypes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      leaveType: string;
      policyName: string;
      annualAllowance: string;
      accrualFrequency?: string;
      monthlyAccrualRate?: string;
      reducingBalance?: boolean;
      carryForwardEnabled?: boolean;
      carryForwardLimit?: string;
      requiresAttachment?: boolean;
      payrollImpact?: boolean;
      requestCategory?: string;
      approvalFlow?: string;
      minimumNoticeDays?: string;
      maxConsecutiveDays?: string;
    };

    return NextResponse.json({
      policy: await createLeavePolicy(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
