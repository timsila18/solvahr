import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/session";

type AiContextTask = {
  requestType?: string;
  title?: string;
  employee?: string;
  ownerRole?: string;
  status?: string;
  submittedDate?: string;
  latestComment?: string;
};

type AiInsight = {
  title?: string;
  detail?: string;
  tone?: string;
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

function extractJsonObject(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? text.match(/```\s*([\s\S]*?)```/i)?.[1] ?? "";
  const candidate = fenced || text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const objectText = firstBrace >= 0 && lastBrace > firstBrace ? candidate.slice(firstBrace, lastBrace + 1) : candidate;
  return JSON.parse(objectText) as Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      prompt?: string;
      roleName?: string;
      workspaceName?: string;
      moduleKey?: string;
      moduleTitle?: string;
      activeItem?: string;
      payrollPeriod?: string;
      payrollValidationErrors?: number;
      employeeCount?: number;
      insightFeed?: AiInsight[];
      pendingTasks?: AiContextTask[];
    };

    const prompt = safeString(body.prompt);
    if (!prompt) {
      return NextResponse.json({ error: "prompt_required" }, { status: 400 });
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

    const insightSummary = Array.isArray(body.insightFeed)
      ? body.insightFeed
          .slice(0, 6)
          .map((item) => `- ${safeString(item.title)}: ${safeString(item.detail)}${safeString(item.tone) ? ` (${safeString(item.tone)})` : ""}`)
          .join("\n")
      : "";

    const taskSummary = Array.isArray(body.pendingTasks)
      ? body.pendingTasks
          .slice(0, 8)
          .map(
            (task, index) =>
              `${index + 1}. ${safeString(task.requestType, "Task")} | ${safeString(task.title)} | ${safeString(task.employee, "No employee")} | ${safeString(task.ownerRole)} | ${safeString(task.status)} | ${safeString(task.submittedDate)}${safeString(task.latestComment) ? ` | latest comment: ${safeString(task.latestComment)}` : ""}`
          )
          .join("\n")
      : "";

    const systemPrompt = [
      "You are Solva AI inside Solva HR, a professional HR and payroll copilot.",
      "Stay grounded in the supplied workspace context and the authenticated user's scope.",
      "Be practical, concise, and operationally useful.",
      "You may explain, summarize, suggest, draft approval or rejection comments, draft responses, and point out likely risks or missing data.",
      "Do not claim to have executed payroll runs, approvals, profile updates, notifications, or any irreversible action.",
      "If the user asks for an execution, tell them the safest next step and, where useful, draft the wording they can use.",
      "Do not invent employee records, leave balances, payroll figures, or approvals that are not in the supplied context.",
      'Return JSON with keys: "answer" (string) and "suggestedActions" (array of short strings).',
    ].join(" ");

    const userPrompt = [
      `Authenticated role: ${safeString(profile.role)}.`,
      `Workspace: ${safeString(body.workspaceName, "Solva HR")}.`,
      `Current module: ${safeString(body.moduleTitle, safeString(body.moduleKey))}.`,
      `Current page: ${safeString(body.activeItem)}.`,
      `Payroll period in view: ${safeString(body.payrollPeriod, "-")}.`,
      `Visible payroll validation errors: ${typeof body.payrollValidationErrors === "number" ? body.payrollValidationErrors : 0}.`,
      `Visible employee count: ${typeof body.employeeCount === "number" ? body.employeeCount : 0}.`,
      insightSummary ? `Insights:\n${insightSummary}` : "",
      taskSummary ? `Pending tasks in scope:\n${taskSummary}` : "",
      `User request: ${prompt}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = extractJsonObject(content);
    } catch {
      parsed = null;
    }
    const suggestedActions = Array.isArray(parsed?.suggestedActions)
      ? parsed.suggestedActions.map((value) => safeString(value)).filter(Boolean).slice(0, 5)
      : [];

    return NextResponse.json({
      answer: safeString(parsed?.answer, content),
      suggestedActions,
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
