import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

export type CvPackageKey = "entry" | "mid" | "senior" | "executive";

export type CvServicePackageDefinition = {
  key: CvPackageKey;
  name: string;
  price: number;
  bestFor: string;
  contentDepth: string;
  designLevel: string;
  turnaroundPlaceholder: string;
  outputFormats: string;
  description: string;
};

export type CvServiceEducationEntry = {
  institution: string;
  qualification: string;
  year: string;
  grade: string;
};

export type CvServiceQualificationEntry = {
  name: string;
  issuer: string;
  year: string;
  type: string;
};

export type CvServiceExperienceEntry = {
  employer: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  currentRole: boolean;
  duties: string;
  achievements: string;
  tools: string;
  leadership: string;
};

export type CvServiceSkillEntry = {
  category: string;
  items: string;
};

export type CvServiceRefereeEntry = {
  name: string;
  designation: string;
  organization: string;
  phone: string;
  email: string;
  relationship: string;
};

export type CvSectionKey =
  | "summary"
  | "competencies"
  | "achievements"
  | "experience"
  | "education"
  | "qualifications"
  | "skills"
  | "memberships"
  | "referees";

export type CvTemplateKey = "sidebar" | "executive";

export type CvCareerStrategy = {
  targetRole: string;
  careerLevel: string;
  industry: string;
  strongestSellingPoints: string[];
  weakAreasToImprove: string[];
  atsKeywords: string[];
  bestCvStructure: string[];
  recommendedTone: string;
  idealLength: string;
  packageExpectation: string;
};

export type CvAtsAnalysis = {
  baselineScore: number;
  finalScore: number;
  keywordStrengthScore: number;
  formattingScore: number;
  readabilityScore: number;
  missingInformation: string[];
  recommendedImprovements: string[];
};

export type CvQualityCheck = {
  status: "passed" | "failed";
  checks: Array<{
    key: string;
    passed: boolean;
    detail: string;
  }>;
  issues: string[];
  regenerationCount: number;
  adminApprovalStatus?: "pending" | "approved";
};

export type GeneratedCvModel = {
  packageKey: CvPackageKey;
  packageName: string;
  designLabel: string;
  generationEngine?: string;
  estimatedProcessingCostKes?: number;
  recommendedTemplate?: CvTemplateKey;
  sectionOrder?: CvSectionKey[];
  sourceMode: "upload" | "manual";
  customerName: string;
  contactLine: string;
  linkedinUrl: string;
  portfolioUrl: string;
  targetRole: string;
  industry: string;
  countryRegion: string;
  professionalHeadline: string;
  professionalSummary: string;
  coreCompetencies: string[];
  keyAchievements: string[];
  experience: Array<{
    employer: string;
    jobTitle: string;
    dateRange: string;
    bullets: string[];
  }>;
  education: Array<{
    title: string;
    detail: string;
  }>;
  qualifications: Array<{
    title: string;
    detail: string;
  }>;
  skills: Array<{
    category: string;
    items: string[];
  }>;
  professionalMemberships: Array<{
    title: string;
    detail: string;
  }>;
  referees: CvServiceRefereeEntry[];
  refereesOnRequest: boolean;
  atsScore: number;
  readabilityScore: number;
  improvementSummary: string[];
  reviewNotes: string[];
  careerStrategy: CvCareerStrategy;
  atsAnalysis: CvAtsAnalysis;
  qualityCheck: CvQualityCheck;
  executiveBio?: string;
  linkedInSummary?: string;
  generatedAtLabel: string;
  profilePhotoPath?: string;
  profilePhotoMime?: string;
};

type BuilderInput = {
  packageDefinition: CvServicePackageDefinition;
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
  refereesOnRequest: boolean;
  existingCvText: string;
  notes: string;
  generatedAtLabel: string;
  sourceMode: "upload" | "manual";
  profilePhotoPath?: string;
  profilePhotoMime?: string;
};

const PACKAGE_STYLES: Record<
  CvPackageKey,
  {
    accent: string;
    summaryTone: string;
    designLabel: string;
    verbs: string[];
  }
> = {
  entry: {
    accent: "#1d4ed8",
    summaryTone: "clear, polished, and ready for entry-level recruiter screening",
    designLabel: "Signature sidebar premium layout",
    verbs: ["Supported", "Handled", "Coordinated", "Assisted", "Prepared", "Maintained"],
  },
  mid: {
    accent: "#1737a6",
    summaryTone: "achievement-focused, professional, and growth-oriented",
    designLabel: "Signature sidebar premium layout",
    verbs: ["Delivered", "Improved", "Coordinated", "Managed", "Strengthened", "Streamlined"],
  },
  senior: {
    accent: "#0f2d7a",
    summaryTone: "leadership-driven, strategic, and metrics-aware",
    designLabel: "Executive band premium layout",
    verbs: ["Led", "Directed", "Optimized", "Expanded", "Strengthened", "Elevated"],
  },
  executive: {
    accent: "#0b1f5c",
    summaryTone: "boardroom-ready, strategic, and executive in tone",
    designLabel: "Executive band premium layout",
    verbs: ["Spearheaded", "Transformed", "Directed", "Governed", "Accelerated", "Positioned"],
  },
};

const CV_SECTION_KEYS: CvSectionKey[] = [
  "summary",
  "competencies",
  "achievements",
  "experience",
  "education",
  "qualifications",
  "skills",
  "memberships",
  "referees",
];

const LEADERSHIP_ROLE_PATTERN =
  /\b(ceo|chief|director|head|general manager|manager|lead|leader|principal|executive|consultant|specialist|strategy|governance|operations|finance manager|hr manager|program manager|country manager)\b/i;

const CREATIVE_ROLE_PATTERN =
  /\b(designer|creative|brand|content|communications|marketing|illustrator|media|social media|ui|ux|visual|photography|copywriter)\b/i;

const CREDENTIAL_PATTERN =
  /\b(certified|certification|license|licensed|membership|member|chartered|cpa|acca|cifa|hrmpeb|phr|shrm|nebosh|nursing|safety|professional)\b/i;

type CvProfilePhotoAsset = {
  bytes: Uint8Array;
  mimeType: string;
} | null;

