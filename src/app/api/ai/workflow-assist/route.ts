import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/session";

type WorkflowAssistMode =
  | "profile_update_request"
  | "training_request"
  | "salary_advance_request"
  | "complaint_submission"
  | "complaint_response"
  | "payslip_explanation";

type WorkflowAssistRequest = {
  mode?: WorkflowAssistMode;
  employeeName?: string;
  fieldName?: string;
  newValue?: string;
  reason?: string;
  programName?: string;
  schedule?: string;
  budget?: string;
  notes?: string;
  category?: string;
  subject?: string;
  details?: string;
  response?: string;
  privateNotes?: string;
  payrollPeriod?: string;
  grossPay?: string;
  netPay?: string;
  deductions?: Record<string, unknown>;
  allowances?: Record<string, unknown>;
};

function readConfiguredEnv(value: string | undefined) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === '""' || trimmed === "''") return "";
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return quoted ? trimmed.slice(1, -1).trim() : trimmed;
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
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

function buildSystemPrompt(mode: WorkflowAssistMode) {
  switch (mode) {
    case "profile_update_request":
      return [
        "You help employees prepare HR-ready profile update requests inside Solva HR.",
        "Improve clarity and professionalism without sounding stiff.",
        "Do not invent facts. Keep the wording short and practical.",
        'Return JSON with keys: "newValue", "reason", "summary".',
      ].join(" ");
    case "training_request":
      return [
        "You help employees prepare short, practical training requests inside Solva HR.",
        "Keep the wording grounded, useful, and operational.",
        "Do not invent qualifications or approvals.",
        'Return JSON with keys: "programName", "notes", "summary".',
      ].join(" ");
    case "salary_advance_request":
      return [
        "You help employees explain salary advance requests clearly and respectfully.",
        "Be concise, believable, and professional.",
        "Do not exaggerate hardship or invent facts.",
        'Return JSON with keys: "reason", "summary".',
      ].join(" ");
    case "complaint_submission":
      return [
        "You help employees write workplace complaints in a calm, factual, professional tone.",
        "Improve structure and clarity without inflaming the issue.",
        "Do not invent incidents, dates, or accusations.",
        'Return JSON with keys: "subject", "details", "summary".',
      ].join(" ");
    case "complaint_response":
      return [
        "You help supervisors or managers draft professional responses to employee complaints.",
        "Be respectful, practical, and resolution-oriented.",
        "Do not admit facts that are not in context, and do not invent private investigation details.",
        'Return JSON with keys: "response", "privateNotes", "summary".',
      ].join(" ");
    case "payslip_explanation":
      return [
        "You explain a payslip clearly for an employee inside Solva HR.",
        "Be simple, practical, and reassuring where appropriate.",
        "Use only the supplied figures.",
        'Return JSON with keys: "summary".',
      ].join(" ");
  }
}

function buildUserPrompt(mode: WorkflowAssistMode, input: WorkflowAssistRequest, role: string) {
  const deductions =
    input.deductions && Object.keys(input.deductions).length
      ? `Deductions: ${Object.entries(input.deductions)
          .map(([key, value]) => `${key} ${String(value)}`)
          .join(" | ")}`
      : "";
  const allowances =
    input.allowances && Object.keys(input.allowances).length
      ? `Allowances: ${Object.entries(input.allowances)
          .map(([key, value]) => `${key} ${String(value)}`)
          .join(" | ")}`
      : "";

  return [
    `Authenticated role: ${role}.`,
    `Workflow assist mode: ${mode}.`,
    safeString(input.employeeName) ? `Employee: ${safeString(input.employeeName)}` : "",
    safeString(input.fieldName) ? `Field being updated: ${safeString(input.fieldName)}` : "",
    safeString(input.newValue) ? `Requested value draft: ${safeString(input.newValue)}` : "",
    safeString(input.reason) ? `Reason draft: ${safeString(input.reason)}` : "",
    safeString(input.programName) ? `Training program draft: ${safeString(input.programName)}` : "",
    safeString(input.schedule) ? `Training schedule: ${safeString(input.schedule)}` : "",
    safeString(input.budget) ? `Training budget: ${safeString(input.budget)}` : "",
    safeString(input.notes) ? `Training notes draft: ${safeString(input.notes)}` : "",
    safeString(input.category) ? `Complaint category: ${safeString(input.category)}` : "",
    safeString(input.subject) ? `Complaint subject draft: ${safeString(input.subject)}` : "",
    safeString(input.details) ? `Complaint details draft: ${safeString(input.details)}` : "",
    safeString(input.response) ? `Response draft: ${safeString(input.response)}` : "",
    safeString(input.privateNotes) ? `Private notes draft: ${safeString(input.privateNotes)}` : "",
    safeString(input.payrollPeriod) ? `Payroll period: ${safeString(input.payrollPeriod)}` : "",
    safeString(input.grossPay) ? `Gross pay: ${safeString(input.grossPay)}` : "",
    safeString(input.netPay) ? `Net pay: ${safeString(input.netPay)}` : "",
    deductions,
    allowances,
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

    const input = (await request.json()) as WorkflowAssistRequest;
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

    return NextResponse.json({
      newValue: safeString(parsed.newValue),
      reason: safeString(parsed.reason),
      programName: safeString(parsed.programName),
      notes: safeString(parsed.notes),
      subject: safeString(parsed.subject),
      details: safeString(parsed.details),
      response: safeString(parsed.response),
      privateNotes: safeString(parsed.privateNotes),
      summary: safeString(parsed.summary, content),
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
