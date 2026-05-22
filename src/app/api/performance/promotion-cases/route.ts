import { NextResponse } from "next/server";
import { createPromotionCase, getPerformanceWorkspace } from "@/lib/performance-management";

export async function GET() {
  try {
    const workspace = await getPerformanceWorkspace();
    return NextResponse.json({ promotionCases: workspace.promotionCases });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const promotionCase = await createPromotionCase({
      employeeId: String(body.employeeId ?? ""),
      reviewId: typeof body.reviewId === "string" ? body.reviewId : null,
      currentRole: String(body.currentRole ?? ""),
      proposedRole: String(body.proposedRole ?? ""),
      currentSalary: typeof body.currentSalary === "number" ? body.currentSalary : 0,
      proposedSalary: typeof body.proposedSalary === "number" ? body.proposedSalary : null,
      performanceJustification: String(body.performanceJustification ?? ""),
      supervisorRecommendation:
        typeof body.supervisorRecommendation === "string" ? body.supervisorRecommendation : undefined,
      gmEndorsement: typeof body.gmEndorsement === "string" ? body.gmEndorsement : undefined,
      hrReview: typeof body.hrReview === "string" ? body.hrReview : undefined,
      payrollImpactFlag: typeof body.payrollImpactFlag === "boolean" ? body.payrollImpactFlag : undefined,
      createSalaryRequest:
        typeof body.createSalaryRequest === "boolean" ? body.createSalaryRequest : undefined,
      effectiveDate: typeof body.effectiveDate === "string" ? body.effectiveDate : undefined,
    });
    return NextResponse.json({ promotionCase }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
