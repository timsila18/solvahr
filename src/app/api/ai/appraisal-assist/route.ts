import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/session";

type AppraisalAssistMode = "employee_self_review" | "supervisor_review" | "gm_review";

type AppraisalAssistRequest = {
  mode?: AppraisalAssistMode;
  employeeName?: string;
  reviewTitle?: string;
  reviewPeriod?: string;
  selfComments?: string;
  challengesSummary?: string;
  supportRequired?: string;
  supervisorComments?: string;
  gmComments?: string;
  finalDecision?: string;
  allowedOutcomes?: string[];
  areas?: Array<{
    id?: string;
    title?: string;
    expectedOutput?: string;
    performanceIndicator?: string;
    selfScore?: number;
    supervisorScore?: number;
    gmScore?: number;
    evaluatorComments?: string;
  }>;
};

function readConfiguredEnv(value: string | undefined) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === '""' || trimmed === "''") {
    return "";
  }
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return quoted ? trimmed.slice(1, -1).trim() : trimmed;
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractJsonObject(text: string) {
  const fenced =
    text.match(/```json\s*([\s\S]*?)```/i)?.[1] ??
    text.match(/```\s*([\s\S]*?)```/i)?.[1] ??
    "";
  const candidate = fenced || text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const objectText =
    firstBrace >= 0 && lastBrace > firstBrace
      ? candidate.slice(firstBrace, lastBrace + 1)
      : candidate;
  return JSON.parse(objectText) as Record<string, unknown>;
}

function buildAreaSummary(input: AppraisalAssistRequest) {
  return Array.isArray(input.areas)
    ? input.areas
        .slice(0, 12)
        .map((area, index) => {
          const parts = [
            `${index + 1}. ${safeString(area.title, "Area")}`,
            safeString(area.expectedOutput || area.performanceIndicator, ""),
          ].filter(Boolean);
          const selfScore = safeNumber(area.selfScore);
          const supervisorScore = safeNumber(area.supervisorScore);
          const gmScore = safeNumber(area.gmScore);
          if (selfScore !== null) parts.push(`employee score ${selfScore}/5`);
          if (supervisorScore !== null) parts.push(`supervisor score ${supervisorScore}/5`);
          if (gmScore !== null) parts.push(`gm score ${gmScore}/5`);
          if (safeString(area.evaluatorComments)) {
            parts.push(`notes: ${safeString(area.evaluatorComments)}`);
          }
          return parts.join(" | ");
        })
        .join("\n")
    : "";
}

function buildSystemPrompt(mode: AppraisalAssistMode) {
  if (mode === "employee_self_review") {
    return [
      "You are helping an employee draft a practical performance self-review inside Solva HR.",
      "Write naturally, clearly, and credibly.",
      "Do not sound robotic or over-polished.",
      "Do not invent achievements, figures, or incidents that are not implied by the supplied context.",
      "Strengthen weak writing, remove repetition, and keep the tone professional and honest.",
      'Return JSON with keys: "whatWentWell", "challenges", "supportNeeded", "summary".',
    ].join(" ");
  }

  if (mode === "supervisor_review") {
    return [
      "You are helping a supervisor complete a performance review inside Solva HR.",
      "Base your suggestions on the employee self-review and the appraisal areas provided.",
      "Be balanced, specific, and operational.",
      "Do not invent performance incidents or disciplinary issues.",
      "Suggested scores must be integers from 1 to 5.",
      'Return JSON with keys: "supervisorComments", "correctiveAction", "trainingRecommendation", "summary", and "areaSuggestions" (array of { areaId, suggestedScore, note }).',
    ].join(" ");
  }

  return [
    "You are helping a General Manager finalize an appraisal inside Solva HR.",
    "Use a leadership tone that is concise, fair, and decisive.",
    "Do not invent facts that are not present in the supplied review context.",
    "Where an outcome is suggested, choose only from the allowed outcomes if they are provided.",
    "Suggested scores must be integers from 1 to 5.",
    'Return JSON with keys: "gmComments", "finalDecision", "nextQuarterActions", "summary", and "areaSuggestions" (array of { areaId, suggestedScore, note }).',
  ].join(" ");
}

