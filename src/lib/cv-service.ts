import { randomBytes, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile, unlink, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as XLSX from "xlsx";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStorageBucketNames } from "@/lib/supabase/env";
import { getCurrentUserProfile } from "@/lib/session";
import {
  buildCvDocx,
  buildCvPdf,
  generateStructuredCv,
  type CvPackageKey,
  type CvSectionKey,
  type CvServiceEducationEntry,
  type CvServiceExperienceEntry,
  type CvServicePackageDefinition,
  type CvServiceQualificationEntry,
  type CvServiceRefereeEntry,
  type CvServiceSkillEntry,
  type CvTemplateKey,
  type GeneratedCvModel,
} from "@/lib/cv-service-documents";

const execFileAsync = promisify(execFile);

export type {
  CvPackageKey,
  CvServiceEducationEntry,
  CvServiceExperienceEntry,
  CvServicePackageDefinition,
  CvServiceQualificationEntry,
  CvServiceRefereeEntry,
  CvServiceSkillEntry,
} from "@/lib/cv-service-documents";

type CvServiceOrderRow = Record<string, unknown>;

export type CvServiceMode = "upload" | "manual";

export type CvServiceExtractionPreview = {
  customerName: string;
  phone: string;
  email: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  currentProfession: string;
  careerObjective: string;
  majorAchievements: string;
  educationEntries: CvServiceEducationEntry[];
  qualificationEntries: CvServiceQualificationEntry[];
  experienceEntries: CvServiceExperienceEntry[];
  skillEntries: CvServiceSkillEntry[];
  refereeEntries: CvServiceRefereeEntry[];
  extractedSummary: string;
  reviewFlags: string[];
  rawTextPreview: string;
};

export const CV_SERVICE_PACKAGES: CvServicePackageDefinition[] = [
  {
    key: "entry",
    name: "Entry Level Application CV",
    price: 1000,
    bestFor: "Students, interns, fresh graduates, entry-level applicants, and junior staff.",
    contentDepth: "Good content depth",
    designLevel: "Clean simple modern",
    turnaroundPlaceholder: "Within one working day",
    outputFormats: "DOCX + PDF",
    description:
      "ATS-compliant wording, simple graphics, and a clean structure suited for early-career applications.",
  },
  {
    key: "mid",
    name: "Middle-Level Management Application CV",
    price: 3000,
    bestFor: "Officers, supervisors, administrators, coordinators, and mid-level professionals.",
    contentDepth: "Achievement-focused professional depth",
    designLevel: "Refined professional design",
    turnaroundPlaceholder: "Within one to two working days",
    outputFormats: "DOCX + PDF",
    description:
      "Stronger professional content, clearer achievements, and better positioning for serious career progression.",
  },
  {
    key: "senior",
    name: "Senior Management Level Application CV",
    price: 5000,
    bestFor: "Managers, senior officers, department heads, consultants, and specialists.",
    contentDepth: "Detailed content and leadership framing",
    designLevel: "Premium leadership layout",
    turnaroundPlaceholder: "Within two working days",
    outputFormats: "DOCX + PDF",
    description:
      "Leadership-focused, metrics-aware, and premium in tone while remaining ATS-friendly and easy to parse.",
  },
  {
    key: "executive",
    name: "CEO / Executive Level Application CV",
    price: 10000,
    bestFor: "CEOs, directors, executives, founders, board-level candidates, and top leadership roles.",
    contentDepth: "Deep executive content",
    designLevel: "Executive premium design",
    turnaroundPlaceholder: "Priority executive turnaround",
    outputFormats: "DOCX + PDF",
    description:
      "Boardroom-level positioning with leadership narrative, governance language, and premium executive presentation.",
  },
];

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

const CV_AI_BASE_MODEL =
  readConfiguredEnv(process.env.OPENAI_CV_MODEL) ||
  readConfiguredEnv(process.env.OPENAI_MODEL) ||
  "gpt-5.4-mini";
const CV_AI_PREMIUM_MODEL =
  readConfiguredEnv(process.env.OPENAI_CV_PREMIUM_MODEL) ||
  readConfiguredEnv(process.env.OPENAI_CV_EXECUTIVE_MODEL) ||
  "gpt-5.5";
const CV_AI_COST_ESTIMATES_KES: Record<CvPackageKey, number> = {
  entry: 5,
  mid: 8,
  senior: 12,
  executive: 20,
};

export type CvServiceWizardPayload = {
  sourceMode: CvServiceMode;
  packageKey: CvPackageKey;
  customerName: string;
  phone: string;
  email: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  targetRole: string;
  industry: string;
  countryRegion: string;
  preferredCvStyle: string;
  jobDescription: string;
  currentProfession: string;
  yearsOfExperience: number;
  careerObjective: string;
  majorAchievements: string;
  preferredTone: string;
  educationEntries: CvServiceEducationEntry[];
  qualificationEntries: CvServiceQualificationEntry[];
  experienceEntries: CvServiceExperienceEntry[];
  skillEntries: CvServiceSkillEntry[];
  refereeEntries: CvServiceRefereeEntry[];
  existingCvText: string;
  existingCvPaste: string;
  specialInstructions: string;
  refereesOnRequest?: boolean;
  extractionPreview?: CvServiceExtractionPreview | null;
  uploadedCvPath?: string | null;
  uploadedCvName?: string | null;
  uploadedCvMime?: string | null;
  uploadedCvSize?: number | null;
  profilePhotoPath?: string | null;
  profilePhotoName?: string | null;
  profilePhotoMime?: string | null;
  profilePhotoSize?: number | null;
};

export type CvServicePublicOrder = {
  id: string;
  publicToken: string;
  sourceMode: CvServiceMode;
  packageKey: CvPackageKey;
  packageName: string;
  packagePrice: number;
  customerName: string;
  phone: string;
  email: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  targetRole: string;
  industry: string;
  countryRegion: string;
  preferredCvStyle: string;
  jobDescription: string;
  currentProfession: string;
  yearsOfExperience: number;
  careerObjective: string;
  majorAchievements: string;
  preferredTone: string;
  educationEntries: CvServiceEducationEntry[];
  qualificationEntries: CvServiceQualificationEntry[];
  experienceEntries: CvServiceExperienceEntry[];
  skillEntries: CvServiceSkillEntry[];
  refereeEntries: CvServiceRefereeEntry[];
  existingCvText: string;
  existingCvPaste: string;
  specialInstructions: string;
  refereesOnRequest: boolean;
  paymentStatus: string;
  generationStatus: string;
  orderStatus: string;
  expiresAt: string;
  generatedAt: string;
  generatedAtLabel: string;
  uploadedCvName: string;
  uploadedCvMime: string;
  profilePhotoName: string;
  profilePhotoMime: string;
  profilePhotoUrl?: string | null;
  amount: number;
  generatedDownloadLinks: {
    docx: string | null;
    pdf: string | null;
  };
  generatedPreview: Record<string, unknown> | null;
  extractionPreview: CvServiceExtractionPreview | null;
  reviewNotes: string[];
  atsScore: number;
  readabilityScore: number;
  improvementSummary: string[];
  careerStrategy: Record<string, unknown> | null;
  atsAnalysis: Record<string, unknown> | null;
  qualityStatus: string;
  qualityIssues: string[];
  uploadedCvUrl?: string | null;
  generationEngine?: string;
  estimatedProcessingCostKes?: number;
  downloadCount: number;
  generationAttempts: number;
};

export type CvServiceAdminDashboard = {
  metrics: {
    totalOrders: number;
    uploadedCvOrders: number;
    formCreatedOrders: number;
    pendingPayments: number;
    paidOrders: number;
    generatedCvs: number;
    failedPayments: number;
    failedGenerations: number;
    abandonedApplications: number;
    downloads: number;
    revenueByPackage: Array<{ packageName: string; revenue: number; count: number }>;
  };
  orders: Array<Record<string, unknown>>;
};

export type CvServiceAdminEditPayload = {
  professionalHeadline?: string;
  professionalSummary?: string;
  keyAchievements?: string[];
  adminNotes?: string;
};

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function safeBoolean(value: unknown) {
  return value === true || value === "true";
}

