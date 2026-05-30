"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { workflowRoutes } from "@/lib/workflow-routes";
import * as XLSX from "xlsx";

type AsyncState<T> = {
  loading: boolean;
  error: string;
  data: T | null;
};

const DEFAULT_LEAVE_START = new Date().toISOString().slice(0, 10);
const DEFAULT_LEAVE_END = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const DEFAULT_WEEK_START = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const DEFAULT_ROSTER_START = new Date().toISOString().slice(0, 10);

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

function formatDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function SectionMessage({ text }: { text: string }) {
  return <p className="section-description">{text}</p>;
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

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.length) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

type ApprovalAction = "approve" | "reject" | "reduce" | "cancel" | "request_clarification";

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

function parseFileNameFromDisposition(value: string | null) {
  if (!value) return null;
  const match = value.match(/filename=\"?([^\";]+)\"?/i);
  return match?.[1] ?? null;
}

function downloadCsvFile(fileName: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? "");
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function downloadXlsxFile(fileName: string, rows: Array<Record<string, unknown>>, sheetName: string) {
  if (!rows.length) {
    return;
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

export function LeaveAttendanceWorkbench({
  activeItem,
  onJump,
}: {
  activeItem: string;
  onJump: (item: string) => void;
}) {
  const router = useRouter();
  const [actionMessage, setActionMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [dashboardState, setDashboardState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [calendarState, setCalendarState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [requestsState, setRequestsState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [balancesState, setBalancesState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [policiesState, setPoliciesState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [attendanceDashboardState, setAttendanceDashboardState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [attendanceState, setAttendanceState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [timesheetsState, setTimesheetsState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [shiftsState, setShiftsState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [overtimeState, setOvertimeState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [latenessState, setLatenessState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [holidaysState, setHolidaysState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [weekendRulesState, setWeekendRulesState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [devicesState, setDevicesState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [approvalState, setApprovalState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [reportsState, setReportsState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [settingsState, setSettingsState] = useState<AsyncState<Record<string, unknown>>>({ loading: false, error: "", data: null });
  const [adjustmentsState, setAdjustmentsState] = useState<AsyncState<Array<Record<string, unknown>>>>({ loading: false, error: "", data: null });
  const [requestListView, setRequestListView] = useState<"active" | "history">("active");
  const [approvalListView, setApprovalListView] = useState<"pending" | "history">("pending");
  const [historyTransfer, setHistoryTransfer] = useState<{
    scope: "requests" | "approvals";
    title: string;
    detail: string;
  } | null>(null);

  const [policyForm, setPolicyForm] = useState({
    leaveType: "Annual Leave",
    policyName: "Annual Leave Standard",
    annualAllowance: "21",
    accrualFrequency: "monthly",
    monthlyAccrualRate: "1.75",
    carryForwardLimit: "5",
    minimumNoticeDays: "3",
    maxConsecutiveDays: "21",
    requestCategory: "leave",
    approvalFlow: "supervisor_gm",
    reducingBalance: true,
    carryForwardEnabled: true,
    requiresAttachment: false,
    payrollImpact: false,
  });
  const [rosterForm, setRosterForm] = useState({
    periodType: "weekly",
    startDate: DEFAULT_ROSTER_START,
  });
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [showRosterUpload, setShowRosterUpload] = useState(false);
  const [showManualRoster, setShowManualRoster] = useState(false);
  const [rosterValidation, setRosterValidation] = useState<{
    rowCount: number;
    periodStart: string;
    periodEnd: string;
    counts: Record<string, number>;
    warnings: Array<{ staffNumber: string; message: string }>;
    errors: Array<{ rowNumber: number; staffNumber: string; employeeName?: string; date?: string; message: string }>;
    previewRows: Array<{ rowNumber: number; staffNumber: string; employeeName: string; date: string; shiftCode: string; shiftLabel: string }>;
  } | null>(null);
  const [manualRosterForm, setManualRosterForm] = useState({
    employeeId: "",
    assignmentDate: DEFAULT_ROSTER_START,
    shiftCode: "AM",
  });
  const [overtimeForm, setOvertimeForm] = useState({
    workDate: DEFAULT_LEAVE_START,
    hours: "2",
    reason: "Month-end catch-up",
  });
  const [timesheetForm, setTimesheetForm] = useState({
    weekStart: DEFAULT_WEEK_START,
    totalHours: "42",
    notes: "Weekly delivery and support coverage",
  });
  const [holidayForm, setHolidayForm] = useState({
    name: "Founders Day",
    holidayDate: DEFAULT_LEAVE_START,
    scope: "company",
  });
  const [weekendRuleForm, setWeekendRuleForm] = useState({
    name: "Alt Saturday Rule",
    workingDays: "monday,tuesday,wednesday,thursday,friday",
    halfDays: "saturday",
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    workDate: DEFAULT_LEAVE_START,
    requestedClockIn: "",
    requestedClockOut: "",
    reason: "Clocking correction",
  });

  function triggerHistoryTransfer(scope: "requests" | "approvals", title: string, detail: string) {
    setHistoryTransfer({ scope, title, detail });
    window.setTimeout(() => {
      setHistoryTransfer((current) =>
        current?.scope === scope && current?.title === title ? null : current
      );
    }, 2200);
  }

  async function loadDashboard() {
    setDashboardState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ dashboard: Record<string, unknown> }>("/api/leave/dashboard");
      setDashboardState({ loading: false, error: "", data: payload.dashboard });
    } catch (error) {
      setDashboardState({ loading: false, error: error instanceof Error ? error.message : "Could not load leave dashboard.", data: null });
    }
  }

  async function loadRequests() {
    setRequestsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ requests: Array<Record<string, unknown>> }>("/api/leave/requests");
      setRequestsState({ loading: false, error: "", data: payload.requests });
    } catch (error) {
      setRequestsState({ loading: false, error: error instanceof Error ? error.message : "Could not load leave requests.", data: null });
    }
  }

  async function loadCalendar() {
    setCalendarState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<Record<string, unknown>>("/api/leave/calendar");
      setCalendarState({ loading: false, error: "", data: payload });
    } catch (error) {
      setCalendarState({ loading: false, error: error instanceof Error ? error.message : "Could not load leave calendar.", data: null });
    }
  }

  async function loadBalances() {
    setBalancesState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ balances: Array<Record<string, unknown>> }>("/api/leave/balances");
      setBalancesState({ loading: false, error: "", data: payload.balances });
    } catch (error) {
      setBalancesState({ loading: false, error: error instanceof Error ? error.message : "Could not load leave balances.", data: null });
    }
  }

  async function loadPolicies() {
    setPoliciesState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<Record<string, unknown>>("/api/leave/policies");
      setPoliciesState({ loading: false, error: "", data: payload });
    } catch (error) {
      setPoliciesState({ loading: false, error: error instanceof Error ? error.message : "Could not load leave policies.", data: null });
    }
  }

  async function loadAttendanceDashboard() {
    setAttendanceDashboardState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ dashboard: Record<string, unknown> }>("/api/leave/attendance-dashboard");
      setAttendanceDashboardState({ loading: false, error: "", data: payload.dashboard });
    } catch (error) {
      setAttendanceDashboardState({ loading: false, error: error instanceof Error ? error.message : "Could not load attendance dashboard.", data: null });
    }
  }

  async function loadAttendance() {
    setAttendanceState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ records: Array<Record<string, unknown>> }>("/api/leave/daily-attendance");
      setAttendanceState({ loading: false, error: "", data: payload.records });
    } catch (error) {
      setAttendanceState({ loading: false, error: error instanceof Error ? error.message : "Could not load attendance.", data: null });
    }
  }

  async function loadTimesheets() {
    setTimesheetsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ timesheets: Array<Record<string, unknown>> }>("/api/leave/timesheets");
      setTimesheetsState({ loading: false, error: "", data: payload.timesheets });
    } catch (error) {
      setTimesheetsState({ loading: false, error: error instanceof Error ? error.message : "Could not load timesheets.", data: null });
    }
  }

  async function loadShifts() {
    setShiftsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<Record<string, unknown>>("/api/leave/shifts");
      setShiftsState({ loading: false, error: "", data: payload });
      const employees = (payload.rosterEmployees as Array<Record<string, unknown>> | undefined) ?? [];
      if (employees[0] && !manualRosterForm.employeeId) {
        setManualRosterForm((current) => ({
          ...current,
          employeeId: safeString(employees[0]?.employeeId),
        }));
      }
    } catch (error) {
      setShiftsState({ loading: false, error: error instanceof Error ? error.message : "Could not load shifts.", data: null });
    }
  }

  async function loadOvertime() {
    setOvertimeState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ overtime: Array<Record<string, unknown>> }>("/api/leave/overtime");
      setOvertimeState({ loading: false, error: "", data: payload.overtime });
    } catch (error) {
      setOvertimeState({ loading: false, error: error instanceof Error ? error.message : "Could not load overtime.", data: null });
    }
  }

  async function loadLateness() {
    setLatenessState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<Record<string, unknown>>("/api/leave/lateness");
      setLatenessState({ loading: false, error: "", data: payload });
    } catch (error) {
      setLatenessState({ loading: false, error: error instanceof Error ? error.message : "Could not load lateness data.", data: null });
    }
  }

  async function loadHolidays() {
    setHolidaysState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ holidays: Array<Record<string, unknown>> }>("/api/leave/holidays");
      setHolidaysState({ loading: false, error: "", data: payload.holidays });
    } catch (error) {
      setHolidaysState({ loading: false, error: error instanceof Error ? error.message : "Could not load holidays.", data: null });
    }
  }

  async function loadWeekendRules() {
    setWeekendRulesState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ weekendRules: Array<Record<string, unknown>> }>("/api/leave/weekend-rules");
      setWeekendRulesState({ loading: false, error: "", data: payload.weekendRules });
    } catch (error) {
      setWeekendRulesState({ loading: false, error: error instanceof Error ? error.message : "Could not load weekend rules.", data: null });
    }
  }

  async function loadDevices() {
    setDevicesState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<Record<string, unknown>>("/api/leave/devices");
      setDevicesState({ loading: false, error: "", data: payload });
    } catch (error) {
      setDevicesState({ loading: false, error: error instanceof Error ? error.message : "Could not load attendance devices.", data: null });
    }
  }

  async function loadApprovalQueue() {
    setApprovalState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ tasks: Array<Record<string, unknown>> }>("/api/leave/approval-queue");
      setApprovalState({ loading: false, error: "", data: payload.tasks });
    } catch (error) {
      setApprovalState({ loading: false, error: error instanceof Error ? error.message : "Could not load the approvals inbox.", data: null });
    }
  }

  async function loadReports() {
    setReportsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<Record<string, unknown>>("/api/leave/reports");
      setReportsState({ loading: false, error: "", data: payload });
    } catch (error) {
      setReportsState({ loading: false, error: error instanceof Error ? error.message : "Could not load reports.", data: null });
    }
  }

  async function loadSettings() {
    setSettingsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ settings: Record<string, unknown> }>("/api/leave/settings");
      setSettingsState({ loading: false, error: "", data: payload.settings });
    } catch (error) {
      setSettingsState({ loading: false, error: error instanceof Error ? error.message : "Could not load settings.", data: null });
    }
  }

  async function loadAdjustments() {
    setAdjustmentsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const payload = await readJson<{ adjustments: Array<Record<string, unknown>> }>("/api/leave/adjustments");
      setAdjustmentsState({ loading: false, error: "", data: payload.adjustments });
    } catch (error) {
      setAdjustmentsState({ loading: false, error: error instanceof Error ? error.message : "Could not load attendance adjustments.", data: null });
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (activeItem === "Leave Dashboard" && !dashboardState.data && !dashboardState.loading) void loadDashboard();
      if (activeItem === "Leave Requests" && !requestsState.data && !requestsState.loading) void loadRequests();
      if (activeItem === "Leave Calendar" && !calendarState.data && !calendarState.loading) void loadCalendar();
      if (activeItem === "Leave Balances" && !balancesState.data && !balancesState.loading) void loadBalances();
      if (activeItem === "Leave Policies" && !policiesState.data && !policiesState.loading) void loadPolicies();
      if (activeItem === "Attendance Dashboard" && !attendanceDashboardState.data && !attendanceDashboardState.loading) void loadAttendanceDashboard();
      if (activeItem === "Daily Attendance") {
        if (!attendanceState.data && !attendanceState.loading) void loadAttendance();
        if (!adjustmentsState.data && !adjustmentsState.loading) void loadAdjustments();
      }
      if (activeItem === "Timesheets" && !timesheetsState.data && !timesheetsState.loading) void loadTimesheets();
      if (activeItem === "Shift Scheduling" && !shiftsState.data && !shiftsState.loading) void loadShifts();
      if (activeItem === "Overtime" && !overtimeState.data && !overtimeState.loading) void loadOvertime();
      if (activeItem === "Late Coming & Absenteeism" && !latenessState.data && !latenessState.loading) void loadLateness();
      if (activeItem === "Holidays" && !holidaysState.data && !holidaysState.loading) void loadHolidays();
      if (activeItem === "Weekend Rules" && !weekendRulesState.data && !weekendRulesState.loading) void loadWeekendRules();
      if (activeItem === "Biometric / Device Integrations" && !devicesState.data && !devicesState.loading) void loadDevices();
      if ((activeItem === "Approvals Inbox" || activeItem === "Approval Queue") && !approvalState.data && !approvalState.loading) void loadApprovalQueue();
      if (activeItem === "Reports" && !reportsState.data && !reportsState.loading) void loadReports();
      if (activeItem === "Settings" && !settingsState.data && !settingsState.loading) void loadSettings();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    activeItem,
    adjustmentsState.data,
    adjustmentsState.loading,
    approvalState.data,
    approvalState.loading,
    attendanceDashboardState.data,
    attendanceDashboardState.loading,
    attendanceState.data,
    attendanceState.loading,
    balancesState.data,
    balancesState.loading,
    calendarState.data,
    calendarState.loading,
    dashboardState.data,
    dashboardState.loading,
    devicesState.data,
    devicesState.loading,
    holidaysState.data,
    holidaysState.loading,
    latenessState.data,
    latenessState.loading,
    overtimeState.data,
    overtimeState.loading,
    policiesState.data,
    policiesState.loading,
    reportsState.data,
    reportsState.loading,
    requestsState.data,
    requestsState.loading,
    settingsState.data,
    settingsState.loading,
    shiftsState.data,
    shiftsState.loading,
    timesheetsState.data,
    timesheetsState.loading,
    weekendRulesState.data,
    weekendRulesState.loading,
  ]);

  async function handleCancelRequest(requestId: string) {
    setBusyAction(`cancel-${requestId}`);
    setActionMessage("");
    try {
      await readJson(`/api/leave/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      await Promise.all([loadRequests(), loadBalances()]);
      setActionMessage("Leave request cancelled.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not cancel the request.");
    } finally {
      setBusyAction("");
    }
  }

  async function handlePolicySave() {
    setBusyAction("policy");
    setActionMessage("");
    try {
      await readJson("/api/leave/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policyForm),
      });
      await loadPolicies();
      setActionMessage("Leave policy saved.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save the leave policy.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleLeaveFormDownload(requestId: string, mode: "preview" | "download") {
    setBusyAction(`leave-form-${requestId}-${mode}`);
    setActionMessage("");
    try {
      const response = await fetch(`/api/leave/forms/${requestId}?mode=${mode}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Request failed with ${response.status}`);
      }

      const fileName =
        parseFileNameFromDisposition(response.headers.get("Content-Disposition")) ?? `leave-form-${requestId}.pdf`;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (mode === "preview") {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      } else {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setActionMessage(mode === "preview" ? "Leave form opened in a new tab." : "Leave form downloaded.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not open the leave form.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRosterTemplateDownload() {
    setBusyAction("roster-template");
    setActionMessage("");
    try {
      const response = await fetch(
        `/api/leave/shifts/template?periodType=${encodeURIComponent(rosterForm.periodType)}&startDate=${encodeURIComponent(
          rosterForm.startDate
        )}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Request failed with ${response.status}`);
      }

      const fileName =
        parseFileNameFromDisposition(response.headers.get("Content-Disposition")) ?? "robot-cafe-roster.xlsx";
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      setActionMessage("Roster template downloaded. Populate shifts in Excel, then upload the completed file here.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not download the roster template.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRosterUpload() {
    if (!rosterFile) {
      setActionMessage("Choose the completed roster workbook before uploading.");
      return;
    }

    if (!rosterValidation) {
      setActionMessage("Validate the roster first so you can preview the parsed shifts before saving.");
      return;
    }

    if (rosterValidation.errors.length) {
      setActionMessage("Fix the validation issues before uploading the roster.");
      return;
    }

    setBusyAction("roster-upload");
    setActionMessage("");
    try {
      const formData = new FormData();
      formData.append("file", rosterFile);

      const response = await fetch("/api/leave/shifts/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        details?: { errors?: Array<{ message: string; rowNumber?: number; date?: string }>; warnings?: Array<{ message: string }> };
        result?: { assignmentsSaved: number; warnings?: Array<{ message: string }>; counts?: Record<string, number> };
      };

      if (!response.ok) {
        const errorLines = payload.details?.errors?.slice(0, 4).map((item) => {
          const rowText = item.rowNumber ? `row ${item.rowNumber}` : "uploaded roster";
          return `${rowText}: ${item.message}`;
        });
        throw new Error(errorLines?.length ? errorLines.join(" | ") : payload.error ?? `Request failed with ${response.status}`);
      }

      const warningText = payload.result?.warnings?.length
        ? ` Warnings: ${payload.result.warnings.slice(0, 3).map((item) => item.message).join(" | ")}`
        : "";
      setActionMessage(`Roster uploaded successfully. Saved ${payload.result?.assignmentsSaved ?? 0} shift assignments.${warningText}`);
      setRosterFile(null);
      await loadShifts();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not upload the completed roster.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleRosterValidate() {
    if (!rosterFile) {
      setActionMessage("Choose the completed roster workbook before validating.");
      return;
    }

    setBusyAction("roster-validate");
    setActionMessage("");
    try {
      const formData = new FormData();
      formData.append("file", rosterFile);

      const payload = await readJson<{
        result: {
          rowCount: number;
          periodStart: string;
          periodEnd: string;
          counts: Record<string, number>;
          warnings: Array<{ staffNumber: string; message: string }>;
          errors: Array<{ rowNumber: number; staffNumber: string; employeeName?: string; date?: string; message: string }>;
          previewRows: Array<{ rowNumber: number; staffNumber: string; employeeName: string; date: string; shiftCode: string; shiftLabel: string }>;
        };
      }>("/api/leave/shifts/validate", {
        method: "POST",
        body: formData,
      });

      setRosterValidation(payload.result);
      setActionMessage(
        payload.result.errors.length
          ? `Validation found ${payload.result.errors.length} issue(s). Fix them in the workbook, then validate again.`
          : `Validation passed. ${payload.result.rowCount} roster row(s) are ready to upload.`
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not validate the completed roster.");
      setRosterValidation(null);
    } finally {
      setBusyAction("");
    }
  }

  function handleRosterCancel() {
    setRosterFile(null);
    setRosterValidation(null);
    setShowRosterUpload(false);
    setActionMessage("");
  }

  async function handleManualRosterSubmit() {
    if (!manualRosterForm.employeeId || !manualRosterForm.assignmentDate || !manualRosterForm.shiftCode) {
      setActionMessage("Choose the employee, date, and shift before saving the manual roster.");
      return;
    }

    setBusyAction("manual-roster");
    setActionMessage("");
    try {
      await readJson("/api/leave/shifts/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualRosterForm),
      });
      await loadShifts();
      setShowManualRoster(false);
      setActionMessage("Manual roster assignment saved.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save the manual roster assignment.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleOvertimeSubmit() {
    setBusyAction("overtime");
    setActionMessage("");
    try {
      await readJson("/api/leave/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overtimeForm),
      });
      await Promise.all([loadOvertime(), loadApprovalQueue()]);
      setActionMessage("Overtime request submitted.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit the overtime request.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleTimesheetSubmit() {
    setBusyAction("timesheet");
    setActionMessage("");
    try {
      await readJson("/api/leave/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(timesheetForm),
      });
      await Promise.all([loadTimesheets(), loadApprovalQueue()]);
      setActionMessage("Timesheet submitted for review.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit the timesheet.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleHolidaySave() {
    setBusyAction("holiday");
    setActionMessage("");
    try {
      await readJson("/api/leave/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holidayForm),
      });
      await Promise.all([loadHolidays(), loadCalendar()]);
      setActionMessage("Holiday saved.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save the holiday.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleWeekendRuleSave() {
    setBusyAction("weekend-rule");
    setActionMessage("");
    try {
      await readJson("/api/leave/weekend-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: weekendRuleForm.name,
          workingDays: weekendRuleForm.workingDays.split(",").map((entry) => entry.trim()).filter(Boolean),
          halfDays: weekendRuleForm.halfDays.split(",").map((entry) => entry.trim()).filter(Boolean),
        }),
      });
      await loadWeekendRules();
      setActionMessage("Weekend rule saved.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not save the weekend rule.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleAdjustmentSubmit() {
    setBusyAction("adjustment");
    setActionMessage("");
    try {
      await readJson("/api/leave/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjustmentForm),
      });
      await Promise.all([loadAdjustments(), loadApprovalQueue()]);
      setActionMessage("Attendance adjustment submitted.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not submit the attendance adjustment.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleApproval(item: Record<string, unknown>, action: ApprovalAction) {
    const taskId = safeString(item.id);
    const isLeaveTask = safeString(item.kind) === "leave_request";
    const payload: Record<string, unknown> = { action };

    if (isLeaveTask && action === "reduce") {
      const requestedDays = safeNumber(item.requestedDays);
      const response = window.prompt(
        `Approve how many days? Current request is ${requestedDays} day(s).`,
        String(Math.max(1, requestedDays - 1))
      );
      if (response === null) return;
      const approvedDays = Number(response);
      if (!Number.isFinite(approvedDays) || approvedDays <= 0 || approvedDays >= requestedDays) {
        setActionMessage("Enter a reduced day count that is lower than the original request.");
        return;
      }
      payload.approvedDays = approvedDays;
      const note = window.prompt("Optional note for the reduced approval", "");
      if (note && note.trim()) {
        payload.comments = note.trim();
      }
    }

    if (isLeaveTask && action === "request_clarification") {
      const note = window.prompt("What clarification do you need from the employee?", "");
      if (note === null) return;
      if (!note.trim()) {
        setActionMessage("Add a clarification note before sending this back.");
        return;
      }
      payload.comments = note.trim();
    }

    if (isLeaveTask && action === "cancel") {
      const reason = window.prompt("Why are you cancelling this approved leave?", "Operational change");
      if (reason === null) return;
      if (!reason.trim()) {
        setActionMessage("A cancellation reason is required.");
        return;
      }
      payload.comments = reason.trim();
    }

    if (isLeaveTask && action === "reject") {
      const reason = window.prompt("Add a rejection reason for the employee (optional).", "");
      if (reason && reason.trim()) {
        payload.comments = reason.trim();
      }
    }

    setBusyAction(`${action}-${taskId}`);
    setActionMessage("");
    try {
      await readJson(isLeaveTask ? `/api/leave/approval-queue/${taskId}` : `/api/approval-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await Promise.all([
        loadApprovalQueue(),
        loadRequests(),
        loadBalances(),
        loadCalendar(),
        loadOvertime(),
        loadTimesheets(),
        loadAdjustments(),
      ]);
      if (isLeaveTask && action !== "request_clarification") {
        const nextStatus =
          action === "reject"
            ? "rejected"
            : action === "cancel"
              ? "cancelled"
              : "approved";

        setApprovalState((current) => ({
          ...current,
          data: (current.data ?? []).map((entry) =>
            safeString(entry.id) === taskId
              ? {
                  ...entry,
                  status: nextStatus,
                  leaveStatus: nextStatus,
                }
              : entry
          ),
        }));
        setRequestsState((current) => ({
          ...current,
          data: (current.data ?? []).map((entry) =>
            safeString(entry.id) === safeString(item.entityId)
              ? {
                  ...entry,
                  status: nextStatus,
                }
              : entry
          ),
        }));
        triggerHistoryTransfer(
          "approvals",
          safeString(item.title, "Leave request"),
          action === "reject"
            ? "Rejected and moved into history."
            : action === "cancel"
              ? "Cancelled and moved into history."
              : "Completed and moved into history."
        );
      }
      setActionMessage(
        action === "request_clarification"
          ? "Clarification request sent."
          : action === "reduce"
            ? "Leave days reduced successfully."
            : action === "cancel"
              ? "Approved leave cancelled."
              : `Task ${action}d successfully.`
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Could not complete the approval action.");
    } finally {
      setBusyAction("");
    }
  }

  function exportLeaveHistory(format: "xlsx" | "csv") {
    const rows = ((requestsState.data ?? []) as Array<Record<string, unknown>>)
      .filter((item) => ["approved", "rejected", "cancelled"].includes(safeString(item.status).toLowerCase()))
      .map((item) => {
        const employee = item.employee as Record<string, unknown> | undefined;
        return {
          "Employee Name": `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
          "Staff Number": safeString(employee?.employee_number),
          "Request Type": safeString(item.request_category, "leave") === "off_day" ? "Off Day" : "Leave",
          "Leave Type": safeString(item.leave_type),
          "Start Date": safeString(item.start_date),
          "End Date": safeString(item.end_date),
          Days: safeNumber(item.days),
          Status: safeString(item.status),
          "Expected Resume Date": safeString(item.expected_resume_date),
          Reason: safeString(item.reason),
          "Created At": safeString(item.created_at),
        };
      });

    if (!rows.length) {
      setActionMessage("There is no leave history available to export yet.");
      return;
    }

    if (format === "xlsx") {
      downloadXlsxFile("robot-cafe-leave-history.xlsx", rows, "Leave History");
    } else {
      downloadCsvFile("robot-cafe-leave-history.csv", rows);
    }
    setActionMessage("Leave history exported successfully.");
  }

  function exportApprovalHistory(format: "xlsx" | "csv") {
    const rows = ((approvalState.data ?? []) as Array<Record<string, unknown>>)
      .filter((item) => safeString(item.status).toLowerCase() !== "pending")
      .filter((item) => safeString(item.kind) === "leave_request")
      .map((item) => ({
        Title: safeString(item.title),
        Employee: safeString(item.employee),
        Department: safeString(item.department),
        "Request Type": safeString(item.requestType),
        Status: safeString(item.status),
        Stage: safeString(item.stage),
        Priority: safeString(item.priority),
        "Requested By": safeString(item.requestedBy),
        "Requested By Role": safeString(item.requestedByRole),
        "Submitted Date": safeString(item.submittedDate),
        "Updated At": safeString(item.updatedAt),
      }));

    if (!rows.length) {
      setActionMessage("There is no approval history available to export yet.");
      return;
    }

    if (format === "xlsx") {
      downloadXlsxFile("robot-cafe-leave-approval-history.xlsx", rows, "Approval History");
    } else {
      downloadCsvFile("robot-cafe-leave-approval-history.csv", rows);
    }
    setActionMessage("Approval history exported successfully.");
  }

  function exportLeaveBalances(format: "xlsx" | "csv") {
    const rows = ((balancesState.data ?? []) as Array<Record<string, unknown>>).map((item) => {
      const employee = item.employee as Record<string, unknown> | undefined;
      const department = employee?.department as Record<string, unknown> | undefined;
      const branch = employee?.branch as Record<string, unknown> | undefined;
      return {
        "Staff Number": safeString(employee?.employee_number),
        "Employee Name": `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim(),
        Branch: safeString(branch?.name),
        Department: safeString(department?.name),
        "Leave Type": safeString(item.leave_type),
        "Opening Days": safeNumber(item.opening_balance),
        "Accrued Days": safeNumber(item.accrued_days),
        "Days Spent": safeNumber(item.taken_days),
        "Pending Days": safeNumber(item.pending_days),
        "Balance Left": safeNumber(item.balance_days),
        "As Of Date": safeString(item.as_of_date),
      };
    });

    if (!rows.length) {
      setActionMessage("There are no leave balances available to export yet.");
      return;
    }

    if (format === "xlsx") {
      downloadXlsxFile("solva-leave-balances.xlsx", rows, "Leave Balances");
    } else {
      downloadCsvFile("solva-leave-balances.csv", rows);
    }
    setActionMessage("Leave balances exported successfully.");
  }

  function renderLeaveDashboard() {
    const state = dashboardState;
    if (state.loading) return <SectionMessage text="Loading leave dashboard..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Leave dashboard is not available yet." />;

    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Leave Dashboard</p>
            <h3>Leave demand, balance pressure, and approval flow</h3>
          </div>
        </div>
        <p className="workspace-intro">
          Keep leave decisions simple. Start the request flow quickly, then use the dashboard to monitor approvals,
          exposure, and attendance issues that need follow-up.
        </p>
        <div className="metric-grid compact-grid">
          <article className="metric-card"><span>Requests</span><strong>{safeNumber(state.data.requestCount)}</strong><small>Live leave submissions</small></article>
          <article className="metric-card"><span>Pending</span><strong>{safeNumber(state.data.pendingRequests)}</strong><small>Awaiting review</small></article>
          <article className="metric-card"><span>Exceptions</span><strong>{safeNumber(state.data.attendanceExceptions)}</strong><small>Attendance issues impacting teams</small></article>
          <article className="metric-card"><span>Liability</span><strong>KES {safeNumber(state.data.leaveLiability).toLocaleString()}</strong><small>Annual leave exposure</small></article>
        </div>
        <div className="action-card-grid">
          <button className="primary-button" onClick={() => router.push(workflowRoutes.leaveCreate)} type="button">Apply Leave</button>
          <button className="ghost-button action-card-button" onClick={() => onJump("Leave Calendar")} type="button">Open Leave Calendar</button>
          <button className="ghost-button action-card-button" onClick={() => onJump("Holidays")} type="button">Manage Holidays</button>
        </div>
      </section>
    );
  }

  function renderLeaveRequests() {
    const state = requestsState;
    if (state.loading) return <SectionMessage text="Loading leave requests..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    const activeRequests = (state.data ?? []).filter((item) =>
      ["pending", "recommended"].includes(safeString(item.status).toLowerCase())
    );
    const historyRequests = (state.data ?? [])
      .filter((item) =>
        ["approved", "rejected", "cancelled"].includes(safeString(item.status).toLowerCase())
      )
      .slice()
      .sort((left, right) => {
        const leftTime = new Date(
          `${safeString(left.updated_at, safeString(left.final_approved_at, safeString(left.created_at, safeString(left.end_date))))}`
        ).getTime();
        const rightTime = new Date(
          `${safeString(right.updated_at, safeString(right.final_approved_at, safeString(right.created_at, safeString(right.end_date))))}`
        ).getTime();
        return rightTime - leftTime;
      });
    const visibleRequests = requestListView === "active" ? activeRequests : historyRequests;
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Leave Requests</p>
            <h3>Create, review, and cancel requests</h3>
          </div>
        </div>
        <p className="workspace-intro">
          This queue keeps current requests easy to understand. Start new leave from the dedicated form, then come back
          here to track status and cancel pending requests when plans change.
        </p>
        <div className="workbench-grid">
          <section className="mini-panel" data-tour="leave-apply">
            <h4>Apply leave</h4>
            <p className="section-description">
              Leave requests now start in a dedicated page so dates, totals, and approval notes stay easy to review.
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
          <section className="mini-panel" data-tour="leave-request-queue">
            <div className="section-heading">
              <div>
                <h4>{requestListView === "active" ? "Active requests" : "Leave history"}</h4>
                <p className="section-description">
                  {requestListView === "active"
                    ? "Current requests stay here while they are active. Closed items move into history."
                    : "Closed leave decisions stay tucked away here instead of stretching the page downward."}
                </p>
              </div>
              <div className="inline-actions">
                <button
                  className={requestListView === "active" ? "primary-button" : "ghost-button"}
                  onClick={() => setRequestListView("active")}
                  type="button"
                >
                  Active
                </button>
                <button
                  className={requestListView === "history" ? "primary-button" : "ghost-button"}
                  onClick={() => setRequestListView("history")}
                  type="button"
                >
                  History
                </button>
                {requestListView === "history" ? (
                  <>
                    <button className="ghost-button" onClick={() => exportLeaveHistory("xlsx")} type="button">
                      Export Excel
                    </button>
                    <button className="ghost-button" onClick={() => exportLeaveHistory("csv")} type="button">
                      Export CSV
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            {historyTransfer?.scope === "requests" ? (
              <div className="history-transfer-banner" role="status">
                <div className="history-transfer-icon" aria-hidden="true">
                  <span className="history-transfer-arrow" />
                  <span className="history-transfer-bucket" />
                </div>
                <div>
                  <strong>{historyTransfer.title}</strong>
                  <small>{historyTransfer.detail}</small>
                </div>
              </div>
            ) : null}
            {visibleRequests.length ? (
              requestListView === "history" ? (
                <ScheduleTable
                  columns={[
                    { key: "employee", label: "Employee" },
                    { key: "leaveType", label: "Leave Type" },
                    { key: "period", label: "Period" },
                    { key: "days", label: "Days", align: "right" },
                    { key: "status", label: "Status" },
                    { key: "workflow", label: "Workflow" },
                    { key: "resume", label: "Resume" },
                    { key: "actions", label: "Actions" },
                  ]}
                  emptyText="No leave history is available yet."
                  rows={visibleRequests.map((item) => {
                    const employee = item.employee as Record<string, unknown> | undefined;
                    const approvalTask = item.approval_task as Record<string, unknown> | undefined;
                    return {
                      id: safeString(item.id),
                      employee: `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim() || "-",
                      leaveType: safeString(item.leave_type),
                      period: `${formatDate(safeString(item.start_date))} - ${formatDate(safeString(item.end_date))}`,
                      days: safeNumber(item.days).toFixed(1),
                      status: safeString(item.status),
                      workflow: safeString(approvalTask?.owner_role, safeString(approvalTask?.stage, "Workflow")),
                      resume: formatDate(safeString(item.expected_resume_date)),
                      actions: (
                        <div className="inline-actions">
                          <button
                            className="ghost-button"
                            disabled={busyAction === `leave-form-${safeString(item.id)}-preview`}
                            onClick={() => void handleLeaveFormDownload(safeString(item.id), "preview")}
                            type="button"
                          >
                            View form
                          </button>
                          <button
                            className="ghost-button"
                            disabled={busyAction === `leave-form-${safeString(item.id)}-download`}
                            onClick={() => void handleLeaveFormDownload(safeString(item.id), "download")}
                            type="button"
                          >
                            Download form
                          </button>
                        </div>
                      ),
                    };
                  })}
                />
              ) : (
                <div className="mini-list queue-list">
                  {visibleRequests.map((item) => {
                    const employee = item.employee as Record<string, unknown> | undefined;
                    const approvalTask = item.approval_task as Record<string, unknown> | undefined;
                    return (
                      <article key={safeString(item.id)}>
                        <strong>{safeString(item.leave_type)} | {safeString(employee?.first_name)} {safeString(employee?.last_name)}</strong>
                        <span>{formatDate(safeString(item.start_date))} - {formatDate(safeString(item.end_date))}</span>
                        <small>{safeString(item.status)} | {safeString(approvalTask?.owner_role, safeString(approvalTask?.stage, "Workflow"))} | Resume {formatDate(safeString(item.expected_resume_date))}</small>
                        <div className="inline-actions">
                          <button className="ghost-button" disabled={busyAction === `leave-form-${safeString(item.id)}-preview`} onClick={() => void handleLeaveFormDownload(safeString(item.id), "preview")} type="button">View form</button>
                          <button className="ghost-button" disabled={busyAction === `leave-form-${safeString(item.id)}-download`} onClick={() => void handleLeaveFormDownload(safeString(item.id), "download")} type="button">Download form</button>
                          {safeString(item.status) === "pending" ? (
                            <button className="ghost-button" disabled={busyAction === `cancel-${safeString(item.id)}`} onClick={() => void handleCancelRequest(safeString(item.id))} type="button">Cancel</button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            ) : (
              <EmptyState
                actionLabel="Apply Leave"
                onAction={() => router.push(workflowRoutes.leaveCreate)}
                text={
                  requestListView === "active"
                    ? "No active leave requests found right now."
                    : "No leave history is available yet."
                }
                title={requestListView === "active" ? "No leave requests yet" : "No leave history yet"}
              />
            )}
          </section>
        </div>
      </section>
    );
  }

  function renderCalendar() {
    const state = calendarState;
    if (state.loading) return <SectionMessage text="Loading leave calendar..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    const requests = ((state.data?.requests as Array<Record<string, unknown>> | undefined) ?? []).slice(0, 8);
    const holidays = ((state.data?.holidays as Array<Record<string, unknown>> | undefined) ?? []).slice(0, 8);
    const blackoutDates = ((state.data?.blackoutDates as Array<Record<string, unknown>> | undefined) ?? []).slice(0, 8);
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Leave Calendar</p>
            <h3>Approved leave, holidays, and blackout windows</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Upcoming leave</h4>
            <div className="mini-list queue-list">
              {requests.length ? requests.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.leave_type)}</strong>
                  <span>{formatDate(safeString(item.start_date))} - {formatDate(safeString(item.end_date))}</span>
                  <small>{safeString(item.status)}</small>
                </article>
              )) : <SectionMessage text="No leave entries found." />}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Public holidays</h4>
            <div className="mini-list queue-list">
              {holidays.length ? holidays.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.name)}</strong>
                  <span>{formatDate(safeString(item.holiday_date))}</span>
                  <small>{safeString(item.scope)}</small>
                </article>
              )) : <SectionMessage text="No holidays configured." />}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Blackout dates</h4>
            <div className="mini-list queue-list">
              {blackoutDates.length ? blackoutDates.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.title)}</strong>
                  <span>{formatDate(safeString(item.start_date))} - {formatDate(safeString(item.end_date))}</span>
                  <small>{safeString(item.status)}</small>
                </article>
              )) : <SectionMessage text="No blackout windows configured." />}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderBalances() {
    const state = balancesState;
    if (state.loading) return <SectionMessage text="Loading leave balances..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    const balanceRows = (state.data ?? []) as Array<Record<string, unknown>>;
    const totals = balanceRows.reduce<{
      opening: number;
      accrued: number;
      spent: number;
      pending: number;
      balance: number;
    }>(
      (summary, item) => ({
        opening: summary.opening + safeNumber(item.opening_balance),
        accrued: summary.accrued + safeNumber(item.accrued_days),
        spent: summary.spent + safeNumber(item.taken_days),
        pending: summary.pending + safeNumber(item.pending_days),
        balance: summary.balance + safeNumber(item.balance_days),
      }),
      { opening: 0, accrued: 0, spent: 0, pending: 0, balance: 0 }
    );
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Leave Balances</p>
            <h3>Leave days spent and leave balances in spreadsheet view</h3>
          </div>
          <div className="queue-actions">
            <button className="secondary-button" onClick={() => exportLeaveBalances("xlsx")} type="button">
              Download Excel
            </button>
            <button className="ghost-button" onClick={() => exportLeaveBalances("csv")} type="button">
              Download CSV
            </button>
          </div>
        </div>
        <div className="metric-grid compact-grid">
          <article className="metric-card"><span>Opening days</span><strong>{totals.opening.toFixed(2)}</strong><small>Total opening entitlement in scope</small></article>
          <article className="metric-card"><span>Accrued days</span><strong>{totals.accrued.toFixed(2)}</strong><small>Total days earned so far</small></article>
          <article className="metric-card"><span>Days spent</span><strong>{totals.spent.toFixed(2)}</strong><small>Total leave already used</small></article>
          <article className="metric-card"><span>Balance left</span><strong>{totals.balance.toFixed(2)}</strong><small>Total leave not yet spent</small></article>
        </div>
        <ScheduleTable
          columns={[
            { key: "staffNumber", label: "Staff No." },
            { key: "employeeName", label: "Employee" },
            { key: "branch", label: "Branch" },
            { key: "department", label: "Department" },
            { key: "leaveType", label: "Leave Type" },
            { key: "openingDays", label: "Opening", align: "right" },
            { key: "accruedDays", label: "Accrued", align: "right" },
            { key: "daysSpent", label: "Days Spent", align: "right" },
            { key: "pendingDays", label: "Pending", align: "right" },
            { key: "balanceLeft", label: "Balance Left", align: "right" },
            { key: "asOfDate", label: "As Of" },
          ]}
          emptyText="No leave balances available."
          rows={balanceRows.map((item) => {
            const employee = item.employee as Record<string, unknown> | undefined;
            const department = employee?.department as Record<string, unknown> | undefined;
            const branch = employee?.branch as Record<string, unknown> | undefined;
            return {
              id: safeString(item.id),
              staffNumber: safeString(employee?.employee_number, "-"),
              employeeName: `${safeString(employee?.first_name)} ${safeString(employee?.last_name)}`.trim() || "-",
              branch: safeString(branch?.name, "-"),
              department: safeString(department?.name, "-"),
              leaveType: safeString(item.leave_type, "-"),
              openingDays: safeNumber(item.opening_balance).toFixed(2),
              accruedDays: safeNumber(item.accrued_days).toFixed(2),
              daysSpent: safeNumber(item.taken_days).toFixed(2),
              pendingDays: safeNumber(item.pending_days).toFixed(2),
              balanceLeft: safeNumber(item.balance_days).toFixed(2),
              asOfDate: formatDate(safeString(item.as_of_date)),
            };
          })}
        />
      </section>
    );
  }

  function renderPolicies() {
    const state = policiesState;
    if (state.loading) return <SectionMessage text="Loading leave policies..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    const policies = (state.data?.policies as Array<Record<string, unknown>> | undefined) ?? [];
    const leaveTypes = (state.data?.leaveTypes as Array<Record<string, unknown>> | undefined) ?? [];
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Leave Policies</p>
            <h3>Entitlements, accruals, and attachment rules</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Leave type catalogue</h4>
            <div className="mini-list queue-list">
              {leaveTypes.length ? leaveTypes.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.name)}</strong>
                  <span>{safeString(item.code)} | {safeString(item.gender_applicability)}</span>
                  <small>{item.requires_attachment ? "Requires attachment" : "No attachment"}</small>
                </article>
              )) : <SectionMessage text="No leave types found." />}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Create or update policy</h4>
            <div className="action-form">
              <label><span>Leave type</span><input value={policyForm.leaveType} onChange={(event) => setPolicyForm((current) => ({ ...current, leaveType: event.target.value }))} /></label>
              <label><span>Policy name</span><input value={policyForm.policyName} onChange={(event) => setPolicyForm((current) => ({ ...current, policyName: event.target.value }))} /></label>
              <label><span>Annual allowance</span><input value={policyForm.annualAllowance} onChange={(event) => setPolicyForm((current) => ({ ...current, annualAllowance: event.target.value }))} /></label>
              <label><span>Accrual frequency</span><input value={policyForm.accrualFrequency} onChange={(event) => setPolicyForm((current) => ({ ...current, accrualFrequency: event.target.value }))} /></label>
              <label><span>Monthly accrual</span><input value={policyForm.monthlyAccrualRate} onChange={(event) => setPolicyForm((current) => ({ ...current, monthlyAccrualRate: event.target.value }))} /></label>
              <label><span>Carry forward limit</span><input value={policyForm.carryForwardLimit} onChange={(event) => setPolicyForm((current) => ({ ...current, carryForwardLimit: event.target.value }))} /></label>
              <label><span>Notice period (days)</span><input value={policyForm.minimumNoticeDays} onChange={(event) => setPolicyForm((current) => ({ ...current, minimumNoticeDays: event.target.value }))} /></label>
              <label><span>Max consecutive days</span><input value={policyForm.maxConsecutiveDays} onChange={(event) => setPolicyForm((current) => ({ ...current, maxConsecutiveDays: event.target.value }))} /></label>
              <label><span>Request category</span><select value={policyForm.requestCategory} onChange={(event) => setPolicyForm((current) => ({ ...current, requestCategory: event.target.value }))}><option value="leave">Leave</option><option value="off_day">Off day</option></select></label>
              <label><span>Approval flow</span><select value={policyForm.approvalFlow} onChange={(event) => setPolicyForm((current) => ({ ...current, approvalFlow: event.target.value }))}><option value="supervisor_gm">Supervisor to GM</option><option value="supervisor_hr">Supervisor to HR/Admin</option><option value="supervisor_only">Supervisor only</option></select></label>
              <label><span>Reducing balance</span><select value={policyForm.reducingBalance ? "yes" : "no"} onChange={(event) => setPolicyForm((current) => ({ ...current, reducingBalance: event.target.value === "yes" }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label><span>Carry forward enabled</span><select value={policyForm.carryForwardEnabled ? "yes" : "no"} onChange={(event) => setPolicyForm((current) => ({ ...current, carryForwardEnabled: event.target.value === "yes" }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label><span>Attachment required</span><select value={policyForm.requiresAttachment ? "yes" : "no"} onChange={(event) => setPolicyForm((current) => ({ ...current, requiresAttachment: event.target.value === "yes" }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label><span>Payroll impact</span><select value={policyForm.payrollImpact ? "yes" : "no"} onChange={(event) => setPolicyForm((current) => ({ ...current, payrollImpact: event.target.value === "yes" }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
              <button className="primary-button" disabled={busyAction === "policy"} onClick={handlePolicySave} type="button">{busyAction === "policy" ? "Saving..." : "Save policy"}</button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Current policy rules</h4>
            <div className="mini-list queue-list">
              {policies.length ? policies.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.leave_type)}</strong>
                  <span>{safeString(item.policy_name)} | {safeString(item.request_category)} | {safeString(item.accrual_frequency)}</span>
                  <small>{safeNumber(item.annual_allowance)} days | Monthly accrual {safeNumber(item.monthly_accrual_rate)} | Balance {item.reducing_balance ? "Reducing" : "Separate tracking"} | Carry forward {safeString(item.carry_forward_enabled) === "true" || item.carry_forward_enabled ? "Yes" : "No"}</small>
                </article>
              )) : <SectionMessage text="No leave policies found." />}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderAttendanceDashboard() {
    const state = attendanceDashboardState;
    if (state.loading) return <SectionMessage text="Loading attendance dashboard..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Attendance dashboard is not available yet." />;
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Attendance Dashboard</p>
            <h3>Presence, lateness, overtime, and adjustment pressure</h3>
          </div>
        </div>
        <div className="metric-grid compact-grid">
          <article className="metric-card"><span>Present today</span><strong>{safeNumber(state.data.presentToday)}</strong><small>Checked-in records</small></article>
          <article className="metric-card"><span>Absent today</span><strong>{safeNumber(state.data.absentToday)}</strong><small>Requires review</small></article>
          <article className="metric-card"><span>Late today</span><strong>{safeNumber(state.data.lateToday)}</strong><small>Minutes beyond grace period</small></article>
          <article className="metric-card"><span>Overtime this week</span><strong>{safeNumber(state.data.overtimeThisWeek).toFixed(2)} hrs</strong><small>Pending payroll linkage</small></article>
        </div>
      </section>
    );
  }

  function renderDailyAttendance() {
    const state = attendanceState;
    if (state.loading) return <SectionMessage text="Loading daily attendance..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Daily Attendance</p>
            <h3>Clocking, overtime, and correction requests</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Attendance adjustments</h4>
            <div className="action-form">
              <label><span>Work date</span><input type="date" value={adjustmentForm.workDate} onChange={(event) => setAdjustmentForm((current) => ({ ...current, workDate: event.target.value }))} /></label>
              <label><span>Requested clock in</span><input value={adjustmentForm.requestedClockIn} onChange={(event) => setAdjustmentForm((current) => ({ ...current, requestedClockIn: event.target.value }))} /></label>
              <label><span>Requested clock out</span><input value={adjustmentForm.requestedClockOut} onChange={(event) => setAdjustmentForm((current) => ({ ...current, requestedClockOut: event.target.value }))} /></label>
              <label><span>Reason</span><input value={adjustmentForm.reason} onChange={(event) => setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))} /></label>
              <button className="primary-button" disabled={busyAction === "adjustment"} onClick={handleAdjustmentSubmit} type="button">{busyAction === "adjustment" ? "Submitting..." : "Submit adjustment"}</button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Recent attendance</h4>
            <div className="mini-list queue-list">
              {state.data?.length ? state.data.slice(0, 12).map((item) => {
                const employee = item.employee as Record<string, unknown> | undefined;
                return (
                  <article key={safeString(item.id)}>
                    <strong>{safeString(employee?.employee_number)} {safeString(employee?.first_name)} {safeString(employee?.last_name)}</strong>
                    <span>{formatDate(safeString(item.work_date))} | {safeString(item.status)}</span>
                    <small>Late {safeNumber(item.minutes_late)} min | Overtime {safeNumber(item.overtime_hours).toFixed(2)} hrs</small>
                  </article>
                );
              }) : <SectionMessage text="No attendance records found." />}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Pending adjustments</h4>
            <div className="mini-list queue-list">
              {adjustmentsState.data?.length ? adjustmentsState.data.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{formatDate(safeString(item.work_date))}</strong>
                  <span>{safeString(item.status)}</span>
                  <small>{safeString(item.reason)}</small>
                </article>
              )) : <SectionMessage text="No adjustment requests yet." />}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderTimesheets() {
    const state = timesheetsState;
    if (state.loading) return <SectionMessage text="Loading timesheets..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Timesheets</p>
            <h3>Weekly submissions and manager review flow</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Submit timesheet</h4>
            <div className="action-form">
              <label><span>Week start</span><input type="date" value={timesheetForm.weekStart} onChange={(event) => setTimesheetForm((current) => ({ ...current, weekStart: event.target.value }))} /></label>
              <label><span>Total hours</span><input value={timesheetForm.totalHours} onChange={(event) => setTimesheetForm((current) => ({ ...current, totalHours: event.target.value }))} /></label>
              <label><span>Notes</span><input value={timesheetForm.notes} onChange={(event) => setTimesheetForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <button className="primary-button" disabled={busyAction === "timesheet"} onClick={handleTimesheetSubmit} type="button">{busyAction === "timesheet" ? "Submitting..." : "Submit timesheet"}</button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Timesheet history</h4>
            <div className="mini-list queue-list">
              {state.data?.length ? state.data.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{formatDate(safeString(item.week_start))} - {formatDate(safeString(item.week_end))}</strong>
                  <span>{safeString(item.status)} | {safeNumber(item.total_hours)} hrs</span>
                  <small>{safeString(item.notes)}</small>
                </article>
              )) : <SectionMessage text="No timesheets found." />}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderShifts() {
    const state = shiftsState;
    if (state.loading) return <SectionMessage text="Loading shifts..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    const shifts = (state.data?.shifts as Array<Record<string, unknown>> | undefined) ?? [];
    const assignments = (state.data?.assignments as Array<Record<string, unknown>> | undefined) ?? [];
    const rosterSummary = (state.data?.rosterSummary as Record<string, number> | undefined) ?? {};
    const rosterEmployees = (state.data?.rosterEmployees as Array<Record<string, unknown>> | undefined) ?? [];
    const uploadHistory = (state.data?.uploadHistory as Array<Record<string, unknown>> | undefined) ?? [];
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Shift Scheduling</p>
            <h3>Robot Cafe roster template, upload, and current assignments</h3>
          </div>
          <div className="inline-actions">
            <button
              className="primary-button"
              disabled={busyAction === "roster-upload" || busyAction === "roster-validate"}
              onClick={() => setShowRosterUpload(true)}
              type="button"
            >
              Upload Populated Roster
            </button>
            <button
              className="secondary-button"
              disabled={busyAction === "roster-template"}
              onClick={handleRosterTemplateDownload}
              type="button"
            >
              {busyAction === "roster-template" ? "Preparing..." : "Download Roster Template"}
            </button>
            <button
              className="neutral-button"
              onClick={() => setShowManualRoster((current) => !current)}
              type="button"
            >
              Create Manual Roster
            </button>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Roster workflow</h4>
            <div className="action-form">
              <label>
                <span>Roster period</span>
                <select
                  value={rosterForm.periodType}
                  onChange={(event) => setRosterForm((current) => ({ ...current, periodType: event.target.value }))}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label>
                <span>Period start</span>
                <input
                  type="date"
                  value={rosterForm.startDate}
                  onChange={(event) => setRosterForm((current) => ({ ...current, startDate: event.target.value }))}
                />
              </label>
            </div>
            <p className="section-description" style={{ marginTop: 12 }}>
              Use only AM, SWING, PM, OFF, or LEAVE in each date cell. The template is scoped to your active team.
            </p>
            {showRosterUpload ? (
              <div className="upload-panel" style={{ marginTop: 16 }}>
                <label className="upload-dropzone">
                  <input
                    accept=".xlsx,.xls"
                    onChange={(event) => {
                      setRosterFile(event.target.files?.[0] ?? null);
                      setRosterValidation(null);
                    }}
                    type="file"
                  />
                  <strong>{rosterFile ? rosterFile.name : "Choose completed roster workbook"}</strong>
                  <span>{rosterFile ? `${Math.max(1, Math.round(rosterFile.size / 1024))} KB selected` : "Drag, drop, or browse for an .xlsx or .xls file."}</span>
                </label>
                <div className="inline-actions">
                  <button
                    className="secondary-button"
                    disabled={busyAction === "roster-validate" || !rosterFile}
                    onClick={() => void handleRosterValidate()}
                    type="button"
                  >
                    {busyAction === "roster-validate" ? "Validating..." : "Validate roster"}
                  </button>
                  <button
                    className="primary-button"
                    disabled={busyAction === "roster-upload" || !rosterFile || !rosterValidation || rosterValidation.errors.length > 0}
                    onClick={() => void handleRosterUpload()}
                    type="button"
                  >
                    {busyAction === "roster-upload" ? "Uploading..." : "Upload and save"}
                  </button>
                  <button className="neutral-button" onClick={handleRosterCancel} type="button">
                    Cancel
                  </button>
                </div>
                {rosterValidation ? (
                  <div className="mini-list queue-list" style={{ marginTop: 12 }}>
                    <article>
                      <strong>{rosterValidation.rowCount}</strong>
                      <span>Roster entries parsed</span>
                      <small>
                        {formatDate(rosterValidation.periodStart)} - {formatDate(rosterValidation.periodEnd)}
                      </small>
                    </article>
                    <article>
                      <strong>{rosterValidation.errors.length}</strong>
                      <span>Validation issues</span>
                      <small>{rosterValidation.warnings.length} warning(s)</small>
                    </article>
                    {rosterValidation.previewRows.slice(0, 5).map((item) => (
                      <article key={`${item.staffNumber}-${item.date}`}>
                        <strong>{item.staffNumber} {item.employeeName}</strong>
                        <span>{formatDate(item.date)} | {item.shiftCode}</span>
                        <small>{item.shiftLabel}</small>
                      </article>
                    ))}
                    {rosterValidation.errors.slice(0, 6).map((item, index) => (
                      <article key={`error-${index}`}>
                        <strong>Row {item.rowNumber} {item.staffNumber}</strong>
                        <span>{item.date ? formatDate(item.date) : "Workbook structure"}</span>
                        <small>{item.message}</small>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {showManualRoster ? (
              <div className="action-form" style={{ marginTop: 16 }}>
                <label>
                  <span>Team member</span>
                  <select
                    value={manualRosterForm.employeeId}
                    onChange={(event) => setManualRosterForm((current) => ({ ...current, employeeId: event.target.value }))}
                  >
                    {rosterEmployees.map((item) => (
                      <option key={safeString(item.employeeId)} value={safeString(item.employeeId)}>
                        {safeString(item.staffNumber)} {safeString(item.employeeName)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={manualRosterForm.assignmentDate}
                    onChange={(event) => setManualRosterForm((current) => ({ ...current, assignmentDate: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Shift</span>
                  <select
                    value={manualRosterForm.shiftCode}
                    onChange={(event) => setManualRosterForm((current) => ({ ...current, shiftCode: event.target.value }))}
                  >
                    <option value="AM">AM Shift</option>
                    <option value="SWING">Swing Shift</option>
                    <option value="PM">PM Shift</option>
                    <option value="OFF">OFF</option>
                    <option value="LEAVE">LEAVE</option>
                  </select>
                </label>
                <div className="inline-actions">
                  <button
                    className="primary-button"
                    disabled={busyAction === "manual-roster"}
                    onClick={() => void handleManualRosterSubmit()}
                    type="button"
                  >
                    {busyAction === "manual-roster" ? "Saving..." : "Save manual roster"}
                  </button>
                  <button className="neutral-button" onClick={() => setShowManualRoster(false)} type="button">
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </section>
          <section className="mini-panel">
            <h4>Shift catalogue</h4>
            <div className="mini-list queue-list">
              {shifts.length ? shifts.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.name)}</strong>
                  <span>{safeString(item.code)} | {formatShiftTime(safeString(item.start_time))} - {formatShiftTime(safeString(item.end_time))}</span>
                  <small>Break {safeNumber(item.break_minutes)} min</small>
                </article>
              )) : <SectionMessage text="No shifts configured." />}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Roster coverage</h4>
            <div className="mini-list queue-list">
              <article>
                <strong>{rosterEmployees.length}</strong>
                <span>Scoped roster employees</span>
              </article>
              <article>
                <strong>{rosterSummary.AM ?? 0}</strong>
                <span>AM allocations</span>
              </article>
              <article>
                <strong>{rosterSummary.SWING ?? 0}</strong>
                <span>Swing allocations</span>
              </article>
              <article>
                <strong>{rosterSummary.PM ?? 0}</strong>
                <span>PM allocations</span>
              </article>
              <article>
                <strong>{(rosterSummary.OFF ?? 0) + (rosterSummary.LEAVE ?? 0)}</strong>
                <span>OFF and LEAVE markers</span>
              </article>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Upload history</h4>
            <div className="mini-list queue-list">
              {uploadHistory.length ? uploadHistory.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{formatDate(safeString(item.periodStart))} - {formatDate(safeString(item.periodEnd))}</strong>
                  <span>{safeNumber(item.assignmentsSaved)} assignments saved</span>
                  <small>{safeString(item.actorEmail)} | {formatDate(safeString(item.createdAt))}</small>
                </article>
              )) : <SectionMessage text="No roster uploads have been recorded yet." />}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Assignments</h4>
            <div className="mini-list queue-list">
              {assignments.length ? assignments.map((item) => {
                const employee = item.employee as Record<string, unknown> | undefined;
                const shift = item.shift as Record<string, unknown> | undefined;
                return (
                  <article key={safeString(item.id)}>
                    <strong>{safeString(employee?.employee_number)} {safeString(employee?.first_name)} {safeString(employee?.last_name)}</strong>
                    <span>{safeString(shift?.code)} | {formatDate(safeString(item.effective_from))}</span>
                    <small>{safeString(shift?.name)} | {formatShiftTime(safeString(shift?.start_time))} - {formatShiftTime(safeString(shift?.end_time))}</small>
                  </article>
                );
              }) : <SectionMessage text="No shift assignments found." />}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Template team list</h4>
            <div className="mini-list queue-list">
              {rosterEmployees.length ? rosterEmployees.map((item) => (
                <article key={safeString(item.employeeId)}>
                  <strong>{safeString(item.staffNumber)} {safeString(item.employeeName)}</strong>
                  <span>{safeString(item.department)}</span>
                  <small>Available for supervisor roster scheduling</small>
                </article>
              )) : <SectionMessage text="No team members are available for roster scheduling." />}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderOvertime() {
    const state = overtimeState;
    if (state.loading) return <SectionMessage text="Loading overtime..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Overtime</p>
            <h3>Request, approve, and prepare overtime for payroll</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Create overtime request</h4>
            <div className="action-form">
              <label><span>Work date</span><input type="date" value={overtimeForm.workDate} onChange={(event) => setOvertimeForm((current) => ({ ...current, workDate: event.target.value }))} /></label>
              <label><span>Hours</span><input value={overtimeForm.hours} onChange={(event) => setOvertimeForm((current) => ({ ...current, hours: event.target.value }))} /></label>
              <label><span>Reason</span><input value={overtimeForm.reason} onChange={(event) => setOvertimeForm((current) => ({ ...current, reason: event.target.value }))} /></label>
              <button className="primary-button" disabled={busyAction === "overtime"} onClick={handleOvertimeSubmit} type="button">{busyAction === "overtime" ? "Submitting..." : "Submit overtime"}</button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Overtime history</h4>
            <div className="mini-list queue-list">
              {state.data?.length ? state.data.map((item) => {
                const employee = item.employee as Record<string, unknown> | undefined;
                return (
                  <article key={safeString(item.id)}>
                    <strong>{safeString(employee?.first_name)} {safeString(employee?.last_name)}</strong>
                    <span>{formatDate(safeString(item.work_date))} | {safeNumber(item.hours).toFixed(2)} hrs</span>
                    <small>{safeString(item.status)} | {safeString(item.reason)}</small>
                  </article>
                );
              }) : <SectionMessage text="No overtime requests found." />}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderLateness() {
    const state = latenessState;
    if (state.loading) return <SectionMessage text="Loading lateness and absenteeism..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    const lateness = (state.data?.lateness as Array<Record<string, unknown>> | undefined) ?? [];
    const absence = (state.data?.absence as Array<Record<string, unknown>> | undefined) ?? [];
    const exceptions = (state.data?.exceptions as Array<Record<string, unknown>> | undefined) ?? [];
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Late Coming & Absenteeism</p>
            <h3>Exceptions, follow-up items, and payroll-relevant patterns</h3>
          </div>
        </div>
        <div className="metric-grid compact-grid">
          <article className="metric-card"><span>Late records</span><strong>{lateness.length}</strong><small>Active lateness items</small></article>
          <article className="metric-card"><span>Absence records</span><strong>{absence.length}</strong><small>Requires review</small></article>
          <article className="metric-card"><span>Open exceptions</span><strong>{safeNumber((state.data?.summary as Record<string, unknown> | undefined)?.openExceptions)}</strong><small>Needs action</small></article>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Lateness trend</h4>
            <div className="mini-list queue-list">
              {lateness.slice(0, 8).map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{formatDate(safeString(item.work_date))}</strong>
                  <span>{safeNumber(item.minutes_late)} late minutes</span>
                  <small>{safeString(item.status)}</small>
                </article>
              ))}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Absenteeism</h4>
            <div className="mini-list queue-list">
              {absence.slice(0, 8).map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{formatDate(safeString(item.work_date))}</strong>
                  <span>{safeString(item.absence_type)}</span>
                  <small>{safeString(item.status)}</small>
                </article>
              ))}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Attendance exceptions</h4>
            <div className="mini-list queue-list">
              {exceptions.slice(0, 8).map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.exception_type)}</strong>
                  <span>{formatDate(safeString(item.work_date))} | {safeString(item.severity)}</span>
                  <small>{item.payroll_relevant ? "Payroll relevant" : "Operational only"}</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderHolidays() {
    const state = holidaysState;
    if (state.loading) return <SectionMessage text="Loading holidays..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Holidays</p>
            <h3>Public holidays and company-wide non-working days</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Create holiday</h4>
            <div className="action-form">
              <label><span>Name</span><input value={holidayForm.name} onChange={(event) => setHolidayForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label><span>Date</span><input type="date" value={holidayForm.holidayDate} onChange={(event) => setHolidayForm((current) => ({ ...current, holidayDate: event.target.value }))} /></label>
              <label><span>Scope</span><input value={holidayForm.scope} onChange={(event) => setHolidayForm((current) => ({ ...current, scope: event.target.value }))} /></label>
              <button className="primary-button" disabled={busyAction === "holiday"} onClick={handleHolidaySave} type="button">{busyAction === "holiday" ? "Saving..." : "Save holiday"}</button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Holiday list</h4>
            <div className="mini-list queue-list">
              {state.data?.length ? state.data.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.name)}</strong>
                  <span>{formatDate(safeString(item.holiday_date))}</span>
                  <small>{safeString(item.scope)}</small>
                </article>
              )) : <SectionMessage text="No holidays configured." />}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderWeekendRules() {
    const state = weekendRulesState;
    if (state.loading) return <SectionMessage text="Loading weekend rules..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Weekend Rules</p>
            <h3>Working day patterns that affect leave and attendance</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Create weekend rule</h4>
            <div className="action-form">
              <label><span>Name</span><input value={weekendRuleForm.name} onChange={(event) => setWeekendRuleForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label><span>Working days</span><input value={weekendRuleForm.workingDays} onChange={(event) => setWeekendRuleForm((current) => ({ ...current, workingDays: event.target.value }))} /></label>
              <label><span>Half days</span><input value={weekendRuleForm.halfDays} onChange={(event) => setWeekendRuleForm((current) => ({ ...current, halfDays: event.target.value }))} /></label>
              <button className="primary-button" disabled={busyAction === "weekend-rule"} onClick={handleWeekendRuleSave} type="button">{busyAction === "weekend-rule" ? "Saving..." : "Save weekend rule"}</button>
            </div>
          </section>
          <section className="mini-panel">
            <h4>Weekend rules</h4>
            <div className="mini-list queue-list">
              {state.data?.length ? state.data.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.name)}</strong>
                  <span>{safeString(item.status)}</span>
                  <small>From {formatDate(safeString(item.effective_from))}</small>
                </article>
              )) : <SectionMessage text="No weekend rules configured." />}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderDevices() {
    const state = devicesState;
    if (state.loading) return <SectionMessage text="Loading attendance devices..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    const devices = (state.data?.devices as Array<Record<string, unknown>> | undefined) ?? [];
    const logs = (state.data?.logs as Array<Record<string, unknown>> | undefined) ?? [];
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Biometric / Device Integrations</p>
            <h3>Device list, sync status, and import readiness</h3>
          </div>
        </div>
        <div className="workbench-grid">
          <section className="mini-panel">
            <h4>Devices</h4>
            <div className="mini-list queue-list">
              {devices.length ? devices.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.device_name)}</strong>
                  <span>{safeString(item.device_code)} | {safeString(item.device_type)}</span>
                  <small>{safeString(item.status)} | Last sync {formatDate(safeString(item.last_sync_at))}</small>
                </article>
              )) : <SectionMessage text="No attendance devices configured." />}
            </div>
          </section>
          <section className="mini-panel">
            <h4>Sync logs</h4>
            <div className="mini-list queue-list">
              {logs.length ? logs.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.status)}</strong>
                  <span>{safeNumber(item.records_synced)} records</span>
                  <small>{safeString(item.message)}</small>
                </article>
              )) : <SectionMessage text="No sync logs yet." />}
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderApprovalQueue() {
    const state = approvalState;
    if (state.loading) return <SectionMessage text="Loading approvals inbox..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    const pendingTasks = (state.data ?? []).filter((item) => safeString(item.status).toLowerCase() === "pending");
    const historyTasks = (state.data ?? [])
      .filter((item) => safeString(item.status).toLowerCase() !== "pending")
      .slice()
      .sort((left, right) => {
        const leftTime = new Date(safeString(left.updatedAt, safeString(left.submittedDate, safeString(left.due)))).getTime();
        const rightTime = new Date(safeString(right.updatedAt, safeString(right.submittedDate, safeString(right.due)))).getTime();
        return rightTime - leftTime;
      });
    const visibleTasks = approvalListView === "pending" ? pendingTasks : historyTasks;
    const dueToday = pendingTasks.filter((item) => {
      const due = safeString(item.due);
      return due && due !== "-" && due.slice(0, 10) === new Date().toISOString().slice(0, 10);
    }).length;
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Approvals Inbox</p>
            <h3>One place for leave, payroll, performance, and workforce approvals</h3>
          </div>
          <div className="inline-actions">
            <button
              className={approvalListView === "pending" ? "primary-button" : "ghost-button"}
              onClick={() => setApprovalListView("pending")}
              type="button"
            >
              Pending
            </button>
            <button
              className={approvalListView === "history" ? "primary-button" : "ghost-button"}
              onClick={() => setApprovalListView("history")}
              type="button"
            >
              History
            </button>
            {approvalListView === "history" ? (
              <>
                <button className="ghost-button" onClick={() => exportApprovalHistory("xlsx")} type="button">
                  Export Excel
                </button>
                <button className="ghost-button" onClick={() => exportApprovalHistory("csv")} type="button">
                  Export CSV
                </button>
              </>
            ) : null}
          </div>
        </div>
        {historyTransfer?.scope === "approvals" ? (
          <div className="history-transfer-banner" role="status">
            <div className="history-transfer-icon" aria-hidden="true">
              <span className="history-transfer-arrow" />
              <span className="history-transfer-bucket" />
            </div>
            <div>
              <strong>{historyTransfer.title}</strong>
              <small>{historyTransfer.detail}</small>
            </div>
          </div>
        ) : null}
        <div className="metric-grid compact-grid">
          <article className="metric-card"><span>Total pending</span><strong>{pendingTasks.length}</strong><small>Assigned to you</small></article>
          <article className="metric-card"><span>Due today</span><strong>{dueToday}</strong><small>Need quick action</small></article>
          <article className="metric-card"><span>Overdue</span><strong>{pendingTasks.filter((item) => safeString(item.due) && safeString(item.due) !== "-").length - dueToday}</strong><small>Review carefully</small></article>
          <article className="metric-card"><span>By type</span><strong>{new Set((state.data ?? []).map((item) => safeString(item.kind))).size}</strong><small>Request categories</small></article>
        </div>
        {visibleTasks.length ? (
          approvalListView === "history" ? (
            <ScheduleTable
              columns={[
                { key: "request", label: "Request" },
                { key: "employee", label: "Employee" },
                { key: "type", label: "Type" },
                { key: "status", label: "Status" },
                { key: "stage", label: "Stage" },
                { key: "days", label: "Days", align: "right" },
                { key: "balance", label: "Balance After", align: "right" },
                { key: "notes", label: "Notes" },
              ]}
              emptyText="No approval history is available yet."
              rows={visibleTasks.map((item) => ({
                id: safeString(item.id),
                request: safeString(item.title),
                employee: safeString(item.employee),
                type: safeString(item.requestType, safeString(item.kind)),
                status: safeString(item.status),
                stage: safeString(item.stage),
                days: safeString(item.kind) === "leave_request" ? safeNumber(item.requestedDays).toFixed(1) : "-",
                balance: safeString(item.kind) === "leave_request" ? safeNumber(item.balanceAfterApproval).toFixed(1) : "-",
                notes: safeString(item.latestComment, safeString(item.description, "-")),
              }))}
            />
          ) : (
            <div className="mini-list queue-list">
              {visibleTasks.map((item) => (
                <article key={safeString(item.id)}>
                  <strong>{safeString(item.title)}</strong>
                  <span>{safeString(item.requestType, safeString(item.kind))} | {safeString(item.ownerRole)} | {safeString(item.status)}</span>
                  <small>
                    {safeString(item.kind) === "staff_complaint" ? "Raised by" : "Launched by"} {safeString(item.employee, safeString(item.requestedBy, "Unknown"))} |{" "}
                    {formatDate(safeString(item.submittedDate, safeString(item.updatedAt, safeString(item.due))))}
                  </small>
                  <small>{safeString(item.description)} | Pending action: {safeString(item.stage)}</small>
                  {safeString(item.kind) === "leave_request" ? (
                    <>
                      <small>
                        Leave balance {safeNumber(item.leaveBalance).toFixed(1)} | Accrued {safeNumber(item.accruedLeave).toFixed(1)} |
                        Taken {safeNumber(item.takenLeave).toFixed(1)} | Pending {safeNumber(item.pendingLeave).toFixed(1)}
                      </small>
                      <small>
                        Requested {safeNumber(item.requestedDays).toFixed(1)} day(s) | Balance after approval {safeNumber(item.balanceAfterApproval).toFixed(1)}
                      </small>
                      {safeString(item.latestComment) ? <small>Latest note: {safeString(item.latestComment)}</small> : null}
                    </>
                  ) : null}
                  {safeString(item.status) === "pending" ? (
                    <div className="inline-actions">
                      <button className="primary-button" disabled={busyAction === `approve-${safeString(item.id)}`} onClick={() => void handleApproval(item, "approve")} type="button">Approve</button>
                      <button className="ghost-button" disabled={busyAction === `reject-${safeString(item.id)}`} onClick={() => void handleApproval(item, "reject")} type="button">Reject</button>
                      {safeString(item.kind) === "leave_request" ? (
                        <>
                          <button className="ghost-button" disabled={busyAction === `reduce-${safeString(item.id)}`} onClick={() => void handleApproval(item, "reduce")} type="button">Reduce days</button>
                          <button className="ghost-button" disabled={busyAction === `request_clarification-${safeString(item.id)}`} onClick={() => void handleApproval(item, "request_clarification")} type="button">Request clarification</button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {safeString(item.kind) === "leave_request" &&
                  safeString(item.leaveStatus, safeString(item.status)).toLowerCase() === "approved" ? (
                    <div className="inline-actions">
                      <button className="ghost-button" disabled={busyAction === `cancel-${safeString(item.id)}`} onClick={() => void handleApproval(item, "cancel")} type="button">Cancel approved leave</button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )
        ) : <SectionMessage text={approvalListView === "pending" ? "No pending approvals are waiting for you." : "No approval history is available yet."} />}
      </section>
    );
  }

  function renderReports() {
    const state = reportsState;
    if (state.loading) return <SectionMessage text="Loading reports..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    const reports = (state.data?.reports as Record<string, unknown> | undefined) ?? {};
    const payrollLinkage = (state.data?.payrollLinkage as Array<Record<string, unknown>> | undefined) ?? [];
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Reports</p>
            <h3>Operational reports and payroll-ready attendance outputs</h3>
          </div>
        </div>
        <div className="metric-grid compact-grid">
          <article className="metric-card"><span>Leave summary</span><strong>{safeNumber(reports.leaveSummary)}</strong><small>Total requests</small></article>
          <article className="metric-card"><span>Attendance summary</span><strong>{safeNumber(reports.attendanceSummary)}</strong><small>Tracked attendance rows</small></article>
          <article className="metric-card"><span>Overtime hours</span><strong>{safeNumber(reports.overtimeHours).toFixed(2)}</strong><small>Approved and pending mix</small></article>
          <article className="metric-card"><span>Late count</span><strong>{safeNumber(reports.latenessCount)}</strong><small>Period issue count</small></article>
        </div>
        <section className="mini-panel">
          <h4>Payroll linkage output</h4>
          <div className="mini-list queue-list">
            {payrollLinkage.length ? payrollLinkage.slice(0, 10).map((item, index) => (
              <article key={`${safeString(item.employeeName)}-${index}`}>
                <strong>{safeString(item.employeeName)}</strong>
                <span>Unpaid leave {safeNumber(item.unpaidLeaveDays)} | OT {safeNumber(item.approvedOvertimeHours).toFixed(2)} hrs</span>
                <small>Late {safeNumber(item.lateMinutes)} min | Absence {safeNumber(item.absenceDays)} | Exceptions {safeNumber(item.payrollExceptions)}</small>
              </article>
            )) : <SectionMessage text="No payroll linkage rows available yet." />}
          </div>
        </section>
      </section>
    );
  }

  function renderSettings() {
    const state = settingsState;
    if (state.loading) return <SectionMessage text="Loading module settings..." />;
    if (state.error) return <SectionMessage text={state.error} />;
    if (!state.data) return <SectionMessage text="Settings are not available yet." />;
    return (
      <section className="surface-card action-workbench">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Settings</p>
            <h3>Leave and attendance setup snapshot</h3>
          </div>
        </div>
        <div className="metric-grid compact-grid">
          <article className="metric-card"><span>Leave types</span><strong>{safeNumber(state.data.leaveTypes)}</strong><small>Configured types</small></article>
          <article className="metric-card"><span>Policies</span><strong>{safeNumber(state.data.policies)}</strong><small>Entitlement rules</small></article>
          <article className="metric-card"><span>Weekend rules</span><strong>{safeNumber(state.data.weekendRules)}</strong><small>Working day logic</small></article>
          <article className="metric-card"><span>Devices</span><strong>{safeNumber(state.data.devices)}</strong><small>Attendance device footprint</small></article>
        </div>
      </section>
    );
  }

  const content = (() => {
    if (activeItem === "Leave Dashboard") return renderLeaveDashboard();
    if (activeItem === "Leave Requests") return renderLeaveRequests();
    if (activeItem === "Leave Calendar") return renderCalendar();
    if (activeItem === "Leave Balances") return renderBalances();
    if (activeItem === "Leave Policies") return renderPolicies();
    if (activeItem === "Attendance Dashboard") return renderAttendanceDashboard();
    if (activeItem === "Daily Attendance") return renderDailyAttendance();
    if (activeItem === "Timesheets") return renderTimesheets();
    if (activeItem === "Shift Scheduling") return renderShifts();
    if (activeItem === "Overtime") return renderOvertime();
    if (activeItem === "Late Coming & Absenteeism") return renderLateness();
    if (activeItem === "Holidays") return renderHolidays();
    if (activeItem === "Weekend Rules") return renderWeekendRules();
    if (activeItem === "Biometric / Device Integrations") return renderDevices();
    if (activeItem === "Approvals Inbox" || activeItem === "Approval Queue") return renderApprovalQueue();
    if (activeItem === "Reports") return renderReports();
    if (activeItem === "Settings") return renderSettings();

    return <EmptyState title={activeItem} text="This Leave & Attendance workspace is being prepared." />;
  })();

  return (
    <>
      {actionMessage ? <div className="task-banner">{actionMessage}</div> : null}
      {content}
    </>
  );
}
