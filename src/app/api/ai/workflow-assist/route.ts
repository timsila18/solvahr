import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/session";

type WorkflowAssistMode =
  | "profile_update_request"
  | "training_request"
  | "salary_advance_request"
  | "complaint_submission"
  | "complaint_response"
  | "payslip_explanation"
  | "leave_request"
  | "salary_review"
  | "hr_document"
  | "employee_exit";

type WorkflowAssistRequest = {
  mode?: WorkflowAssistMode;
  variant?: "draft" | "review" | "shorter" | "formal" | "factual";
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
  kind?: string;
  currentSalary?: string;
  newSalary?: string;
  effectiveDate?: string;
  incidentDate?: string;
  facts?: string;
  desiredAction?: string;
  responseHours?: string;
  roleDutyOverrides?: string[];
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  attachmentNote?: string;
  leaveAddress?: string;
  relievingOfficer?: string;
  comments?: string;
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

function buildSystemPrompt(
  mode: WorkflowAssistMode,
  variant: WorkflowAssistRequest["variant"]
) {
  const variantInstruction =
    variant === "review"
      ? 'First identify weak, unclear, risky, or overly emotional wording. Then improve the draft. Return a short "issues" array with practical warnings.'
      : variant === "shorter"
        ? 'Make the draft shorter and tighter while preserving the meaning. Return a short "issues" array only if something important is still missing.'
        : variant === "formal"
          ? 'Make the draft more formal and polished without sounding robotic. Return a short "issues" array only if something important is still missing.'
          : variant === "factual"
            ? 'Make the draft more factual, neutral, and evidence-focused. Return a short "issues" array only if something important is still missing.'
            : 'Improve the draft directly. Return a short "issues" array only if something important is still missing.';

  switch (mode) {
    case "profile_update_request":
      return [
        "You help employees prepare HR-ready profile update requests inside Solva HR.",
        "Improve clarity and professionalism without sounding stiff.",
        "Do not invent facts. Keep the wording short and practical.",
        variantInstruction,
        'Return JSON with keys: "newValue", "reason", "summary", "issues".',
      ].join(" ");
    case "training_request":
      return [
        "You help employees prepare short, practical training requests inside Solva HR.",
        "Keep the wording grounded, useful, and operational.",
        "Do not invent qualifications or approvals.",
        variantInstruction,
        'Return JSON with keys: "programName", "notes", "summary", "issues".',
      ].join(" ");
    case "salary_advance_request":
      return [
        "You help employees explain salary advance requests clearly and respectfully.",
        "Be concise, believable, and professional.",
        "Do not exaggerate hardship or invent facts.",
        variantInstruction,
        'Return JSON with keys: "reason", "summary", "issues".',
      ].join(" ");
    case "complaint_submission":
      return [
        "You help employees write workplace complaints in a calm, factual, professional tone.",
        "Improve structure and clarity without inflaming the issue.",
        "Do not invent incidents, dates, or accusations.",
        variantInstruction,
        'Return JSON with keys: "subject", "details", "summary", "issues".',
      ].join(" ");
    case "complaint_response":
      return [
        "You help supervisors or managers draft professional responses to employee complaints.",
        "Be respectful, practical, and resolution-oriented.",
        "Do not admit facts that are not in context, and do not invent private investigation details.",
        variantInstruction,
        'Return JSON with keys: "response", "privateNotes", "summary", "issues".',
      ].join(" ");
    case "payslip_explanation":
      return [
        "You explain a payslip clearly for an employee inside Solva HR.",
        "Be simple, practical, and reassuring where appropriate.",
        "Use only the supplied figures.",
        variantInstruction,
        'Return JSON with keys: "summary", "issues".',
      ].join(" ");
    case "leave_request":
      return [
        "You help employees prepare approval-ready leave requests inside Solva HR.",
        "Keep the request practical, respectful, and believable.",
        "Do not invent emergencies, travel plans, or supporting documents.",
        variantInstruction,
        'Return JSON with keys: "reason", "attachmentNote", "summary", "issues".',
      ].join(" ");
    case "salary_review":
      return [
        "You help HR or management write clean salary review justifications inside Solva HR.",
        "Keep the wording professional, specific, and grounded in business reality.",
        "Do not invent approvals, market data, or performance claims that are not supplied.",
        variantInstruction,
        'Return JSON with keys: "reason", "comments", "summary", "issues".',
      ].join(" ");
    case "hr_document":
      return [
        "You help HR teams prepare HR letter content inside Solva HR.",
        "Adapt tone to the document type: formal and positive for commendations or recommendations, careful and factual for disciplinary letters, clear and practical for contracts and appointment letters.",
        "Do not invent incidents, misconduct, or employment terms.",
        variantInstruction,
        'Return JSON with keys: "reason", "facts", "desiredAction", "roleDutyOverrides", "summary", "issues".',
      ].join(" ");
    case "employee_exit":
      return [
        "You help HR, supervisors, and managers draft respectful staff exit notes inside Solva HR.",
        "Keep the comments factual, calm, and operational.",
        "Do not invent misconduct, admissions, or legal language that is not in context.",
        variantInstruction,
        'Return JSON with keys: "comments", "summary", "issues".',
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
    `Requested variant: ${safeString(input.variant, "draft")}.`,
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
    safeString(input.kind) ? `Document type: ${safeString(input.kind)}` : "",
    safeString(input.currentSalary) ? `Current salary: ${safeString(input.currentSalary)}` : "",
    safeString(input.newSalary) ? `New salary: ${safeString(input.newSalary)}` : "",
    safeString(input.effectiveDate) ? `Effective date: ${safeString(input.effectiveDate)}` : "",
    safeString(input.incidentDate) ? `Incident or recognition date: ${safeString(input.incidentDate)}` : "",
    safeString(input.facts) ? `Facts draft: ${safeString(input.facts)}` : "",
    safeString(input.desiredAction) ? `Desired action draft: ${safeString(input.desiredAction)}` : "",
    safeString(input.responseHours) ? `Response hours: ${safeString(input.responseHours)}` : "",
    Array.isArray(input.roleDutyOverrides) && input.roleDutyOverrides.length
      ? `Role duty overrides draft: ${input.roleDutyOverrides.join(" | ")}`
      : "",
    safeString(input.leaveType) ? `Leave type: ${safeString(input.leaveType)}` : "",
    safeString(input.startDate) ? `Leave start date: ${safeString(input.startDate)}` : "",
    safeString(input.endDate) ? `Leave end date: ${safeString(input.endDate)}` : "",
    safeString(input.attachmentNote) ? `Attachment note draft: ${safeString(input.attachmentNote)}` : "",
    safeString(input.leaveAddress) ? `Leave address: ${safeString(input.leaveAddress)}` : "",
    safeString(input.relievingOfficer) ? `Relieving officer: ${safeString(input.relievingOfficer)}` : "",
    safeString(input.comments) ? `Comments draft: ${safeString(input.comments)}` : "",
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
          { role: "system", content: buildSystemPrompt(mode, input.variant) },
          { role: "system", content: `Keep the response strictly in JSON. Do not wrap it in prose.` },
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
      comments: safeString(parsed.comments),
      facts: safeString(parsed.facts),
      desiredAction: safeString(parsed.desiredAction),
      attachmentNote: safeString(parsed.attachmentNote),
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean)
        : [],
      roleDutyOverrides: Array.isArray(parsed.roleDutyOverrides)
        ? parsed.roleDutyOverrides.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean)
        : [],
      summary: safeString(parsed.summary, content),
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