function buildUserPrompt(mode: AppraisalAssistMode, input: AppraisalAssistRequest, role: string) {
  const areaSummary = buildAreaSummary(input);
  return [
    `Authenticated role: ${role}.`,
    `Appraisal mode: ${mode}.`,
    `Employee: ${safeString(input.employeeName, "Employee")}.`,
    `Review: ${safeString(input.reviewTitle, "Performance appraisal")}.`,
    `Period: ${safeString(input.reviewPeriod, "-")}.`,
    safeString(input.selfComments) ? `What went well draft: ${safeString(input.selfComments)}` : "",
    safeString(input.challengesSummary) ? `Challenges draft: ${safeString(input.challengesSummary)}` : "",
    safeString(input.supportRequired) ? `Support needed draft: ${safeString(input.supportRequired)}` : "",
    safeString(input.supervisorComments) ? `Supervisor comments so far: ${safeString(input.supervisorComments)}` : "",
    safeString(input.gmComments) ? `GM comments so far: ${safeString(input.gmComments)}` : "",
    safeString(input.finalDecision) ? `Current final decision: ${safeString(input.finalDecision)}` : "",
    Array.isArray(input.allowedOutcomes) && input.allowedOutcomes.length
      ? `Allowed final outcomes: ${input.allowedOutcomes.join(" | ")}`
      : "",
    areaSummary ? `Appraisal areas:\n${areaSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const input = (await request.json()) as AppraisalAssistRequest;
    const mode = input.mode;
    if (!mode) {
      return NextResponse.json({ error: "mode_required" }, { status: 400 });
    }

    const apiKey = readConfiguredEnv(process.env.OPENAI_API_KEY);
    if (!apiKey) {
      return NextResponse.json({ error: "openai_not_configured" }, { status: 503 });
    }

    const model =
      readConfiguredEnv(process.env.OPENAI_SOLVA_MODEL) ||
      readConfiguredEnv(process.env.OPENAI_CV_PREMIUM_MODEL) ||
      readConfiguredEnv(process.env.OPENAI_MODEL) ||
      readConfiguredEnv(process.env.OPENAI_CV_MODEL) ||
      "gpt-5.5";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages: [
          { role: "system", content: buildSystemPrompt(mode) },
          { role: "user", content: buildUserPrompt(mode, input, safeString(profile.role, "Employee")) },
        ],
      }),
    });

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: safeString(payload.error?.message, "openai_request_failed") },
        { status: 502 }
      );
    }

    const content = safeString(payload.choices?.[0]?.message?.content);
    const parsed = extractJsonObject(content);

    const areaSuggestions = Array.isArray(parsed.areaSuggestions)
      ? parsed.areaSuggestions
          .map((value) => {
            const item =
              value && typeof value === "object" && !Array.isArray(value)
                ? (value as Record<string, unknown>)
                : null;
            if (!item) return null;
            const score = safeNumber(item.suggestedScore);
            return {
              areaId: safeString(item.areaId),
              suggestedScore: score !== null ? Math.min(5, Math.max(1, Math.round(score))) : null,
              note: safeString(item.note),
            };
          })
          .filter(Boolean)
      : [];

    return NextResponse.json({
      whatWentWell: safeString(parsed.whatWentWell),
      challenges: safeString(parsed.challenges),
      supportNeeded: safeString(parsed.supportNeeded),
      supervisorComments: safeString(parsed.supervisorComments),
      correctiveAction: safeString(parsed.correctiveAction),
      trainingRecommendation: safeString(parsed.trainingRecommendation),
      gmComments: safeString(parsed.gmComments),
      finalDecision: safeString(parsed.finalDecision),
      nextQuarterActions: safeString(parsed.nextQuarterActions),
      summary: safeString(parsed.summary, content),
      areaSuggestions,
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
