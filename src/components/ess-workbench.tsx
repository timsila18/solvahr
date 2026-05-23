"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { workflowRoutes } from "@/lib/workflow-routes";

type AsyncState<T> = {
  loading: boolean;
  error: string;
  data: T | null;
};

type DashboardData = {
  profile: {
    fullName: string;
    employeeNumber: string;
    department: string;
    branch: string;
    employmentType: string;
    supervisor: string;
  };
  stats: {
    payslips: number;
    annualLeaveBalance: number;
    documents: number;
    pendingRequests: number;
    unreadNotifications: number;
    attendanceExceptions: number;
  };
  latestPayslip: null | {
    period: string;
    netPay: string;
    grossPay: string;
  };
  shiftToday: null | {
    date: string;
    shiftCode: string;
    shiftName: string;
    startTime: string;
    endTime: string;
  };
  upcomingShifts: Array<{
    id: string;
    date: string;
    shiftCode: string;
    shiftName: string;
    startTime: string;
    endTime: string;
  }>;
  profileCompletionPercent: number;
  upcomingLeaveDates: Array<{
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  recentDocuments: Array<{
    id: string;
    category: string;
    fileName: string;
    uploadedAt: string;
  }>;
  loanSummary: {
    activeLoans: number;
    outstandingBalance: string;
    monthlyLoanDeduction: string;
  };
  recentNotifications: Array<{ id: string; title: string; message: string; createdAt: string }>;
  recentRequests: Array<{ id: string; title: string; ownerRole: string; status: string; updatedAt: string }>;
};

type ProfileData = {
  id: string;
  employeeNumber: string;
  fullName: string;
  department: string;
  branch: string;
  employmentType: string;
  status: string;
  phoneNumber: string;
  companyEmail: string;
  profilePhoto?: string;
  gender?: string;
  dateOfBirth?: string;
  supervisor: string;
  costCenter: string;
  nationalId: string;
  kraPin: string;
  shifNumber: string;
  nssfNumber: string;
  bankName: string;
  bankAccount: string;
  hireDate: string;
  profileSections: Array<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }>;
  documentSummary: Array<{ name: string; category: string; status: string; expiry: string }>;
  movementHistory: Array<{ title: string; detail: string; date: string }>;
};

type DocumentItem = {
  id: string;
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

type CompanyDocumentItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  issueDate: string;
  uploadedAt: string;
};

type PayslipItem = {
  id: string;
  employeeId?: string;
  periodId?: string;
  period: string;
  grossPay: string;
  netPay: string;
  deductions: Record<string, unknown>;
  allowances: Record<string, unknown>;
  missingFields?: string[];
};

type P9Item = {
  id: string;
  taxYear: string;
  grossPay: string;
  taxablePay: string;
  payePaid: string;
  reliefApplied: string;
  pensionContribution: string;
  insuranceRelief: string;
  mortgageRelief: string;
};

type LeavePayload = {
  requests: Array<Record<string, unknown>>;
  balances: Array<Record<string, unknown>>;
  holidays: Array<Record<string, unknown>>;
  policies: Array<Record<string, unknown>>;
};

type AttendancePayload = {
  records: Array<Record<string, unknown>>;
  overtime: Array<Record<string, unknown>>;
  holidays: Array<Record<string, unknown>>;
  shiftSchedule: Array<{
    id: string;
    date: string;
    shiftCode: string;
    shiftName: string;
    startTime: string;
    endTime: string;
  }>;
  summary: {
    presentDays: number;
    lateDays: number;
    absentDays: number;
    overtimeHours: number;
  };
};

type LoansPayload = {
  loans: Array<{
    id: string;
    loanName: string;
    lenderName: string;
    deductionType: string;
    originalAmount: string;
    balanceAmount: string;
    monthlyDeduction: string;
    startDate: string;
    endDate: string;
    status: string;
    notes: string;
  }>;
  salaryAdvances: Array<{
    id: string;
    amount: string;
    rawAmount: number;
    reason: string;
    requestDate: string;
    status: string;
    stage: string;
    targetPayrollLabel: string;
    updatedAt: string;
  }>;
  payrollDeductions: Array<{
    payslipId: string;
    period: string;
    total: string;
    items: Array<{ label: string; value: string }>;
  }>;
  summary: {
    activeLoans: number;
    outstandingBalance: string;
    monthlyLoanDeduction: string;
  };
};

type AssetsPayload = {
  assignments: Array<{
    id: string;
    assetName: string;
    assetCategory: string;
    serialNumber: string;
    status: string;
    issueDate: string;
    expectedReturnDate: string;
    handoverFormName: string;
    notes: string;
  }>;
  requests: Array<{
    id: string;
    assetName: string;
    requestType: string;
    status: string;
    createdAt: string;
    notes: string;
    approvalStage: string;
  }>;
};

type TrainingItem = {
  id: string;
  programName: string;
  schedule: string;
  budget: string;
  notes: string;
  status: string;
  createdAt: string;
  approvalStage: string;
};

type AppraisalItem = {
  id: string;
  reviewCycle: string;
  reviewPeriod: string;
  score: string | number;
  status: string;
  supervisorComments: string;
  hrComments: string;
  promotionRecommendation: string;
  pipStatus: string;
  goals: Array<{ title?: string; status?: string }>;
  kpis: Array<{ label?: string; value?: number }>;
  metricLabel?: string;
  targetValue?: number;
  actualValue?: number;
  achievementPercent?: number;
  indicator?: string;
  weekLabel?: string;
  managerRating?: string;
  subjectRole?: string;
  provisionalStatus?: string;
  canDownloadReport?: boolean;
  selfComments?: string;
  challengesSummary?: string;
  supportRequired?: string;
  gmComments?: string;
  finalDecision?: string;
  canSelfReview?: boolean;
  workflowMode?: string;
  areas?: Array<{
    id: string;
    title: string;
    performanceIndicator?: string;
    expectedOutput?: string;
    selfScore?: number;
    supervisorScore?: number;
    gmScore?: number;
    finalScore?: number;
    evaluatorComments?: string;
  }>;
  createdAt: string;
};

type AppraisalAssistPayload = {
  whatWentWell?: string;
  challenges?: string;
  supportNeeded?: string;
  summary?: string;
  model?: string;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  category: string;
  linkHref: string;
  status: string;
  createdAt: string;
};

type ActionMessageItem = {
  id: string;
  title: string;
  entityType: string;
  entityId: string;
  authorRole: string;
  authorName: string;
  message: string;
  createdAt: string;
};

type RequestItem = {
  id: string;
  title: string;
  moduleKey: string;
  requestType?: string;
  ownerRole: string;
  requestedBy?: string;
  requestedByRole?: string;
  submittedDate?: string;
  status: string;
  updatedAt: string;
  description: string;
  latestComment?: string;
  linkHref?: string;
};

type ComplaintItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  stage: string;
  details: string;
  response: string;
  privateNotes: string;
  employeeName: string;
  employeeNumber: string;
  createdAt?: string;
  updatedAt: string;
};

type WorkflowAssistPayload = {
  newValue?: string;
  reason?: string;
  programName?: string;
  notes?: string;
  subject?: string;
  details?: string;
  response?: string;
  privateNotes?: string;
  comments?: string;
  attachmentNote?: string;
  issues?: string[];
  summary?: string;
  model?: string;
};

