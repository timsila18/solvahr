import { NextResponse } from "next/server";
import {
  createAppraisalCycle,
  createPerformanceGoal,
  createPerformanceKpi,
  createPerformancePip,
  createPerformanceWorkPlan,
  createPromotionCase,
  createSuccessionCandidate,
  createSuccessionRole,
  createTalentAssessment,
  getPerformanceWorkspace,
} from "@/lib/performance-management";

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const message = "message" in error && typeof error.message === "string" ? error.message : "";
    const details = "details" in error && typeof error.details === "string" ? error.details : "";
    const code = "code" in error && typeof error.code === "string" ? error.code : "";
    return message || details || code || JSON.stringify(error);
  }
  return String(error || "unknown_error");
}

export async function GET() {
  try {
    return NextResponse.json({ workspace: await getPerformanceWorkspace() });
  } catch (error) {
    const message = resolveErrorMessage(error);
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const entityType = typeof body.entityType === "string" ? body.entityType : "";

    if (!entityType) {
      return NextResponse.json({ error: "missing_performance_entity_type" }, { status: 400 });
    }

    switch (entityType) {
      case "kpi":
        return NextResponse.json(
          {
            kpi: await createPerformanceKpi({
              title: String(body.title ?? ""),
              category: String(body.category ?? ""),
              employeeId: typeof body.employeeId === "string" ? body.employeeId : null,
              departmentId: typeof body.departmentId === "string" ? body.departmentId : null,
              designationId: typeof body.designationId === "string" ? body.designationId : null,
              supervisorEmployeeId:
                typeof body.supervisorEmployeeId === "string" ? body.supervisorEmployeeId : null,
              assignmentScope: typeof body.assignmentScope === "string" ? body.assignmentScope : undefined,
              roleTitle: typeof body.roleTitle === "string" ? body.roleTitle : undefined,
              measurementUnit: typeof body.measurementUnit === "string" ? body.measurementUnit : undefined,
              targetValue: typeof body.targetValue === "number" ? body.targetValue : undefined,
              weightPercent: typeof body.weightPercent === "number" ? body.weightPercent : undefined,
              periodLabel: String(body.periodLabel ?? ""),
              startDate: String(body.startDate ?? ""),
              endDate: String(body.endDate ?? ""),
              evidenceRequired: typeof body.evidenceRequired === "boolean" ? body.evidenceRequired : undefined,
              status: typeof body.status === "string" ? body.status : undefined,
              notes: typeof body.notes === "string" ? body.notes : undefined,
            }),
          },
          { status: 201 }
        );
      case "goal":
        return NextResponse.json(
          {
            goal: await createPerformanceGoal({
              kpiId: typeof body.kpiId === "string" ? body.kpiId : null,
              employeeId: String(body.employeeId ?? ""),
              title: String(body.title ?? ""),
              target: String(body.target ?? ""),
              activities: Array.isArray(body.activities)
                ? (body.activities.filter((item) => Boolean(item) && typeof item === "object") as Array<Record<string, unknown>>)
                : undefined,
              dueDate: typeof body.dueDate === "string" ? body.dueDate : undefined,
              progressPercent: typeof body.progressPercent === "number" ? body.progressPercent : undefined,
              evidenceComments: typeof body.evidenceComments === "string" ? body.evidenceComments : undefined,
              status: typeof body.status === "string" ? body.status : undefined,
              departmentObjective:
                typeof body.departmentObjective === "string" ? body.departmentObjective : undefined,
              expectedOutput: typeof body.expectedOutput === "string" ? body.expectedOutput : undefined,
              performanceIndicator:
                typeof body.performanceIndicator === "string" ? body.performanceIndicator : undefined,
              timeline: typeof body.timeline === "string" ? body.timeline : undefined,
              weighting: typeof body.weighting === "number" ? body.weighting : undefined,
              responsiblePerson:
                typeof body.responsiblePerson === "string" ? body.responsiblePerson : undefined,
              reviewStatus: typeof body.reviewStatus === "string" ? body.reviewStatus : undefined,
            }),
          },
          { status: 201 }
        );
      case "work_plan":
        return NextResponse.json(
          {
            workPlan: await createPerformanceWorkPlan({
              employeeId: String(body.employeeId ?? ""),
              goalId: typeof body.goalId === "string" ? body.goalId : null,
              quarterLabel: String(body.quarterLabel ?? ""),
              departmentObjective: String(body.departmentObjective ?? ""),
              individualTarget: String(body.individualTarget ?? ""),
              quarterlyActivities: Array.isArray(body.quarterlyActivities)
                ? (body.quarterlyActivities.filter((item) => Boolean(item) && typeof item === "object") as Array<Record<string, unknown>>)
                : undefined,
              expectedOutput: typeof body.expectedOutput === "string" ? body.expectedOutput : undefined,
              performanceIndicator:
                typeof body.performanceIndicator === "string" ? body.performanceIndicator : undefined,
              timeline: typeof body.timeline === "string" ? body.timeline : undefined,
              weighting: typeof body.weighting === "number" ? body.weighting : undefined,
              responsiblePerson:
                typeof body.responsiblePerson === "string" ? body.responsiblePerson : undefined,
              reviewStatus: typeof body.reviewStatus === "string" ? body.reviewStatus : undefined,
            }),
          },
          { status: 201 }
        );
      case "cycle":
        return NextResponse.json(
          {
            cycle: await createAppraisalCycle({
              title: String(body.title ?? ""),
              cycleType: String(body.cycleType ?? ""),
              periodStart: String(body.periodStart ?? ""),
              periodEnd: String(body.periodEnd ?? ""),
              departmentIds: Array.isArray(body.departmentIds)
                ? body.departmentIds.filter((item): item is string => typeof item === "string")
                : undefined,
              roleTitles: Array.isArray(body.roleTitles)
                ? body.roleTitles.filter((item): item is string => typeof item === "string")
                : undefined,
              employeeIds: Array.isArray(body.employeeIds)
                ? body.employeeIds.filter((item): item is string => typeof item === "string")
                : undefined,
              scoringModel: typeof body.scoringModel === "string" ? body.scoringModel : undefined,
              selfEvaluationEnabled:
                typeof body.selfEvaluationEnabled === "boolean" ? body.selfEvaluationEnabled : undefined,
              supervisorEvaluationEnabled:
                typeof body.supervisorEvaluationEnabled === "boolean"
                  ? body.supervisorEvaluationEnabled
                  : undefined,
              gmEvaluationEnabled:
                typeof body.gmEvaluationEnabled === "boolean" ? body.gmEvaluationEnabled : undefined,
              payrollAdminVisibilityEnabled:
                typeof body.payrollAdminVisibilityEnabled === "boolean"
                  ? body.payrollAdminVisibilityEnabled
                  : undefined,
              payrollAdminActionEnabled:
                typeof body.payrollAdminActionEnabled === "boolean"
                  ? body.payrollAdminActionEnabled
                  : undefined,
              status: typeof body.status === "string" ? body.status : undefined,
            }),
          },
          { status: 201 }
        );
      case "pip":
        return NextResponse.json(
          {
            pip: await createPerformancePip({
              employeeId: String(body.employeeId ?? ""),
              reviewId: typeof body.reviewId === "string" ? body.reviewId : null,
              issue: String(body.issue ?? ""),
              improvementTarget: String(body.improvementTarget ?? ""),
              supportRequired: typeof body.supportRequired === "string" ? body.supportRequired : undefined,
              reviewDate: typeof body.reviewDate === "string" ? body.reviewDate : undefined,
              status: typeof body.status === "string" ? body.status : undefined,
              outcome: typeof body.outcome === "string" ? body.outcome : undefined,
            }),
          },
          { status: 201 }
        );
      case "promotion_case":
        return NextResponse.json(
          {
            promotionCase: await createPromotionCase({
              employeeId: String(body.employeeId ?? ""),
              reviewId: typeof body.reviewId === "string" ? body.reviewId : null,
              currentRole: String(body.currentRole ?? ""),
              proposedRole: String(body.proposedRole ?? ""),
              currentSalary: typeof body.currentSalary === "number" ? body.currentSalary : 0,
              proposedSalary: typeof body.proposedSalary === "number" ? body.proposedSalary : null,
              performanceJustification: String(body.performanceJustification ?? ""),
              supervisorRecommendation:
                typeof body.supervisorRecommendation === "string"
                  ? body.supervisorRecommendation
                  : undefined,
              gmEndorsement: typeof body.gmEndorsement === "string" ? body.gmEndorsement : undefined,
              hrReview: typeof body.hrReview === "string" ? body.hrReview : undefined,
              payrollImpactFlag:
                typeof body.payrollImpactFlag === "boolean" ? body.payrollImpactFlag : undefined,
              createSalaryRequest:
                typeof body.createSalaryRequest === "boolean" ? body.createSalaryRequest : undefined,
              effectiveDate: typeof body.effectiveDate === "string" ? body.effectiveDate : undefined,
            }),
          },
          { status: 201 }
        );
      case "succession_role":
        return NextResponse.json(
          {
            successionRole: await createSuccessionRole({
              roleTitle: String(body.roleTitle ?? ""),
              departmentId: typeof body.departmentId === "string" ? body.departmentId : null,
              incumbentEmployeeId:
                typeof body.incumbentEmployeeId === "string" ? body.incumbentEmployeeId : null,
              criticality: typeof body.criticality === "string" ? body.criticality : undefined,
              riskLevel: typeof body.riskLevel === "string" ? body.riskLevel : undefined,
              notes: typeof body.notes === "string" ? body.notes : undefined,
            }),
          },
          { status: 201 }
        );
      case "succession_candidate":
        return NextResponse.json(
          {
            successionCandidate: await createSuccessionCandidate({
              successionRoleId: String(body.successionRoleId ?? ""),
              employeeId: String(body.employeeId ?? ""),
              readinessLevel: String(body.readinessLevel ?? ""),
              developmentActions:
                typeof body.developmentActions === "string" ? body.developmentActions : undefined,
              gmComments: typeof body.gmComments === "string" ? body.gmComments : undefined,
              riskLevel: typeof body.riskLevel === "string" ? body.riskLevel : undefined,
              status: typeof body.status === "string" ? body.status : undefined,
            }),
          },
          { status: 201 }
        );
      case "talent_assessment":
        return NextResponse.json(
          {
            talentAssessment: await createTalentAssessment({
              employeeId: String(body.employeeId ?? ""),
              reviewId: typeof body.reviewId === "string" ? body.reviewId : null,
              performanceBand: String(body.performanceBand ?? ""),
              potentialRating: String(body.potentialRating ?? ""),
              notes: typeof body.notes === "string" ? body.notes : undefined,
            }),
          },
          { status: 201 }
        );
      default:
        return NextResponse.json({ error: "unsupported_performance_entity_type" }, { status: 400 });
    }
  } catch (error) {
    const message = resolveErrorMessage(error);
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