type CvCompositionPlan = {
  template: CvTemplateKey;
  sectionOrder: CvSectionKey[];
  careerStage: "emerging" | "established" | "executive";
  presentationMode: "balanced" | "credential-forward" | "education-forward" | "leadership-forward";
  headline: string;
  sideLabel: string;
};

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeComparableText(value: string) {
  return safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTextItems(items: string[], maxItems?: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const cleaned = safeString(item);
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

function hasMeaningfulText(value: string) {
  return normalizeComparableText(value).length > 1;
}

function normaliseParagraphs(value: string) {
  return safeString(value)
    .split(/\r?\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normaliseCsvItems(value: string) {
  return safeString(value)
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sentenceCase(value: string) {
  const normalized = safeString(value);
  if (!normalized) {
    return "";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function cleanInlineText(value: string) {
  let cleaned = safeString(value)
    .replace(/\b(?:phone|email|physical location)\s*:\s*/gi, "")
    .replace(/\bCV FOR\b/gi, "")
    .replace(/[|]{2,}/g, "|")
    .replace(/\s{2,}/g, " ")
    .trim();
  if ((cleaned.match(/[@|]/g)?.length ?? 0) > 2 && cleaned.length > 90) {
    cleaned = cleaned.split("|").slice(0, 3).join(" | ").trim();
  }
  return cleaned;
}

function cleanDisplayText(value: string) {
  let cleaned = cleanInlineText(value)
    .replace(/\b(?:\+254|0)\d{9}\b/g, "")
    .replace(/[|]{2,}/g, "|")
    .replace(/\s{2,}/g, " ")
    .trim();
  cleaned = cleaned.replace(/^[|,\-–—\s]+|[|,\-–—\s]+$/g, "").trim();
  return cleaned;
}

function containsLikelyContactNoise(value: string) {
  const text = safeString(value);
  return /@|\b(?:\+254|0)\d{9}\b|\bCV FOR\b|\bphone\b|\bemail\b/i.test(text);
}

function buildDateRange(startDate: string, endDate: string, currentRole: boolean) {
  const start = safeString(startDate, "Start date not supplied");
  const end = currentRole ? "Present" : safeString(endDate, "End date not supplied");
  return `${start} - ${end}`;
}

function buildContactLine(input: BuilderInput) {
  return uniqueTextItems([safeString(input.phone), safeString(input.email), safeString(input.location)]).join(" | ");
}

function buildProfessionalSummary(input: BuilderInput) {
  const packageStyle = PACKAGE_STYLES[input.packageDefinition.key];
  const experienceLabel =
    input.yearsOfExperience > 0
      ? `${input.yearsOfExperience} year${input.yearsOfExperience === 1 ? "" : "s"} of experience`
      : "relevant professional experience";
  const parts = [
    input.currentProfession
      ? `${input.currentProfession} with ${experienceLabel}`
      : input.targetRole
        ? `Professional profile aligned to ${input.targetRole} opportunities`
        : `Professional profile with ${experienceLabel}`,
    input.targetRole ? `targeting ${input.targetRole} opportunities` : "seeking the next professional opportunity",
    input.industry ? `within ${input.industry}` : "",
    input.countryRegion ? `for ${input.countryRegion} applications` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const achievementSentence = input.majorAchievements
    ? `Known for ${sentenceCase(input.majorAchievements.replace(/\.$/, ""))}.`
    : "Focused on delivering credible, truthful achievements in a clean ATS-friendly structure.";

  const objective = input.careerObjective
    ? sentenceCase(input.careerObjective.replace(/\.$/, "")) + "."
    : "Positioned for recruiter clarity, strong keyword coverage, and professional presentation.";

  return `${sentenceCase(parts)}. ${achievementSentence} ${objective} The profile is presented in a ${packageStyle.summaryTone} style while staying faithful to the supplied facts.`;
}

function buildProfessionalHeadline(input: BuilderInput) {
  const target = safeString(input.targetRole);
  const profession = safeString(input.currentProfession);
  if (target && profession && normalizeComparableText(target) !== normalizeComparableText(profession)) {
    return `${profession} | ${target}`;
  }
  return target || profession || input.packageDefinition.name;
}

function buildCoreCompetencies(input: BuilderInput) {
  const seed = new Set<string>();
  normaliseCsvItems(input.majorAchievements).forEach((entry) => seed.add(entry));
  input.skillEntries.forEach((entry) => {
    normaliseCsvItems(entry.items).forEach((item) => seed.add(item));
  });
  normaliseCsvItems(input.jobDescription)
    .filter((item) => item.length <= 52)
    .slice(0, 4)
    .forEach((item) => seed.add(item));
  return uniqueTextItems(Array.from(seed).filter((item) => item.length <= 60), 10);
}

function buildKeyAchievements(input: BuilderInput, packageKey: CvPackageKey) {
  const maxItems = packageKey === "executive" ? 7 : packageKey === "senior" ? 6 : packageKey === "mid" ? 5 : 4;
  const seed: string[] = [];
  normaliseParagraphs(input.majorAchievements).forEach((entry) => seed.push(sentenceCase(entry.replace(/\.$/, "")) + "."));
  input.experienceEntries.forEach((entry) => {
    normaliseParagraphs(entry.achievements)
      .slice(0, 2)
      .forEach((achievement) => {
        const rolePrefix = safeString(entry.jobTitle) ? `${entry.jobTitle}: ` : "";
        seed.push(`${rolePrefix}${sentenceCase(achievement.replace(/\.$/, ""))}.`);
      });
  });
  return uniqueTextItems(seed, maxItems);
}

function splitQualificationsAndMemberships(entries: CvServiceQualificationEntry[]) {
  const memberships: Array<{ title: string; detail: string }> = [];
  const qualifications: Array<{ title: string; detail: string }> = [];

  entries.forEach((entry) => {
    const title = uniqueTextItems([safeString(entry.name), safeString(entry.type)]).join(" - ");
    const detail = uniqueTextItems([safeString(entry.issuer), safeString(entry.year)]).join(" | ");
    const combined = `${title} ${detail}`.toLowerCase();
    if (/\b(member|membership|association|institute|board|society|chapter)\b/.test(combined)) {
      memberships.push({ title, detail });
      return;
    }
    qualifications.push({ title, detail });
  });

  return { qualifications, memberships };
}

function buildExperienceBullets(entry: CvServiceExperienceEntry, packageKey: CvPackageKey) {
  const verbs = PACKAGE_STYLES[packageKey].verbs;
  const bullets: string[] = [];
  const achievementLines = normaliseParagraphs(entry.achievements);
  const dutyLines = normaliseParagraphs(entry.duties);
  const leadershipLines = normaliseParagraphs(entry.leadership);
  const tools = normaliseCsvItems(entry.tools);

  const rawLines = [...achievementLines, ...dutyLines, ...leadershipLines];

  rawLines.forEach((line, index) => {
    if (!line) {
      return;
    }
    const normalized = line.replace(/^[\-\u2022]\s*/, "");
    if (normalizeComparableText(normalized) === normalizeComparableText(entry.jobTitle) || normalizeComparableText(normalized) === normalizeComparableText(entry.employer)) {
      return;
    }
    const verb = verbs[index % verbs.length];
    const sentence = normalized.match(/^(led|managed|coordinated|directed|supported|handled|oversaw|supervised)\b/i)
      ? sentenceCase(normalized.replace(/\.$/, "")) + "."
      : `${verb} ${normalized.replace(/\.$/, "")}.`;
    bullets.push(sentence);
  });

  if (tools.length) {
    bullets.push(`Used tools and systems such as ${tools.slice(0, 6).join(", ")} to support day-to-day delivery.`);
  }

  if (!bullets.length) {
    bullets.push("Career details need one or two stronger responsibilities or achievements before final submission.");
  }

  return uniqueTextItems(bullets, 6);
}

function buildReviewNotes(input: BuilderInput, competencies: string[]) {
  const notes: string[] = [];
  if (!input.careerObjective) {
    notes.push("Career objective was not supplied clearly, so the summary uses a conservative recruiter-friendly default.");
  }
  if (!input.targetRole) {
    notes.push("Target role is missing; add it for sharper role alignment and stronger keyword focus.");
  }
  if (competencies.length < 5) {
    notes.push("Add more concrete tools, systems, or technical skills to improve ATS keyword coverage.");
  }
  if (input.sourceMode === "manual" && !input.refereesOnRequest && input.refereeEntries.filter((entry) => safeString(entry.name)).length < 3) {
    notes.push("Add at least three referees before final submission, or switch to referees available on request.");
  }
  if (input.sourceMode === "upload" && input.refereeEntries.filter((entry) => safeString(entry.name)).length === 0) {
    notes.push("No referees were detected in the uploaded CV. You can add them later if the employer asks for them.");
  }
  input.experienceEntries.forEach((entry) => {
    if (!safeString(entry.achievements)) {
      notes.push(`Add measurable achievements for ${entry.jobTitle || entry.employer || "one role"} to strengthen impact.`);
    }
  });
  if (!input.existingCvText && !input.notes) {
    notes.push("No old CV text or extra notes were supplied, so the revamp relies mainly on the structured form data.");
  }
  return notes;
}

function estimateBaselineAtsScore(input: BuilderInput) {
  let score = 42;
  if (input.targetRole) score += 6;
  if (input.experienceEntries.filter((entry) => safeString(entry.jobTitle) || safeString(entry.employer)).length >= 1) score += 8;
  if (input.educationEntries.filter((entry) => safeString(entry.qualification)).length >= 1) score += 6;
  if (input.skillEntries.some((entry) => safeString(entry.items))) score += 6;
  if (input.existingCvText || input.sourceMode === "upload") score += 4;
  return Math.max(34, Math.min(72, score));
}

function scoreAtsReadiness(input: BuilderInput, competencies: string[], reviewNotes: string[]) {
  let score = 56;
  if (input.targetRole) score += 8;
  if (input.jobDescription) score += 8;
  if (input.experienceEntries.filter((entry) => safeString(entry.jobTitle)).length >= 2) score += 8;
  if (competencies.length >= 6) score += 8;
  if (input.refereeEntries.filter((entry) => safeString(entry.name)).length >= 3) score += 4;
  score -= Math.min(18, reviewNotes.length * 3);
  return Math.max(48, Math.min(94, score));
}

function scoreReadability(input: BuilderInput, competencies: string[]) {
  let score = 62;
  if (input.careerObjective) score += 6;
  if (input.majorAchievements) score += 6;
  if (competencies.length >= 5) score += 6;
  if (input.experienceEntries.some((entry) => safeString(entry.achievements))) score += 8;
  return Math.max(50, Math.min(92, score));
}

function buildImprovementSummary(input: BuilderInput, competencies: string[]) {
  const items = [
    "Professional summary tightened for recruiter clarity and ATS keyword alignment.",
    "Repeated or weak phrasing reduced so the final CV reads cleaner and more confidently.",
    "Work experience bullets reworked to emphasize contribution, ownership, and outcomes.",
  ];
  if (input.jobDescription) {
    items.push("Target-job language incorporated where appropriate without inventing experience.");
  }
  if (competencies.length >= 5) {
    items.push("Core competencies section organized into cleaner ATS-friendly categories.");
  }
  if (input.sourceMode === "upload") {
    items.push("Uploaded CV content was restructured into a more disciplined, recruiter-friendly format.");
  }
  return items.slice(0, 5);
}

function inferCareerLevelLabel(input: BuilderInput) {
  if (input.packageDefinition.key === "executive") return "Executive leadership";
  if (input.packageDefinition.key === "senior") return "Senior management";
  if (input.packageDefinition.key === "mid") return "Mid-level management";
  return "Entry level / early career";
}

function estimateIdealLength(input: BuilderInput) {
  if (input.packageDefinition.key === "executive") return "2-3 pages";
  if (input.packageDefinition.key === "senior") return "2 pages";
  if (input.packageDefinition.key === "mid") return "2 pages";
  return input.experienceEntries.filter((entry) => safeString(entry.jobTitle)).length > 1 ? "2 pages" : "1-2 pages";
}

function extractAtsKeywords(input: BuilderInput) {
  const keywords = [
    ...normaliseCsvItems(input.targetRole),
    ...normaliseCsvItems(input.industry),
    ...normaliseCsvItems(input.jobDescription),
    ...input.skillEntries.flatMap((entry) => normaliseCsvItems(entry.items)),
  ].filter((entry) => entry.length >= 3 && entry.length <= 40);
  return uniqueTextItems(keywords, input.packageDefinition.key === "executive" ? 16 : 12);
}

function buildCareerStrategy(
  input: BuilderInput,
  competencies: string[],
  keyAchievements: string[],
  reviewNotes: string[]
): CvCareerStrategy {
  return {
    targetRole: safeString(input.targetRole, safeString(input.currentProfession, input.packageDefinition.name)),
    careerLevel: inferCareerLevelLabel(input),
    industry: safeString(input.industry, "General"),
    strongestSellingPoints: uniqueTextItems(
      [
        ...keyAchievements.map((entry) => entry.replace(/\.$/, "")),
        ...competencies,
        safeString(input.currentProfession),
      ].filter(Boolean),
      6
    ),
    weakAreasToImprove: uniqueTextItems(reviewNotes, 5),
    atsKeywords: extractAtsKeywords(input),
    bestCvStructure: [
      "Headline and contact block",
      "Professional summary",
      "Core competencies",
      "Key achievements",
      "Professional experience",
      "Education and credentials",
      "Technical skills, memberships, and referees",
    ],
    recommendedTone: safeString(input.preferredTone, PACKAGE_STYLES[input.packageDefinition.key].summaryTone),
    idealLength: estimateIdealLength(input),
    packageExpectation: input.packageDefinition.description,
  };
}

function buildAtsAnalysis(
  input: BuilderInput,
  baselineScore: number,
  finalScore: number,
  readabilityScore: number,
  reviewNotes: string[],
  competencies: string[]
): CvAtsAnalysis {
  const formattingScore = Math.max(
    58,
    Math.min(
      96,
      64 +
        (input.experienceEntries.some((entry) => safeString(entry.achievements)) ? 10 : 0) +
        (input.educationEntries.some((entry) => safeString(entry.qualification)) ? 6 : 0) +
        (input.refereesOnRequest || input.refereeEntries.some((entry) => safeString(entry.name)) ? 4 : 0) -
        Math.min(12, reviewNotes.length * 2)
    )
  );
  const keywordStrengthScore = Math.max(52, Math.min(96, 54 + Math.min(26, competencies.length * 3) + (input.jobDescription ? 10 : 0)));
  return {
    baselineScore,
    finalScore,
    keywordStrengthScore,
    formattingScore,
    readabilityScore,
    missingInformation: uniqueTextItems(reviewNotes, 5),
    recommendedImprovements: uniqueTextItems(
      [
        "Tailor the headline and summary to each application.",
        "Keep metrics and scale where you can evidence them.",
        "Mirror the target job language naturally in the experience bullets.",
        ...reviewNotes,
      ],
      6
    ),
  };
}

function buildQualityCheck(model: GeneratedCvModel): CvQualityCheck {
  const duplicateTracker = new Set<string>();
  const duplicateCount = [
    model.professionalSummary,
    ...model.coreCompetencies,
    ...model.keyAchievements,
    ...model.experience.flatMap((entry) => entry.bullets),
  ].reduce((count, value) => {
    const normalized = normalizeComparableText(value);
    if (!normalized) {
      return count;
    }
    if (duplicateTracker.has(normalized)) {
      return count + 1;
    }
    duplicateTracker.add(normalized);
    return count;
  }, 0);

  const brokenNumbering = /\b\d+\.\s*\d+\./.test(model.professionalSummary) || model.experience.some((entry) => entry.bullets.some((bullet) => /\b\d+\.\s*\d+\./.test(bullet)));
  const rawDumpDetected = model.professionalSummary.length > 900 || /\b(curriculum vitae|resume|page 1|references upon request)\b/i.test(model.professionalSummary);
  const depthThreshold = model.packageKey === "executive" ? 5 : model.packageKey === "senior" ? 4 : model.packageKey === "mid" ? 3 : 2;
  const totalBullets = model.experience.reduce((sum, entry) => sum + entry.bullets.length, 0);
  const checks = [
    {
      key: "summary_present",
      passed: hasMeaningfulText(model.professionalSummary) && model.professionalSummary.length >= 140,
      detail: "Professional summary should be clearly written and substantial.",
    },
    {
      key: "experience_structured",
      passed: model.experience.length > 0 && totalBullets >= depthThreshold,
      detail: "Experience section should contain structured roles and achievement-style bullets.",
    },
    {
      key: "key_achievements_present",
      passed: model.keyAchievements.length >= Math.min(depthThreshold, 3),
      detail: "Key achievements should be visible before the full experience section.",
    },
    {
      key: "no_duplicates",
      passed: duplicateCount === 0,
      detail: "Duplicate paragraphs and bullets should not appear in the final CV.",
    },
    {
      key: "numbering_clean",
      passed: !brokenNumbering,
      detail: "Broken numbering and pasted-list artifacts should not appear.",
    },
    {
      key: "no_raw_dump",
      passed: !rawDumpDetected,
      detail: "The final summary should not look like a raw pasted CV dump.",
    },
  ];
  const issues = checks.filter((check) => !check.passed).map((check) => check.detail);
  return {
    status: issues.length ? "failed" : "passed",
    checks,
    issues,
    regenerationCount: 0,
    adminApprovalStatus: "pending",
  };
}

function getCvTemplateKey(packageKey: CvPackageKey): CvTemplateKey {
  return packageKey === "senior" || packageKey === "executive" ? "executive" : "sidebar";
}

function buildInitials(name: string) {
  const parts = safeString(name)
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) {
    return "CV";
  }
  return parts.map((entry) => entry.charAt(0).toUpperCase()).join("");
}

function splitContactLines(model: GeneratedCvModel) {
  const lines = model.contactLine
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (model.linkedinUrl) {
    lines.push(model.linkedinUrl);
  }
  if (model.portfolioUrl) {
    lines.push(model.portfolioUrl);
  }
  return uniqueTextItems(lines, 6);
}

function clampItems(items: string[], count: number) {
  return items.filter(Boolean).slice(0, count);
}

function normalizeSectionOrder(value: unknown): CvSectionKey[] {
  return Array.isArray(value)
    ? value
        .map((entry) => safeString(entry))
        .filter((entry): entry is CvSectionKey => CV_SECTION_KEYS.includes(entry as CvSectionKey))
    : [];
}

function mergeSectionOrder(preferred: CvSectionKey[], fallback: CvSectionKey[]) {
  const seen = new Set<CvSectionKey>();
  const merged: CvSectionKey[] = [];
  [...preferred, ...fallback].forEach((entry) => {
    if (seen.has(entry)) {
      return;
    }
    seen.add(entry);
    merged.push(entry);
  });
  return merged;
}

function buildHeadline(model: GeneratedCvModel) {
  const explicitHeadline = safeString(model.professionalHeadline);
  const role = safeString(model.targetRole);
  const profession = safeString(model.experience[0]?.jobTitle);
  return explicitHeadline || role || profession || model.packageName;
}

function inferCvCompositionPlan(model: GeneratedCvModel): CvCompositionPlan {
  const leadershipText = [model.targetRole, model.professionalSummary, ...model.experience.map((entry) => entry.jobTitle)].join(" ");
  const credentialsText = model.qualifications.map((entry) => `${entry.title} ${entry.detail}`).join(" ");
  const leadershipSignal =
    LEADERSHIP_ROLE_PATTERN.test(leadershipText) ||
    model.packageKey === "executive" ||
    (model.packageKey === "senior" && model.experience.length >= 2);
  const creativeSignal =
    CREATIVE_ROLE_PATTERN.test(leadershipText) ||
    CREATIVE_ROLE_PATTERN.test(model.industry) ||
    Boolean(model.profilePhotoPath);
  const credentialHeavy =
    model.qualifications.length >= 2 ||
    CREDENTIAL_PATTERN.test(credentialsText) ||
    (model.qualifications.length > 0 && model.education.length === 0);
  const educationForward =
    model.packageKey === "entry" &&
    model.education.length > 0 &&
    model.experience.length <= 1 &&
    !leadershipSignal;

  const template: CvTemplateKey =
    model.recommendedTemplate ||
    (leadershipSignal ? "executive" : creativeSignal ? "sidebar" : model.packageKey === "senior" || model.packageKey === "executive" ? "executive" : "sidebar");

  const fallbackOrder: CvSectionKey[] =
    template === "executive"
      ? credentialHeavy
        ? ["summary", "competencies", "achievements", "experience", "qualifications", "education", "skills", "memberships", "referees"]
        : ["summary", "competencies", "achievements", "experience", "education", "qualifications", "skills", "memberships", "referees"]
      : educationForward
        ? ["summary", "competencies", "achievements", "education", "experience", "qualifications", "skills", "memberships", "referees"]
        : credentialHeavy
          ? ["summary", "competencies", "achievements", "qualifications", "experience", "education", "skills", "memberships", "referees"]
          : ["summary", "competencies", "achievements", "experience", "education", "qualifications", "skills", "memberships", "referees"];

  const preferredOrder = normalizeSectionOrder(model.sectionOrder);
  const sectionOrder = mergeSectionOrder(preferredOrder, fallbackOrder);
  const careerStage = leadershipSignal ? "executive" : model.packageKey === "entry" ? "emerging" : "established";
  const presentationMode = credentialHeavy
    ? "credential-forward"
    : educationForward
      ? "education-forward"
      : leadershipSignal
        ? "leadership-forward"
        : "balanced";

  return {
    template,
    sectionOrder,
    careerStage,
    presentationMode,
    headline: buildHeadline(model),
    sideLabel:
      careerStage === "executive"
        ? "Leadership Profile"
        : careerStage === "emerging"
          ? "Candidate Snapshot"
          : "Career Snapshot",
  };
}

function sanitizeGeneratedCvModel(model: GeneratedCvModel): GeneratedCvModel {
  const customerName = cleanDisplayText(model.customerName) || "Candidate";
  const targetRole = cleanDisplayText(model.targetRole);
  const contactLine = uniqueTextItems(
    model.contactLine
      .split("|")
      .map((entry) => cleanInlineText(entry))
      .filter(Boolean),
    4
  ).join(" | ");
  const professionalSummary = cleanInlineText(model.professionalSummary)
    .replace(/\bprofessional summary\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const professionalHeadline = cleanDisplayText(model.professionalHeadline);
  const experience = model.experience
    .map((entry) => ({
      employer: cleanDisplayText(entry.employer),
      jobTitle: cleanDisplayText(entry.jobTitle),
      dateRange: cleanInlineText(entry.dateRange),
      bullets: uniqueTextItems(entry.bullets.map((bullet) => cleanInlineText(bullet)).filter(Boolean), 8),
    }))
    .filter((entry) => entry.jobTitle || entry.employer || entry.bullets.length);
  const education = model.education
    .map((entry) => ({
      title: cleanDisplayText(entry.title),
      detail: cleanInlineText(entry.detail),
    }))
    .filter((entry) => entry.title);
  const qualifications = model.qualifications
    .map((entry) => ({
      title: cleanDisplayText(entry.title),
      detail: cleanInlineText(entry.detail),
    }))
    .filter((entry) => entry.title);
  const skills = model.skills
    .map((entry) => ({
      category: cleanDisplayText(entry.category) || "Skills",
      items: uniqueTextItems(entry.items.map((item) => cleanDisplayText(item)).filter(Boolean), 12),
    }))
    .filter((entry) => entry.items.length);
  const keyAchievements = uniqueTextItems(model.keyAchievements.map((item) => cleanInlineText(item)).filter(Boolean), 8);
  const professionalMemberships = model.professionalMemberships
    .map((entry) => ({
      title: cleanDisplayText(entry.title),
      detail: cleanInlineText(entry.detail),
    }))
    .filter((entry) => entry.title);
  const referees = model.referees
    .map((entry) => ({
      ...entry,
      name: cleanDisplayText(entry.name),
      designation: cleanDisplayText(entry.designation),
      organization: cleanDisplayText(entry.organization),
      phone: cleanInlineText(entry.phone),
      email: cleanInlineText(entry.email),
      relationship: cleanDisplayText(entry.relationship),
    }))
    .filter((entry) => entry.name);

  return {
    ...model,
    customerName,
    targetRole,
    contactLine,
    professionalHeadline,
    professionalSummary,
    keyAchievements,
    experience,
    education,
    qualifications,
    skills,
    professionalMemberships,
    referees,
    coreCompetencies: uniqueTextItems(model.coreCompetencies.map((item) => cleanDisplayText(item)).filter(Boolean), 12),
  };
}

export function generateStructuredCv(input: BuilderInput): GeneratedCvModel {
  const competencies = buildCoreCompetencies(input);
  const reviewNotes = buildReviewNotes(input, competencies);
  const baselineAtsScore = estimateBaselineAtsScore(input);
  const atsScore = scoreAtsReadiness(input, competencies, reviewNotes);
  const readabilityScore = scoreReadability(input, competencies);
  const improvementSummary = buildImprovementSummary(input, competencies);
  const keyAchievements = buildKeyAchievements(input, input.packageDefinition.key);
  const experience = input.experienceEntries
    .filter((entry) => hasMeaningfulText(entry.jobTitle) || hasMeaningfulText(entry.employer) || hasMeaningfulText(entry.duties) || hasMeaningfulText(entry.achievements))
    .map((entry) => ({
      employer: safeString(entry.employer, "Employer not supplied"),
      jobTitle: safeString(entry.jobTitle, "Role not supplied"),
      dateRange: buildDateRange(entry.startDate, entry.endDate, entry.currentRole),
      bullets: buildExperienceBullets(entry, input.packageDefinition.key),
    }));
  const education = input.educationEntries
    .filter((entry) => hasMeaningfulText(entry.qualification) || hasMeaningfulText(entry.institution))
    .map((entry) => ({
      title: uniqueTextItems([safeString(entry.qualification), safeString(entry.institution)]).join(" - "),
      detail: uniqueTextItems([safeString(entry.year), safeString(entry.grade)]).join(" | "),
    }));
  const { qualifications, memberships } = splitQualificationsAndMemberships(
    input.qualificationEntries.filter((entry) => hasMeaningfulText(entry.name) || hasMeaningfulText(entry.issuer))
  );
  const skills = input.skillEntries
    .map((entry) => ({
      category: safeString(entry.category, "General Skills"),
      items: uniqueTextItems(normaliseCsvItems(entry.items)),
    }))
    .filter((entry) => hasMeaningfulText(entry.category) && entry.items.length > 0);
  const referees = input.refereeEntries.filter((entry) => hasMeaningfulText(entry.name));
  const careerStrategy = buildCareerStrategy(input, competencies, keyAchievements, reviewNotes);
  const atsAnalysis = buildAtsAnalysis(input, baselineAtsScore, atsScore, readabilityScore, reviewNotes, competencies);

  const baseDraft: GeneratedCvModel = {
    packageKey: input.packageDefinition.key,
    packageName: input.packageDefinition.name,
    designLabel: PACKAGE_STYLES[input.packageDefinition.key].designLabel,
    sourceMode: input.sourceMode,
    customerName: safeString(input.customerName, "Candidate"),
    contactLine: buildContactLine(input),
    linkedinUrl: safeString(input.linkedinUrl),
    portfolioUrl: safeString(input.portfolioUrl),
    targetRole: safeString(input.targetRole),
    industry: safeString(input.industry),
    countryRegion: safeString(input.countryRegion),
    professionalHeadline: buildProfessionalHeadline(input),
    professionalSummary: buildProfessionalSummary(input),
    coreCompetencies: competencies,
    keyAchievements,
    experience,
    education,
    qualifications,
    skills,
    professionalMemberships: memberships,
    referees,
    refereesOnRequest: input.refereesOnRequest,
    atsScore,
    readabilityScore,
    improvementSummary,
    reviewNotes,
    careerStrategy,
    atsAnalysis,
    qualityCheck: {
      status: "passed",
      checks: [],
      issues: [],
      regenerationCount: 0,
      adminApprovalStatus: "pending",
    },
    executiveBio:
      input.packageDefinition.key === "executive"
        ? `${safeString(input.currentProfession, safeString(input.targetRole, "Executive leader"))} offering a strategic leadership profile shaped for board-level review and high-trust stakeholder conversations.`
        : undefined,
    linkedInSummary:
      input.packageDefinition.key === "executive" || input.packageDefinition.key === "senior"
        ? `${safeString(input.currentProfession || input.targetRole || "Professional")} | ${safeString(input.industry || input.countryRegion || "Leadership")} | ${PACKAGE_STYLES[input.packageDefinition.key].summaryTone}`
        : undefined,
    generatedAtLabel: input.generatedAtLabel,
    profilePhotoPath: safeString(input.profilePhotoPath),
    profilePhotoMime: safeString(input.profilePhotoMime),
  };

  const composition = inferCvCompositionPlan(baseDraft);
  const draft = {
    ...baseDraft,
    designLabel: composition.template === "executive" ? "Executive band premium layout" : "Signature sidebar premium layout",
    recommendedTemplate: composition.template,
    sectionOrder: composition.sectionOrder,
  };
  return {
    ...draft,
    qualityCheck: buildQualityCheck(draft),
  };
}

function headingParagraph(text: string, accent: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: {
      before: 220,
      after: 80,
    },
    border: {
      bottom: {
        color: accent.replace("#", ""),
        style: BorderStyle.SINGLE,
        size: 4,
      },
    },
    children: [
      new TextRun({
        text,
        color: accent.replace("#", ""),
        bold: true,
      }),
    ],
  });
}

export async function buildCvDocx(model: GeneratedCvModel, profilePhoto: CvProfilePhotoAsset = null) {
  const sanitizedModel = sanitizeGeneratedCvModel(model);
  const accent = PACKAGE_STYLES[sanitizedModel.packageKey].accent.replace("#", "");
  const slate = "102B4E";
  const contactLines = splitContactLines(sanitizedModel).map((entry) => cleanInlineText(entry)).filter(Boolean);
  const composition = inferCvCompositionPlan(sanitizedModel);
  const experienceEntries = sanitizedModel.experience.filter((entry) => hasMeaningfulText(entry.jobTitle) || hasMeaningfulText(entry.employer));
  const educationEntries = sanitizedModel.education.filter((entry) => hasMeaningfulText(entry.title));
  const qualificationEntries = sanitizedModel.qualifications.filter((entry) => hasMeaningfulText(entry.title));
  const skillEntries = sanitizedModel.skills.filter((entry) => entry.items.length > 0);
  const membershipEntries = sanitizedModel.professionalMemberships.filter((entry) => hasMeaningfulText(entry.title));
  const refereeEntries = sanitizedModel.referees.filter((entry) => hasMeaningfulText(entry.name));
  const competencyItems = uniqueTextItems(sanitizedModel.coreCompetencies, 10);
  const keyAchievementItems = uniqueTextItems(sanitizedModel.keyAchievements, 8);
  const showRefereesOnRequest = sanitizedModel.refereesOnRequest || sanitizedModel.sourceMode === "upload";

  const bodyParagraph = (text: string, options?: { color?: string; size?: number; italics?: boolean; bold?: boolean; spacingAfter?: number; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] }) =>
    new Paragraph({
      spacing: { after: options?.spacingAfter ?? 70 },
      alignment: options?.alignment,
      children: [
        new TextRun({
          text,
          color: options?.color,
          size: options?.size ?? 20,
          italics: options?.italics,
          bold: options?.bold,
        }),
      ],
    });

  const bulletParagraph = (text: string, options?: { color?: string; size?: number }) =>
    new Paragraph({
      spacing: { after: 45 },
      bullet: { level: 0 },
      children: [new TextRun({ text, color: options?.color, size: options?.size ?? 20 })],
    });

  const workExperienceChildren = experienceEntries.flatMap((entry) => [
    new Paragraph({
      spacing: { before: 130, after: 30 },
      children: [
        new TextRun({ text: entry.jobTitle, bold: true, size: 24 }),
        ...(hasMeaningfulText(entry.employer) ? [new TextRun({ text: ` | ${entry.employer}`, size: 22 })] : []),
      ],
    }),
    ...(hasMeaningfulText(entry.dateRange) ? [bodyParagraph(entry.dateRange, { italics: true, size: 19, spacingAfter: 50 })] : []),
    ...uniqueTextItems(entry.bullets, 8).map((bullet) => bulletParagraph(bullet, { size: 20 })),
  ]);

  const educationChildren = educationEntries.length
    ? educationEntries.flatMap((entry) => [
        bodyParagraph(entry.title || "Education entry", { bold: true, size: 21, spacingAfter: 26 }),
        ...(entry.detail ? [bodyParagraph(entry.detail, { size: 19, spacingAfter: 60 })] : []),
      ])
    : [];

  const qualificationChildren = qualificationEntries.length
    ? qualificationEntries.flatMap((entry) => [
        bodyParagraph(entry.title || "Qualification entry", { bold: true, size: 21, spacingAfter: 26 }),
        ...(entry.detail ? [bodyParagraph(entry.detail, { size: 19, spacingAfter: 60 })] : []),
      ])
    : [];

  const skillsChildren = skillEntries.length
    ? skillEntries.flatMap((entry) => [
        bodyParagraph(entry.category, { bold: true, size: 21, spacingAfter: 20 }),
        bodyParagraph(uniqueTextItems(entry.items).join(", "), { size: 19, spacingAfter: 60 }),
      ])
    : [];
  const membershipsChildren = membershipEntries.length
    ? membershipEntries.flatMap((entry) => [
        bodyParagraph(entry.title, { bold: true, size: 21, spacingAfter: 26 }),
        ...(entry.detail ? [bodyParagraph(entry.detail, { size: 19, spacingAfter: 60 })] : []),
      ])
    : [];

  const refereesChildren = refereeEntries.length
    ? refereeEntries.flatMap((referee) => [
        bodyParagraph(referee.name || "Referee", { bold: true, size: 21, spacingAfter: 20 }),
        bodyParagraph(
          uniqueTextItems([referee.designation, referee.organization, referee.phone, referee.email].filter(Boolean)).join(" | "),
          { size: 19, spacingAfter: 60 }
        ),
      ])
    : showRefereesOnRequest
      ? [bodyParagraph("Referees available on request.", { italics: true, size: 19 })]
      : [];

  const sectionChildren = (title: string, children: Paragraph[]) =>
    children.length ? [headingParagraph(title, `#${accent}`), ...children] : [];

  const mainSections = new Map<CvSectionKey, Paragraph[]>([
    ["summary", [bodyParagraph(sanitizedModel.professionalSummary, { size: composition.template === "executive" ? 22 : 21, spacingAfter: 90 })]],
    ["competencies", competencyItems.map((item) => bulletParagraph(item, { size: 19 }))],
    ["achievements", keyAchievementItems.map((item) => bulletParagraph(item, { size: 19 }))],
    ["experience", workExperienceChildren],
    ["education", educationChildren],
    ["qualifications", qualificationChildren],
    ["skills", skillsChildren],
    ["memberships", membershipsChildren],
    ["referees", refereesChildren],
  ]);

  const sectionTitles: Record<CvSectionKey, string> = {
    summary: "Professional Summary",
    competencies: composition.careerStage === "executive" ? "Leadership Focus" : "Core Competencies",
    achievements: "Key Achievements",
    experience: "Work Experience",
    education: composition.presentationMode === "education-forward" ? "Academic Foundation" : "Education",
    qualifications: "Certifications and Additional Qualifications",
    skills: "Technical Skills and Tools",
    memberships: "Professional Memberships",
    referees: "Referees",
  };

  const orderedMainChildren = composition.sectionOrder.flatMap((sectionKey) =>
    sectionChildren(sectionTitles[sectionKey], mainSections.get(sectionKey) ?? [])
  );

  const children = [
    new Paragraph({
      shading: { fill: slate, type: ShadingType.CLEAR },
      spacing: { after: 36 },
      border: {
        bottom: { color: accent, style: BorderStyle.SINGLE, size: 8 },
      },
      children: [
        new TextRun({
          text: sanitizedModel.customerName.toUpperCase(),
          color: "FFFFFF",
          bold: true,
          size: 32,
        }),
      ],
    }),
    ...(sanitizedModel.targetRole
      ? [
          new Paragraph({
            spacing: { after: 18 },
            children: [new TextRun({ text: sanitizedModel.professionalHeadline || sanitizedModel.targetRole, color: accent, size: 22, bold: true })],
          }),
        ]
      : []),
    ...(sanitizedModel.targetRole && sanitizedModel.professionalHeadline && sanitizedModel.professionalHeadline !== sanitizedModel.targetRole
      ? [
          new Paragraph({
            spacing: { after: 14 },
            children: [new TextRun({ text: sanitizedModel.targetRole, color: "4D6178", size: 18 })],
          }),
        ]
      : []),
    ...(contactLines.length
      ? [
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: contactLines.join(" | "), color: "4D6178", size: 19 })],
          }),
        ]
      : []),
    ...(uniqueTextItems([sanitizedModel.industry, sanitizedModel.countryRegion].filter(Boolean)).length
      ? [
          new Paragraph({
            spacing: { after: 70 },
            shading: { fill: "F5F8FC", type: ShadingType.CLEAR },
            border: {
              left: { color: accent, style: BorderStyle.SINGLE, size: 8 },
            },
            children: [
              new TextRun({
                text: uniqueTextItems([sanitizedModel.industry, sanitizedModel.countryRegion].filter(Boolean)).join(" | "),
                size: 18,
                color: "5B6A7C",
              }),
            ],
          }),
        ]
      : []),
    ...orderedMainChildren,
    new Paragraph({
      spacing: { before: 140 },
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Prepared by Solva AI Career Studio", color: "7C8796", size: 16 })],
    }),
  ];

  const document = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

function wrapPdfText(text: string, maxChars = 92) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [""];
  }
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = next;
    }
  });
  if (current) {
    lines.push(current);
  }
  return lines;
}

