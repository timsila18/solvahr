import { NextResponse } from "next/server";
import { updateAppraisalReview } from "@/lib/performance-management";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;
    const body = (await request.json()) as {
      stage?: "self" | "supervisor" | "gm";
      submit?: boolean;
      selfComments?: string;
      supervisorComments?: string;
      gmComments?: string;
      hrComments?: string;
      performanceDiscussionHeld?: boolean;
      discussionHelped?: boolean;
      supervisorContributionComments?: string;
      challengesSummary?: string;
      issuesAffectingPerformance?: string;
      correctiveAction?: string;
      nextQuarterActions?: string;
      developmentNeeds?: string;
      supportRequired?: string;
      rewardRecommendation?: string;
      sanctionRecommendation?: string;
      trainingRecommendation?: string;
      pipRecommendation?: boolean;
      promotionRecommendation?: boolean;
      gmEndorsement?: string;
      potentialRating?: string;
      finalDecision?: string;
      probationOutcome?: string;
      itemUpdates?: Array<{
        id: string;
        actualText?: string;
        actualValue?: number;
        selfScore?: number;
        supervisorScore?: number;
        gmScore?: number;
        evidenceNotes?: string;
        evaluatorComments?: string;
      }>;
    };

    return NextResponse.json(
      await updateAppraisalReview(reviewId, {
        stage: body.stage ?? "supervisor",
        submit: body.submit,
        selfComments: body.selfComments,
        supervisorComments: body.supervisorComments,
        gmComments: body.gmComments,
        hrComments: body.hrComments,
        performanceDiscussionHeld: body.performanceDiscussionHeld,
        discussionHelped: body.discussionHelped,
        supervisorContributionComments: body.supervisorContributionComments,
        challengesSummary: body.challengesSummary,
        issuesAffectingPerformance: body.issuesAffectingPerformance,
        correctiveAction: body.correctiveAction,
        nextQuarterActions: body.nextQuarterActions,
        developmentNeeds: body.developmentNeeds,
        supportRequired: body.supportRequired,
        rewardRecommendation: body.rewardRecommendation,
        sanctionRecommendation: body.sanctionRecommendation,
        trainingRecommendation: body.trainingRecommendation,
        pipRecommendation: body.pipRecommendation,
        promotionRecommendation: body.promotionRecommendation,
        gmEndorsement: body.gmEndorsement,
        potentialRating: body.potentialRating,
        finalDecision: body.finalDecision,
        probationOutcome: body.probationOutcome,
        itemUpdates: body.itemUpdates,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "performance_review_not_found"
            || message === "appraisal_review_not_found"
            ? 404
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