type SettingsPayload = {
  themeMode: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  language: string;
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });

  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}`);
  }

  return payload;
}

function SectionMessage({ text }: { text: string }) {
  return <p className="section-description">{text}</p>;
}

function ScheduleTable({
  columns,
  rows,
  emptyText,
}: {
  columns: Array<{ key: string; label: string; align?: "left" | "right" }>;
  rows: Array<Record<string, React.ReactNode>>;
  emptyText: string;
}) {
  if (!rows.length) {
    return <SectionMessage text={emptyText} />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.align === "right" ? "align-right" : undefined} key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? row.key ?? index)}>
              {columns.map((column) => (
                <td className={column.align === "right" ? "align-right" : undefined} key={column.key}>
                  {row[column.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  title,
  text,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="empty-state-card">
      <strong>{title}</strong>
      <p>{text}</p>
      {actionLabel && onAction ? (
        <button className="primary-button" onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function formatSimpleStageContribution(scoreValues: Array<number | undefined>) {
  const validScores = scoreValues.filter((value): value is number => typeof value === "number" && value > 0);
  if (!validScores.length) {
    return "0.00";
  }
  const average = validScores.reduce((sum, value) => sum + value, 0) / validScores.length;
  return ((average / 5) * 33).toFixed(2);
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseFileNameFromDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/filename=\"?([^\";]+)\"?/i);
  return match?.[1] ?? null;
}

function parseActionThreadTarget(linkHref: string) {
  if (!linkHref) {
    return null;
  }

  try {
    const targetUrl = new URL(linkHref, "https://solvahr.local");
    const entityType = targetUrl.searchParams.get("entityType") ?? "";
    const entityId = targetUrl.searchParams.get("entityId") ?? "";
    if (!entityType || !entityId) {
      return null;
    }
    return { entityType, entityId };
  } catch {
    return null;
  }
}

function toNumberValue(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function formatShiftTime(value: string) {
  if (!value) return "";
  const [hoursText, minutesText = "00"] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatWorkflowAssistMessage(payload: WorkflowAssistPayload, fallback: string) {
  const summary = payload.summary || fallback;
  const issues = Array.isArray(payload.issues) ? payload.issues.filter(Boolean) : [];
  if (!issues.length) {
    return summary;
  }
  return `${summary} Watch-outs: ${issues.slice(0, 3).join(" | ")}`;
}

const DEFAULT_TRAINING_SCHEDULE = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
  .toISOString()
  .slice(0, 10);

export function EssWorkbench({
  activeItem,
  onJump,
}: {
  activeItem: string;
  onJump: (item: string) => void;
}) {
  const router = useRouter();
  const [dashboardState, setDashboardState] = useState<AsyncState<DashboardData>>({
    loading: false,
    error: "",
    data: null,
  });
  const [profileState, setProfileState] = useState<AsyncState<ProfileData>>({
    loading: false,
    error: "",
    data: null,
  });
  const [documentsState, setDocumentsState] = useState<AsyncState<DocumentItem[]>>({
    loading: false,
    error: "",
    data: null,
  });
  const [companyDocumentsState, setCompanyDocumentsState] = useState<AsyncState<CompanyDocumentItem[]>>({
    loading: false,
    error: "",
    data: null,
  });
  const [payslipState, setPayslipState] = useState<AsyncState<PayslipItem[]>>({
    loading: false,
    error: "",
    data: null,
  });
  const [p9State, setP9State] = useState<AsyncState<P9Item[]>>({
    loading: false,
    error: "",
    data: null,
  });
  const [leaveState, setLeaveState] = useState<AsyncState<LeavePayload>>({
    loading: false,
    error: "",
    data: null,
  });
  const [attendanceState, setAttendanceState] = useState<AsyncState<AttendancePayload>>({
    loading: false,
    error: "",
    data: null,
  });
  const [loansState, setLoansState] = useState<AsyncState<LoansPayload>>({
    loading: false,
    error: "",
    data: null,
  });
  const [assetsState, setAssetsState] = useState<AsyncState<AssetsPayload>>({
    loading: false,
    error: "",
    data: null,
  });
  const [appraisalsState, setAppraisalsState] = useState<AsyncState<AppraisalItem[]>>({
    loading: false,
    error: "",
    data: null,
  });
  const [trainingState, setTrainingState] = useState<AsyncState<TrainingItem[]>>({
    loading: false,
    error: "",
    data: null,
  });
  const [complaintsState, setComplaintsState] = useState<AsyncState<ComplaintItem[]>>({
    loading: false,
    error: "",
    data: null,
  });
  const [requestsState, setRequestsState] = useState<AsyncState<RequestItem[]>>({
    loading: false,
    error: "",
    data: null,
  });
  const [notificationsState, setNotificationsState] = useState<AsyncState<NotificationItem[]>>({
    loading: false,
    error: "",
    data: null,
  });
  const [actionThreadState, setActionThreadState] = useState<AsyncState<ActionMessageItem[]>>({
    loading: false,
    error: "",
    data: null,
  });
  const [activeActionThread, setActiveActionThread] = useState<{ entityType: string; entityId: string; title: string } | null>(null);
  const [actionThreadDraft, setActionThreadDraft] = useState("");
  const [settingsState, setSettingsState] = useState<AsyncState<SettingsPayload>>({
    loading: false,
    error: "",
    data: null,
  });
  const [actionMessage, setActionMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [safeProfileForm, setSafeProfileForm] = useState({
    phone: "",
    mpesaMobileNumber: "",
    email: "",
    gender: "",
    dateOfBirth: "",
    nationalId: "",
    kraPin: "",
    shifNumber: "",
    nssfNumber: "",
    profilePhoto: "",
  });
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [sensitiveProfileForm, setSensitiveProfileForm] = useState({
    fieldName: "Bank details",
    newValue: "",
    reason: "",
  });
  const [trainingForm, setTrainingForm] = useState({
    programName: "Customer Service Excellence",
    schedule: DEFAULT_TRAINING_SCHEDULE,
    budget: "0",
    notes: "",
  });
  const [assetForm, setAssetForm] = useState({
    assetName: "",
    requestType: "Return",
  });
  const [complaintForm, setComplaintForm] = useState({
    category: "Workplace conduct",
    subject: "",
    details: "",
  });
  const [complaintReplyDrafts, setComplaintReplyDrafts] = useState<Record<string, { response: string; privateNotes: string }>>({});
  const [selfReviewDrafts, setSelfReviewDrafts] = useState<
    Record<
      string,
      {
        whatWentWell: string;
        challenges: string;
        supportNeeded: string;
        areaScores: Record<string, string>;
      }
    >
  >({});
  const [documentForm, setDocumentForm] = useState({
    category: "National ID",
    file: null as File | null,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [salaryAdvanceForm, setSalaryAdvanceForm] = useState({
    amount: "",
    reason: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  async function loadDashboard() {
    setDashboardState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ dashboard: DashboardData }>("/api/ess/dashboard");
      setDashboardState({ loading: false, error: "", data: payload.dashboard });
    } catch (error) {
      setDashboardState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load dashboard.",
        data: null,
      });
    }
  }

  async function loadProfile() {
    setProfileState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ profile: ProfileData }>("/api/ess/profile");
      setProfileState({ loading: false, error: "", data: payload.profile });
      setSafeProfileForm({
        phone: payload.profile.phoneNumber === "-" ? "" : payload.profile.phoneNumber,
        mpesaMobileNumber: payload.profile.phoneNumber === "-" ? "" : payload.profile.phoneNumber,
        email: payload.profile.companyEmail === "-" ? "" : payload.profile.companyEmail,
        gender: payload.profile.gender === "-" ? "" : toStringValue(payload.profile.gender),
        dateOfBirth: payload.profile.dateOfBirth === "-" ? "" : toStringValue(payload.profile.dateOfBirth),
        nationalId: payload.profile.nationalId === "-" ? "" : payload.profile.nationalId,
        kraPin: payload.profile.kraPin === "-" ? "" : payload.profile.kraPin,
        shifNumber: payload.profile.shifNumber === "-" ? "" : payload.profile.shifNumber,
        nssfNumber: payload.profile.nssfNumber === "-" ? "" : payload.profile.nssfNumber,
        profilePhoto: payload.profile.profilePhoto ?? "",
      });
      setProfilePhotoFile(null);
    } catch (error) {
      setProfileState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load profile.",
        data: null,
      });
    }
  }

  async function loadDocuments() {
    setDocumentsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ documents: DocumentItem[] }>("/api/ess/documents");
      setDocumentsState({ loading: false, error: "", data: payload.documents });
    } catch (error) {
      setDocumentsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load documents.",
        data: null,
      });
    }
  }

  async function loadCompanyDocuments() {
    setCompanyDocumentsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ documents: CompanyDocumentItem[] }>("/api/ess/company-documents");
      setCompanyDocumentsState({ loading: false, error: "", data: payload.documents });
    } catch (error) {
      setCompanyDocumentsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load company documents.",
        data: null,
      });
    }
  }

  async function loadPayslips() {
    setPayslipState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ payslips: PayslipItem[] }>("/api/ess/payslips");
      setPayslipState({ loading: false, error: "", data: payload.payslips });
    } catch (error) {
      setPayslipState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load payslips.",
        data: null,
      });
    }
  }

  async function loadP9() {
    setP9State((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ forms: P9Item[] }>("/api/ess/p9");
      setP9State({ loading: false, error: "", data: payload.forms });
    } catch (error) {
      setP9State({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load P9 forms.",
        data: null,
      });
    }
  }

  async function loadLeave() {
    setLeaveState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<LeavePayload>("/api/ess/leave");
      setLeaveState({ loading: false, error: "", data: payload });
    } catch (error) {
      setLeaveState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load leave records.",
        data: null,
      });
    }
  }

  async function loadAttendance() {
    setAttendanceState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<AttendancePayload>("/api/ess/attendance");
      setAttendanceState({ loading: false, error: "", data: payload });
    } catch (error) {
      setAttendanceState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load attendance records.",
        data: null,
      });
    }
  }

  async function loadLoans() {
    setLoansState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<LoansPayload>("/api/ess/loans");
      setLoansState({ loading: false, error: "", data: payload });
    } catch (error) {
      setLoansState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load loans and deductions.",
        data: null,
      });
    }
  }

  async function loadAssets() {
    setAssetsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<AssetsPayload>("/api/ess/assets");
      setAssetsState({ loading: false, error: "", data: payload });
    } catch (error) {
      setAssetsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load assets.",
        data: null,
      });
    }
  }

  async function loadAppraisals() {
    setAppraisalsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ appraisals: AppraisalItem[] }>("/api/ess/appraisals");
      setAppraisalsState({ loading: false, error: "", data: payload.appraisals });
      setSelfReviewDrafts((current) => {
        const next = { ...current };
        for (const appraisal of payload.appraisals) {
          next[appraisal.id] = {
            whatWentWell: next[appraisal.id]?.whatWentWell ?? appraisal.selfComments ?? "",
            challenges: next[appraisal.id]?.challenges ?? appraisal.challengesSummary ?? "",
            supportNeeded: next[appraisal.id]?.supportNeeded ?? appraisal.supportRequired ?? "",
            areaScores: {
              ...Object.fromEntries(
                (appraisal.areas ?? []).map((area) => [area.id, area.selfScore ? String(area.selfScore) : ""])
              ),
              ...(next[appraisal.id]?.areaScores ?? {}),
            },
          };
        }
        return next;
      });
    } catch (error) {
      setAppraisalsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load appraisals.",
        data: null,
      });
    }
  }

  async function loadTraining() {
    setTrainingState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ training: TrainingItem[] }>("/api/ess/training");
      setTrainingState({ loading: false, error: "", data: payload.training });
    } catch (error) {
      setTrainingState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load training records.",
        data: null,
      });
    }
  }

  async function loadComplaints() {
    setComplaintsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ complaints: ComplaintItem[] }>("/api/ess/complaints");
      setComplaintsState({ loading: false, error: "", data: payload.complaints });
      setComplaintReplyDrafts((current) => {
        const next = { ...current };
        for (const complaint of payload.complaints) {
          if (!next[complaint.id]) {
            next[complaint.id] = {
              response: complaint.response ?? "",
              privateNotes: complaint.privateNotes ?? "",
            };
          }
        }
        return next;
      });
    } catch (error) {
      setComplaintsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load complaints.",
        data: null,
      });
    }
  }

  async function loadRequests() {
    setRequestsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ requests: RequestItem[] }>("/api/ess/requests");
      setRequestsState({ loading: false, error: "", data: payload.requests });
    } catch (error) {
      setRequestsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load request center.",
        data: null,
      });
    }
  }

  async function loadNotifications() {
    setNotificationsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ notifications: NotificationItem[] }>("/api/ess/notifications");
      setNotificationsState({ loading: false, error: "", data: payload.notifications });
    } catch (error) {
      setNotificationsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load notifications.",
        data: null,
      });
    }
  }

  async function loadSettings() {
    setSettingsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ settings: SettingsPayload }>("/api/ess/settings");
      setSettingsState({ loading: false, error: "", data: payload.settings });
    } catch (error) {
      setSettingsState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load settings.",
        data: null,
      });
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (activeItem === "My Dashboard" && !dashboardState.data && !dashboardState.loading) {
        void loadDashboard();
      }
      if (activeItem === "My Profile" && !profileState.loading) {
        if (!profileState.data) {
          void loadProfile();
        }
        if (!requestsState.data && !requestsState.loading) {
          void loadRequests();
        }
      }
      if (activeItem === "My Documents") {
        if (!profileState.data && !profileState.loading) {
          void loadProfile();
        }
        if (!documentsState.data && !documentsState.loading) {
          void loadDocuments();
        }
      }
      if (activeItem === "Issued Documents" && !documentsState.data && !documentsState.loading) {
        void loadDocuments();
      }
      if (activeItem === "Company Documents" && !companyDocumentsState.data && !companyDocumentsState.loading) {
        void loadCompanyDocuments();
      }
      if (activeItem === "My Payslips" && !payslipState.data && !payslipState.loading) {
        void loadPayslips();
      }
      if (activeItem === "My P9 Forms" && !p9State.data && !p9State.loading) {
        void loadP9();
      }
      if (activeItem === "My Leave" && !leaveState.data && !leaveState.loading) {
        void loadLeave();
      }
      if (activeItem === "My Attendance" && !attendanceState.data && !attendanceState.loading) {
        void loadAttendance();
      }
      if ((activeItem === "My Loans & Deductions" || activeItem === "My Loans") && !loansState.data && !loansState.loading) {
        void loadLoans();
      }
      if (activeItem === "My Assets" && !assetsState.data && !assetsState.loading) {
        void loadAssets();
      }
      if ((activeItem === "My Performance" || activeItem === "My Appraisals") && !appraisalsState.data && !appraisalsState.loading) {
        void loadAppraisals();
      }
      if (activeItem === "My Complaints" && !complaintsState.loading) {
        if (!complaintsState.data) {
          void loadComplaints();
        }
        if (!profileState.data) {
          void loadProfile();
        }
      }
      if (activeItem === "My Training" && !trainingState.data && !trainingState.loading) {
        void loadTraining();
      }
      if (activeItem === "My Requests" && !requestsState.data && !requestsState.loading) {
        void loadRequests();
      }
      if (activeItem === "My Notifications" && !notificationsState.data && !notificationsState.loading) {
        void loadNotifications();
      }
      if (activeItem === "My Settings" && !settingsState.data && !settingsState.loading) {
        void loadSettings();
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    activeItem,
    appraisalsState.data,
    appraisalsState.loading,
    assetsState.data,
    assetsState.loading,
    attendanceState.data,
    attendanceState.loading,
    companyDocumentsState.data,
    companyDocumentsState.loading,
    complaintsState.data,
    complaintsState.loading,
    dashboardState.data,
    dashboardState.loading,
    documentsState.data,
    documentsState.loading,
    leaveState.data,
    leaveState.loading,
    loansState.data,
    loansState.loading,
    notificationsState.data,
    notificationsState.loading,
    p9State.data,
    p9State.loading,
    payslipState.data,
    payslipState.loading,
    profileState.data,
    profileState.loading,
    requestsState.data,
    requestsState.loading,
    settingsState.data,
    settingsState.loading,
    trainingState.data,
    trainingState.loading,
  ]);

  const latestPayslip = useMemo(() => payslipState.data?.[0] ?? null, [payslipState.data]);

  async function handleSafeProfileSave() {
    setBusyAction("save-profile");
    setActionMessage("");
    try {
      let uploadedProfilePhotoPath: string | undefined;
      if (profilePhotoFile) {
        const formData = new FormData();
        formData.set("file", profilePhotoFile);
        const uploadResponse = await fetch("/api/ess/profile-photo", {
          method: "POST",
          body: formData,
        });
        const uploadPayload = (await uploadResponse.json().catch(() => ({ error: "profile_photo_upload_failed" }))) as {
          error?: string;
          result?: { path?: string; url?: string };
        };
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload.error ?? "Could not upload your profile photo.");
        }
        uploadedProfilePhotoPath = toStringValue(uploadPayload.result?.path ?? "");
      }
      await readJson<{ profile: ProfileData }>("/api/ess/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...safeProfileForm,
          ...(typeof uploadedProfilePhotoPath !== "undefined" ? { profilePhoto: uploadedProfilePhotoPath } : {}),
        }),
      });
      await loadProfile();
      setActionMessage("Profile details updated successfully.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update your profile.");
    } finally {
      setBusyAction("");
    }
  }

  async function handlePayslipFile(employeeId: string, mode: "preview" | "download", periodId?: string) {
    const actionKey = `payslip-${employeeId}-${periodId ?? "latest"}-${mode}`;
    setBusyAction(actionKey);
    setActionMessage("");
    try {
      const query = new URLSearchParams({
        format: "pdf",
        disposition: mode === "preview" ? "inline" : "attachment",
      });
      if (periodId) {
        query.set("periodId", periodId);
      }
      const response = await fetch(
        `/api/payroll/payslips/${employeeId}?${query.toString()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Could not ${mode === "preview" ? "open" : "download"} your payslip right now.`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const fileName =
        parseFileNameFromDisposition(response.headers.get("Content-Disposition")) ?? `payslip-${employeeId}.pdf`;
      if (mode === "preview") {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      } else {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setActionMessage(
        mode === "preview" ? `${fileName} opened in a new tab.` : `${fileName} downloaded successfully.`
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : `Could not ${mode === "preview" ? "open" : "download"} your payslip right now.`
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handlePerformanceReportFile(reviewId: string, mode: "preview" | "download") {
    setBusyAction(`performance-report-${reviewId}-${mode}`);
    setActionMessage("");
    try {
      const response = await fetch(
        `/api/performance/reports/${reviewId}?disposition=${mode === "preview" ? "inline" : "attachment"}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || `Could not ${mode === "preview" ? "open" : "download"} your performance report right now.`
        );
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const fileName =
        parseFileNameFromDisposition(response.headers.get("Content-Disposition")) ??
        `performance-report-${reviewId}.pdf`;

      if (mode === "preview") {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      } else {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setActionMessage(
        mode === "preview"
          ? `${fileName} opened in a new tab.`
          : `${fileName} downloaded successfully.`
      );
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : `Could not ${mode === "preview" ? "open" : "download"} your performance report right now.`
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleSelfReviewSubmit(reviewId: string) {
    const appraisal = appraisalsState.data?.find((item) => item.id === reviewId) ?? null;
    const appraisalStatus = (appraisal?.status ?? "").trim().toLowerCase();
    const isResubmittingToSupervisor = appraisalStatus === "supervisor_review_pending";
    const confirmationMessage = isResubmittingToSupervisor
      ? "Are you sure you want to update and resubmit this appraisal to your supervisor? Your latest answers will replace the earlier self-review."
      : "Are you sure you want to submit this appraisal to your supervisor?";
    if (typeof window !== "undefined" && !window.confirm(confirmationMessage)) {
      return;
    }

    const draft = selfReviewDrafts[reviewId] ?? {
      whatWentWell: "",
      challenges: "",
      supportNeeded: "",
      areaScores: {},
    };
    setBusyAction(`self-review-${reviewId}`);
    setActionMessage("");
    try {
      await readJson(`/api/performance/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "self",
          submit: true,
          selfComments: draft.whatWentWell,
          challengesSummary: draft.challenges,
          supportRequired: draft.supportNeeded,
          itemUpdates: Object.entries(draft.areaScores)
            .filter(([, value]) => value.trim().length > 0)
            .map(([id, value]) => ({
              id,
              selfScore: Number(value),
            })),
        }),
      });
      await loadAppraisals();
      setActionMessage(
        isResubmittingToSupervisor
          ? "Your self-review has been updated and sent back to your supervisor."
          : "Your self-review has been submitted to your supervisor."
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit your self-review.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleSelfReviewAssist(item: AppraisalItem) {
    setBusyAction(`self-review-ai-${item.id}`);
    setActionMessage("");
    try {
      const response = await readJson<AppraisalAssistPayload>("/api/ai/appraisal-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "employee_self_review",
          employeeName: item.metricLabel || item.reviewCycle,
          reviewTitle: item.reviewCycle,
          reviewPeriod: item.reviewPeriod,
          selfComments: selfReviewDrafts[item.id]?.whatWentWell ?? item.selfComments ?? "",
          challengesSummary: selfReviewDrafts[item.id]?.challenges ?? item.challengesSummary ?? "",
          supportRequired: selfReviewDrafts[item.id]?.supportNeeded ?? item.supportRequired ?? "",
          areas: (item.areas ?? []).map((area) => ({
            id: area.id,
            title: area.title,
            expectedOutput: area.expectedOutput,
            performanceIndicator: area.performanceIndicator,
            selfScore:
              Number(selfReviewDrafts[item.id]?.areaScores?.[area.id] ?? "") || area.selfScore || undefined,
          })),
        }),
      });

      setSelfReviewDrafts((current) => ({
        ...current,
        [item.id]: {
          whatWentWell: response.whatWentWell || current[item.id]?.whatWentWell || "",
          challenges: response.challenges || current[item.id]?.challenges || "",
          supportNeeded: response.supportNeeded || current[item.id]?.supportNeeded || "",
          areaScores: current[item.id]?.areaScores ?? {},
        },
      }));
      setActionMessage(response.summary || "A stronger self-review draft is ready. Please adjust it to match your real work.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not prepare a self-review draft right now.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleLeaveFormFile(requestId: string, mode: "preview" | "download") {
    setBusyAction(`leave-form-${requestId}-${mode}`);
    setActionMessage("");
    try {
      const response = await fetch(
        `/api/leave/forms/${requestId}?mode=${mode === "preview" ? "preview" : "download"}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Could not ${mode === "preview" ? "open" : "download"} the leave form.`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const fileName =
        parseFileNameFromDisposition(response.headers.get("Content-Disposition")) ?? `leave-form-${requestId}.pdf`;
      if (mode === "preview") {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      } else {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setActionMessage(mode === "preview" ? `${fileName} opened in a new tab.` : `${fileName} downloaded successfully.`);
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : `Could not ${mode === "preview" ? "open" : "download"} the leave form.`
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleSensitiveProfileRequest() {
    setBusyAction("request-profile");
    setActionMessage("");
    try {
      await readJson("/api/ess/profile-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sensitiveProfileForm),
      });
      await loadRequests();
      setSensitiveProfileForm((current) => ({ ...current, newValue: "", reason: "" }));
      setActionMessage("Sensitive profile update submitted for HR approval.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit the profile update request.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleTrainingSubmit() {
    setBusyAction("training");
    setActionMessage("");
    try {
      await readJson("/api/ess/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trainingForm),
      });
      await loadTraining();
      await loadRequests();
      setTrainingForm((current) => ({ ...current, notes: "" }));
      setActionMessage("Training request submitted for HR review.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit the training request.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleComplaintSubmit() {
    setBusyAction("complaint-submit");
    setActionMessage("");
    try {
      await readJson("/api/ess/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(complaintForm),
      });
      setComplaintForm({
        category: "Workplace conduct",
        subject: "",
        details: "",
      });
      await loadComplaints();
      setActionMessage("Complaint sent to your assigned supervisor.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit the complaint.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleWorkflowAssist(
    mode:
      | "profile_update_request"
      | "training_request"
      | "salary_advance_request"
      | "complaint_submission"
      | "complaint_response"
      | "payslip_explanation",
    options?: {
      complaintId?: string;
      payslip?: PayslipItem;
      variant?: "draft" | "review" | "shorter" | "formal" | "factual";
    }
  ) {
    const busyKey = options?.complaintId
      ? `workflow-ai-${mode}-${options.complaintId}`
      : options?.payslip?.id
        ? `workflow-ai-${mode}-${options.payslip.id}`
        : `workflow-ai-${mode}`;
    setBusyAction(busyKey);
    setActionMessage("");
    try {
      const payload = await readJson<WorkflowAssistPayload>("/api/ai/workflow-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "profile_update_request"
            ? {
                mode,
                variant: options?.variant ?? "draft",
                fieldName: sensitiveProfileForm.fieldName,
                newValue: sensitiveProfileForm.newValue,
                reason: sensitiveProfileForm.reason,
              }
            : mode === "training_request"
              ? {
                  mode,
                  variant: options?.variant ?? "draft",
                  programName: trainingForm.programName,
                  schedule: trainingForm.schedule,
                  budget: trainingForm.budget,
                  notes: trainingForm.notes,
                }
              : mode === "salary_advance_request"
                ? {
                    mode,
                    variant: options?.variant ?? "draft",
                    reason: salaryAdvanceForm.reason,
                  }
                : mode === "complaint_submission"
                  ? {
                      mode,
                      variant: options?.variant ?? "draft",
                      category: complaintForm.category,
                      subject: complaintForm.subject,
                      details: complaintForm.details,
                    }
                  : mode === "complaint_response" && options?.complaintId
                    ? {
                        mode,
                        variant: options?.variant ?? "draft",
                        category:
                          complaintsState.data?.find((item) => item.id === options.complaintId)?.category ?? "",
                        subject:
                          complaintsState.data?.find((item) => item.id === options.complaintId)?.title ?? "",
                        details:
                          complaintsState.data?.find((item) => item.id === options.complaintId)?.details ?? "",
                        response: complaintReplyDrafts[options.complaintId]?.response ?? "",
                        privateNotes: complaintReplyDrafts[options.complaintId]?.privateNotes ?? "",
                      }
                    : {
                        mode,
                        variant: options?.variant ?? "draft",
                        payrollPeriod: options?.payslip?.period,
                        grossPay: options?.payslip?.grossPay,
                        netPay: options?.payslip?.netPay,
                        deductions: options?.payslip?.deductions,
                        allowances: options?.payslip?.allowances,
                      }
        ),
      });

      if (mode === "profile_update_request") {
        setSensitiveProfileForm((current) => ({
          ...current,
          newValue: payload.newValue || current.newValue,
          reason: payload.reason || current.reason,
        }));
      } else if (mode === "training_request") {
        setTrainingForm((current) => ({
          ...current,
          programName: payload.programName || current.programName,
          notes: payload.notes || current.notes,
        }));
      } else if (mode === "salary_advance_request") {
        setSalaryAdvanceForm((current) => ({
          ...current,
          reason: payload.reason || current.reason,
        }));
      } else if (mode === "complaint_submission") {
        setComplaintForm((current) => ({
          ...current,
          subject: payload.subject || current.subject,
          details: payload.details || current.details,
        }));
      } else if (mode === "complaint_response" && options?.complaintId) {
        setComplaintReplyDrafts((current) => ({
          ...current,
          [options.complaintId!]: {
            response: payload.response || current[options.complaintId!]?.response || "",
            privateNotes: payload.privateNotes || current[options.complaintId!]?.privateNotes || "",
          },
        }));
      }

      setActionMessage(
        formatWorkflowAssistMessage(
          payload,
          "A stronger draft is ready. Please review it and keep it true to the situation."
        )
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not prepare AI assistance right now.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleComplaintUpdate(
    complaintId: string,
    status: "in_review" | "resolved"
  ) {
    setBusyAction(`complaint-${complaintId}-${status}`);
    setActionMessage("");
    try {
      const draft = complaintReplyDrafts[complaintId] ?? { response: "", privateNotes: "" };
      await readJson(`/api/ess/complaints/${complaintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          response: draft.response,
          privateNotes: draft.privateNotes,
        }),
      });
      await loadComplaints();
      setActionMessage(status === "resolved" ? "Complaint resolved." : "Complaint moved into review.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update the complaint.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleAssetSubmit() {
    setBusyAction("asset");
    setActionMessage("");
    try {
      await readJson("/api/ess/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assetForm),
      });
      await loadAssets();
      await loadRequests();
      setAssetForm({ assetName: "", requestType: "Return" });
      setActionMessage("Asset request submitted for review.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit the asset request.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleDocumentUpload() {
    if (!documentForm.file) {
      setActionMessage("Choose a document before uploading.");
      return;
    }

    setBusyAction("document");
    setActionMessage("");
    try {
      const formData = new FormData();
      formData.set("category", documentForm.category);
      formData.set("file", documentForm.file);
      await readJson("/api/ess/documents", {
        method: "POST",
        body: formData,
      });
      await loadDocuments();
      await loadRequests();
      setDocumentForm({ category: documentForm.category, file: null });
      setActionMessage("Document uploaded successfully.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not upload the document.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleDocumentDownload(documentId: string) {
    setBusyAction(`download-${documentId}`);
    setActionMessage("");
    try {
      const payload = await readJson<{ document: { signedUrl: string } }>(`/api/ess/documents/${documentId}`);
      window.open(payload.document.signedUrl, "_blank", "noopener,noreferrer");
      setActionMessage("Document download opened in a new tab.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not open that document.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleDocumentDelete(documentId: string) {
    setBusyAction(`delete-${documentId}`);
    setActionMessage("");
    try {
      await readJson(`/api/ess/documents/${documentId}`, { method: "DELETE" });
      await loadDocuments();
      setActionMessage("Document removed successfully.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not delete that document.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleCompanyDocumentOpen(documentId: string) {
    setBusyAction(`company-document-${documentId}`);
    setActionMessage("");
    try {
      const payload = await readJson<{ document: { signedUrl: string } }>(`/api/ess/company-documents/${documentId}`);
      window.open(payload.document.signedUrl, "_blank", "noopener,noreferrer");
      setActionMessage("Company document opened in a new tab.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not open that company document.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleMarkNotification(id?: string) {
    setBusyAction(id ? `notification-${id}` : "notifications-all");
    setActionMessage("");
    try {
      await readJson(id ? `/api/ess/notifications/${id}` : "/api/ess/notifications", {
        method: "PATCH",
      });
      await loadNotifications();
      await loadDashboard();
      setActionMessage(id ? "Notification marked as read." : "All notifications marked as read.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not update notifications.");
    } finally {
      setBusyAction("");
    }
  }

  async function openActionThread(entityType: string, entityId: string, title: string) {
    setBusyAction(`thread-${entityType}-${entityId}`);
    setActionThreadState({ loading: true, error: "", data: null });
    try {
      const query = new URLSearchParams({ entityType, entityId }).toString();
      const payload = await readJson<{ messages: ActionMessageItem[] }>(`/api/ess/action-messages?${query}`);
      setActiveActionThread({ entityType, entityId, title });
      setActionThreadState({ loading: false, error: "", data: payload.messages });
    } catch (error) {
      setActionThreadState({
        loading: false,
        error: error instanceof Error ? error.message : "Could not load action replies.",
        data: null,
      });
    } finally {
      setBusyAction("");
    }
  }

  async function handleActionThreadReply() {
    if (!activeActionThread || !actionThreadDraft.trim()) {
      return;
    }

    setBusyAction(`thread-reply-${activeActionThread.entityType}-${activeActionThread.entityId}`);
    try {
      await readJson<{ message: ActionMessageItem }>("/api/ess/action-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: activeActionThread.entityType,
          entityId: activeActionThread.entityId,
          message: actionThreadDraft.trim(),
        }),
      });
      setActionThreadDraft("");
      await openActionThread(activeActionThread.entityType, activeActionThread.entityId, activeActionThread.title);
      await loadNotifications();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not send your reply.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleSaveSettings() {
    setBusyAction("settings");
    setActionMessage("");
    try {
      await readJson("/api/ess/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsState.data),
      });
      await loadSettings();
      setActionMessage("ESS settings saved.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleChangePassword() {
    setBusyAction("change-password");
    setActionMessage("");
    try {
      await readJson<{ success: boolean }>("/api/ess/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setActionMessage("Password changed successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not change password.";
      setActionMessage(
        message === "password_fields_required"
          ? "All password fields are required."
          : message === "password_confirmation_mismatch"
            ? "New password and confirmation do not match."
            : message === "password_too_short"
              ? "New password must be at least 8 characters."
              : message === "current_password_incorrect"
                ? "Current password is incorrect."
                : message
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleSalaryAdvanceRequest() {
    if (!salaryAdvanceForm.amount.trim() || !salaryAdvanceForm.reason.trim()) {
      setActionMessage("Enter the salary advance amount and a clear explanation.");
      return;
    }

    setBusyAction("salary-advance");
    setActionMessage("");
    try {
      await readJson<{ request: Record<string, unknown> }>("/api/ess/salary-advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: salaryAdvanceForm.amount,
          reason: salaryAdvanceForm.reason,
        }),
      });
      setSalaryAdvanceForm({ amount: "", reason: "" });
      await loadLoans();
      await loadRequests();
      setActionMessage("Salary advance request submitted for supervisor review.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit the salary advance request.";
      setActionMessage(
        message === "salary_advance_already_requested_this_month"
          ? "You can only request one salary advance in a month."
          : message === "no_open_payroll_run_available"
            ? "No upcoming payroll run is open yet for recovery."
            : message
      );
    } finally {
      setBusyAction("");
    }
  }

  function renderDashboard() {
    const state = dashboardState;
    if (state.loading) return <SectionMessage text="Loading your employee dashboard..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Dashboard is not available yet." />;

    return (
      <section className="surface-card action-workbench ess-home-card">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Employee Portal</p>
            <h3>Welcome, {state.data.profile.fullName}</h3>
          </div>
        </div>
        <p className="workspace-intro ess-home-copy">
          This space is just for your work life at Robot Cafe: payslips, leave, profile details, notices, documents,
          and personal requests.
        </p>
        <section className="ess-shortcut-grid" data-tour="ess-actions">
          {[
            { item: "My Dashboard", label: "Dashboard", detail: "See today’s work summary and important updates." },
            { item: "My Payslips", label: "Payslips", detail: "View and download payroll history." },
            { item: "My Leave", label: "Leave", detail: "Apply, track balances, and monitor status." },
            { item: "My Documents", label: "My Documents", detail: "Update personal document numbers like ID, KRA, SHIF, and NSSF." },
            { item: "My Notifications", label: "Notifications", detail: "Catch notices, approvals, and updates quickly." },
            { item: "My Profile", label: "Profile", detail: "Review statutory, bank, and contact details." },
            { item: "Issued Documents", label: "Issued Documents", detail: "Open letters, contracts, commendations, and recommendation letters." },
            { item: "Company Documents", label: "Policies", detail: "Open company policies, manuals, and shared HR forms." },
            { item: "My Performance", label: "Performance", detail: "Follow weekly targets and feedback." },
          ].map((shortcut) => (
            <button
              className="ess-shortcut-button"
              key={shortcut.item}
              onClick={() => onJump(shortcut.item)}
              type="button"
            >
              <strong>{shortcut.label}</strong>
              <small>{shortcut.detail}</small>
            </button>
          ))}
        </section>
        <section className="mini-panel ess-profile-band">
          <div className="ess-profile-band__copy">
            <h4>My employment details</h4>
            <p>
              Staff number {state.data.profile.employeeNumber} in {state.data.profile.department}. Your records,
              approvals, and personal payroll history stay here.
            </p>
          </div>
          <div className="ess-profile-band__meta">
            <article>
              <span>Branch</span>
              <strong>{state.data.profile.branch}</strong>
            </article>
            <article>
              <span>Employment type</span>
              <strong>{state.data.profile.employmentType}</strong>
            </article>
            <article>
              <span>Reporting officer</span>
              <strong>{state.data.profile.supervisor}</strong>
            </article>
          </div>
        </section>
        <div className="metric-grid compact-grid">
          <article className="metric-card">
            <span>Latest payslip</span>
            <strong>{state.data.latestPayslip?.period ?? "Not available yet"}</strong>
            <small>
              {state.data.latestPayslip?.netPay
                ? `Net pay ${state.data.latestPayslip.netPay}`
                : "Payroll will appear here once published."}
            </small>
          </article>
          <article className="metric-card">
            <span>My shift today</span>
            <strong>{state.data.shiftToday?.shiftCode ?? "OFF"}</strong>
            <small>
              {state.data.shiftToday?.shiftName
                ? `${state.data.shiftToday.shiftName} | ${formatShiftTime(state.data.shiftToday.startTime)} - ${formatShiftTime(state.data.shiftToday.endTime)}`
                : "No scheduled shift is saved for today."}
            </small>
          </article>
          <article className="metric-card">
            <span>My leave</span>
            <strong>{state.data.stats.annualLeaveBalance} days</strong>
            <small>
              {state.data.upcomingLeaveDates.length
                ? `${state.data.upcomingLeaveDates.length} upcoming leave date${state.data.upcomingLeaveDates.length === 1 ? "" : "s"}`
                : "No upcoming leave dates saved yet."}
            </small>
          </article>
          <article className="metric-card">
            <span>My profile</span>
            <strong>{state.data.profileCompletionPercent}% complete</strong>
            <small>Keep statutory and bank details current for payroll and communication.</small>
          </article>
          <article className="metric-card">
            <span>My notices</span>
            <strong>{state.data.stats.unreadNotifications}</strong>
            <small>
              {state.data.stats.unreadNotifications === 1 ? "Unread notice waiting." : "Unread notices waiting."}
            </small>
          </article>
          <article className="metric-card">
            <span>Loans & deductions</span>
            <strong>{state.data.loanSummary.outstandingBalance}</strong>
            <small>
              {state.data.loanSummary.activeLoans > 0
                ? `${state.data.loanSummary.activeLoans} active loan${state.data.loanSummary.activeLoans === 1 ? "" : "s"}`
                : "No active employee loans right now."}
            </small>
          </article>
          <article className="metric-card">
            <span>Attendance summary</span>
            <strong>{state.data.stats.attendanceExceptions}</strong>
            <small>
              {state.data.stats.attendanceExceptions === 0
                ? "No attendance exceptions logged."
                : "Attendance items may need your attention."}
            </small>
          </article>
        </div>
        <div className="control-grid">
          <section className="mini-panel">
            <h4>Upcoming shifts</h4>
            <div className="mini-list queue-list">
              {state.data.upcomingShifts.length ? (
                state.data.upcomingShifts.map((item) => (
                  <article key={item.id}>
                    <strong>{item.shiftCode || "OFF"}</strong>
                    <span>{formatDate(item.date)}</span>
                    <small>
                      {item.shiftName ? `${item.shiftName} | ${formatShiftTime(item.startTime)} - ${formatShiftTime(item.endTime)}` : "No shift details saved."}
                    </small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No upcoming shifts are visible yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Upcoming leave dates</h4>
            <div className="mini-list queue-list">
              {state.data.upcomingLeaveDates.length ? (
                state.data.upcomingLeaveDates.map((item) => (
                  <article key={item.id}>
                    <strong>{item.leaveType}</strong>
                    <span>
                      {formatDate(item.startDate)} to {formatDate(item.endDate)}
                    </span>
                    <small>{item.status}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No approved or pending leave dates are scheduled yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Recent notices</h4>
            <div className="mini-list queue-list">
              {state.data.recentNotifications.length ? (
                state.data.recentNotifications.map((item) => (
                  <article key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                    <small>{formatDate(item.createdAt)}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No new notices right now." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Recent documents</h4>
            <div className="mini-list queue-list">
              {state.data.recentDocuments.length ? (
                state.data.recentDocuments.map((document) => (
                  <article key={document.id}>
                    <strong>{document.fileName}</strong>
                    <span>{document.category}</span>
                    <small>{formatDate(document.uploadedAt)}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No personal documents have been uploaded yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Recent requests</h4>
            <div className="mini-list queue-list">
              {state.data.recentRequests.length ? (
                state.data.recentRequests.map((item) => (
                  <article key={item.id}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.ownerRole} | {item.status}
                    </span>
                    <small>{formatDate(item.updatedAt)}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No recent requests yet." />
              )}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderProfile() {
    const state = profileState;
    if (state.loading) return <SectionMessage text="Loading your profile..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Profile data is not available." />;

    const profileUpdateRequests = requestsState.data?.filter((item) => item.moduleKey === "ess") ?? [];

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Profile</p>
            <h3>{state.data.fullName}</h3>
          </div>
        </div>
        <div className="detail-section-grid">
          {state.data.profileSections.map((section) => (
            <section className="detail-section-card" key={section.title}>
              <h5>{section.title}</h5>
              <div className="detail-kv-list">
                {section.items.map((item) => (
                  <article key={`${section.title}-${item.label}`}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Edit directly</h4>
            <div className="action-form">
              <label>
                <span>Phone</span>
                <input
                  onChange={(event) =>
                    setSafeProfileForm((current) => ({
                      ...current,
                      phone: event.target.value,
                      mpesaMobileNumber: event.target.value,
                    }))
                  }
                  value={safeProfileForm.phone}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  onChange={(event) => setSafeProfileForm((current) => ({ ...current, email: event.target.value }))}
                  value={safeProfileForm.email}
                />
              </label>
              <label>
                <span>Gender</span>
                <select
                  className="filter-pill"
                  onChange={(event) => setSafeProfileForm((current) => ({ ...current, gender: event.target.value }))}
                  value={safeProfileForm.gender}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
              <label>
                <span>Date of birth</span>
                <input
                  onChange={(event) => setSafeProfileForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                  type="date"
                  value={safeProfileForm.dateOfBirth}
                />
              </label>
              <label>
                <span>Profile Photo</span>
                <input
                  accept="image/png,image/jpeg"
                  onChange={(event) => setProfilePhotoFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              {safeProfileForm.profilePhoto ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <small>Current photo</small>
                  <img
                    alt={`${profileState.data?.fullName ?? "Employee"} profile`}
                    src={safeProfileForm.profilePhoto}
                    style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }}
                  />
                </div>
              ) : null}
              {profilePhotoFile ? <small>Selected file: {profilePhotoFile.name}</small> : null}
              <button className="primary-button" disabled={busyAction === "save-profile"} onClick={handleSafeProfileSave} type="button">
                {busyAction === "save-profile" ? "Saving..." : "Save direct updates"}
              </button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Approval-based changes</h4>
            <div className="action-form">
              <label>
                <span>Field</span>
                <select
                  className="filter-pill"
                  onChange={(event) => setSensitiveProfileForm((current) => ({ ...current, fieldName: event.target.value }))}
                  value={sensitiveProfileForm.fieldName}
                >
                  <option>Bank details</option>
                  <option>KRA PIN</option>
                  <option>SHIF number</option>
                  <option>NSSF number</option>
                  <option>Emergency contact</option>
                  <option>Next of kin</option>
                </select>
              </label>
              <label>
                <span>Requested value</span>
                <input
                  onChange={(event) => setSensitiveProfileForm((current) => ({ ...current, newValue: event.target.value }))}
                  value={sensitiveProfileForm.newValue}
                />
              </label>
              <label>
                <span>Reason</span>
                <textarea
                  onChange={(event) => setSensitiveProfileForm((current) => ({ ...current, reason: event.target.value }))}
                  rows={3}
                  value={sensitiveProfileForm.reason}
                />
              </label>
              <div className="inline-actions">
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-profile_update_request"}
                  onClick={() => void handleWorkflowAssist("profile_update_request")}
                  type="button"
                >
                  {busyAction === "workflow-ai-profile_update_request" ? "Drafting..." : "Help me draft this"}
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-profile_update_request"}
                  onClick={() => void handleWorkflowAssist("profile_update_request", { variant: "formal" })}
                  type="button"
                >
                  More formal
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-profile_update_request"}
                  onClick={() => void handleWorkflowAssist("profile_update_request", { variant: "review" })}
                  type="button"
                >
                  Review wording
                </button>
              </div>
              <button className="primary-button" disabled={busyAction === "request-profile"} onClick={handleSensitiveProfileRequest} type="button">
                {busyAction === "request-profile" ? "Submitting..." : "Submit for HR approval"}
              </button>
            </div>
          </section>
        </div>
        <section className="mini-panel">
          <h4>Profile update request history</h4>
          <div className="mini-list queue-list">
            {profileUpdateRequests.length ? (
              profileUpdateRequests.map((item) => (
                <article key={item.id}>
                  <strong>{item.title}</strong>
                  <span>
                    {item.ownerRole} | {item.status}
                  </span>
                  <small>{formatDate(item.updatedAt)}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No profile update requests yet." />
            )}
          </div>
        </section>
      </section>
    );
  }

  function renderMyDocuments() {
    const state = profileState;
    if (state.loading) return <SectionMessage text="Loading your document details..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Your personal document details are not available yet." />;
    const recentIssuedDocuments = documentsState.data?.slice(0, 4) ?? [];

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Documents</p>
            <h3>Personal document details</h3>
          </div>
        </div>
        <p className="workspace-intro">
          Keep your personal identifiers current here. Use this page for National ID, KRA PIN, SHIF, NSSF, and the
          MPESA mobile number that payroll should treat as your official payout number.
        </p>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Update document numbers</h4>
            <div className="action-form">
              <label>
                <span>Mpesa Mobile Number</span>
                <input
                  onChange={(event) => {
                    const value = event.target.value;
                    setSafeProfileForm((current) => ({
                      ...current,
                      mpesaMobileNumber: value,
                      phone: value,
                    }));
                  }}
                  value={safeProfileForm.mpesaMobileNumber}
                />
              </label>
              <label>
                <span>National ID</span>
                <input
                  onChange={(event) => setSafeProfileForm((current) => ({ ...current, nationalId: event.target.value }))}
                  value={safeProfileForm.nationalId}
                />
              </label>
              <label>
                <span>KRA PIN</span>
                <input
                  onChange={(event) => setSafeProfileForm((current) => ({ ...current, kraPin: event.target.value }))}
                  value={safeProfileForm.kraPin}
                />
              </label>
              <label>
                <span>SHIF Number</span>
                <input
                  onChange={(event) => setSafeProfileForm((current) => ({ ...current, shifNumber: event.target.value }))}
                  value={safeProfileForm.shifNumber}
                />
              </label>
              <label>
                <span>NSSF Number</span>
                <input
                  onChange={(event) => setSafeProfileForm((current) => ({ ...current, nssfNumber: event.target.value }))}
                  value={safeProfileForm.nssfNumber}
                />
              </label>
              <button className="primary-button" disabled={busyAction === "save-profile"} onClick={handleSafeProfileSave} type="button">
                {busyAction === "save-profile" ? "Saving..." : "Save document details"}
              </button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Current records</h4>
            <div className="mini-list queue-list">
              <article>
                <strong>Mpesa Mobile Number</strong>
                <span>{safeProfileForm.mpesaMobileNumber || "-"}</span>
              </article>
              <article>
                <strong>National ID</strong>
                <span>{safeProfileForm.nationalId || "-"}</span>
              </article>
              <article>
                <strong>KRA PIN</strong>
                <span>{safeProfileForm.kraPin || "-"}</span>
              </article>
              <article>
                <strong>SHIF Number</strong>
                <span>{safeProfileForm.shifNumber || "-"}</span>
              </article>
              <article>
                <strong>NSSF Number</strong>
                <span>{safeProfileForm.nssfNumber || "-"}</span>
              </article>
            </div>
          </section>
        </div>
        <section className="mini-panel">
          <div className="section-heading compact">
            <div>
              <h4>Issued letters and contracts</h4>
              <p className="subtle-copy">Your appointment letters, contracts, and other HR-issued files also appear here for quick access.</p>
            </div>
          </div>
          <div className="mini-list queue-list">
            {documentsState.loading ? (
              <SectionMessage text="Loading issued documents..." />
            ) : recentIssuedDocuments.length ? (
              recentIssuedDocuments.map((document) => (
                <article key={document.id}>
                  <strong>{document.fileName}</strong>
                  <span>
                    {document.category} | {document.mimeType || "Unknown"}
                  </span>
                  <small>
                    {formatDate(document.uploadedAt)} | {(document.sizeBytes / 1024 / 1024).toFixed(2)} MB
                  </small>
                  <div className="inline-actions">
                    <button
                      className="ghost-button"
                      disabled={busyAction === `download-${document.id}`}
                      onClick={() => void handleDocumentDownload(document.id)}
                      type="button"
                    >
                      Download
                    </button>
                    <button
                      className="ghost-button"
                      disabled={busyAction === `thread-employee_document-${document.id}`}
                      onClick={() => void openActionThread("employee_document", document.id, document.fileName)}
                      type="button"
                    >
                      {busyAction === `thread-employee_document-${document.id}` ? "Opening..." : "Replies"}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <SectionMessage text="No issued letters or contracts are available yet." />
            )}
          </div>
        </section>
      </section>
    );
  }

  function renderDocuments() {
    const state = documentsState;
    if (state.loading) return <SectionMessage text="Loading your issued documents..." />;
    if (state.error) return <SectionMessage text={state.error} />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Issued Documents</p>
            <h3>Staff issued documents</h3>
          </div>
        </div>
        <p className="workspace-intro">
          Open your appointment letters, contracts, commendations, recommendation letters, warning letters, and other
          documents issued to you by management. New issued documents will also appear in your notifications when you
          log in.
        </p>
        <section className="mini-panel">
          <h4>Issued archive</h4>
          <div className="mini-list queue-list">
            {state.data?.length ? (
              state.data.map((document) => (
                <article key={document.id}>
                  <strong>{document.fileName}</strong>
                  <span>
                    {document.category} | {document.mimeType || "Unknown"}
                  </span>
                  <small>
                    {formatDate(document.uploadedAt)} | {(document.sizeBytes / 1024 / 1024).toFixed(2)} MB
                  </small>
                  <div className="inline-actions">
                    <button
                      className="ghost-button"
                      disabled={busyAction === `download-${document.id}`}
                      onClick={() => void handleDocumentDownload(document.id)}
                      type="button"
                    >
                      Download
                    </button>
                    <button
                      className="ghost-button"
                      disabled={busyAction === `thread-employee_document-${document.id}`}
                      onClick={() => void openActionThread("employee_document", document.id, document.fileName)}
                      type="button"
                    >
                      {busyAction === `thread-employee_document-${document.id}` ? "Opening..." : "Replies"}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <SectionMessage text="No issued documents are available yet." />
            )}
          </div>
        </section>
        {activeActionThread ? renderActionThreadPanel() : null}
      </section>
    );
  }

  function renderCompanyDocuments() {
    const state = companyDocumentsState;
    if (state.loading) return <SectionMessage text="Loading company documents..." />;
    if (state.error) return <SectionMessage text={state.error} />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Company Documents</p>
            <h3>Policies, manuals, and shared HR forms</h3>
          </div>
        </div>
        <p className="workspace-intro">
          These are official Robot Cafe documents available to everyone in the organization for reference, compliance,
          and day-to-day guidance.
        </p>
        <section className="mini-panel">
          <h4>Shared library</h4>
          <div className="mini-list queue-list">
            {state.data?.length ? (
              state.data.map((document) => (
                <article key={document.id}>
                  <strong>{document.title}</strong>
                  <span>
                    {document.category} | {document.fileName}
                  </span>
                  <small>
                    {document.issueDate ? `Issued ${formatDate(document.issueDate)} | ` : ""}
                    {(document.sizeBytes / 1024 / 1024).toFixed(2)} MB
                  </small>
                  {document.description ? <small>{document.description}</small> : null}
                  <div className="inline-actions">
                    <button
                      className="primary-button"
                      disabled={busyAction === `company-document-${document.id}`}
                      onClick={() => void handleCompanyDocumentOpen(document.id)}
                      type="button"
                    >
                      {busyAction === `company-document-${document.id}` ? "Opening..." : "View / Download"}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <SectionMessage text="No company documents have been published yet." />
            )}
          </div>
        </section>
      </section>
    );
  }

  function renderPayslips() {
    const state = payslipState;
    if (state.loading) return <SectionMessage text="Loading your payslips..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    const historicalPayslips = (state.data ?? []).filter((slip) => slip.id !== latestPayslip?.id);

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Payslips</p>
            <h3>Payslip history</h3>
          </div>
        </div>
        {latestPayslip ? (
          <section className="mini-panel">
            <h4>Latest payslip</h4>
            <div className="metric-grid compact-grid">
              <article className="metric-card">
                <span>Latest period</span>
                <strong>{latestPayslip.period}</strong>
                <small>Most recent payroll cycle</small>
              </article>
              <article className="metric-card">
                <span>Gross pay</span>
                <strong>{latestPayslip.grossPay}</strong>
                <small>Before deductions</small>
              </article>
              <article className="metric-card">
                <span>Net pay</span>
                <strong>{latestPayslip.netPay}</strong>
                <small>Amount received</small>
              </article>
            </div>
            {latestPayslip.employeeId ? (
              <div className="inline-actions">
                <button
                  className="ghost-button"
                  disabled={busyAction === `workflow-ai-payslip_explanation-${latestPayslip.id}`}
                  onClick={() => void handleWorkflowAssist("payslip_explanation", { payslip: latestPayslip })}
                  type="button"
                >
                  {busyAction === `workflow-ai-payslip_explanation-${latestPayslip.id}` ? "Explaining..." : "Explain this payslip"}
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === `payslip-${latestPayslip.employeeId}-${latestPayslip.periodId ?? "latest"}-preview`}
                  onClick={() =>
                    void handlePayslipFile(latestPayslip.employeeId as string, "preview", latestPayslip.periodId)
                  }
                  type="button"
                >
                  {busyAction === `payslip-${latestPayslip.employeeId}-${latestPayslip.periodId ?? "latest"}-preview`
                    ? "Opening..."
                    : "View payslip"}
                </button>
                <button
                  className="primary-button"
                  disabled={busyAction === `payslip-${latestPayslip.employeeId}-${latestPayslip.periodId ?? "latest"}-download`}
                  onClick={() =>
                    void handlePayslipFile(latestPayslip.employeeId as string, "download", latestPayslip.periodId)
                  }
                  type="button"
                >
                  {busyAction === `payslip-${latestPayslip.employeeId}-${latestPayslip.periodId ?? "latest"}-download`
                    ? "Downloading..."
                    : "Download payslip"}
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
        <section className="mini-panel">
          <h4>History</h4>
          <ScheduleTable
            columns={[
              { key: "period", label: "Period" },
              { key: "grossPay", label: "Gross Pay", align: "right" },
              { key: "netPay", label: "Net Pay", align: "right" },
              { key: "paye", label: "PAYE", align: "right" },
              { key: "shif", label: "SHIF", align: "right" },
              { key: "nssf", label: "NSSF", align: "right" },
              { key: "actions", label: "Actions" },
            ]}
            rows={historicalPayslips.map((slip) => ({
              id: slip.id,
              period: (
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{slip.period}</strong>
                  {slip.missingFields?.length ? (
                    <small>Complete employee details first: {slip.missingFields.join(", ")}</small>
                  ) : null}
                </div>
              ),
              grossPay: slip.grossPay,
              netPay: slip.netPay,
              paye: toNumberValue(slip.deductions?.PAYE ?? 0).toLocaleString(),
              shif: toNumberValue(slip.deductions?.SHIF ?? 0).toLocaleString(),
              nssf: toNumberValue(slip.deductions?.NSSF ?? 0).toLocaleString(),
              actions: slip.employeeId ? (
                <div className="inline-actions">
                  <button
                    className="ghost-button"
                    disabled={busyAction === `workflow-ai-payslip_explanation-${slip.id}`}
                    onClick={() => void handleWorkflowAssist("payslip_explanation", { payslip: slip })}
                    type="button"
                  >
                    {busyAction === `workflow-ai-payslip_explanation-${slip.id}` ? "Explaining..." : "Explain"}
                  </button>
                  <button
                    className="ghost-button"
                    disabled={busyAction === `payslip-${slip.employeeId}-${slip.periodId ?? "latest"}-preview`}
                    onClick={() => void handlePayslipFile(slip.employeeId as string, "preview", slip.periodId)}
                    type="button"
                  >
                    {busyAction === `payslip-${slip.employeeId}-${slip.periodId ?? "latest"}-preview`
                      ? "Opening..."
                      : "View payslip"}
                  </button>
                  <button
                    className="primary-button"
                    disabled={busyAction === `payslip-${slip.employeeId}-${slip.periodId ?? "latest"}-download`}
                    onClick={() => void handlePayslipFile(slip.employeeId as string, "download", slip.periodId)}
                    type="button"
                  >
                    {busyAction === `payslip-${slip.employeeId}-${slip.periodId ?? "latest"}-download`
                      ? "Downloading..."
                      : "Download payslip"}
                  </button>
                </div>
              ) : (
                "-"
              ),
            }))}
            emptyText="No previous payslips are available yet."
          />
        </section>
      </section>
    );
  }

  function renderP9() {
    const state = p9State;
    if (state.loading) return <SectionMessage text="Loading your P9 forms..." />;
    if (state.error) return <SectionMessage text={state.error} />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My P9 Forms</p>
            <h3>Annual tax card history</h3>
          </div>
        </div>
        <section className="mini-panel">
          <h4>P9 history</h4>
          <div className="mini-list queue-list">
            {state.data?.length ? (
              state.data.map((form) => (
                <article key={form.id}>
                  <strong>{form.taxYear}</strong>
                  <span>
                    Gross {form.grossPay} | Taxable {form.taxablePay}
                  </span>
                  <small>
                    PAYE {form.payePaid} | Relief {form.reliefApplied} | Pension {form.pensionContribution}
                  </small>
                </article>
              ))
            ) : (
              <SectionMessage text="No P9 records are available yet." />
            )}
          </div>
        </section>
      </section>
    );
  }

  function renderLeave() {
    const state = leaveState;
    if (state.loading) return <SectionMessage text="Loading your leave workspace..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Leave data is not available yet." />;

    const annualBalance = state.data.balances.find((row) => toStringValue((row as Record<string, unknown>).leave_type) === "Annual Leave");
    const pendingCount = state.data.requests.filter((row) => toStringValue((row as Record<string, unknown>).status) === "pending").length;
    const offDayRequests = state.data.requests.filter((row) => toStringValue((row as Record<string, unknown>).request_category) === "off_day");
    const historyRequests = [...state.data.requests].sort((left, right) => {
      const leftRow = left as Record<string, unknown>;
      const rightRow = right as Record<string, unknown>;
      const leftTime = new Date(
        toStringValue(
          leftRow.updated_at ??
            leftRow.final_approved_at ??
            leftRow.created_at ??
            leftRow.start_date
        )
      ).getTime();
      const rightTime = new Date(
        toStringValue(
          rightRow.updated_at ??
            rightRow.final_approved_at ??
            rightRow.created_at ??
            rightRow.start_date
        )
      ).getTime();
      return rightTime - leftTime;
    });

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Leave</p>
            <h3>Balances, requests, and calendar</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Leave actions</h4>
            <p className="section-description">
              Open the full-page leave workflow for date selection, totals, and approval-ready notes.
            </p>
            <div className="inline-actions">
              <button className="primary-button" onClick={() => router.push(workflowRoutes.leaveCreate)} type="button">
                Apply Leave
              </button>
              <button
                className="ghost-button"
                onClick={() => router.push(`${workflowRoutes.leaveCreate}?leaveType=${encodeURIComponent("Off Day Request")}`)}
                type="button"
              >
                Request Off Day
              </button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Balances and status</h4>
            <div className="mini-list queue-list">
              <article>
                <strong>{toNumberValue((annualBalance as Record<string, unknown> | undefined)?.balance_days ?? 0)} days</strong>
                <span>Annual leave balance</span>
              </article>
              <article>
                <strong>{pendingCount}</strong>
                <span>Pending approvals</span>
              </article>
              <article>
                <strong>{state.data.holidays.length}</strong>
                <span>Upcoming holidays</span>
              </article>
              <article>
                <strong>{offDayRequests.length}</strong>
                <span>Off-day requests</span>
              </article>
            </div>
          </section>
        </div>
        <div className="control-grid">
          <section className="mini-panel">
            <h4>Leave balances</h4>
            <div className="mini-list queue-list">
              {state.data.balances.length ? (
                state.data.balances.map((balance) => (
                  <article key={toStringValue((balance as Record<string, unknown>).id)}>
                    <strong>{toStringValue((balance as Record<string, unknown>).leave_type)}</strong>
                    <span>
                      Entitlement {toNumberValue((balance as Record<string, unknown>).opening_balance)} | Accrued {toNumberValue((balance as Record<string, unknown>).accrued_days)}
                    </span>
                    <small>
                      Taken {toNumberValue((balance as Record<string, unknown>).taken_days)} | Pending {toNumberValue((balance as Record<string, unknown>).pending_days)} | Balance {toNumberValue((balance as Record<string, unknown>).balance_days)}
                    </small>
                  </article>
                ))
              ) : (
                <SectionMessage text="Your leave balances are still being prepared." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Application history</h4>
            <ScheduleTable
              columns={[
                { key: "date", label: "Event Date" },
                { key: "leaveType", label: "Leave Type" },
                { key: "period", label: "Period" },
                { key: "days", label: "Days", align: "right" },
                { key: "status", label: "Status" },
                { key: "resume", label: "Resume" },
                { key: "actions", label: "Actions" },
              ]}
              emptyText="You have no leave requests yet."
              rows={historyRequests.map((request) => {
                const row = request as Record<string, unknown>;
                const requestId = toStringValue(row.id);
                return {
                  id: requestId,
                  date: formatDate(
                    toStringValue(row.updated_at ?? row.final_approved_at ?? row.created_at ?? row.start_date)
                  ),
                  leaveType: toStringValue(row.leave_type),
                  period: `${toStringValue(row.start_date)} to ${toStringValue(row.end_date)}`,
                  days: toNumberValue(row.days).toFixed(1),
                  status: toStringValue(row.status),
                  resume: toStringValue(row.expected_resume_date),
                  actions: (
                    <div className="inline-actions">
                      <button
                        className="ghost-button"
                        disabled={busyAction === `leave-form-${requestId}-preview`}
                        onClick={() => void handleLeaveFormFile(requestId, "preview")}
                        type="button"
                      >
                        {busyAction === `leave-form-${requestId}-preview` ? "Opening..." : "View form"}
                      </button>
                      <button
                        className="primary-button"
                        disabled={busyAction === `leave-form-${requestId}-download`}
                        onClick={() => void handleLeaveFormFile(requestId, "download")}
                        type="button"
                      >
                        {busyAction === `leave-form-${requestId}-download` ? "Downloading..." : "Download form"}
                      </button>
                    </div>
                  ),
                };
              })}
            />
          </section>
          <section className="mini-panel">
            <h4>Public holidays and off days</h4>
            <div className="mini-list queue-list">
              {state.data.holidays.length ? (
                state.data.holidays.slice(0, 8).map((holiday) => (
                  <article key={toStringValue((holiday as Record<string, unknown>).id)}>
                    <strong>{toStringValue((holiday as Record<string, unknown>).name)}</strong>
                    <span>{toStringValue((holiday as Record<string, unknown>).scope)}</span>
                    <small>{formatDate(toStringValue((holiday as Record<string, unknown>).holiday_date))}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No holidays configured yet." />
              )}
              {offDayRequests.length ? (
                offDayRequests.slice(0, 4).map((request) => (
                  <article key={`off-day-${toStringValue((request as Record<string, unknown>).id)}`}>
                    <strong>Off Day Request</strong>
                    <span>{formatDate(toStringValue((request as Record<string, unknown>).start_date))}</span>
                    <small>{toStringValue((request as Record<string, unknown>).status)}</small>
                  </article>
                ))
              ) : null}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderAttendance() {
    const state = attendanceState;
    if (state.loading) return <SectionMessage text="Loading your attendance..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Attendance data is not available yet." />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Attendance</p>
            <h3>Attendance, overtime, and shifts</h3>
          </div>
        </div>
        <div className="metric-grid compact-grid">
          <article className="metric-card">
            <span>Present days</span>
            <strong>{state.data.summary.presentDays}</strong>
            <small>This month</small>
          </article>
          <article className="metric-card">
            <span>Late days</span>
            <strong>{state.data.summary.lateDays}</strong>
            <small>Clock-in exceptions</small>
          </article>
          <article className="metric-card">
            <span>Absent days</span>
            <strong>{state.data.summary.absentDays}</strong>
            <small>Missed shifts</small>
          </article>
          <article className="metric-card">
            <span>Overtime hours</span>
            <strong>{state.data.summary.overtimeHours.toFixed(2)}</strong>
            <small>Approved and pending</small>
          </article>
        </div>
        <div className="control-grid">
          <section className="mini-panel">
            <h4>Upcoming shift schedule</h4>
            <div className="mini-list queue-list">
              {state.data.shiftSchedule.length ? (
                state.data.shiftSchedule.map((row) => (
                  <article key={row.id}>
                    <strong>{row.shiftCode || "OFF"}</strong>
                    <span>{formatDate(row.date)}</span>
                    <small>{row.shiftName ? `${row.shiftName} | ${formatShiftTime(row.startTime)} - ${formatShiftTime(row.endTime)}` : "No shift details saved."}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No shift schedule is available yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Recent attendance</h4>
            <div className="mini-list queue-list">
              {state.data.records.length ? (
                state.data.records.slice(0, 12).map((row) => (
                  <article key={toStringValue((row as Record<string, unknown>).id)}>
                    <strong>{formatDate(toStringValue((row as Record<string, unknown>).work_date))}</strong>
                    <span>
                      {toStringValue((row as Record<string, unknown>).shift_name)} | {toStringValue((row as Record<string, unknown>).status)}
                    </span>
                    <small>
                      In {formatDate(toStringValue((row as Record<string, unknown>).clock_in_at))} | Out {formatDate(toStringValue((row as Record<string, unknown>).clock_out_at))}
                    </small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No attendance records yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Overtime and holiday visibility</h4>
            <div className="mini-list queue-list">
              {state.data.overtime.length ? (
                state.data.overtime.slice(0, 8).map((row) => (
                  <article key={toStringValue((row as Record<string, unknown>).id)}>
                    <strong>{toNumberValue((row as Record<string, unknown>).hours).toFixed(2)} hrs</strong>
                    <span>
                      {formatDate(toStringValue((row as Record<string, unknown>).work_date))} | {toStringValue((row as Record<string, unknown>).status)}
                    </span>
                  </article>
                ))
              ) : (
                <SectionMessage text="No overtime requests recorded." />
              )}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderLoans() {
    const state = loansState;
    if (state.loading) return <SectionMessage text="Loading loans and deductions..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Loans and deductions are not available yet." />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Loans & Deductions</p>
            <h3>Outstanding balances and payroll deductions</h3>
          </div>
        </div>
        <div className="metric-grid compact-grid">
          <article className="metric-card">
            <span>Active loans</span>
            <strong>{state.data.summary.activeLoans}</strong>
            <small>Current repayment plans</small>
          </article>
          <article className="metric-card">
            <span>Outstanding balance</span>
            <strong>{state.data.summary.outstandingBalance}</strong>
            <small>Open exposure</small>
          </article>
          <article className="metric-card">
            <span>Monthly deduction</span>
            <strong>{state.data.summary.monthlyLoanDeduction}</strong>
            <small>Loan repayment only</small>
          </article>
        </div>
        <div className="control-grid">
          <section className="mini-panel">
            <h4>Salary advance request</h4>
            <div className="action-form">
              <label>
                <span>Amount requested</span>
                <input
                  onChange={(event) =>
                    setSalaryAdvanceForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  placeholder="e.g. 5000"
                  type="number"
                  value={salaryAdvanceForm.amount}
                />
              </label>
              <label>
                <span>Explanation</span>
                <textarea
                  onChange={(event) =>
                    setSalaryAdvanceForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Explain why you need the salary advance."
                  rows={4}
                  value={salaryAdvanceForm.reason}
                />
              </label>
              <div className="inline-actions">
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-salary_advance_request"}
                  onClick={() => void handleWorkflowAssist("salary_advance_request")}
                  type="button"
                >
                  {busyAction === "workflow-ai-salary_advance_request" ? "Drafting..." : "Help me explain this"}
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-salary_advance_request"}
                  onClick={() => void handleWorkflowAssist("salary_advance_request", { variant: "shorter" })}
                  type="button"
                >
                  Make shorter
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-salary_advance_request"}
                  onClick={() => void handleWorkflowAssist("salary_advance_request", { variant: "review" })}
                  type="button"
                >
                  Review wording
                </button>
              </div>
              <small>One request is allowed each month. Supervisor recommends, then the GM approves.</small>
              <button
                className="primary-button"
                disabled={busyAction === "salary-advance"}
                onClick={() => void handleSalaryAdvanceRequest()}
                type="button"
              >
                {busyAction === "salary-advance" ? "Submitting..." : "Request salary advance"}
              </button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Active loans</h4>
            <div className="mini-list queue-list">
              {state.data.loans.length ? (
                state.data.loans.map((loan) => (
                  <article key={loan.id}>
                    <strong>{loan.loanName}</strong>
                    <span>
                      {loan.lenderName} | {loan.status}
                    </span>
                    <small>
                      Balance {loan.balanceAmount} | Monthly {loan.monthlyDeduction}
                    </small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No active loan records were found." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Salary advance history</h4>
            <div className="mini-list queue-list">
              {state.data.salaryAdvances.length ? (
                state.data.salaryAdvances.map((request) => (
                  <article key={request.id}>
                    <strong>{request.amount}</strong>
                    <span>
                      {formatDate(request.requestDate)} | {request.status}
                    </span>
                    <small>
                      {request.targetPayrollLabel || "Upcoming payroll"} | {request.reason}
                    </small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No salary advance requests have been submitted yet." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Deduction history</h4>
            <div className="mini-list queue-list">
              {state.data.payrollDeductions.length ? (
                state.data.payrollDeductions.map((deduction) => (
                  <article key={deduction.payslipId}>
                    <strong>{deduction.period}</strong>
                    <span>Total deductions {deduction.total}</span>
                    <small>{deduction.items.map((item) => `${item.label} ${item.value}`).join(" | ")}</small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No deduction history is available yet." />
              )}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderAssets() {
    const state = assetsState;
    if (state.loading) return <SectionMessage text="Loading asset assignments..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Asset data is not available yet." />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Assets</p>
            <h3>Assigned company assets and return requests</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Assigned assets</h4>
            <div className="mini-list queue-list">
              {state.data.assignments.length ? (
                state.data.assignments.map((asset) => (
                  <article key={asset.id}>
                    <strong>{asset.assetName}</strong>
                    <span>
                      {asset.assetCategory} | {asset.serialNumber}
                    </span>
                    <small>
                      Issued {formatDate(asset.issueDate)} | Return {formatDate(asset.expectedReturnDate)}
                    </small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No assigned assets were found." />
              )}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Request return or report damage</h4>
            <div className="action-form">
              <label>
                <span>Asset name</span>
                <input
                  onChange={(event) => setAssetForm((current) => ({ ...current, assetName: event.target.value }))}
                  value={assetForm.assetName}
                />
              </label>
              <label>
                <span>Request type</span>
                <select
                  className="filter-pill"
                  onChange={(event) => setAssetForm((current) => ({ ...current, requestType: event.target.value }))}
                  value={assetForm.requestType}
                >
                  <option>Return</option>
                  <option>Damage</option>
                  <option>Loss</option>
                </select>
              </label>
              <button className="primary-button" disabled={busyAction === "asset"} onClick={handleAssetSubmit} type="button">
                {busyAction === "asset" ? "Submitting..." : "Submit asset request"}
              </button>
            </div>
          </section>
        </div>
        <section className="mini-panel">
          <h4>Asset request history</h4>
          <div className="mini-list queue-list">
            {state.data.requests.length ? (
              state.data.requests.map((item) => (
                <article key={item.id}>
                  <strong>{item.requestType} {item.assetName}</strong>
                  <span>
                    {item.status} | {item.approvalStage}
                  </span>
                  <small>{formatDate(item.createdAt)}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No asset requests have been submitted yet." />
            )}
          </div>
        </section>
      </section>
    );
  }

  function renderPerformance() {
    const state = appraisalsState;
    if (state.loading) return <SectionMessage text="Loading performance history..." />;
    if (state.error) return <SectionMessage text={state.error} />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Performance</p>
            <h3>Appraisals, targets, and manager feedback</h3>
          </div>
        </div>
        <div className="mini-list queue-list">
          {state.data?.length ? (
            state.data.map((item) => {
              const normalizedStatus = (item.status ?? "").trim().toLowerCase();
              const employeeCanStillEdit =
                item.workflowMode === "robot_cafe_simple" &&
                (normalizedStatus === "self_review_pending" || normalizedStatus === "supervisor_review_pending");

              return (
              <article key={item.id}>
                <strong>
                  {item.metricLabel || item.reviewCycle} | {item.weekLabel || item.reviewPeriod}
                </strong>
                {item.workflowMode === "robot_cafe_simple" ? (
                  <>
                    <span>{item.reviewCycle} | {item.reviewPeriod}</span>
                    <small>
                      Status {(item.provisionalStatus || item.status || "pending").toUpperCase()}
                      {item.finalDecision ? ` | Outcome ${item.finalDecision}` : ""}
                    </small>
                  </>
                ) : (
                  <>
                    <span>
                      Target {toNumberValue(item.targetValue ?? 0).toLocaleString()} | Actual{" "}
                      {toNumberValue(item.actualValue ?? 0).toLocaleString()} | {item.achievementPercent?.toFixed(2) ?? "0.00"}%
                    </span>
                    <small>
                      Indicator {(item.indicator ?? "pending").toUpperCase()} | Supervisor {item.supervisorComments || "-"}
                      {item.managerRating ? ` | GM rating ${item.managerRating}` : ""}
                    </small>
                  </>
                )}
                {item.workflowMode === "robot_cafe_simple" ? (
                  <div className="mini-panel">
                    <h4>Simple appraisal flow</h4>
                    <p className="section-description">
                      {item.finalDecision
                        ? `Final outcome: ${item.finalDecision}`
                        : employeeCanStillEdit
                          ? normalizedStatus === "supervisor_review_pending"
                            ? "Your supervisor is reviewing this appraisal. You can still update your self-review until it is forwarded to GM."
                            : "Your self-review is needed before your supervisor can continue."
                          : `Current stage: ${item.status}`}
                    </p>
                    {employeeCanStillEdit ? (
                      <div className="action-form compact-form">
                        <label>
                          <span>What went well during this period?</span>
                          <textarea
                            rows={3}
                            value={selfReviewDrafts[item.id]?.whatWentWell ?? ""}
                            onChange={(event) =>
                              setSelfReviewDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  whatWentWell: event.target.value,
                                  challenges: current[item.id]?.challenges ?? "",
                                  supportNeeded: current[item.id]?.supportNeeded ?? "",
                                  areaScores: current[item.id]?.areaScores ?? {},
                                },
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>What challenges did you face?</span>
                          <textarea
                            rows={3}
                            value={selfReviewDrafts[item.id]?.challenges ?? ""}
                            onChange={(event) =>
                              setSelfReviewDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  whatWentWell: current[item.id]?.whatWentWell ?? "",
                                  challenges: event.target.value,
                                  supportNeeded: current[item.id]?.supportNeeded ?? "",
                                  areaScores: current[item.id]?.areaScores ?? {},
                                },
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>What support or training would help you perform better?</span>
                          <textarea
                            rows={3}
                            value={selfReviewDrafts[item.id]?.supportNeeded ?? ""}
                            onChange={(event) =>
                              setSelfReviewDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  whatWentWell: current[item.id]?.whatWentWell ?? "",
                                  challenges: current[item.id]?.challenges ?? "",
                                  supportNeeded: event.target.value,
                                  areaScores: current[item.id]?.areaScores ?? {},
                                },
                              }))
                            }
                          />
                        </label>
                        {item.areas?.length ? (
                          <div className="mini-list queue-list">
                            {item.areas.map((area) => (
                              <article key={area.id}>
                                <strong>{area.title}</strong>
                                <span>{area.expectedOutput || area.performanceIndicator || "-"}</span>
                                <label>
                                  <span>My score (out of 5, contributes to your 33%)</span>
                                  <select
                                    className="filter-pill"
                                    value={selfReviewDrafts[item.id]?.areaScores?.[area.id] ?? ""}
                                    onChange={(event) =>
                                      setSelfReviewDrafts((current) => ({
                                        ...current,
                                        [item.id]: {
                                          whatWentWell: current[item.id]?.whatWentWell ?? "",
                                          challenges: current[item.id]?.challenges ?? "",
                                          supportNeeded: current[item.id]?.supportNeeded ?? "",
                                          areaScores: {
                                            ...(current[item.id]?.areaScores ?? {}),
                                            [area.id]: event.target.value,
                                          },
                                        },
                                      }))
                                    }
                                  >
                                    <option value="">Select</option>
                                    <option value="1">1 - Needs improvement</option>
                                    <option value="2">2 - Fair</option>
                                    <option value="3">3 - Good</option>
                                    <option value="4">4 - Very good</option>
                                    <option value="5">5 - Excellent</option>
                                  </select>
                                </label>
                              </article>
                            ))}
                          </div>
                        ) : null}
                        <p className="section-description">
                          After you submit, you can still come back and update this appraisal while your supervisor is reviewing it.
                        </p>
                        <div className="inline-actions">
                          <button
                            className="ghost-button"
                            disabled={busyAction === `self-review-ai-${item.id}`}
                            onClick={() => void handleSelfReviewAssist(item)}
                            type="button"
                          >
                            {busyAction === `self-review-ai-${item.id}` ? "Drafting..." : "Help me draft this"}
                          </button>
                        </div>
                        <button
                          className="primary-button"
                          disabled={busyAction === `self-review-${item.id}`}
                          onClick={() => void handleSelfReviewSubmit(item.id)}
                          type="button"
                        >
                          {busyAction === `self-review-${item.id}`
                            ? "Submitting..."
                            : normalizedStatus === "supervisor_review_pending"
                              ? "Update self-review"
                              : "Submit self-review"}
                        </button>
                      </div>
                    ) : (
                      <div className="mini-list queue-list">
                        <article>
                          <strong>What went well</strong>
                          <span>{item.selfComments || "-"}</span>
                        </article>
                        <article>
                          <strong>Challenges</strong>
                          <span>{item.challengesSummary || "-"}</span>
                        </article>
                        <article>
                          <strong>Support needed</strong>
                          <span>{item.supportRequired || "-"}</span>
                        </article>
                        <article>
                          <strong>Score split</strong>
                          <span>
                            Self {formatSimpleStageContribution((item.areas ?? []).map((area) => area.selfScore))}/33
                            {item.areas?.length
                              ? ` | Supervisor ${formatSimpleStageContribution(
                                  item.areas.map((area) => area.supervisorScore)
                                )}/33 | GM ${formatSimpleStageContribution(item.areas.map((area) => area.gmScore))}/33`
                              : ""}
                          </span>
                        </article>
                        {item.gmComments ? (
                          <article>
                            <strong>GM remark</strong>
                            <span>{item.gmComments}</span>
                          </article>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
                {item.canDownloadReport ? (
                  <div className="inline-actions">
                    <button
                      className="ghost-button"
                      disabled={busyAction === `performance-report-${item.id}-preview`}
                      onClick={() => void handlePerformanceReportFile(item.id, "preview")}
                      type="button"
                    >
                      {busyAction === `performance-report-${item.id}-preview`
                        ? "Opening..."
                        : `${item.provisionalStatus === "FINAL" ? "View final report" : "View provisional report"}`}
                    </button>
                    <button
                      className="primary-button"
                      disabled={busyAction === `performance-report-${item.id}-download`}
                      onClick={() => void handlePerformanceReportFile(item.id, "download")}
                      type="button"
                    >
                      {busyAction === `performance-report-${item.id}-download`
                        ? "Downloading..."
                        : `${item.provisionalStatus === "FINAL" ? "Download final report" : "Download provisional report"}`}
                    </button>
                  </div>
                ) : null}
              </article>
              );
            })
          ) : (
            <SectionMessage text="No performance records are available yet." />
          )}
        </div>
      </section>
    );
  }

  function renderComplaints() {
    const state = complaintsState;
    if (state.loading) return <SectionMessage text="Loading complaints..." />;
    if (state.error) return <SectionMessage text={state.error} />;

    const canRespond =
      Boolean(profileState.data?.fullName) &&
      (state.data ?? []).some(
        (item) => item.employeeName && item.employeeName !== profileState.data?.fullName
      );

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Complaints</p>
            <h3>Private supervisor handling and status updates</h3>
          </div>
        </div>
        {!canRespond ? (
          <section className="mini-panel">
            <h4>Raise a complaint</h4>
            <div className="action-form">
              <label>
                <span>Category</span>
                <select
                  className="filter-pill"
                  onChange={(event) => setComplaintForm((current) => ({ ...current, category: event.target.value }))}
                  value={complaintForm.category}
                >
                  <option>Workplace conduct</option>
                  <option>Scheduling</option>
                  <option>Harassment</option>
                  <option>Safety</option>
                  <option>Operations</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                <span>Subject</span>
                <input
                  onChange={(event) => setComplaintForm((current) => ({ ...current, subject: event.target.value }))}
                  value={complaintForm.subject}
                />
              </label>
              <label>
                <span>Details</span>
                <textarea
                  onChange={(event) => setComplaintForm((current) => ({ ...current, details: event.target.value }))}
                  rows={4}
                  value={complaintForm.details}
                />
              </label>
              <div className="inline-actions">
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-complaint_submission"}
                  onClick={() => void handleWorkflowAssist("complaint_submission")}
                  type="button"
                >
                  {busyAction === "workflow-ai-complaint_submission" ? "Drafting..." : "Help me write this"}
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-complaint_submission"}
                  onClick={() => void handleWorkflowAssist("complaint_submission", { variant: "factual" })}
                  type="button"
                >
                  More factual
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-complaint_submission"}
                  onClick={() => void handleWorkflowAssist("complaint_submission", { variant: "review" })}
                  type="button"
                >
                  Review wording
                </button>
              </div>
              <button className="primary-button" disabled={busyAction === "complaint-submit"} onClick={() => void handleComplaintSubmit()} type="button">
                {busyAction === "complaint-submit" ? "Submitting..." : "Submit complaint"}
              </button>
            </div>
          </section>
        ) : null}
        <section className="mini-panel">
          <h4>{canRespond ? "Team complaints" : "Complaint history"}</h4>
          <div className="mini-list queue-list">
            {state.data?.length ? (
              state.data.map((item) => (
                <article key={item.id}>
                  <strong>{item.title}</strong>
                  <span>
                    {item.category} | {item.status} | {formatDate(item.updatedAt)}
                  </span>
                  {canRespond ? (
                    <small>
                      Launched by {item.employeeName || "Employee"}{item.employeeNumber ? ` (${item.employeeNumber})` : ""} | {formatDate(item.createdAt ?? item.updatedAt)}
                    </small>
                  ) : null}
                  <small>{item.details}</small>
                  {item.response ? <small>Supervisor response: {item.response}</small> : null}
                  {canRespond ? (
                    <div className="action-form compact-form">
                      <label>
                        <span>Response</span>
                        <textarea
                          onChange={(event) =>
                            setComplaintReplyDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                response: event.target.value,
                                privateNotes: current[item.id]?.privateNotes ?? "",
                              },
                            }))
                          }
                          rows={2}
                          value={complaintReplyDrafts[item.id]?.response ?? ""}
                        />
                      </label>
                      <label>
                        <span>Private notes</span>
                        <textarea
                          onChange={(event) =>
                            setComplaintReplyDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                response: current[item.id]?.response ?? "",
                                privateNotes: event.target.value,
                              },
                            }))
                          }
                          rows={2}
                          value={complaintReplyDrafts[item.id]?.privateNotes ?? ""}
                        />
                      </label>
                      <div className="inline-actions">
                        <button
                          className="ghost-button"
                          disabled={busyAction === `workflow-ai-complaint_response-${item.id}`}
                          onClick={() => void handleWorkflowAssist("complaint_response", { complaintId: item.id })}
                          type="button"
                        >
                          {busyAction === `workflow-ai-complaint_response-${item.id}` ? "Drafting..." : "Draft response"}
                        </button>
                        <button
                          className="ghost-button"
                          disabled={busyAction === `workflow-ai-complaint_response-${item.id}`}
                          onClick={() => void handleWorkflowAssist("complaint_response", { complaintId: item.id, variant: "formal" })}
                          type="button"
                        >
                          More formal
                        </button>
                        <button
                          className="ghost-button"
                          disabled={busyAction === `workflow-ai-complaint_response-${item.id}`}
                          onClick={() => void handleWorkflowAssist("complaint_response", { complaintId: item.id, variant: "review" })}
                          type="button"
                        >
                          Review wording
                        </button>
                      </div>
                      <div className="inline-actions">
                        <button
                          className="ghost-button"
                          disabled={busyAction === `complaint-${item.id}-in_review`}
                          onClick={() => void handleComplaintUpdate(item.id, "in_review")}
                          type="button"
                        >
                          {busyAction === `complaint-${item.id}-in_review` ? "Saving..." : "Mark in review"}
                        </button>
                        <button
                          className="primary-button"
                          disabled={busyAction === `complaint-${item.id}-resolved`}
                          onClick={() => void handleComplaintUpdate(item.id, "resolved")}
                          type="button"
                        >
                          {busyAction === `complaint-${item.id}-resolved` ? "Saving..." : "Resolve complaint"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <SectionMessage text={canRespond ? "No team complaints are assigned to you." : "No complaints submitted yet."} />
            )}
          </div>
        </section>
      </section>
    );
  }

  function renderTraining() {
    const state = trainingState;
    if (state.loading) return <SectionMessage text="Loading training records..." />;
    if (state.error) return <SectionMessage text={state.error} />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Training</p>
            <h3>Upcoming programs and request history</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Training request</h4>
            <div className="action-form">
              <label>
                <span>Program</span>
                <input
                  onChange={(event) => setTrainingForm((current) => ({ ...current, programName: event.target.value }))}
                  value={trainingForm.programName}
                />
              </label>
              <label>
                <span>Schedule</span>
                <input
                  onChange={(event) => setTrainingForm((current) => ({ ...current, schedule: event.target.value }))}
                  type="date"
                  value={trainingForm.schedule}
                />
              </label>
              <label>
                <span>Budget</span>
                <input
                  onChange={(event) => setTrainingForm((current) => ({ ...current, budget: event.target.value }))}
                  value={trainingForm.budget}
                />
              </label>
              <label>
                <span>Justification</span>
                <textarea
                  onChange={(event) => setTrainingForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  value={trainingForm.notes}
                />
              </label>
              <div className="inline-actions">
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-training_request"}
                  onClick={() => void handleWorkflowAssist("training_request")}
                  type="button"
                >
                  {busyAction === "workflow-ai-training_request" ? "Drafting..." : "Help me draft this"}
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-training_request"}
                  onClick={() => void handleWorkflowAssist("training_request", { variant: "shorter" })}
                  type="button"
                >
                  Make shorter
                </button>
                <button
                  className="ghost-button"
                  disabled={busyAction === "workflow-ai-training_request"}
                  onClick={() => void handleWorkflowAssist("training_request", { variant: "review" })}
                  type="button"
                >
                  Review wording
                </button>
              </div>
              <button className="primary-button" disabled={busyAction === "training"} onClick={handleTrainingSubmit} type="button">
                {busyAction === "training" ? "Submitting..." : "Submit training request"}
              </button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Training history</h4>
            <div className="mini-list queue-list">
              {state.data?.length ? (
                state.data.map((item) => (
                  <article key={item.id}>
                    <strong>{item.programName}</strong>
                    <span>
                      {item.schedule} | {item.status}
                    </span>
                    <small>
                      {item.budget} | {item.approvalStage}
                    </small>
                  </article>
                ))
              ) : (
                <SectionMessage text="No training records are available yet." />
              )}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderRequests() {
    const state = requestsState;
    if (state.loading) return <SectionMessage text="Loading request center..." />;
    if (state.error) return <SectionMessage text={state.error} />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Requests</p>
            <h3>Unified workflow history</h3>
          </div>
        </div>
        <div className="mini-list queue-list">
          {state.data?.length ? (
            state.data.map((item) => (
              <article key={item.id}>
                <strong>{item.title}</strong>
                <span>
                  {(item.requestType || item.moduleKey)} | {item.status}
                </span>
                <small>
                  Sent to {item.ownerRole} | Submitted {formatDate(item.submittedDate ?? item.updatedAt)}
                </small>
                {item.description ? <small>{item.description}</small> : null}
                {item.latestComment ? <small>{item.latestComment}</small> : null}
                {parseActionThreadTarget(item.linkHref ?? "") ? (
                  <div className="inline-actions">
                    <button
                      className="ghost-button"
                      disabled={
                        busyAction ===
                        `thread-${parseActionThreadTarget(item.linkHref ?? "")?.entityType}-${parseActionThreadTarget(item.linkHref ?? "")?.entityId}`
                      }
                      onClick={() => {
                        const target = parseActionThreadTarget(item.linkHref ?? "");
                        if (!target) return;
                        void openActionThread(target.entityType, target.entityId, item.title);
                      }}
                      type="button"
                    >
                      Open replies
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <SectionMessage text="No request history is available yet." />
          )}
        </div>
        {activeActionThread ? renderActionThreadPanel() : null}
      </section>
    );
  }

  function renderNotifications() {
    const state = notificationsState;
    if (state.loading) return <SectionMessage text="Loading your notifications..." />;
    if (state.error) return <SectionMessage text={state.error} />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Notifications</p>
            <h3>Workflow and system alerts</h3>
          </div>
          <button className="ghost-button" disabled={busyAction === "notifications-all"} onClick={() => void handleMarkNotification()} type="button">
            Mark all as read
          </button>
        </div>
        <div className="mini-list queue-list">
          {state.data?.length ? (
            state.data.map((item) => (
              <article key={item.id}>
                <strong>{item.title}</strong>
                <span>
                  {item.category} | {item.status}
                </span>
                <small>{item.message}</small>
                <div className="inline-actions">
                  {item.linkHref ? (
                    <button
                      className="primary-button"
                      onClick={() => router.push(item.linkHref)}
                      type="button"
                    >
                      Open
                    </button>
                  ) : null}
                  {parseActionThreadTarget(item.linkHref) ? (
                    <button
                      className="ghost-button"
                      disabled={
                        busyAction ===
                        `thread-${parseActionThreadTarget(item.linkHref)?.entityType}-${parseActionThreadTarget(item.linkHref)?.entityId}`
                      }
                      onClick={() => {
                        const target = parseActionThreadTarget(item.linkHref);
                        if (!target) return;
                        void openActionThread(target.entityType, target.entityId, item.title);
                      }}
                      type="button"
                    >
                      Reply
                    </button>
                  ) : null}
                  <button
                    className="ghost-button"
                    disabled={busyAction === `notification-${item.id}` || item.status === "read"}
                    onClick={() => void handleMarkNotification(item.id)}
                    type="button"
                  >
                    Mark as read
                  </button>
                </div>
              </article>
            ))
          ) : (
            <SectionMessage text="Your inbox is clear right now." />
          )}
        </div>
        {activeActionThread ? renderActionThreadPanel() : null}
      </section>
    );
  }

  function renderActionThreadPanel() {
    const state = actionThreadState;
    if (!activeActionThread) {
      return null;
    }

    return (
      <section className="mini-panel">
        <h4>{activeActionThread.title}</h4>
        {state.loading ? <SectionMessage text="Loading conversation..." /> : null}
        {state.error ? <SectionMessage text={state.error} /> : null}
        {!state.loading && !state.error ? (
          <div className="mini-list queue-list">
            {state.data?.length ? (
              state.data.map((message) => (
                <article key={message.id}>
                  <strong>{message.authorName}</strong>
                  <span>{message.authorRole}</span>
                  <small>{message.message}</small>
                </article>
              ))
            ) : (
              <SectionMessage text="No replies yet." />
            )}
          </div>
        ) : null}
        <div className="action-form" style={{ marginTop: 12 }}>
          <label>
            <span>Reply</span>
            <textarea
              onChange={(event) => setActionThreadDraft(event.target.value)}
              rows={3}
              value={actionThreadDraft}
            />
          </label>
          <button
            className="primary-button"
            disabled={
              !actionThreadDraft.trim() ||
              busyAction === `thread-reply-${activeActionThread.entityType}-${activeActionThread.entityId}`
            }
            onClick={() => void handleActionThreadReply()}
            type="button"
          >
            {busyAction === `thread-reply-${activeActionThread.entityType}-${activeActionThread.entityId}` ? "Sending..." : "Send reply"}
          </button>
        </div>
      </section>
    );
  }

  function renderSettings() {
    const state = settingsState;
    if (state.loading) return <SectionMessage text="Loading your ESS settings..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Settings are not available yet." />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">My Settings</p>
            <h3>Preferences and delivery controls</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Notification preferences</h4>
            <div className="action-form">
              <label>
                <span>Theme</span>
                <select
                  className="filter-pill"
                  onChange={(event) =>
                    setSettingsState((current) => ({
                      ...current,
                      data: current.data ? { ...current.data, themeMode: event.target.value } : current.data,
                    }))
                  }
                  value={state.data.themeMode}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label>
                <span>Language</span>
                <select
                  className="filter-pill"
                  onChange={(event) =>
                    setSettingsState((current) => ({
                      ...current,
                      data: current.data ? { ...current.data, language: event.target.value } : current.data,
                    }))
                  }
                  value={state.data.language}
                >
                  <option value="en">English</option>
                  <option value="sw">Swahili</option>
                </select>
              </label>
              <label className="queue-actions">
                <input
                  checked={state.data.emailNotifications}
                  onChange={(event) =>
                    setSettingsState((current) => ({
                      ...current,
                      data: current.data ? { ...current.data, emailNotifications: event.target.checked } : current.data,
                    }))
                  }
                  type="checkbox"
                />
                <span>Email notifications</span>
              </label>
              <label className="queue-actions">
                <input
                  checked={state.data.smsNotifications}
                  onChange={(event) =>
                    setSettingsState((current) => ({
                      ...current,
                      data: current.data ? { ...current.data, smsNotifications: event.target.checked } : current.data,
                    }))
                  }
                  type="checkbox"
                />
                <span>SMS notifications</span>
              </label>
              <label className="queue-actions">
                <input
                  checked={state.data.inAppNotifications}
                  onChange={(event) =>
                    setSettingsState((current) => ({
                      ...current,
                      data: current.data ? { ...current.data, inAppNotifications: event.target.checked } : current.data,
                    }))
                  }
                  type="checkbox"
                />
                <span>In-app notifications</span>
              </label>
              <button className="primary-button" disabled={busyAction === "settings"} onClick={handleSaveSettings} type="button">
                {busyAction === "settings" ? "Saving..." : "Save ESS settings"}
              </button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Password & security</h4>
            <div className="action-form">
              <label>
                <span>Current password</span>
                <div className="password-input-row">
                  <input
                    autoComplete="current-password"
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                    }
                    type={showPasswordForm.currentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                  />
                  <button
                    className="ghost-button password-visibility-toggle"
                    onClick={() =>
                      setShowPasswordForm((current) => ({ ...current, currentPassword: !current.currentPassword }))
                    }
                    type="button"
                  >
                    {showPasswordForm.currentPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <label>
                <span>New password</span>
                <div className="password-input-row">
                  <input
                    autoComplete="new-password"
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                    }
                    type={showPasswordForm.newPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                  />
                  <button
                    className="ghost-button password-visibility-toggle"
                    onClick={() =>
                      setShowPasswordForm((current) => ({ ...current, newPassword: !current.newPassword }))
                    }
                    type="button"
                  >
                    {showPasswordForm.newPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <label>
                <span>Reconfirm password</span>
                <div className="password-input-row">
                  <input
                    autoComplete="new-password"
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                    type={showPasswordForm.confirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                  />
                  <button
                    className="ghost-button password-visibility-toggle"
                    onClick={() =>
                      setShowPasswordForm((current) => ({ ...current, confirmPassword: !current.confirmPassword }))
                    }
                    type="button"
                  >
                    {showPasswordForm.confirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <button
                className="primary-button"
                disabled={busyAction === "change-password"}
                onClick={handleChangePassword}
                type="button"
              >
                {busyAction === "change-password" ? "Changing..." : "Change password"}
              </button>
            </div>
            <div className="mini-list queue-list">
              <article>
                <strong>Password management</strong>
                <span>Change your password here directly without going through email reset.</span>
              </article>
              <article>
                <strong>Session history</strong>
                <span>Device and session management is ready for the next hardening slice.</span>
              </article>
            </div>
          </section>
        </div>
      </section>
    );
  }

  const content = (() => {
    if (activeItem === "My Dashboard") return renderDashboard();
    if (activeItem === "My Profile") return renderProfile();
    if (activeItem === "My Documents") return renderMyDocuments();
    if (activeItem === "Issued Documents") return renderDocuments();
    if (activeItem === "Company Documents") return renderCompanyDocuments();
    if (activeItem === "My Payslips") return renderPayslips();
    if (activeItem === "My P9 Forms") return renderP9();
    if (activeItem === "My Leave") return renderLeave();
    if (activeItem === "My Attendance") return renderAttendance();
    if (activeItem === "My Loans & Deductions" || activeItem === "My Loans") return renderLoans();
    if (activeItem === "My Assets") return renderAssets();
    if (activeItem === "My Performance" || activeItem === "My Appraisals") return renderPerformance();
    if (activeItem === "My Complaints") return renderComplaints();
    if (activeItem === "My Training") return renderTraining();
    if (activeItem === "My Requests") return renderRequests();
    if (activeItem === "My Notifications") return renderNotifications();
    if (activeItem === "My Settings") return renderSettings();

    return <EmptyState title={activeItem} text="This employee workspace is being prepared." />;
  })();

  return (
    <>
      {actionMessage ? <div className="task-banner">{actionMessage}</div> : null}
      {content}
    </>
  );
}