function drawParagraph(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  size: number,
  lineHeight: number,
  color = rgb(0.06, 0.1, 0.16),
  maxChars = 96
) {
  const lines = wrapPdfText(text, maxChars);
  let cursorY = y;
  lines.forEach((line) => {
    page.drawText(line, {
      x,
      y: cursorY,
      size,
      font,
      color,
    });
    cursorY -= lineHeight;
  });
  return cursorY;
}

function hexToRgb(hex: string) {
  return rgb(
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255
  );
}

function drawSectionHeading(
  page: PDFPage,
  fontBold: PDFFont,
  title: string,
  x: number,
  y: number,
  width: number,
  accent: ReturnType<typeof rgb>,
  textColor = accent
) {
  page.drawText(title.toUpperCase(), { x, y, size: 11.2, font: fontBold, color: textColor });
  page.drawLine({
    start: { x, y: y - 4 },
    end: { x: x + width, y: y - 4 },
    thickness: 0.9,
    color: accent,
  });
  return y - 18;
}

function drawBulletList(
  page: PDFPage,
  font: PDFFont,
  items: string[],
  x: number,
  y: number,
  size: number,
  lineHeight: number,
  color: ReturnType<typeof rgb>,
  maxChars: number
) {
  let cursor = y;
  items.forEach((item) => {
    cursor = drawParagraph(page, font, `- ${item}`, x, cursor, size, lineHeight, color, maxChars) - 2;
  });
  return cursor;
}

