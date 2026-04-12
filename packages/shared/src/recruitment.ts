export type CandidatePipelineStage =
  | "applied"
  | "screening"
  | "shortlisted"
  | "interview"
  | "background_check"
  | "offer"
  | "hired"
  | "rejected"
  | "talent_pool";

export type CandidatePipelineSummary = {
  stage: CandidatePipelineStage;
  label: string;
  count: number;
};

export const candidateStageLabels: Record<CandidatePipelineStage, string> = {
  applied: "Applied",
  screening: "Screening",
  shortlisted: "Shortlisted",
  interview: "Interview",
  background_check: "Background Check",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  talent_pool: "Talent Pool"
};

export function summarizePipeline(stages: CandidatePipelineStage[]): CandidatePipelineSummary[] {
  const counts = stages.reduce<Record<CandidatePipelineStage, number>>(
    (accumulator, stage) => {
      accumulator[stage] += 1;
      return accumulator;
    },
    {
      applied: 0,
      screening: 0,
      shortlisted: 0,
      interview: 0,
      background_check: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
      talent_pool: 0
    }
  );

  return Object.entries(counts).map(([stage, count]) => ({
    stage: stage as CandidatePipelineStage,
    label: candidateStageLabels[stage as CandidatePipelineStage],
    count
  }));
}