function asArray<T extends Record<string, unknown>>(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is T => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function getPackageDefinition(packageKey: string) {
  const packageDefinition = CV_SERVICE_PACKAGES.find((entry) => entry.key === packageKey);
  if (!packageDefinition) {
    throw new Error("invalid_cv_package");
  }
  return packageDefinition;
}

function buildOrderToken() {
  return randomBytes(18).toString("hex");
}

function mapEducationEntries(value: unknown): CvServiceEducationEntry[] {
  return asArray<Record<string, unknown>>(value).map((entry) => ({
    institution: safeString(entry.institution),
    qualification: safeString(entry.qualification),
    year: safeString(entry.year),
    grade: safeString(entry.grade),
  }));
}

function mapQualificationEntries(value: unknown): CvServiceQualificationEntry[] {
  return asArray<Record<string, unknown>>(value).map((entry) => ({
    name: safeString(entry.name),
    issuer: safeString(entry.issuer),
    year: safeString(entry.year),
    type: safeString(entry.type),
  }));
}

function mapExperienceEntries(value: unknown): CvServiceExperienceEntry[] {
  return asArray<Record<string, unknown>>(value).map((entry) => ({
    employer: safeString(entry.employer),
    jobTitle: safeString(entry.jobTitle),
    startDate: safeString(entry.startDate),
    endDate: safeString(entry.endDate),
    currentRole: safeBoolean(entry.currentRole),
    duties: safeString(entry.duties),
    achievements: safeString(entry.achievements),
    tools: safeString(entry.tools),
    leadership: safeString(entry.leadership),
  }));
}

function mapSkillEntries(value: unknown): CvServiceSkillEntry[] {
  return asArray<Record<string, unknown>>(value).map((entry) => ({
    category: safeString(entry.category),
    items: safeString(entry.items),
  }));
}

function mapRefereeEntries(value: unknown): CvServiceRefereeEntry[] {
  return asArray<Record<string, unknown>>(value).map((entry) => ({
    name: safeString(entry.name),
    designation: safeString(entry.designation),
    organization: safeString(entry.organization),
    phone: safeString(entry.phone),
    email: safeString(entry.email),
    relationship: safeString(entry.relationship),
  }));
}

function validateReferees(referees: CvServiceRefereeEntry[], onRequest = false, sourceMode: CvServiceMode = "manual") {
  if (sourceMode === "upload") {
    return;
  }
  if (!onRequest && referees.filter((entry) => safeString(entry.name)).length < 3) {
    throw new Error("minimum_three_referees_required");
  }
}

function normaliseLines(value: string) {
  return safeString(value)
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normaliseListItems(value: string) {
  return safeString(value)
    .split(/[\n,;|]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function containsLikelyContactNoise(value: string) {
  return /@|\b(?:\+254|0)\d{9}\b|\bCV FOR\b|\bphone\b|\bemail\b/i.test(safeString(value));
}

function parseSection(text: string, headings: string[]) {
  const escaped = headings.map((heading) => heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${escaped.join("|")})\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:[A-Z][A-Za-z &/]{2,40}|${escaped.join("|")})\\s*:??\\s*\\n|$)`, "i");
  return safeString(text.match(pattern)?.[1] ?? "");
}

function parseEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function parsePhone(text: string) {
  return text.match(/(?:\+254|0)\d{9}/)?.[0] ?? "";
}

function parseLinkedin(text: string) {
  return text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] ?? "";
}

function parsePortfolio(text: string) {
  const urls = [...text.matchAll(/https?:\/\/[^\s)]+/gi)].map((match) => match[0]);
  return urls.find((url) => !/linkedin\.com/i.test(url)) ?? "";
}

function parseName(lines: string[]) {
  return (
    lines.find((line) => /^[A-Za-z][A-Za-z .'-]{4,60}$/.test(line) && !/@/.test(line) && !/\d{4,}/.test(line)) ?? ""
  );
}

function normalizeExtractedDocumentText(text: string) {
  return safeString(text)
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeExtractionPreview(preview: CvServiceExtractionPreview): CvServiceExtractionPreview {
  return {
    ...preview,
    customerName: safeString(preview.customerName).replace(/^cv for\s+/i, "").trim(),
    currentProfession: containsLikelyContactNoise(preview.currentProfession) ? "" : safeString(preview.currentProfession),
    majorAchievements: safeString(preview.majorAchievements).replace(/^professional summary[:\s-]*/i, "").trim(),
    extractedSummary: normalizeExtractedDocumentText(preview.extractedSummary).replace(/^professional summary[:\s-]*/i, "").trim(),
    rawTextPreview: normalizeExtractedDocumentText(preview.rawTextPreview),
    reviewFlags: uniqueStrings(preview.reviewFlags.map((entry) => safeString(entry)).filter(Boolean), 8),
  };
}

function parseExperienceEntries(section: string): CvServiceExperienceEntry[] {
  const normalizedSection = safeString(section)
    .replace(/\r/g, "")
    .replace(/\u2022/g, "\n- ");
  const blocks = normalizedSection
    .split(/\n{2,}|\n(?=[A-Z][^\n]{4,140}(?:\s-\s|\sat\s|\|))/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 6);

  const entries = blocks.map((block) => {
    const [headline, ...rest] = normaliseLines(block);
    const cleanedHeadline = safeString(headline)
      .replace(/\b(?:phone|email|physical location)\b.*$/i, "")
      .replace(/\bCV FOR\b.*$/i, "")
      .trim();
    const parts = cleanedHeadline.split(/\s+\bat\b\s+|\s+\|\s+|\s+-\s+/);
    const titleCandidate = safeString(parts[0]).replace(/\((?:19|20)\d{2}[^)]*\)$/i, "").trim();
    const employerCandidate = safeString(parts[1] ?? "").replace(/\((?:19|20)\d{2}[^)]*\)$/i, "").trim();
    return {
      employer: employerCandidate,
      jobTitle: titleCandidate,
      startDate: "",
      endDate: "",
      currentRole: /present|current/i.test(block),
      duties: rest.filter((line) => !containsLikelyContactNoise(line)).slice(0, 3).join("\n"),
      achievements: rest.filter((line) => !containsLikelyContactNoise(line)).slice(3, 6).join("\n"),
      tools: "",
      leadership: "",
    };
  }).filter((entry) => (safeString(entry.jobTitle) || safeString(entry.employer)) && !containsLikelyContactNoise(entry.jobTitle));

  return entries.length ? entries : [];
}

function parseEducationEntries(section: string): CvServiceEducationEntry[] {
  return normaliseLines(section)
    .slice(0, 6)
    .map((line) => {
      const parts = line.split(/\s+-\s+|\s+\|\s+/);
      return {
        institution: safeString(parts[1] ?? parts[0]),
        qualification: safeString(parts[0]),
        year: safeString(line.match(/(?:19|20)\d{2}/)?.[0] ?? ""),
        grade: "",
      };
    })
    .filter((entry) => safeString(entry.qualification) || safeString(entry.institution));
}

function parseQualificationEntries(section: string): CvServiceQualificationEntry[] {
  return normaliseLines(section)
    .slice(0, 8)
    .map((line) => ({
      name: line,
      issuer: "",
      year: safeString(line.match(/(?:19|20)\d{2}/)?.[0] ?? ""),
      type: "Certification",
    }));
}

function parseSkillEntries(section: string): CvServiceSkillEntry[] {
  const items = normaliseListItems(section).slice(0, 18);
  return items.length ? [{ category: "Extracted skills", items: items.join(", ") }] : [];
}

function parseRefereeEntries(section: string): CvServiceRefereeEntry[] {
  const lines = normaliseLines(section);
  const entries: CvServiceRefereeEntry[] = [];
  for (let index = 0; index < lines.length; index += 3) {
    const chunk = lines.slice(index, index + 3);
    if (!chunk.length) continue;
    entries.push({
      name: safeString(chunk[0]),
      designation: safeString(chunk[1]),
      organization: "",
      phone: parsePhone(chunk.join(" ")),
      email: parseEmail(chunk.join(" ")),
      relationship: "",
    });
  }
  return entries.slice(0, 3);
}

export function extractCvPreviewFromText(text: string): CvServiceExtractionPreview {
  const lines = normaliseLines(text);
  const summarySection =
    parseSection(text, ["professional summary", "profile", "career summary", "summary"]) ||
    lines.slice(0, 8).join(" ");
  const experienceSection = parseSection(text, ["work experience", "professional experience", "employment history", "experience"]);
  const educationSection = parseSection(text, ["education", "academic qualifications"]);
  const qualificationsSection = parseSection(text, ["certifications", "additional qualifications", "professional qualifications", "trainings"]);
  const skillsSection = parseSection(text, ["skills", "core competencies", "competencies"]);
  const refereesSection = parseSection(text, ["referees", "references"]);

  const reviewFlags: string[] = [];
  const customerName = parseName(lines);
  if (!customerName) reviewFlags.push("Needs review: full name");
  const phone = parsePhone(text);
  if (!phone) reviewFlags.push("Needs review: phone number");
  const email = parseEmail(text);
  if (!email) reviewFlags.push("Needs review: email address");

  const parsedExperience = parseExperienceEntries(experienceSection);
  const parsedEducation = parseEducationEntries(educationSection);
  const parsedQualifications = parseQualificationEntries(qualificationsSection);
  const parsedSkills = parseSkillEntries(skillsSection);
  const parsedReferees = parseRefereeEntries(refereesSection);

  const extraction: CvServiceExtractionPreview = {
    customerName,
    phone,
    email,
    location: lines.find((line) => /nairobi|kenya|mombasa|kisumu|nakuru|eldoret/i.test(line)) ?? "",
    linkedinUrl: parseLinkedin(text),
    portfolioUrl: parsePortfolio(text),
    currentProfession: containsLikelyContactNoise(safeString(parsedExperience[0]?.jobTitle)) ? "" : safeString(parsedExperience[0]?.jobTitle),
    careerObjective: "",
    majorAchievements: normaliseLines(summarySection)
      .filter((line) => line.length <= 180 && !containsLikelyContactNoise(line))
      .slice(0, 2)
      .join(" "),
    educationEntries: parsedEducation,
    qualificationEntries: parsedQualifications,
    experienceEntries: parsedExperience,
    skillEntries: parsedSkills,
    refereeEntries: parsedReferees,
    extractedSummary: summarySection,
    reviewFlags,
    rawTextPreview: lines.slice(0, 30).join("\n"),
  };

  if (!parsedExperience.length) reviewFlags.push("Needs review: work experience");
  if (!parsedEducation.length) reviewFlags.push("Needs review: education");
  if (!parsedSkills.length) reviewFlags.push("Needs review: skills");
  return sanitizeExtractionPreview(extraction);
}

async function tryRunDoclingExtraction(fileBuffer: Buffer, ext: "txt" | "docx" | "pdf") {
  if (ext === "txt") {
    return null;
  }
  const pythonPath = join(process.cwd(), ".venv-docling", "Scripts", "python.exe");
  const scriptPath = join(process.cwd(), "scripts", "docling_extract.py");
  try {
    await access(pythonPath);
    await access(scriptPath);
  } catch {
    return null;
  }

  const tempPath = join(tmpdir(), `solva-cv-${randomUUID()}.${ext}`);
  try {
    await writeFile(tempPath, fileBuffer);
    const { stdout } = await execFileAsync(pythonPath, [scriptPath, tempPath], {
      cwd: process.cwd(),
      maxBuffer: 8 * 1024 * 1024,
    });
    const payload = JSON.parse(stdout || "{}") as { ok?: boolean; text?: string; markdown?: string };
    if (!payload.ok) {
      return null;
    }
    const text = normalizeExtractedDocumentText(payload.markdown || payload.text || "");
    return text || null;
  } catch {
    return null;
  } finally {
    await unlink(tempPath).catch(() => undefined);
  }
}

async function extractTextFromUploadedCv(fileBuffer: Buffer, ext: "txt" | "docx" | "pdf") {
  const doclingText = await tryRunDoclingExtraction(fileBuffer, ext);
  if (doclingText) {
    return { text: doclingText, parser: "docling" as const, warning: "" };
  }

  if (ext === "txt") {
    return { text: normalizeExtractedDocumentText(fileBuffer.toString("utf8")), parser: "text" as const, warning: "" };
  }

  if (ext === "docx") {
    const { default: mammoth } = await import("mammoth");
    const extracted = await mammoth.extractRawText({ buffer: fileBuffer });
    return { text: normalizeExtractedDocumentText(extracted.value), parser: "mammoth" as const, warning: "" };
  }

  try {
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as unknown as { default?: (data: Buffer) => Promise<{ text: string }> }).default;
    if (pdfParse) {
      const parsed = await pdfParse(fileBuffer);
      return { text: normalizeExtractedDocumentText(parsed.text), parser: "pdf-parse" as const, warning: "" };
    }
  } catch {
    // Fall through to warning below.
  }

  return {
    text: "",
    parser: "none" as const,
    warning: "PDF content needs review. We saved your file, but the extracted details should be checked before generation.",
  };
}

function normalizeAiExtractionPreview(aiResult: Record<string, unknown>, fallback: CvServiceExtractionPreview): CvServiceExtractionPreview {
  const preview: CvServiceExtractionPreview = {
    customerName: safeString(aiResult.customerName, fallback.customerName),
    phone: safeString(aiResult.phone, fallback.phone),
    email: safeString(aiResult.email, fallback.email),
    location: safeString(aiResult.location, fallback.location),
    linkedinUrl: safeString(aiResult.linkedinUrl, fallback.linkedinUrl),
    portfolioUrl: safeString(aiResult.portfolioUrl, fallback.portfolioUrl),
    currentProfession: safeString(aiResult.currentProfession, fallback.currentProfession),
    careerObjective: safeString(aiResult.careerObjective, fallback.careerObjective),
    majorAchievements: safeString(aiResult.majorAchievements, fallback.majorAchievements),
    educationEntries: mapEducationEntries(aiResult.educationEntries).length ? mapEducationEntries(aiResult.educationEntries) : fallback.educationEntries,
    qualificationEntries: mapQualificationEntries(aiResult.qualificationEntries).length
      ? mapQualificationEntries(aiResult.qualificationEntries)
      : fallback.qualificationEntries,
    experienceEntries: mapExperienceEntries(aiResult.experienceEntries).length ? mapExperienceEntries(aiResult.experienceEntries) : fallback.experienceEntries,
    skillEntries: mapSkillEntries(aiResult.skillEntries).length ? mapSkillEntries(aiResult.skillEntries) : fallback.skillEntries,
    refereeEntries: mapRefereeEntries(aiResult.refereeEntries).length ? mapRefereeEntries(aiResult.refereeEntries) : fallback.refereeEntries,
    extractedSummary: safeString(aiResult.extractedSummary, fallback.extractedSummary),
    reviewFlags: Array.isArray(aiResult.reviewFlags)
      ? aiResult.reviewFlags.map((entry) => safeString(entry)).filter(Boolean)
      : fallback.reviewFlags,
    rawTextPreview: fallback.rawTextPreview,
  };
  return sanitizeExtractionPreview(preview);
}

async function tryGenerateAiExtractionPreview(rawText: string, fallback: CvServiceExtractionPreview) {
  const apiKey = readConfiguredEnv(process.env.OPENAI_API_KEY);
  if (!apiKey || !rawText) {
    return fallback;
  }

  const model = readConfiguredEnv(process.env.OPENAI_CV_EXTRACTION_MODEL) || CV_AI_PREMIUM_MODEL || CV_AI_BASE_MODEL;
  const systemPrompt = [
    "You extract structured candidate facts from uploaded CV text for Solva HR.",
    "Return only truthful structured data found in the source.",
    "Do not invent employers, dates, degrees, skills, or referees.",
    "Prefer leaving fields blank and adding reviewFlags when information is uncertain.",
    "Never echo contact-line noise, CV titles, or upload artifacts into currentProfession, extractedSummary, or work experience titles.",
    "Return only valid JSON.",
  ].join(" ");

  const userPrompt = JSON.stringify({
    task: "Extract a reviewable CV preview from uploaded CV text.",
    sourceText: rawText.slice(0, 22000),
    requiredOutputShape: {
      customerName: "string",
      phone: "string",
      email: "string",
      location: "string",
      linkedinUrl: "string",
      portfolioUrl: "string",
      currentProfession: "string",
      careerObjective: "string",
      majorAchievements: "string",
      educationEntries: [{ institution: "string", qualification: "string", year: "string", grade: "string" }],
      qualificationEntries: [{ name: "string", issuer: "string", year: "string", type: "string" }],
      experienceEntries: [{ employer: "string", jobTitle: "string", startDate: "string", endDate: "string", currentRole: false, duties: "string", achievements: "string", tools: "string", leadership: "string" }],
      skillEntries: [{ category: "string", items: "string" }],
      refereeEntries: [{ name: "string", designation: "string", organization: "string", phone: "string", email: "string", relationship: "string" }],
      extractedSummary: "string",
      reviewFlags: ["string"],
    },
  });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_completion_tokens: 2200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      return fallback;
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const choice = Array.isArray(payload.choices) ? (payload.choices[0] as Record<string, unknown>) : null;
    const message = choice && typeof choice === "object" ? (choice.message as Record<string, unknown> | undefined) : undefined;
    const contentText = extractOpenAiTextContent(message?.content);
    if (!contentText) {
      return fallback;
    }
    const parsed = extractJsonObject(contentText);
    return normalizeAiExtractionPreview(parsed, fallback);
  } catch {
    return fallback;
  }
}

function buildCvPayload(input: CvServiceWizardPayload) {
  const packageDefinition = getPackageDefinition(input.packageKey);
  validateReferees(input.refereeEntries, input.refereesOnRequest === true, input.sourceMode);
  return {
    cv_source_mode: input.sourceMode,
    package_key: packageDefinition.key,
    package_name: packageDefinition.name,
    package_price: packageDefinition.price,
    package_best_for: packageDefinition.bestFor,
    customer_name: safeString(input.customerName),
    phone: safeString(input.phone),
    email: safeString(input.email),
    location: safeString(input.location),
    linkedin_url: safeString(input.linkedinUrl),
    portfolio_url: safeString(input.portfolioUrl),
    target_role: safeString(input.targetRole),
    industry: safeString(input.industry),
    country_region: safeString(input.countryRegion),
    preferred_cv_style: safeString(input.preferredCvStyle),
    job_description: safeString(input.jobDescription),
    current_profession: safeString(input.currentProfession),
    years_of_experience: safeNumber(input.yearsOfExperience),
    career_objective: safeString(input.careerObjective),
    major_achievements: safeString(input.majorAchievements),
    preferred_tone: safeString(input.preferredTone),
    education_entries: input.educationEntries,
    qualification_entries: input.qualificationEntries,
    experience_entries: input.experienceEntries,
    skill_entries: input.skillEntries,
    referee_entries: input.refereeEntries,
    referees_on_request: input.refereesOnRequest === true,
    existing_cv_text: safeString(input.existingCvText),
    existing_cv_paste: safeString(input.existingCvPaste),
    special_instructions: safeString(input.specialInstructions),
    extraction_preview_json: input.extractionPreview ?? null,
    uploaded_cv_path: safeString(input.uploadedCvPath),
    uploaded_cv_name: safeString(input.uploadedCvName),
    uploaded_cv_mime: safeString(input.uploadedCvMime),
    uploaded_cv_size: input.uploadedCvSize ?? 0,
    profile_photo_path: safeString(input.profilePhotoPath),
    profile_photo_name: safeString(input.profilePhotoName),
    profile_photo_mime: safeString(input.profilePhotoMime),
    profile_photo_size: input.profilePhotoSize ?? 0,
  };
}

function formatGeneratedAtLabel(value: string | null | undefined) {
  const parsed = value ? new Date(value) : new Date();
  return parsed.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  });
}

function slugify(value: string) {
  return safeString(value, "cv").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildDownloadUrl(orderId: string, token: string, format: "docx" | "pdf") {
  const params = new URLSearchParams({ token });
  return `/api/public/cv-service/orders/${orderId}/downloads/${format}?${params.toString()}`;
}

function estimateCvAiProcessingCostKes(packageKey: CvPackageKey) {
  return CV_AI_COST_ESTIMATES_KES[packageKey] ?? 8;
}

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(items: string[], maxItems?: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const cleaned = item.trim();
    const normalized = normalizeComparableText(cleaned);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(cleaned);
    if (maxItems && result.length >= maxItems) {
      break;
    }
  }
  return result;
}

function getMaxBulletCount(packageKey: CvPackageKey) {
  switch (packageKey) {
    case "executive":
      return 9;
    case "senior":
      return 8;
    case "mid":
      return 7;
    default:
      return 6;
  }
}

function getCvModelForPackage(packageKey: CvPackageKey) {
  return CV_AI_PREMIUM_MODEL || CV_AI_BASE_MODEL;
}

function getCvProviderLabel(model: string) {
  return model ? "Solva AI Career Studio" : "Solva Career Studio";
}

function extractOpenAiTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object") {
          const text = (part as Record<string, unknown>).text;
          if (typeof text === "string") {
            return text;
          }
        }
        return "";
      })
      .join("\n");
  }
  return "";
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? text.match(/```\s*([\s\S]*?)```/i)?.[1] ?? "";
  const candidate = fenced || text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const objectText = firstBrace >= 0 && lastBrace > firstBrace ? candidate.slice(firstBrace, lastBrace + 1) : candidate;
  return JSON.parse(objectText) as Record<string, unknown>;
}

function normalizeGeneratedCvModel(
  aiResult: Record<string, unknown>,
  fallback: GeneratedCvModel,
  packageKey: CvPackageKey,
  generationEngine: string
): GeneratedCvModel {
  const maxBullets = getMaxBulletCount(packageKey);
  const globalBulletSignatures = new Set<string>();
  const aiKeyAchievements = Array.isArray(aiResult.keyAchievements)
    ? uniqueStrings(aiResult.keyAchievements.map((item) => safeString(item)).filter(Boolean), packageKey === "executive" ? 8 : 6)
    : fallback.keyAchievements;
  const aiExperience = asArray<Record<string, unknown>>(aiResult.experience).map((entry, index) => {
    const fallbackEntry = fallback.experience[index];
    const bullets = uniqueStrings(
      (Array.isArray(entry.bullets)
        ? entry.bullets.map((item) => safeString(item)).filter(Boolean)
        : fallbackEntry?.bullets ?? []
      ).filter((item) => {
        const signature = normalizeComparableText(item);
        if (!signature || globalBulletSignatures.has(signature)) {
          return false;
        }
        globalBulletSignatures.add(signature);
        return true;
      }),
      maxBullets
    );
    return {
      employer: safeString(entry.employer, fallbackEntry?.employer ?? "Employer not supplied"),
      jobTitle: safeString(entry.jobTitle, fallbackEntry?.jobTitle ?? "Role not supplied"),
      dateRange: safeString(entry.dateRange, fallbackEntry?.dateRange ?? ""),
      bullets: bullets.length ? bullets : fallbackEntry?.bullets ?? [],
    };
  });
  const aiEducation = asArray<Record<string, unknown>>(aiResult.education).map((entry, index) => ({
    title: safeString(entry.title, fallback.education[index]?.title ?? ""),
    detail: safeString(entry.detail, fallback.education[index]?.detail ?? ""),
  }));
  const aiQualifications = asArray<Record<string, unknown>>(aiResult.qualifications).map((entry, index) => ({
    title: safeString(entry.title, fallback.qualifications[index]?.title ?? ""),
    detail: safeString(entry.detail, fallback.qualifications[index]?.detail ?? ""),
  }));
  const aiSkills = asArray<Record<string, unknown>>(aiResult.skills).map((entry, index) => {
    const items = uniqueStrings(
      Array.isArray(entry.items)
        ? entry.items.map((item) => safeString(item)).filter(Boolean)
        : fallback.skills[index]?.items ?? [],
      packageKey === "executive" ? 12 : 10
    );
    return {
      category: safeString(entry.category, fallback.skills[index]?.category ?? "General Skills"),
      items: items.length ? items : fallback.skills[index]?.items ?? [],
    };
  });
  const aiMemberships = asArray<Record<string, unknown>>(aiResult.professionalMemberships).map((entry, index) => ({
    title: safeString(entry.title, fallback.professionalMemberships[index]?.title ?? ""),
    detail: safeString(entry.detail, fallback.professionalMemberships[index]?.detail ?? ""),
  }));
  const aiReferees = asArray<Record<string, unknown>>(aiResult.referees).map((entry) => ({
    name: safeString(entry.name),
    designation: safeString(entry.designation),
    organization: safeString(entry.organization),
    phone: safeString(entry.phone),
    email: safeString(entry.email),
    relationship: safeString(entry.relationship),
  }));
  const reviewNotes = Array.isArray(aiResult.reviewNotes)
    ? uniqueStrings(aiResult.reviewNotes.map((item) => safeString(item)).filter(Boolean), 6)
    : fallback.reviewNotes;
  const improvementSummary = Array.isArray(aiResult.improvementSummary)
    ? uniqueStrings(aiResult.improvementSummary.map((item) => safeString(item)).filter(Boolean), 6)
    : fallback.improvementSummary;
  const competencies = Array.isArray(aiResult.coreCompetencies)
    ? uniqueStrings(
        aiResult.coreCompetencies.map((item) => safeString(item)).filter(Boolean),
        packageKey === "executive" ? 14 : 12
      )
    : fallback.coreCompetencies;
  const professionalHeadline = safeString(aiResult.professionalHeadline, fallback.professionalHeadline);
  const executiveBio = safeString(aiResult.executiveBio, fallback.executiveBio ?? "");
  const linkedInSummary = safeString(aiResult.linkedInSummary, fallback.linkedInSummary ?? "");
  const recommendedTemplate = (() => {
    const template = safeString(aiResult.recommendedTemplate);
    return template === "sidebar" || template === "executive" ? (template as CvTemplateKey) : fallback.recommendedTemplate;
  })();
  const sectionOrder = Array.isArray(aiResult.sectionOrder)
    ? uniqueStrings(
        aiResult.sectionOrder.map((item) => safeString(item)).filter((item) =>
          ["summary", "competencies", "achievements", "experience", "education", "qualifications", "skills", "memberships", "referees"].includes(item)
        )
      ) as CvSectionKey[]
    : fallback.sectionOrder;
  const careerStrategy =
    aiResult.careerStrategy && typeof aiResult.careerStrategy === "object"
      ? {
          ...fallback.careerStrategy,
          ...(aiResult.careerStrategy as Record<string, unknown>),
        }
      : fallback.careerStrategy;
  const atsAnalysis =
    aiResult.atsAnalysis && typeof aiResult.atsAnalysis === "object"
      ? {
          ...fallback.atsAnalysis,
          ...(aiResult.atsAnalysis as Record<string, unknown>),
        }
      : fallback.atsAnalysis;
  const qualityCheck =
    aiResult.qualityCheck && typeof aiResult.qualityCheck === "object"
      ? {
          ...fallback.qualityCheck,
          ...(aiResult.qualityCheck as Record<string, unknown>),
        }
      : fallback.qualityCheck;

  return {
    ...fallback,
    professionalHeadline,
    professionalSummary: safeString(aiResult.professionalSummary, fallback.professionalSummary),
    coreCompetencies: competencies.length ? competencies : fallback.coreCompetencies,
    keyAchievements: aiKeyAchievements.length ? aiKeyAchievements : fallback.keyAchievements,
    experience: aiExperience.length ? aiExperience : fallback.experience,
    education: aiEducation.length ? aiEducation : fallback.education,
    qualifications: aiQualifications.length ? aiQualifications : fallback.qualifications,
    skills: aiSkills.length ? aiSkills : fallback.skills,
    professionalMemberships: aiMemberships.length ? aiMemberships : fallback.professionalMemberships,
    referees: aiReferees.length ? aiReferees : fallback.referees,
    atsScore: Math.max(48, Math.min(96, safeNumber(aiResult.atsScore, fallback.atsScore))),
    readabilityScore: Math.max(50, Math.min(96, safeNumber(aiResult.readabilityScore, fallback.readabilityScore))),
    reviewNotes: reviewNotes.length ? reviewNotes : fallback.reviewNotes,
    improvementSummary: improvementSummary.length ? improvementSummary : fallback.improvementSummary,
    careerStrategy: careerStrategy as GeneratedCvModel["careerStrategy"],
    atsAnalysis: atsAnalysis as GeneratedCvModel["atsAnalysis"],
    qualityCheck: qualityCheck as GeneratedCvModel["qualityCheck"],
    recommendedTemplate,
    sectionOrder,
    generationEngine,
    estimatedProcessingCostKes: estimateCvAiProcessingCostKes(packageKey),
    executiveBio: executiveBio || fallback.executiveBio,
    linkedInSummary: linkedInSummary || fallback.linkedInSummary,
  };
}

async function tryGenerateOpenAiCvModel(
  fallback: GeneratedCvModel,
  packageDefinition: CvServicePackageDefinition,
  candidateContext: Record<string, unknown>
) {
  const apiKey = readConfiguredEnv(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    return null;
  }
  const selectedModel = getCvModelForPackage(packageDefinition.key);
  const generationEngine = getCvProviderLabel(selectedModel);

  const systemPrompt = [
    "You are Solva AI Career Studio, a premium professional CV writing assistant.",
    "Rewrite and restructure candidate information into a truthful, ATS-compliant, recruiter-friendly CV that feels like it was crafted by an expert human CV writer.",
    "Write with natural human cadence, varied sentence rhythm, specific professional detail, and polished executive-level clarity.",
    "Avoid robotic phrasing, generic filler, repeated sentence patterns, and obvious AI-style overstatement.",
    "Never repeat the same bullet, competency, achievement idea, or sentence construction across sections unless a fact absolutely requires it.",
    "Do not reuse the same opening verb pattern across consecutive bullets.",
    "Make the content elegant, substantial, and rich enough for a premium CV that can naturally extend beyond one page when the career history supports it.",
    "Strengthen achievement framing, responsibility depth, and recruiter appeal without inventing facts.",
    "Produce a visible difference in depth and sophistication between entry, mid-level, senior management, and executive packages.",
    "Do not invent jobs, qualifications, employers, dates, grades, or achievements.",
    "Recommend the best presentation template and section order for this exact candidate instead of relying only on package defaults.",
    "Use section order intelligently based on seniority, leadership signal, qualifications, education strength, and ATS clarity.",
    "Use this section order as the default backbone unless the profile strongly needs a slight variation: professional summary, core competencies, key achievements, experience, education, qualifications, technical skills, memberships, referees.",
    "If uploaded CV text conflicts with weak extracted fields, trust the raw uploaded CV text more than the noisy extracted field.",
    "Do not echo contact lines, CV titles, or upload artifacts inside the professional summary or role titles.",
    "If information is weak or missing, keep it conservative and mention it in reviewNotes instead of fabricating.",
    "Use premium but ATS-safe formatting logic: short paragraphs, clean bullets, no random bolding artifacts, no broken numbering, no raw pasted dumps.",
    "Return only valid JSON.",
    "Keep the tone aligned to the package level provided.",
  ].join(" ");

  const packageWritingDirectives: Record<CvPackageKey, string> = {
    entry:
      "Entry-level output should stay clean, credible, confident, and better developed than a basic graduate CV. Emphasize transferable strengths, internships, training, volunteer exposure, systems familiarity, and clear professional promise without exaggerating seniority.",
    mid:
      "Mid-level output should feel polished, detailed, and progression-focused. Emphasize ownership, execution quality, team coordination, stakeholder support, process improvement, and measurable contribution with richer detail than a basic CV.",
    senior:
      "Senior-level output should feel leadership-forward and strategically detailed. Emphasize team oversight, operational scale, cross-functional influence, metrics, and decision-making depth where supported by the source facts.",
    executive:
      "Executive-level output should feel boardroom-ready and richly detailed. Emphasize enterprise leadership, transformation, governance, commercial outcomes, stakeholder management, risk oversight, and organizational scale wherever the source facts support it.",
  };

  const userPrompt = JSON.stringify({
    task: "Revamp this CV into a premium ATS-friendly structure with detailed, elegant, human-sounding writing.",
    package: {
      key: packageDefinition.key,
      name: packageDefinition.name,
      bestFor: packageDefinition.bestFor,
      contentDepth: packageDefinition.contentDepth,
      designLevel: packageDefinition.designLevel,
      description: packageDefinition.description,
    },
    writingDirectives: packageWritingDirectives[packageDefinition.key],
    bulletGuide:
      packageDefinition.key === "executive"
        ? "Use 4-8 rich, non-repetitive bullets for major executive roles when enough factual source material exists."
        : packageDefinition.key === "senior"
          ? "Use 4-7 substantial, non-repetitive bullets for major senior roles when enough factual source material exists."
          : packageDefinition.key === "mid"
            ? "Use 3-5 polished, non-repetitive bullets for important roles and keep them evidence-backed and specific."
            : "Use 2-4 strong, non-repetitive bullets that make junior experience sound credible, organized, and purposeful.",
    summaryGuide:
      packageDefinition.key === "executive"
        ? "Write a substantial executive summary with authority, strategic range, and commercial clarity."
        : packageDefinition.key === "senior"
          ? "Write a strong summary with leadership depth and measurable operational credibility."
          : packageDefinition.key === "mid"
            ? "Write a polished summary with confidence, progression, and operational clarity."
            : "Write a clean but well-developed summary with confidence, clarity, and genuine early-career promise.",
    achievementGuide:
      packageDefinition.key === "executive"
        ? "Create 5-7 strategic key achievements with boardroom-level language where facts support it."
        : packageDefinition.key === "senior"
          ? "Create 4-6 rich key achievements with leadership and KPI flavor where facts support it."
          : packageDefinition.key === "mid"
            ? "Create 3-5 polished key achievements showing ownership, improvement, or measurable contribution."
            : "Create 2-4 credible key achievements that strengthen employability without exaggeration.",
    candidate: candidateContext,
    requiredOutputShape: {
      professionalHeadline: "string",
      professionalSummary: "string",
      coreCompetencies: ["string"],
      keyAchievements: ["string"],
      experience: [{ employer: "string", jobTitle: "string", dateRange: "string", bullets: ["string"] }],
      education: [{ title: "string", detail: "string" }],
      qualifications: [{ title: "string", detail: "string" }],
      skills: [{ category: "string", items: ["string"] }],
      professionalMemberships: [{ title: "string", detail: "string" }],
      referees: [{ name: "string", designation: "string", organization: "string", phone: "string", email: "string", relationship: "string" }],
      recommendedTemplate: "sidebar|executive",
      sectionOrder: ["summary", "competencies", "achievements", "experience", "education", "qualifications", "skills", "memberships", "referees"],
      atsScore: 0,
      readabilityScore: 0,
      improvementSummary: ["string"],
      reviewNotes: ["string"],
      careerStrategy: {
        targetRole: "string",
        careerLevel: "string",
        industry: "string",
        strongestSellingPoints: ["string"],
        weakAreasToImprove: ["string"],
        atsKeywords: ["string"],
        bestCvStructure: ["string"],
        recommendedTone: "string",
        idealLength: "string",
        packageExpectation: "string",
      },
      atsAnalysis: {
        baselineScore: 0,
        finalScore: 0,
        keywordStrengthScore: 0,
        formattingScore: 0,
        readabilityScore: 0,
        missingInformation: ["string"],
        recommendedImprovements: ["string"],
      },
      qualityCheck: {
        status: "passed",
        checks: [{ key: "string", passed: true, detail: "string" }],
        issues: ["string"],
        regenerationCount: 0,
        adminApprovalStatus: "pending",
      },
      executiveBio: "string",
      linkedInSummary: "string",
    },
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      temperature: 0.35,
      max_completion_tokens: 4600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`openai_cv_revamp_failed:${errorText.slice(0, 240)}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const choice = Array.isArray(payload.choices) ? payload.choices[0] as Record<string, unknown> : null;
  const message = choice && typeof choice === "object" ? (choice.message as Record<string, unknown> | undefined) : undefined;
  const contentText = extractOpenAiTextContent(message?.content);
  if (!contentText) {
    throw new Error("openai_cv_revamp_empty_response");
  }
  const parsed = extractJsonObject(contentText);
  let normalized = normalizeGeneratedCvModel(parsed, fallback, packageDefinition.key, generationEngine);

  normalized = await tryPolishOpenAiCvModel(normalized, packageDefinition, candidateContext, selectedModel);

  return normalized;
}

async function tryPolishOpenAiCvModel(
  draft: GeneratedCvModel,
  packageDefinition: CvServicePackageDefinition,
  candidateContext: Record<string, unknown>,
  selectedModel: string
) {
  const apiKey = readConfiguredEnv(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    return draft;
  }

  const editorialPrompt = [
    "You are the final editorial layer for Solva AI Premium CVs.",
    "Polish the draft for elegance, detail, and executive readability while staying factual.",
    "Remove repeated ideas, repeated bullet openings, repeated competencies, and repetitive cadence.",
    "Improve flow and substance for high-level roles, but do not invent facts or add unsupported claims.",
    "Preserve or improve the recommended template and section order when they help the candidate present more strongly.",
    "Remove contact-line leakage, CV-title leakage, and any upload artifacts that slipped into summaries, role titles, or section content.",
    "Keep the output ATS-friendly and return only valid JSON in the same structure.",
  ].join(" ");

  const userPrompt = JSON.stringify({
    task: "Perform a final editorial polish on this premium CV draft.",
    package: {
      key: packageDefinition.key,
      name: packageDefinition.name,
      contentDepth: packageDefinition.contentDepth,
      designLevel: packageDefinition.designLevel,
    },
    sourceFacts: candidateContext,
    draft,
    editorialGoals: [
      "Reduce repetition across summary, experience bullets, and competencies.",
      "Make the language more elegant and human-sounding.",
      "For senior and executive packages, increase depth and strategic detail where already supported by the facts.",
      "Keep the candidate truthful and ATS-compliant.",
    ],
    requiredOutputShape: {
      professionalHeadline: "string",
      professionalSummary: "string",
      coreCompetencies: ["string"],
      keyAchievements: ["string"],
      experience: [{ employer: "string", jobTitle: "string", dateRange: "string", bullets: ["string"] }],
      education: [{ title: "string", detail: "string" }],
      qualifications: [{ title: "string", detail: "string" }],
      skills: [{ category: "string", items: ["string"] }],
      professionalMemberships: [{ title: "string", detail: "string" }],
      referees: [{ name: "string", designation: "string", organization: "string", phone: "string", email: "string", relationship: "string" }],
      recommendedTemplate: "sidebar|executive",
      sectionOrder: ["summary", "competencies", "achievements", "experience", "education", "qualifications", "skills", "memberships", "referees"],
      atsScore: 0,
      readabilityScore: 0,
      improvementSummary: ["string"],
      reviewNotes: ["string"],
      careerStrategy: {
        targetRole: "string",
        careerLevel: "string",
        industry: "string",
        strongestSellingPoints: ["string"],
        weakAreasToImprove: ["string"],
        atsKeywords: ["string"],
        bestCvStructure: ["string"],
        recommendedTone: "string",
        idealLength: "string",
        packageExpectation: "string",
      },
      atsAnalysis: {
        baselineScore: 0,
        finalScore: 0,
        keywordStrengthScore: 0,
        formattingScore: 0,
        readabilityScore: 0,
        missingInformation: ["string"],
        recommendedImprovements: ["string"],
      },
      qualityCheck: {
        status: "passed",
        checks: [{ key: "string", passed: true, detail: "string" }],
        issues: ["string"],
        regenerationCount: 0,
        adminApprovalStatus: "pending",
      },
      executiveBio: "string",
      linkedInSummary: "string",
    },
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: selectedModel,
      temperature: 0.25,
      max_completion_tokens: 3200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: editorialPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`openai_cv_editorial_failed:${errorText.slice(0, 240)}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const choice = Array.isArray(payload.choices) ? payload.choices[0] as Record<string, unknown> : null;
  const message = choice && typeof choice === "object" ? (choice.message as Record<string, unknown> | undefined) : undefined;
  const contentText = extractOpenAiTextContent(message?.content);
  if (!contentText) {
    throw new Error("openai_cv_editorial_empty_response");
  }
  const parsed = extractJsonObject(contentText);
  return normalizeGeneratedCvModel(parsed, draft, packageDefinition.key, `${getCvProviderLabel(selectedModel)} + Editorial Pass`);
}

function uniqueGeneratedEntries(items: string[], maxItems: number) {
  return uniqueStrings(items.map((item) => safeString(item)).filter(Boolean), maxItems);
}

function evaluateCvOutputQuality(model: GeneratedCvModel) {
  const duplicatePool = [
    model.professionalSummary,
    ...model.coreCompetencies,
    ...model.keyAchievements,
    ...model.experience.flatMap((entry) => entry.bullets),
  ].map((entry) => normalizeComparableText(entry)).filter(Boolean);
  const seen = new Set<string>();
  let duplicates = 0;
  duplicatePool.forEach((entry) => {
    if (seen.has(entry)) {
      duplicates += 1;
      return;
    }
    seen.add(entry);
  });
  const brokenNumbering =
    /\b\d+\.\s*\d+\./.test(model.professionalSummary) ||
    model.experience.some((entry) => entry.bullets.some((bullet) => /\b\d+\.\s*\d+\./.test(bullet)));
  const rawDumpDetected =
    model.professionalSummary.length > 900 ||
    /\b(curriculum vitae|resume|references upon request|page 1)\b/i.test(model.professionalSummary);
  const missingMajorSection =
    !safeString(model.professionalSummary) ||
    model.experience.length === 0 ||
    model.coreCompetencies.length === 0 ||
    model.keyAchievements.length === 0;
  const packageDepth =
    model.packageKey === "executive" ? 6 : model.packageKey === "senior" ? 5 : model.packageKey === "mid" ? 4 : 3;
  const totalBullets = model.experience.reduce((sum, entry) => sum + entry.bullets.length, 0);
  const insufficientDepth = totalBullets < packageDepth;
  const issues = [
    ...(duplicates ? ["Duplicate paragraphs or bullets detected."] : []),
    ...(brokenNumbering ? ["Broken numbering detected in the output."] : []),
    ...(rawDumpDetected ? ["Raw pasted CV dump detected in the summary."] : []),
    ...(missingMajorSection ? ["A major CV section is empty or missing."] : []),
    ...(insufficientDepth ? ["Content depth is below the selected package expectation."] : []),
  ];
  const blockingIssues = [
    ...(!safeString(model.professionalSummary) ? ["Professional summary is missing."] : []),
    ...(brokenNumbering ? ["Broken numbering detected in the output."] : []),
    ...(rawDumpDetected ? ["Raw pasted CV dump detected in the summary."] : []),
  ];
  return {
    status: blockingIssues.length ? "failed" : "passed",
    issues,
    blockingIssues,
    totalBullets,
  };
}

function finalizeGeneratedCvModel(model: GeneratedCvModel): GeneratedCvModel {
  const normalizedAchievements = uniqueGeneratedEntries(
    model.keyAchievements.length
      ? model.keyAchievements
      : model.experience.flatMap((entry) => entry.bullets.slice(0, 1)),
    model.packageKey === "executive" ? 7 : 5
  );
  const normalizedModel: GeneratedCvModel = {
    ...model,
    professionalHeadline: safeString(model.professionalHeadline, safeString(model.targetRole, model.packageName)),
    coreCompetencies: uniqueGeneratedEntries(model.coreCompetencies, model.packageKey === "executive" ? 14 : 12),
    keyAchievements: normalizedAchievements,
    experience: model.experience.map((entry) => ({
      ...entry,
      bullets: uniqueGeneratedEntries(entry.bullets, getMaxBulletCount(model.packageKey)),
    })),
    professionalMemberships: model.professionalMemberships.filter((entry) => safeString(entry.title)),
    atsAnalysis: {
      ...model.atsAnalysis,
      finalScore: model.atsScore,
      readabilityScore: model.readabilityScore,
    },
  };
  const quality = evaluateCvOutputQuality(normalizedModel);
  return {
    ...normalizedModel,
    qualityCheck: {
      ...normalizedModel.qualityCheck,
      status: quality.status as "passed" | "failed",
      issues: quality.issues,
      regenerationCount: safeNumber(normalizedModel.qualityCheck?.regenerationCount),
      adminApprovalStatus: (normalizedModel.qualityCheck?.adminApprovalStatus as "pending" | "approved" | undefined) ?? "pending",
      checks: [
        {
          key: "content_depth",
          passed: quality.totalBullets >= (model.packageKey === "executive" ? 6 : model.packageKey === "senior" ? 5 : model.packageKey === "mid" ? 4 : 3),
          detail: "Experience depth matches the package expectation.",
        },
        {
          key: "clean_structure",
          passed: !quality.blockingIssues.some((issue) => issue.includes("Broken numbering") || issue.includes("Raw pasted")),
          detail: "Formatting is clean and free from pasted-structure artifacts.",
        },
        {
          key: "deduplicated",
          passed: !quality.issues.some((issue) => issue.includes("Duplicate")),
          detail: "Repeated content has been removed.",
        },
      ],
    },
  };
}

async function mapOrderToPublic(row: CvServiceOrderRow): Promise<CvServicePublicOrder> {
  const generated = (row.generated_cv_json && typeof row.generated_cv_json === "object"
    ? (row.generated_cv_json as Record<string, unknown>)
    : null);
  const extraction = row.extraction_preview_json && typeof row.extraction_preview_json === "object"
    ? (row.extraction_preview_json as CvServiceExtractionPreview)
    : null;
  const token = safeString(row.public_token);
  const id = safeString(row.id);
  return {
    id,
    publicToken: token,
    sourceMode: safeString(row.cv_source_mode, "manual") === "upload" ? "upload" : "manual",
    packageKey: getPackageDefinition(safeString(row.package_key)).key,
    packageName: safeString(row.package_name),
    packagePrice: safeNumber(row.package_price),
    customerName: safeString(row.customer_name),
    phone: safeString(row.phone),
    email: safeString(row.email),
    location: safeString(row.location),
    linkedinUrl: safeString(row.linkedin_url),
    portfolioUrl: safeString(row.portfolio_url),
    targetRole: safeString(row.target_role),
    industry: safeString(row.industry),
    countryRegion: safeString(row.country_region),
    preferredCvStyle: safeString(row.preferred_cv_style),
    jobDescription: safeString(row.job_description),
    currentProfession: safeString(row.current_profession),
    yearsOfExperience: safeNumber(row.years_of_experience),
    careerObjective: safeString(row.career_objective),
    majorAchievements: safeString(row.major_achievements),
    preferredTone: safeString(row.preferred_tone),
    educationEntries: mapEducationEntries(row.education_entries),
    qualificationEntries: mapQualificationEntries(row.qualification_entries),
    experienceEntries: mapExperienceEntries(row.experience_entries),
    skillEntries: mapSkillEntries(row.skill_entries),
    refereeEntries: mapRefereeEntries(row.referee_entries),
    existingCvText: safeString(row.existing_cv_text),
    existingCvPaste: safeString(row.existing_cv_paste),
    specialInstructions: safeString(row.special_instructions),
    refereesOnRequest: safeBoolean(row.referees_on_request),
    paymentStatus: safeString(row.payment_status, "pending"),
    generationStatus: safeString(row.generation_status, "pending"),
    orderStatus: safeString(row.order_status, "draft"),
    expiresAt: safeString(row.expires_at),
    generatedAt: safeString(row.generated_at),
    generatedAtLabel: formatGeneratedAtLabel(safeString(row.generated_at)),
    uploadedCvName: safeString(row.uploaded_cv_name),
    uploadedCvMime: safeString(row.uploaded_cv_mime),
    profilePhotoName: safeString(row.profile_photo_name),
    profilePhotoMime: safeString(row.profile_photo_mime),
    profilePhotoUrl: safeString(row.profile_photo_path) ? await createSignedStorageUrl(safeString(row.profile_photo_path)) : null,
    amount: safeNumber(row.package_price),
    generatedDownloadLinks: {
      docx: safeString(row.generated_docx_path) ? buildDownloadUrl(id, token, "docx") : null,
      pdf: safeString(row.generated_pdf_path) ? buildDownloadUrl(id, token, "pdf") : null,
    },
    generatedPreview: generated,
    extractionPreview: extraction,
    reviewNotes: Array.isArray(generated?.reviewNotes) ? generated.reviewNotes.map((item) => safeString(item)).filter(Boolean) : [],
    atsScore: safeNumber(generated?.atsScore),
    readabilityScore: safeNumber(generated?.readabilityScore),
    improvementSummary: Array.isArray(generated?.improvementSummary)
      ? generated.improvementSummary.map((item) => safeString(item)).filter(Boolean)
      : [],
    careerStrategy: generated?.careerStrategy && typeof generated.careerStrategy === "object" ? (generated.careerStrategy as Record<string, unknown>) : null,
    atsAnalysis: generated?.atsAnalysis && typeof generated.atsAnalysis === "object" ? (generated.atsAnalysis as Record<string, unknown>) : null,
    qualityStatus: safeString((generated?.qualityCheck as Record<string, unknown> | undefined)?.status, "pending"),
    qualityIssues: Array.isArray((generated?.qualityCheck as Record<string, unknown> | undefined)?.issues)
      ? (((generated?.qualityCheck as Record<string, unknown>).issues as unknown[]) ?? []).map((item) => safeString(item)).filter(Boolean)
      : [],
    uploadedCvUrl: safeString(row.uploaded_cv_path) ? await createSignedStorageUrl(safeString(row.uploaded_cv_path)) : null,
    generationEngine: safeString(generated?.generationEngine),
    estimatedProcessingCostKes: safeNumber(generated?.estimatedProcessingCostKes),
    downloadCount: safeNumber(row.download_count),
    generationAttempts: safeNumber(row.generation_attempts),
  };
}

async function getOrderById(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("cv_service_orders").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("cv_order_not_found");
  }
  return data as CvServiceOrderRow;
}

async function getOrderByToken(id: string, token: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("cv_service_orders")
    .select("*")
    .eq("id", id)
    .eq("public_token", token)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("cv_order_not_found");
  }
  return data as CvServiceOrderRow;
}

async function createSignedStorageUrl(path: string) {
  if (!path) {
    return null;
  }
  const admin = createSupabaseAdminClient();
  const bucket = getStorageBucketNames().attachments;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24);
  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

export function listCvServicePackages() {
  return CV_SERVICE_PACKAGES;
}

export async function createCvServiceDraft(packageKey: CvPackageKey) {
  const admin = createSupabaseAdminClient();
  const packageDefinition = getPackageDefinition(packageKey);
  const publicToken = buildOrderToken();
  const { data, error } = await admin
    .from("cv_service_orders")
    .insert({
      public_token: publicToken,
      package_key: packageDefinition.key,
      package_name: packageDefinition.name,
      package_price: packageDefinition.price,
      package_best_for: packageDefinition.bestFor,
      payment_status: "pending",
      generation_status: "pending",
      order_status: "draft",
      cv_source_mode: "manual",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("cv_order_create_failed");
  }

  return await mapOrderToPublic(data as CvServiceOrderRow);
}

export async function updateCvServiceDraft(orderId: string, token: string, input: CvServiceWizardPayload) {
  const admin = createSupabaseAdminClient();
  const payload = buildCvPayload(input);
  const { data, error } = await admin
    .from("cv_service_orders")
    .update({
      ...payload,
      order_status: "draft",
    })
    .eq("id", orderId)
    .eq("public_token", token)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("cv_order_update_failed");
  }

  return await mapOrderToPublic(data as CvServiceOrderRow);
}

export async function getCvServiceDraft(orderId: string, token: string) {
  return await mapOrderToPublic(await getOrderByToken(orderId, token));
}

export async function uploadCvSourceFile(file: File, kind: "source" | "profile-photo" = "source") {
  if (!file || !file.size) {
    throw new Error("cv_source_missing");
  }
  const allowedMimeTypes =
    kind === "profile-photo"
      ? new Set(["image/png", "image/jpeg", "image/jpg"])
      : new Set([
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ]);
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error(kind === "profile-photo" ? "cv_profile_photo_type_not_supported" : "cv_source_type_not_supported");
  }
  const admin = createSupabaseAdminClient();
  const lowerName = file.name.toLowerCase();
  const ext =
    kind === "profile-photo"
      ? lowerName.endsWith(".png")
        ? "png"
        : "jpg"
      : lowerName.endsWith(".pdf")
        ? "pdf"
        : lowerName.endsWith(".txt")
          ? "txt"
          : "docx";
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const path = `cv-service/${kind === "profile-photo" ? "profile-photos" : "source"}/${Date.now()}-${randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from(getStorageBucketNames().attachments)
    .upload(path, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });
  if (error) {
    throw error;
  }
  if (kind === "profile-photo") {
    return {
      path,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      signedUrl: await createSignedStorageUrl(path),
    };
  }
  const sourceExt = ext as "txt" | "docx" | "pdf";
  const extractionResult = await extractTextFromUploadedCv(fileBuffer, sourceExt);
  const extractedText = extractionResult.text;
  const fallbackPreview = extractCvPreviewFromText(extractedText);
  const extracted = await tryGenerateAiExtractionPreview(extractedText, fallbackPreview);
  if (extractionResult.warning) {
    extracted.reviewFlags = uniqueStrings([...extracted.reviewFlags, extractionResult.warning], 8);
  }
  if (extractionResult.parser !== "none" && extractionResult.parser !== "text") {
    extracted.reviewFlags = uniqueStrings(
      [...extracted.reviewFlags, `Imported using ${extractionResult.parser} extraction. Review dates and titles before generation.`],
      8
    );
  }

  return {
    path,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    signedUrl: await createSignedStorageUrl(path),
    extracted,
    extractedText,
  };
}

export async function simulateCvOrderPayment(orderId: string, token: string) {
  const admin = createSupabaseAdminClient();
  const order = await getOrderByToken(orderId, token);
  const reference = `TEST-${Date.now()}`;
  const { data, error } = await admin
    .from("cv_service_orders")
    .update({
      payment_status: "paid",
      payment_method: "test_mode",
      payment_reference: reference,
      receipt_number: reference,
      amount_paid: safeNumber(order.package_price),
      paid_at: new Date().toISOString(),
      order_status: "paid",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", orderId)
    .eq("public_token", token)
    .select("*")
    .single();
  if (error || !data) {
    throw error ?? new Error("cv_payment_update_failed");
  }
  return await mapOrderToPublic(data as CvServiceOrderRow);
}

async function persistCvOutputs(order: CvServiceOrderRow) {
  const packageDefinition = getPackageDefinition(safeString(order.package_key));
  const generatedAt = new Date().toISOString();
  const generatedAtLabel = formatGeneratedAtLabel(generatedAt);
  const extractionPreview =
    order.extraction_preview_json && typeof order.extraction_preview_json === "object"
      ? (order.extraction_preview_json as CvServiceExtractionPreview)
      : null;
  const builderInput = {
    packageDefinition,
    customerName: safeString(order.customer_name) || safeString(extractionPreview?.customerName),
    phone: safeString(order.phone) || safeString(extractionPreview?.phone),
    email: safeString(order.email) || safeString(extractionPreview?.email),
    location: safeString(order.location) || safeString(extractionPreview?.location),
    linkedinUrl: safeString(order.linkedin_url) || safeString(extractionPreview?.linkedinUrl),
    portfolioUrl: safeString(order.portfolio_url) || safeString(extractionPreview?.portfolioUrl),
    targetRole: safeString(order.target_role),
    industry: safeString(order.industry),
    countryRegion: safeString(order.country_region),
    preferredCvStyle: safeString(order.preferred_cv_style),
    jobDescription: safeString(order.job_description),
    currentProfession: safeString(order.current_profession) || safeString(extractionPreview?.currentProfession),
    yearsOfExperience: safeNumber(order.years_of_experience),
    careerObjective: safeString(order.career_objective) || safeString(extractionPreview?.careerObjective),
    majorAchievements: safeString(order.major_achievements) || safeString(extractionPreview?.majorAchievements),
    preferredTone: safeString(order.preferred_tone),
    educationEntries: mapEducationEntries(order.education_entries).length ? mapEducationEntries(order.education_entries) : extractionPreview?.educationEntries ?? [],
    qualificationEntries:
      mapQualificationEntries(order.qualification_entries).length
        ? mapQualificationEntries(order.qualification_entries)
        : extractionPreview?.qualificationEntries ?? [],
    experienceEntries: mapExperienceEntries(order.experience_entries).length ? mapExperienceEntries(order.experience_entries) : extractionPreview?.experienceEntries ?? [],
    skillEntries: mapSkillEntries(order.skill_entries).length ? mapSkillEntries(order.skill_entries) : extractionPreview?.skillEntries ?? [],
    refereeEntries: mapRefereeEntries(order.referee_entries).length ? mapRefereeEntries(order.referee_entries) : extractionPreview?.refereeEntries ?? [],
    refereesOnRequest: safeBoolean(order.referees_on_request),
    existingCvText: safeString(order.existing_cv_text || order.existing_cv_paste) || safeString(extractionPreview?.rawTextPreview),
    notes: safeString(order.special_instructions),
    generatedAtLabel,
    sourceMode: safeString(order.cv_source_mode, "manual") === "upload" ? "upload" : "manual",
    profilePhotoPath: safeString(order.profile_photo_path),
    profilePhotoMime: safeString(order.profile_photo_mime),
  } as const;

  const fallbackModel: GeneratedCvModel = {
    ...generateStructuredCv(builderInput),
    generationEngine: "Solva AI Structured Draft",
    estimatedProcessingCostKes: estimateCvAiProcessingCostKes(packageDefinition.key),
  };

  const candidateContext = {
    customerName: builderInput.customerName,
    phone: builderInput.phone,
    email: builderInput.email,
    location: builderInput.location,
    linkedinUrl: builderInput.linkedinUrl,
    portfolioUrl: builderInput.portfolioUrl,
    targetRole: builderInput.targetRole,
    industry: builderInput.industry,
    countryRegion: builderInput.countryRegion,
    preferredCvStyle: builderInput.preferredCvStyle,
    jobDescription: builderInput.jobDescription,
    currentProfession: builderInput.currentProfession,
    yearsOfExperience: builderInput.yearsOfExperience,
    careerObjective: builderInput.careerObjective,
    majorAchievements: builderInput.majorAchievements,
    preferredTone: builderInput.preferredTone,
    sourceMode: builderInput.sourceMode,
    educationEntries: builderInput.educationEntries,
    qualificationEntries: builderInput.qualificationEntries,
    experienceEntries: builderInput.experienceEntries,
    skillEntries: builderInput.skillEntries,
    refereeEntries: builderInput.refereeEntries,
    refereesOnRequest: builderInput.refereesOnRequest,
    existingCvText: builderInput.existingCvText,
    extractionPreview,
    notes: builderInput.notes,
  };

  let model: GeneratedCvModel = fallbackModel;
  let premiumFallbackError: string | null = null;
  try {
    const aiModel = await tryGenerateOpenAiCvModel(fallbackModel, packageDefinition, candidateContext);
    if (aiModel) {
      model = aiModel;
    }
  } catch (error) {
    premiumFallbackError = error instanceof Error ? error.message : "premium_ai_fallback";
    console.error("[cv-service] premium rewrite fallback", error);
    model = {
      ...fallbackModel,
      reviewNotes: [
        ...fallbackModel.reviewNotes,
        "AI premium rewrite was unavailable for this generation, so Solva AI used the structured fallback engine.",
      ],
    };
  }

  model = finalizeGeneratedCvModel(model);
  if (model.qualityCheck.status !== "passed") {
    const repairedModel = finalizeGeneratedCvModel({
      ...model,
      professionalSummary: safeString(model.professionalSummary, fallbackModel.professionalSummary),
      professionalHeadline: safeString(model.professionalHeadline, fallbackModel.professionalHeadline),
      coreCompetencies: model.coreCompetencies.length ? model.coreCompetencies : fallbackModel.coreCompetencies,
      keyAchievements: model.keyAchievements.length ? model.keyAchievements : fallbackModel.keyAchievements,
      experience: model.experience.length ? model.experience : fallbackModel.experience,
      qualifications: model.qualifications.length ? model.qualifications : fallbackModel.qualifications,
      skills: model.skills.length ? model.skills : fallbackModel.skills,
      professionalMemberships: model.professionalMemberships.length ? model.professionalMemberships : fallbackModel.professionalMemberships,
      reviewNotes: uniqueStrings([...model.reviewNotes, ...fallbackModel.reviewNotes], 8),
      improvementSummary: uniqueStrings([...model.improvementSummary, ...fallbackModel.improvementSummary], 8),
      qualityCheck: {
        ...model.qualityCheck,
        regenerationCount: safeNumber(model.qualityCheck?.regenerationCount) + 1,
      },
    });
    model = repairedModel;
  }
  if (model.qualityCheck.status !== "passed") {
    model = finalizeGeneratedCvModel({
      ...fallbackModel,
      reviewNotes: uniqueStrings(
        [
          ...fallbackModel.reviewNotes,
          "The premium draft was automatically repaired and released from the structured fallback engine to keep your CV generation moving.",
        ],
        8
      ),
      improvementSummary: uniqueStrings(
        [
          ...fallbackModel.improvementSummary,
          "Generation was stabilized with the structured premium fallback so the CV could still be completed cleanly.",
        ],
        8
      ),
      qualityCheck: {
        ...fallbackModel.qualityCheck,
        regenerationCount: safeNumber(model.qualityCheck?.regenerationCount) + 1,
        adminApprovalStatus: "pending",
      },
    });
  }

  const admin = createSupabaseAdminClient();
  const bucket = getStorageBucketNames().attachments;
  let profilePhotoAsset:
    | {
        bytes: Uint8Array;
        mimeType: string;
      }
    | null = null;
  if (safeString(order.profile_photo_path) && safeString(order.profile_photo_mime)) {
    const { data: photoBlob } = await admin.storage.from(bucket).download(safeString(order.profile_photo_path));
    if (photoBlob) {
      profilePhotoAsset = {
        bytes: new Uint8Array(await photoBlob.arrayBuffer()),
        mimeType: safeString(order.profile_photo_mime),
      };
    }
  }

  const docx = await buildCvDocx(model, profilePhotoAsset);
  const pdf = await buildCvPdf(model, profilePhotoAsset);
  const basePath = `cv-service/generated/${safeString(order.id)}`;
  const docxPath = `${basePath}/${slugify(model.customerName)}-${packageDefinition.key}.docx`;
  const pdfPath = `${basePath}/${slugify(model.customerName)}-${packageDefinition.key}.pdf`;

  const [docxUpload, pdfUpload] = await Promise.all([
    admin.storage.from(bucket).upload(docxPath, docx, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    }),
    admin.storage.from(bucket).upload(pdfPath, pdf, {
      contentType: "application/pdf",
      upsert: true,
    }),
  ]);

  if (docxUpload.error) {
    throw docxUpload.error;
  }
  if (pdfUpload.error) {
    throw pdfUpload.error;
  }

  const { data, error } = await admin
    .from("cv_service_orders")
    .update({
      generation_status: "generated",
      generated_at: generatedAt,
      generated_cv_json: model,
      generated_docx_path: docxPath,
      generated_pdf_path: pdfPath,
      order_status: "ready",
      generation_attempts: safeNumber(order.generation_attempts) + 1,
      last_generation_error: premiumFallbackError,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", safeString(order.id))
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("cv_generation_update_failed");
  }
  return await mapOrderToPublic(data as CvServiceOrderRow);
}

export async function generateCvOrderOutputs(orderId: string, token: string) {
  const order = await getOrderByToken(orderId, token);
  if (safeString(order.payment_status) !== "paid") {
    throw new Error("payment_required_before_generation");
  }
  try {
    return await persistCvOutputs(order);
  } catch (error) {
    const admin = createSupabaseAdminClient();
    await admin
      .from("cv_service_orders")
      .update({
        generation_status: "failed",
        last_generation_error: error instanceof Error ? error.message : "generation_failed",
        generation_attempts: safeNumber(order.generation_attempts) + 1,
      })
      .eq("id", orderId);
    throw error;
  }
}

export async function streamCvOrderFile(orderId: string, token: string, format: "docx" | "pdf") {
  const order = await getOrderByToken(orderId, token);
  if (safeString(order.payment_status) !== "paid") {
    throw new Error("payment_required_before_download");
  }
  if (safeString(order.generation_status) !== "generated") {
    throw new Error("cv_not_generated_yet");
  }
  const expiresAt = safeString(order.expires_at);
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    throw new Error("cv_download_expired");
  }

  const path = format === "docx" ? safeString(order.generated_docx_path) : safeString(order.generated_pdf_path);
  if (!path) {
    throw new Error("cv_file_missing");
  }
  const admin = createSupabaseAdminClient();
  const bucket = getStorageBucketNames().attachments;
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) {
    throw error ?? new Error("cv_file_download_failed");
  }

  await admin
    .from("cv_service_orders")
    .update({
      download_count: safeNumber(order.download_count) + 1,
      last_downloaded_at: new Date().toISOString(),
      download_log: [
        ...asArray<Record<string, unknown>>(order.download_log),
        { format, timestamp: new Date().toISOString() },
      ],
    })
    .eq("id", orderId);

  return {
    bytes: new Uint8Array(await data.arrayBuffer()),
    fileName: `${slugify(safeString(order.customer_name, "candidate"))}-${format}.${format}`,
    contentType:
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf",
  };
}

function ensureCvAdminRole(role: string) {
  if (!["Super Admin", "HR Admin", "Payroll Admin"].includes(role)) {
    throw new Error("forbidden");
  }
}

export async function getCvServiceAdminDashboard(): Promise<CvServiceAdminDashboard> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  ensureCvAdminRole(profile.role);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("cv_service_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as CvServiceOrderRow[];
  const revenueByPackageMap = new Map<string, { packageName: string; revenue: number; count: number }>();
  rows.forEach((row) => {
    const packageName = safeString(row.package_name, "Package");
    const current = revenueByPackageMap.get(packageName) ?? { packageName, revenue: 0, count: 0 };
    if (safeString(row.payment_status) === "paid") {
      current.revenue += safeNumber(row.amount_paid || row.package_price);
      current.count += 1;
    }
    revenueByPackageMap.set(packageName, current);
  });
  return {
    metrics: {
      totalOrders: rows.length,
      uploadedCvOrders: rows.filter((row) => safeString(row.cv_source_mode) === "upload").length,
      formCreatedOrders: rows.filter((row) => safeString(row.cv_source_mode, "manual") !== "upload").length,
      pendingPayments: rows.filter((row) => safeString(row.payment_status) === "pending").length,
      paidOrders: rows.filter((row) => safeString(row.payment_status) === "paid").length,
      generatedCvs: rows.filter((row) => safeString(row.generation_status) === "generated").length,
      failedPayments: rows.filter((row) => safeString(row.payment_status) === "failed").length,
      failedGenerations: rows.filter((row) => safeString(row.generation_status) === "failed").length,
      abandonedApplications: rows.filter((row) => safeString(row.order_status) === "draft").length,
      downloads: rows.reduce((total, row) => total + safeNumber(row.download_count), 0),
      revenueByPackage: Array.from(revenueByPackageMap.values()),
    },
    orders: await Promise.all(
      rows.map(async (row) => ({
        id: safeString(row.id),
        publicToken: safeString(row.public_token),
        customerName: safeString(row.customer_name),
        phone: safeString(row.phone),
        email: safeString(row.email),
        sourceMode: safeString(row.cv_source_mode, "manual"),
        packageName: safeString(row.package_name),
        amount: safeNumber(row.package_price),
        paymentStatus: safeString(row.payment_status),
        generationStatus: safeString(row.generation_status),
        orderStatus: safeString(row.order_status),
        downloadCount: safeNumber(row.download_count),
        createdAt: safeString(row.created_at),
        expiresAt: safeString(row.expires_at),
        uploadedCvName: safeString(row.uploaded_cv_name),
        uploadedCvUrl: safeString(row.uploaded_cv_path) ? await createSignedStorageUrl(safeString(row.uploaded_cv_path)) : null,
        generatedDocxPath: safeString(row.generated_docx_path),
        generatedPdfPath: safeString(row.generated_pdf_path),
        generatedDocxLink:
          safeString(row.generated_docx_path) && safeString(row.public_token)
            ? buildDownloadUrl(safeString(row.id), safeString(row.public_token), "docx")
            : null,
        generatedPdfLink:
          safeString(row.generated_pdf_path) && safeString(row.public_token)
            ? buildDownloadUrl(safeString(row.id), safeString(row.public_token), "pdf")
            : null,
        customerNotes: safeString(row.special_instructions),
        adminNotes: safeString(row.admin_notes),
        atsScore: safeNumber((row.generated_cv_json as Record<string, unknown> | null)?.atsScore),
        qualityStatus: safeString(((row.generated_cv_json as Record<string, unknown> | null)?.qualityCheck as Record<string, unknown> | undefined)?.status, "pending"),
        qualityIssues: Array.isArray(((row.generated_cv_json as Record<string, unknown> | null)?.qualityCheck as Record<string, unknown> | undefined)?.issues)
          ? ((((row.generated_cv_json as Record<string, unknown>).qualityCheck as Record<string, unknown>).issues as unknown[]) ?? []).map((item) => safeString(item)).filter(Boolean)
          : [],
        generatedPreview: row.generated_cv_json && typeof row.generated_cv_json === "object" ? row.generated_cv_json : null,
      }))
    ),
  };
}

export async function markCvOrderPaidByAdmin(orderId: string) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  ensureCvAdminRole(profile.role);
  const admin = createSupabaseAdminClient();
  const order = await getOrderById(orderId);
  const reference = `ADMIN-${Date.now()}`;
  const { data, error } = await admin
    .from("cv_service_orders")
    .update({
      payment_status: "paid",
      payment_method: "test_mode_admin",
      amount_paid: safeNumber(order.package_price),
      payment_reference: reference,
      receipt_number: reference,
      paid_at: new Date().toISOString(),
      order_status: "paid",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error || !data) {
    throw error ?? new Error("cv_order_mark_paid_failed");
  }
  return await mapOrderToPublic(data as CvServiceOrderRow);
}

export async function regenerateCvOrderByAdmin(orderId: string) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  ensureCvAdminRole(profile.role);
  const order = await getOrderById(orderId);
  if (safeString(order.payment_status) !== "paid") {
    throw new Error("payment_required_before_generation");
  }
  return persistCvOutputs(order);
}

export async function approveCvOrderByAdmin(orderId: string) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  ensureCvAdminRole(profile.role);
  const admin = createSupabaseAdminClient();
  const order = await getOrderById(orderId);
  const generated =
    order.generated_cv_json && typeof order.generated_cv_json === "object"
      ? ({ ...(order.generated_cv_json as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const qualityCheck =
    generated.qualityCheck && typeof generated.qualityCheck === "object"
      ? { ...(generated.qualityCheck as Record<string, unknown>) }
      : {};
  generated.qualityCheck = {
    ...qualityCheck,
    adminApprovalStatus: "approved",
    status: (safeString(qualityCheck.status, "passed") === "failed" ? "failed" : "passed") as "passed" | "failed",
  };
  const { data, error } = await admin
    .from("cv_service_orders")
    .update({
      generated_cv_json: generated,
      order_status: "approved",
    })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error || !data) {
    throw error ?? new Error("cv_order_approve_failed");
  }
  return await mapOrderToPublic(data as CvServiceOrderRow);
}

export async function refreshCvOrderDownloadsByAdmin(orderId: string) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  ensureCvAdminRole(profile.role);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("cv_service_orders")
    .update({
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      order_status: "ready",
    })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error || !data) {
    throw error ?? new Error("cv_order_refresh_links_failed");
  }
  return await mapOrderToPublic(data as CvServiceOrderRow);
}

export async function saveCvOrderManualEditByAdmin(orderId: string, input: CvServiceAdminEditPayload) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  ensureCvAdminRole(profile.role);
  const admin = createSupabaseAdminClient();
  const order = await getOrderById(orderId);
  if (!order.generated_cv_json || typeof order.generated_cv_json !== "object") {
    throw new Error("cv_order_not_generated");
  }
  const generated = { ...(order.generated_cv_json as Record<string, unknown>) };
  if (safeString(input.professionalHeadline)) {
    generated.professionalHeadline = safeString(input.professionalHeadline);
  }
  if (safeString(input.professionalSummary)) {
    generated.professionalSummary = safeString(input.professionalSummary);
  }
  if (Array.isArray(input.keyAchievements)) {
    generated.keyAchievements = uniqueStrings(input.keyAchievements.map((item) => safeString(item)).filter(Boolean), 8);
  }
  const model = finalizeGeneratedCvModel(generated as unknown as GeneratedCvModel);
  const bucket = getStorageBucketNames().attachments;
  let profilePhotoAsset:
    | {
        bytes: Uint8Array;
        mimeType: string;
      }
    | null = null;
  if (safeString(order.profile_photo_path) && safeString(order.profile_photo_mime)) {
    const { data: photoBlob } = await admin.storage.from(bucket).download(safeString(order.profile_photo_path));
    if (photoBlob) {
      profilePhotoAsset = {
        bytes: new Uint8Array(await photoBlob.arrayBuffer()),
        mimeType: safeString(order.profile_photo_mime),
      };
    }
  }
  const docx = await buildCvDocx(model, profilePhotoAsset);
  const pdf = await buildCvPdf(model, profilePhotoAsset);
  const docxPath = safeString(order.generated_docx_path) || `cv-service/generated/${safeString(order.id)}/${slugify(model.customerName)}-${safeString(order.package_key)}.docx`;
  const pdfPath = safeString(order.generated_pdf_path) || `cv-service/generated/${safeString(order.id)}/${slugify(model.customerName)}-${safeString(order.package_key)}.pdf`;
  const [docxUpload, pdfUpload] = await Promise.all([
    admin.storage.from(bucket).upload(docxPath, docx, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    }),
    admin.storage.from(bucket).upload(pdfPath, pdf, {
      contentType: "application/pdf",
      upsert: true,
    }),
  ]);
  if (docxUpload.error) {
    throw docxUpload.error;
  }
  if (pdfUpload.error) {
    throw pdfUpload.error;
  }
  const { data, error } = await admin
    .from("cv_service_orders")
    .update({
      generated_cv_json: model,
      generated_docx_path: docxPath,
      generated_pdf_path: pdfPath,
      admin_notes: safeString(input.adminNotes, safeString(order.admin_notes)),
    })
    .eq("id", orderId)
    .select("*")
    .single();
  if (error || !data) {
    throw error ?? new Error("cv_order_manual_edit_failed");
  }
  return await mapOrderToPublic(data as CvServiceOrderRow);
}