function drawSidebarTemplatePdf(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  model: GeneratedCvModel,
  accent: ReturnType<typeof rgb>,
  profilePhoto: CvProfilePhotoAsset = null
) {
  const composition = inferCvCompositionPlan(model);
  const navy = rgb(0.07, 0.17, 0.31);
  const ink = rgb(0.12, 0.16, 0.22);
  const softInk = rgb(0.33, 0.38, 0.47);
  const paper = rgb(0.985, 0.987, 0.992);
  const white = rgb(0.98, 0.985, 0.995);
  const mistBlue = rgb(0.92, 0.95, 0.99);
  const paleBlue = rgb(0.87, 0.92, 0.985);
  const sidebarWidth = 170;
  const mainX = sidebarWidth + 34;
  const mainWidth = 595 - mainX - 28;
  let y = 772;

  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: paper });
  page.drawRectangle({ x: sidebarWidth - 2, y: 0, width: 427, height: 842, color: mistBlue, opacity: 0.22 });
  page.drawRectangle({ x: sidebarWidth, y: 732, width: 425, height: 110, color: paleBlue, opacity: 0.42 });
  page.drawRectangle({ x: 525, y: 0, width: 70, height: 842, color: paleBlue, opacity: 0.12 });
  page.drawCircle({ x: 545, y: 785, size: 64, color: paleBlue, opacity: 0.16 });
  page.drawCircle({ x: 505, y: 120, size: 48, color: accent, opacity: 0.08 });
  page.drawRectangle({ x: 0, y: 0, width: sidebarWidth, height: 842, color: navy });
  page.drawRectangle({ x: 0, y: 0, width: 10, height: 842, color: accent, opacity: 0.65 });
  if (profilePhoto) {
    page.drawRectangle({ x: 44, y: 700, width: 80, height: 80, color: rgb(0.94, 0.96, 0.985) });
  } else {
    page.drawCircle({ x: 84, y: 742, size: 40, color: rgb(0.94, 0.96, 0.985) });
    page.drawText(buildInitials(model.customerName), { x: 65, y: 729, size: 22, font: fontBold, color: navy });
  }

  let leftY = 660;
  const leftSection = (title: string) => {
    page.drawLine({ start: { x: 22, y: leftY + 12 }, end: { x: sidebarWidth - 22, y: leftY + 12 }, thickness: 0.8, color: rgb(0.82, 0.88, 0.95) });
    page.drawRectangle({ x: 24, y: leftY - 14, width: 52, height: 2.4, color: accent, opacity: 0.9 });
    page.drawText(title.toUpperCase(), { x: 24, y: leftY - 10, size: 10.2, font: fontBold, color: white });
    leftY -= 34;
  };

  if (composition.headline) {
    leftY = drawParagraph(page, fontBold, composition.headline, 24, leftY, 9.2, 11.2, white, 25) - 6;
  }
  if (model.targetRole && composition.headline !== model.targetRole) {
    leftY = drawParagraph(page, font, model.targetRole, 24, leftY, 8.6, 10.8, rgb(0.87, 0.92, 0.98), 25) - 12;
  }
  leftSection("Contact");
  leftY = drawBulletList(page, font, splitContactLines(model), 24, leftY, 8.5, 10.8, white, 25) - 10;
  if (model.coreCompetencies.length) {
    leftSection("Highlights");
    leftY = drawBulletList(page, font, clampItems(model.coreCompetencies, 7), 24, leftY, 8.6, 10.8, white, 25) - 10;
  }

  page.drawText(model.customerName, { x: mainX, y, size: 26, font: fontBold, color: navy });
  y -= 25;
  if (model.professionalHeadline || model.targetRole) {
    page.drawText(model.professionalHeadline || model.targetRole, { x: mainX, y, size: 12.8, font, color: softInk });
    y -= 20;
  }
  page.drawRectangle({ x: mainX, y: y + 8, width: 74, height: 4, color: accent, opacity: 0.95 });
  page.drawLine({ start: { x: mainX, y }, end: { x: mainX + mainWidth, y }, thickness: 1, color: softInk });
  y -= 26;
  const mainSections = composition.sectionOrder.filter((section) =>
    ["summary", "achievements", "experience", "education"].includes(section) ||
    (section === "qualifications" && composition.presentationMode === "credential-forward")
  );
  const secondarySections = composition.sectionOrder.filter((section) => !mainSections.includes(section));

  const renderMainSection = (section: CvSectionKey, startY: number) => {
    let cursor = startY;
    if (section === "summary") {
      page.drawRectangle({ x: mainX, y: cursor - 64, width: mainWidth, height: 54, color: rgb(0.96, 0.975, 0.995) });
      cursor = drawSectionHeading(page, fontBold, "Professional Summary", mainX + 10, cursor - 8, mainWidth - 20, accent, navy);
      return drawParagraph(page, font, model.professionalSummary, mainX + 10, cursor, 9.1, 11.3, ink, 64) - 18;
    }
    if (section === "achievements") {
      cursor = drawSectionHeading(page, fontBold, "Key Achievements", mainX, cursor, mainWidth, accent, navy);
      return drawBulletList(page, font, model.keyAchievements.slice(0, 5), mainX + 2, cursor, 8.8, 11, ink, 58) - 8;
    }
    if (section === "experience") {
      cursor = drawSectionHeading(page, fontBold, "Work Experience", mainX, cursor, mainWidth, accent, navy);
      model.experience.slice(0, 4).forEach((entry) => {
        page.drawText(entry.jobTitle, { x: mainX, y: cursor, size: 10.5, font: fontBold, color: ink });
        cursor -= 12;
        page.drawText(`${entry.employer} | ${entry.dateRange}`, { x: mainX, y: cursor, size: 9.1, font, color: softInk });
        cursor -= 12;
        cursor = drawBulletList(page, font, entry.bullets.slice(0, 4), mainX + 2, cursor, 8.8, 11, ink, 58) - 7;
      });
      return cursor;
    }
    if (section === "education") {
      cursor = drawSectionHeading(page, fontBold, composition.presentationMode === "education-forward" ? "Academic Foundation" : "Education", mainX, cursor, mainWidth, accent, navy);
      model.education.slice(0, 4).forEach((entry) => {
        page.drawText(entry.title || "Education entry", { x: mainX, y: cursor, size: 10.2, font: fontBold, color: ink });
        cursor -= 11;
        if (entry.detail) {
          cursor = drawParagraph(page, font, entry.detail, mainX, cursor, 9, 11.2, softInk, 60) - 7;
        }
      });
      return cursor;
    }
    if (section === "qualifications") {
      cursor = drawSectionHeading(page, fontBold, "Credentials", mainX, cursor, mainWidth, accent, navy);
      return drawBulletList(
        page,
        font,
        model.qualifications.map((entry) => `${entry.title}${entry.detail ? ` - ${entry.detail}` : ""}`).slice(0, 5),
        mainX,
        cursor,
        8.8,
        11,
        ink,
        58
      ) - 8;
    }
    return cursor;
  };

  mainSections.forEach((section) => {
    y = renderMainSection(section, y);
  });

  const lowerStart = Math.max(126, y - 2);
  const colGap = 18;
  const colWidth = (mainWidth - colGap) / 2;
  let leftColY = lowerStart;
  let rightColY = lowerStart;
  const leftSections = secondarySections.filter((_, index) => index % 2 === 0);
  const rightSections = secondarySections.filter((_, index) => index % 2 === 1);

  const renderCompactSection = (section: CvSectionKey, x: number, startY: number) => {
    let cursor = startY;
    const titleMap: Record<CvSectionKey, string> = {
      summary: "Summary",
      competencies: "Core Strengths",
      achievements: "Key Wins",
      experience: "Experience",
      education: "Education",
      qualifications: "Credentials",
      skills: "Technical Skills",
      memberships: "Memberships",
      referees: "Referees",
    };
    const items =
      section === "skills"
        ? model.skills.flatMap((entry) => entry.items).slice(0, 8)
        : section === "memberships"
          ? model.professionalMemberships.map((entry) => `${entry.title}${entry.detail ? ` - ${entry.detail}` : ""}`).slice(0, 5)
        : section === "competencies"
          ? clampItems(model.coreCompetencies, 8)
          : section === "achievements"
            ? model.keyAchievements.slice(0, 5)
          : section === "qualifications"
            ? model.qualifications.map((entry) => `${entry.title}${entry.detail ? ` - ${entry.detail}` : ""}`).slice(0, 6)
            : section === "referees"
              ? (model.referees.length
                  ? model.referees.slice(0, 2).map((entry) => `${entry.name}${entry.designation ? ` - ${entry.designation}` : ""}`)
                  : ["Referees available on request"])
              : section === "education"
                ? model.education.map((entry) => entry.title).slice(0, 4)
                : [];
    if (!items.length) {
      return cursor;
    }
    cursor = drawSectionHeading(page, fontBold, titleMap[section], x, cursor, colWidth, accent, navy);
    return drawBulletList(page, font, items, x, cursor, 8.55, 10.7, ink, 27) - 8;
  };

  leftSections.forEach((section) => {
    leftColY = renderCompactSection(section, mainX, leftColY);
  });
  rightSections.forEach((section) => {
    rightColY = renderCompactSection(section, mainX + colWidth + colGap, rightColY);
  });

  page.drawText("Prepared by Solva AI Career Studio", {
    x: 392,
    y: 24,
    size: 7.7,
    font,
    color: softInk,
  });
}