export async function cleanupExpiredCvServiceFiles() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  ensureCvAdminRole(profile.role);
  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("cv_service_orders")
    .select("*")
    .lt("expires_at", nowIso)
    .is("deleted_large_files_at", null)
    .limit(100);
  if (error) {
    throw error;
  }
  const rows = (data ?? []) as CvServiceOrderRow[];
  const bucket = getStorageBucketNames().attachments;
  for (const row of rows) {
    const paths = [
      safeString(row.uploaded_cv_path),
      safeString(row.profile_photo_path),
      safeString(row.generated_docx_path),
      safeString(row.generated_pdf_path),
    ].filter(Boolean);
    if (paths.length) {
      await admin.storage.from(bucket).remove(paths);
    }
    await admin
      .from("cv_service_orders")
      .update({
        deleted_large_files_at: nowIso,
        expired_at: nowIso,
        order_status: "expired",
      })
      .eq("id", safeString(row.id));
  }
  return { cleaned: rows.length };
}

export async function exportCvServiceOrdersWorkbook() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  ensureCvAdminRole(profile.role);
  const dashboard = await getCvServiceAdminDashboard();
  const rows = [
    [
      "Customer Name",
      "Phone",
      "Email",
      "Flow",
      "Package",
      "Amount",
      "Payment Status",
      "Generation Status",
      "ATS Score",
      "Quality Status",
      "Quality Issues",
      "Customer Notes",
      "Admin Notes",
      "Order Status",
      "Downloads",
      "Created At",
      "Expires At",
    ],
    ...dashboard.orders.map((row) => [
      safeString(row.customerName),
      safeString(row.phone),
      safeString(row.email),
      safeString(row.sourceMode),
      safeString(row.packageName),
      safeNumber(row.amount),
      safeString(row.paymentStatus),
      safeString(row.generationStatus),
      safeNumber(row.atsScore),
      safeString(row.qualityStatus),
      Array.isArray(row.qualityIssues) ? row.qualityIssues.map((item) => safeString(item)).filter(Boolean).join(" | ") : "",
      safeString(row.customerNotes),
      safeString(row.adminNotes),
      safeString(row.orderStatus),
      safeNumber(row.downloadCount),
      safeString(row.createdAt),
      safeString(row.expiresAt),
    ]),
  ];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "CV Service Orders");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