function drawExecutiveTemplatePdf(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  model: GeneratedCvModel,
  accent: ReturnType<typeof rgb>
) {
  const composition = inferCvCompositionPlan(model);
  const navy = rgb(0.09, 0.2, 0.33);
  const ink = rgb(0.12, 0.16, 0.22);
  const softInk = rgb(0.33, 0.38, 0.47);
  const paper = rgb(0.985, 0.987, 0.992);
  const border = rgb(0.45, 0.56, 0.79);
  const mistBlue = rgb(0.92, 0.95, 0.99);
  const paleBlue = rgb(0.86, 0.91, 0.98);
  const marginX = 30;
  const width = 535;
  let y = 690;

  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: paper });
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: mistBlue, opacity: 0.16 });
  page.drawRectangle({ x: 0, y: 664, width: 595, height: 178, color: paleBlue, opacity: 0.18 });
  page.drawCircle({ x: 560, y: 785, size: 52, color: accent, opacity: 0.12 });
  page.drawCircle({ x: 72, y: 62, size: 44, color: accent, opacity: 0.08 });
  page.drawRectangle({ x: 3, y: 3, width: 589, height: 836, borderColor: border, borderWidth: 1.2, color: paper });
  page.drawRectangle({ x: 8, y: 720, width: 579, height: 112, color: navy });
  page.drawRectangle({ x: 95, y: 752, width: 405, height: 38, borderColor: accent, borderWidth: 1.4 });
  page.drawRectangle({ x: 8, y: 714, width: 579, height: 5, color: accent, opacity: 0.88 });
  page.drawText(model.customerName.toUpperCase(), { x: 116, y: 763, size: 22, font, color: rgb(0.97, 0.98, 0.995) });
  page.drawText(splitContactLines(model).join("  |  "), { x: 82, y: 738, size: 8.7, font: fontBold, color: rgb(0.91, 0.95, 0.99) });

  page.drawRectangle({ x: marginX, y: y - 30, width: width, height: 36, color: rgb(0.95, 0.975, 0.995) });
  page.drawText(uniqueTextItems([composition.headline, model.industry, model.countryRegion].filter(Boolean)).join("  |  "), {
    x: marginX + 12,
    y: y - 16,
    size: 9,
    font: fontBold,
    color: softInk,
  });
  y -= 48;

  const mainSections = composition.sectionOrder.filter((section) => ["summary", "achievements", "experience"].includes(section));
  const secondarySections = composition.sectionOrder.filter((section) => !mainSections.includes(section));

  mainSections.forEach((section) => {
    if (section === "summary") {
      y = drawSectionHeading(page, fontBold, "Executive Summary", marginX, y, width, accent, ink);
      y = drawParagraph(page, font, model.professionalSummary, marginX, y, 9.3, 12.2, ink, 95) - 10;
      return;
    }
    if (section === "achievements") {
      y = drawSectionHeading(page, fontBold, "Signature Achievements", marginX, y, width, accent, ink);
      y = drawBulletList(page, font, model.keyAchievements.slice(0, 6), marginX + 2, y, 8.8, 10.9, ink, 89) - 8;
      return;
    }
    if (section === "experience") {
      y = drawSectionHeading(page, fontBold, "Leadership Experience", marginX, y, width, accent, ink);
      model.experience.slice(0, 4).forEach((entry) => {
        page.drawText(entry.jobTitle, { x: marginX, y, size: 10.5, font: fontBold, color: ink });
        y -= 12;
        page.drawText(`${entry.employer} | ${entry.dateRange}`, { x: marginX, y, size: 9, font, color: softInk });
        y -= 12;
        y = drawBulletList(page, font, entry.bullets.slice(0, 4), marginX + 2, y, 8.8, 10.9, ink, 89) - 7;
      });
    }
  });

  const colGap = 22;
  const colWidth = (width - colGap) / 2;
  let leftY = y - 4;
  let rightY = y - 4;
  const leftSections = secondarySections.filter((_, index) => index % 2 === 0);
  const rightSections = secondarySections.filter((_, index) => index % 2 === 1);

  const renderExecutiveSection = (section: CvSectionKey, x: number, startY: number) => {
    let cursor = startY;
    if (section === "education") {
      cursor = drawSectionHeading(page, fontBold, composition.presentationMode === "education-forward" ? "Academic Foundation" : "Education", x, cursor, colWidth, accent, ink);
      model.education.slice(0, 4).forEach((entry) => {
        cursor = drawParagraph(page, fontBold, entry.title || "Education entry", x, cursor, 9.1, 11.3, ink, 36) - 1;
        if (entry.detail) {
          cursor = drawParagraph(page, font, entry.detail, x, cursor, 8.7, 10.9, softInk, 36) - 6;
        }
      });
      return cursor;
    }
    if (section === "skills") {
      cursor = drawSectionHeading(page, fontBold, "Technical Skills", x, cursor, colWidth, accent, ink);
      return drawBulletList(page, font, model.skills.flatMap((entry) => entry.items).slice(0, 10), x, cursor, 8.6, 10.7, ink, 28);
    }
    if (section === "qualifications") {
      cursor = drawSectionHeading(page, fontBold, "Credentials", x, cursor, colWidth, accent, ink);
      return drawBulletList(
        page,
        font,
        model.qualifications.map((entry) => `${entry.title}${entry.detail ? ` - ${entry.detail}` : ""}`).slice(0, 7),
        x,
        cursor,
        8.6,
        10.7,
        ink,
        28
      );
    }
    if (section === "competencies") {
      cursor = drawSectionHeading(page, fontBold, "Strategic Strengths", x, cursor, colWidth, accent, ink);
      return drawBulletList(page, font, clampItems(model.coreCompetencies, 8), x, cursor, 8.6, 10.7, ink, 28);
    }
    if (section === "memberships") {
      cursor = drawSectionHeading(page, fontBold, "Memberships", x, cursor, colWidth, accent, ink);
      return drawBulletList(
        page,
        font,
        model.professionalMemberships.map((entry) => `${entry.title}${entry.detail ? ` - ${entry.detail}` : ""}`).slice(0, 6),
        x,
        cursor,
        8.6,
        10.7,
        ink,
        28
      );
    }
    if (section === "referees") {
      cursor = drawSectionHeading(page, fontBold, "Referees", x, cursor, colWidth, accent, ink);
      const items = model.referees.length
        ? model.referees.slice(0, 2).map((entry) => `${entry.name}${entry.designation ? ` - ${entry.designation}` : ""}`)
        : ["Referees available on request"];
      return drawBulletList(page, font, items, x, cursor, 8.6, 10.7, ink, 28);
    }
    return cursor;
  };

  leftSections.forEach((section) => {
    leftY = renderExecutiveSection(section, marginX, leftY) - 6;
  });
  rightSections.forEach((section) => {
    rightY = renderExecutiveSection(section, marginX + colWidth + colGap, rightY) - 6;
  });

  page.drawRectangle({ x: 20, y: 40, width: 555, height: 1.5, color: accent, opacity: 0.45 });
  page.drawText("Prepared by Solva AI Career Studio", {
    x: 412,
    y: 25,
    size: 7.7,
    font,
    color: softInk,
  });
}

export async function buildCvPdf(model: GeneratedCvModel, profilePhoto: CvProfilePhotoAsset = null) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = hexToRgb(PACKAGE_STYLES[model.packageKey].accent);
  const composition = inferCvCompositionPlan(model);

  if (composition.template === "sidebar") {
    drawSidebarTemplatePdf(page, font, fontBold, model, accent, profilePhoto);
    if (profilePhoto) {
      const image =
        profilePhoto.mimeType === "image/png"
          ? await pdf.embedPng(profilePhoto.bytes)
          : await pdf.embedJpg(profilePhoto.bytes);
      page.drawImage(image, { x: 44, y: 700, width: 80, height: 80 });
    }
  } else {
    drawExecutiveTemplatePdf(page, font, fontBold, model, accent);
  }

  return pdf.save();
}
