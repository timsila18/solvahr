"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { workflowRoutes } from "@/lib/workflow-routes";

type LookupRecord = {
  id: string;
  name?: string | null;
  title?: string | null;
  code?: string | null;
};

type EmployeeProfilePayload = {
  employee: {
    id: string;
    fullName: string;
    companyEmail: string;
    phoneNumber: string;
    employmentType: string;
    branchId?: string | null;
    supervisorEmployeeId?: string | null;
    currentGrossPay?: number;
  };
};

type EmployeeListPayload = {
  employees: Array<{
    id: string;
    employeeNumber: string;
    fullName: string;
    department: string;
    branch: string;
    employmentType: string;
    status: string;
    userAccount?: {
      role?: string;
    };
  }>;
};

type EmployeeDocumentsPayload = {
  documents: Array<{
    id: string;
    category: string;
    documentType: string;
    fileName: string;
    uploadedAt: string;
    issueDate: string;
    versionNumber: number;
  }>;
};

type EmployeeDocumentDownloadPayload = {
  document: {
    signedUrl: string;
  };
};

type EmployeeHrDocumentResultPayload = {
  pendingApproval: boolean;
  task?: {
    title?: string;
  };
  document?: {
    fileName: string;
  };
};

type EmployeeRecordUpdatePayload = {
  employee: {
    id: string;
  };
  pendingApproval?: boolean;
  request?: {
    title?: string;
    message?: string;
  };
};

type HrDocumentKind =
  | "contract"
  | "appointment_letter"
  | "salary_review"
  | "commendation_letter"
  | "recommendation_letter"
  | "warning_letter"
  | "show_cause"
  | "suspension_letter"
  | "dismissal_letter"
  | "summary_dismissal_letter";

type PerformanceWorkspacePayload = {
  workspace: {
    workflowMode?: string;
    employees: Array<{
      id: string;
      label: string;
      department?: string;
      branch?: string;
    }>;
  };
};

type WorkflowAssistPayload = {
  reason?: string;
  comments?: string;
  facts?: string;
  desiredAction?: string;
  attachmentNote?: string;
  roleDutyOverrides?: string[];
  issues?: string[];
  summary?: string;
  model?: string;
};

const DEFAULT_LEAVE_START = new Date().toISOString().slice(0, 10);
const DEFAULT_LEAVE_END = new Date(new Date(DEFAULT_LEAVE_START).getTime() + 2 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

function readJson<T>(input: string, init?: RequestInit) {
  return fetch(input, {
    cache: "no-store",
    ...init,
  }).then(async (response) => {
    const payload = (await response.json().catch(() => ({ error: "request_failed" }))) as T & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "request_failed");
    }

    return payload;
  });
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="workflow-section-card">
      <div className="workflow-section-card__header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="workflow-form-grid">{children}</div>
    </section>
  );
}

function FormActions({
  pending,
  submitLabel,
  pendingLabel,
  cancelHref,
}: {
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
}) {
  return (
    <div className="workflow-actions">
      <Link className="ghost-button workflow-link-button" href={cancelHref}>
        Cancel
      </Link>
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}

function StatusBanner({
  error,
  success,
}: {
  error: string;
  success: string;
}) {
  if (!error && !success) {
    return null;
  }

  return <div className={`workflow-banner ${error ? "workflow-banner--error" : "workflow-banner--success"}`}>{error || success}</div>;
}

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" ") || "Employee",
  };
}

function humanizeDocumentKind(value: HrDocumentKind) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseRoleDutyOverrides(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatWorkflowAssistMessage(payload: WorkflowAssistPayload, fallback: string) {
  const summary = payload.summary || fallback;
  const issues = Array.isArray(payload.issues) ? payload.issues.filter(Boolean) : [];
  if (!issues.length) {
    return summary;
  }
  return `${summary} Watch-outs: ${issues.slice(0, 3).join(" | ")}`;
}

export function EmployeeCreateForm() {
  const router = useRouter();
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [branches, setBranches] = useState<LookupRecord[]>([]);
  const [departments, setDepartments] = useState<LookupRecord[]>([]);
  const [designations, setDesignations] = useState<LookupRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeListPayload["employees"]>([]);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    branchId: "",
    departmentId: "",
    designationId: "",
    supervisorEmployeeId: "",
    employmentType: "Contract",
    salary: "",
    hireDate: new Date().toISOString().slice(0, 10),
    probationMonths: "3",
    contractDurationMonths: "12",
    kraPin: "",
    shifNumber: "",
    nssfNumber: "",
  });

  useEffect(() => {
    let active = true;

    async function loadLookups() {
      setLookupsLoading(true);
      setError("");
      try {
        const [branchPayload, departmentPayload, designationPayload, employeePayload] = await Promise.all([
          readJson<{ records: LookupRecord[] }>("/api/lookups/branches"),
          readJson<{ records: LookupRecord[] }>("/api/lookups/departments"),
          readJson<{ records: LookupRecord[] }>("/api/lookups/designations"),
          readJson<EmployeeListPayload>("/api/people/employees"),
        ]);

        if (!active) {
          return;
        }

        setBranches(branchPayload.records ?? []);
        setDepartments(departmentPayload.records ?? []);
        setDesignations(designationPayload.records ?? []);
        setEmployees(employeePayload.employees ?? []);
        setForm((current) => ({
          ...current,
          branchId: current.branchId || branchPayload.records?.[0]?.id || "",
          departmentId: current.departmentId || departmentPayload.records?.[0]?.id || "",
          designationId: current.designationId || designationPayload.records?.[0]?.id || "",
        }));
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load employee setup data.");
        }
      } finally {
        if (active) {
          setLookupsLoading(false);
        }
      }
    }

    void loadLookups();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    try {
      await readJson("/api/people/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          branchId: form.branchId || null,
          departmentId: form.departmentId || null,
          designationId: form.designationId || null,
          supervisorEmployeeId: form.supervisorEmployeeId || null,
          employmentType: form.employmentType,
          salary: Number(form.salary || 0),
          hireDate: form.hireDate,
          probationMonths: Number(form.probationMonths || 3),
          contractDurationMonths: Number(form.contractDurationMonths || 12),
          kraPin: form.kraPin,
          shifNumber: form.shifNumber,
          nssfNumber: form.nssfNumber,
        }),
      });

      setSuccess("Employee submission saved and onboarding documents queued. Returning to the directory...");
      window.setTimeout(() => {
        router.push(workflowRoutes.peopleWorkspace);
        router.refresh();
      }, 450);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create the employee record.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="workflow-form" onSubmit={handleSubmit}>
      <StatusBanner error={error} success={success} />

      <SectionCard
        description="Capture the employee basics first. Saving from this flow generates the Robot Cafe contract and appointment letter automatically."
        title="Employee Basics"
      >
        <label>
          <span>Full name</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            required
            value={form.fullName}
          />
        </label>

        <label>
          <span>Phone number</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder="07XXXXXXXX"
            required
            value={form.phone}
          />
        </label>

        <label>
          <span>Employment type</span>
          <select
            onChange={(event) => setForm((current) => ({ ...current, employmentType: event.target.value }))}
            value={form.employmentType}
          >
            <option>Contract</option>
            <option>Permanent</option>
            <option>Probation</option>
            <option>Casual</option>
            <option>Internship</option>
            <option>Consultancy</option>
          </select>
        </label>
      </SectionCard>

      <SectionCard
        description="These selectors use live company setup data from Supabase."
        title="Organization Assignment"
      >
        <label>
          <span>Branch</span>
          <select
            disabled={lookupsLoading || branches.length === 0}
            onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
            required
            value={form.branchId}
          >
            <option value="">Select branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name ?? branch.code ?? "Branch"}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Department</span>
          <select
            disabled={lookupsLoading || departments.length === 0}
            onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}
            required
            value={form.departmentId}
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name ?? department.code ?? "Department"}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Designation</span>
          <select
            disabled={lookupsLoading || designations.length === 0}
            onChange={(event) => setForm((current) => ({ ...current, designationId: event.target.value }))}
            required
            value={form.designationId}
          >
            <option value="">Select designation</option>
            {designations.map((designation) => (
              <option key={designation.id} value={designation.id}>
                {designation.title ?? designation.name ?? designation.code ?? "Designation"}
              </option>
            ))}
          </select>
        </label>
      </SectionCard>

      <SectionCard
        description="Supervisors can submit a new hire request here. HR and Super Admin can also create the record directly from the same workflow."
        title="Employment Details"
      >
        <label>
          <span>Date hired</span>
          <input
            type="date"
            onChange={(event) => setForm((current) => ({ ...current, hireDate: event.target.value }))}
            required
            value={form.hireDate}
          />
        </label>

        <label>
          <span>Salary</span>
          <input
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))}
            required
            type="number"
            value={form.salary}
          />
        </label>

        <label>
          <span>Reporting line</span>
          <select
            disabled={lookupsLoading}
            onChange={(event) => setForm((current) => ({ ...current, supervisorEmployeeId: event.target.value }))}
            value={form.supervisorEmployeeId}
          >
            <option value="">Use current manager / assign later</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName} - {employee.employeeNumber}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Probation months</span>
          <input
            min="1"
            onChange={(event) => setForm((current) => ({ ...current, probationMonths: event.target.value }))}
            required
            type="number"
            value={form.probationMonths}
          />
        </label>

        <label>
          <span>Contract duration (months)</span>
          <input
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, contractDurationMonths: event.target.value }))}
            required
            type="number"
            value={form.contractDurationMonths}
          />
        </label>

        <label>
          <span>KRA PIN</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, kraPin: event.target.value }))}
            value={form.kraPin}
          />
        </label>

        <label>
          <span>SHIF number</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, shifNumber: event.target.value }))}
            value={form.shifNumber}
          />
        </label>

        <label>
          <span>NSSF number</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, nssfNumber: event.target.value }))}
            value={form.nssfNumber}
          />
        </label>

        <div className="workflow-form-grid__full workflow-readonly-card">
          <strong>Generate Contract</strong>
          <span>
            This employee will receive a Robot Cafe appointment letter and a one-year contract by default.
          </span>
        </div>
      </SectionCard>

      <FormActions
        cancelHref={workflowRoutes.peopleWorkspace}
        pending={pending}
        pendingLabel="Saving employee and documents..."
        submitLabel="Save Employee & Generate Contract"
      />
    </form>
  );
}

export function EmployeeEditForm({
  employeeId,
  canDirectSalaryReview,
  viewerRole,
}: {
  employeeId: string;
  canDirectSalaryReview: boolean;
  viewerRole: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedDocumentKind = (searchParams.get("doc") ?? "").trim() as HrDocumentKind;
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [documentPending, setDocumentPending] = useState(false);
  const [salaryReviewPending, setSalaryReviewPending] = useState(false);
  const [assistBusyKey, setAssistBusyKey] = useState("");
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [documents, setDocuments] = useState<EmployeeDocumentsPayload["documents"]>([]);
  const [branches, setBranches] = useState<LookupRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeListPayload["employees"]>([]);
  const [form, setForm] = useState({
    fullName: "",
    companyEmail: "",
    phoneNumber: "",
    employmentType: "Permanent",
    branchId: "",
    supervisorEmployeeId: "",
  });
  const [documentForm, setDocumentForm] = useState({
    kind: (requestedDocumentKind || "contract") as HrDocumentKind,
    currentSalary: "",
    newSalary: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: "",
    incidentDate: new Date().toISOString().slice(0, 10),
    facts: "",
    desiredAction: "",
    responseHours: "72",
    roleDutyOverrides: "",
  });
  const [salaryReviewForm, setSalaryReviewForm] = useState({
    employeeName: "",
    currentSalary: "",
    proposedSalary: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: "",
    comments: "",
  });

  useEffect(() => {
    const allowedKinds: HrDocumentKind[] = [
      "contract",
      "appointment_letter",
      "salary_review",
      "commendation_letter",
      "recommendation_letter",
      "warning_letter",
      "show_cause",
      "suspension_letter",
      "dismissal_letter",
      "summary_dismissal_letter",
    ];

    if (allowedKinds.includes(requestedDocumentKind)) {
      setDocumentForm((current) => ({ ...current, kind: requestedDocumentKind }));
    }
  }, [requestedDocumentKind]);

  useEffect(() => {
    let active = true;

    async function loadEmployee() {
      setLoading(true);
      setDocumentsLoading(true);
      setError("");
      try {
        const [payload, documentsPayload, branchPayload, employeePayload] = await Promise.all([
          readJson<EmployeeProfilePayload>(`/api/people/employees/${employeeId}`),
          readJson<EmployeeDocumentsPayload>(`/api/people/employees/${employeeId}/documents`),
          readJson<{ records: LookupRecord[] }>("/api/lookups/branches"),
          readJson<EmployeeListPayload>("/api/people/employees"),
        ]);
        if (!active) {
          return;
        }

        setBranches(branchPayload.records ?? []);
        setEmployees(employeePayload.employees ?? []);
        setForm({
          fullName: payload.employee.fullName,
          companyEmail: payload.employee.companyEmail === "-" ? "" : payload.employee.companyEmail,
          phoneNumber: payload.employee.phoneNumber === "-" ? "" : payload.employee.phoneNumber,
          employmentType: payload.employee.employmentType,
          branchId: payload.employee.branchId ?? "",
          supervisorEmployeeId: payload.employee.supervisorEmployeeId ?? "",
        });
        setSalaryReviewForm((current) => ({
          ...current,
          employeeName: payload.employee.fullName,
          currentSalary: String(payload.employee.currentGrossPay ?? 0),
        }));
        setDocumentForm((current) => ({
          ...current,
          currentSalary: String(payload.employee.currentGrossPay ?? 0),
        }));
        setDocuments(documentsPayload.documents ?? []);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load the employee profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setDocumentsLoading(false);
        }
      }
    }

    void loadEmployee();
    return () => {
      active = false;
    };
  }, [employeeId]);

  async function loadDocuments() {
    setDocumentsLoading(true);
    try {
      const payload = await readJson<EmployeeDocumentsPayload>(`/api/people/employees/${employeeId}/documents`);
      setDocuments(payload.documents ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not reload employee documents.");
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    const { firstName, lastName } = splitName(form.fullName);
    if (!firstName) {
      setError("Enter the employee full name before saving.");
      setPending(false);
      return;
    }

    try {
      const response = await readJson<EmployeeRecordUpdatePayload>(`/api/people/employees/${employeeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: form.companyEmail,
          phone: form.phoneNumber,
          employment_type: form.employmentType,
          branch_id: form.branchId || null,
          supervisor_employee_id: form.supervisorEmployeeId || null,
        }),
      });

      setSuccess(
        response.pendingApproval
          ? response.request?.message ?? "The branch / supervisor change has been submitted to the GM for approval."
          : "Employee changes saved. Returning to the directory..."
      );
      window.setTimeout(() => {
        router.push(workflowRoutes.peopleWorkspace);
        router.refresh();
      }, response.pendingApproval ? 900 : 450);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save the employee changes.");
    } finally {
      setPending(false);
    }
  }

  async function handleGenerateDocument() {
    setDocumentPending(true);
    setError("");
    setSuccess("");

    try {
      const kind = documentForm.kind;
      const payload: Record<string, unknown> = {
        kind,
      };

      if (["contract", "appointment_letter"].includes(kind)) {
        payload.roleDutyOverrides = parseRoleDutyOverrides(documentForm.roleDutyOverrides);
      }

      if (kind === "salary_review") {
        payload.currentSalary = Number(documentForm.currentSalary || 0);
        payload.newSalary = Number(documentForm.newSalary || 0);
        payload.effectiveDate = documentForm.effectiveDate;
        payload.reason = documentForm.reason;
      }

      if (!["contract", "appointment_letter", "salary_review"].includes(kind)) {
        payload.incidentDate = documentForm.incidentDate;
        payload.facts = documentForm.facts;
        payload.desiredAction = documentForm.desiredAction;
        payload.reason = documentForm.reason;
        payload.responseHours = Number(documentForm.responseHours || 72);
      }

      const response = await readJson<EmployeeHrDocumentResultPayload>(
        `/api/people/employees/${employeeId}/hr-documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      setSuccess(
        response.pendingApproval
          ? `${humanizeDocumentKind(kind)} submitted into the approvals queue.`
          : `${response.document?.fileName ?? humanizeDocumentKind(kind)} generated and saved to employee documents.`
      );
      await loadDocuments();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not generate the HR document.");
    } finally {
      setDocumentPending(false);
    }
  }

  async function handleDownloadDocument(documentId: string) {
    setError("");
    setSuccess("");
    try {
      const payload = await readJson<EmployeeDocumentDownloadPayload>(
        `/api/people/employees/${employeeId}/documents/${documentId}`
      );
      window.open(payload.document.signedUrl, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Could not download the employee document.");
    }
  }

  async function handleSalaryReviewSave() {
    setSalaryReviewPending(true);
    setError("");
    setSuccess("");

    try {
      const response = await readJson<{
        request?: {
          message?: string;
        };
      }>("/api/performance/salary-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          proposedSalary: Number(salaryReviewForm.proposedSalary || 0),
          effectiveDate: salaryReviewForm.effectiveDate,
          reason: salaryReviewForm.reason,
          supportingComments: salaryReviewForm.comments,
        }),
      });

      const nextSalary = String(Number(salaryReviewForm.proposedSalary || 0));
      setSalaryReviewForm((current) => ({
        ...current,
        currentSalary: nextSalary,
      }));
      setDocumentForm((current) => ({
        ...current,
        currentSalary: nextSalary,
        newSalary: nextSalary,
        effectiveDate: salaryReviewForm.effectiveDate,
        reason: salaryReviewForm.reason,
      }));
      setSuccess(response.request?.message ?? "Salary updated. This change will apply from the selected effective payroll period.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save the salary review.");
    } finally {
      setSalaryReviewPending(false);
    }
  }

  async function handleWorkflowAssist(
    mode: "salary_review" | "hr_document",
    variant: "draft" | "review" | "shorter" | "formal" | "factual" = "draft"
  ) {
    const busyKey = `assist-${mode}-${variant}`;
    setAssistBusyKey(busyKey);
    setError("");
    setSuccess("");
    try {
      const payload = await readJson<WorkflowAssistPayload>("/api/ai/workflow-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "salary_review"
            ? {
                mode,
                variant,
                employeeName: salaryReviewForm.employeeName,
                currentSalary: salaryReviewForm.currentSalary,
                newSalary: salaryReviewForm.proposedSalary,
                effectiveDate: salaryReviewForm.effectiveDate,
                reason: salaryReviewForm.reason,
                comments: salaryReviewForm.comments,
              }
            : {
                mode,
                variant,
                employeeName: form.fullName,
                kind: documentForm.kind,
                currentSalary: documentForm.currentSalary,
                newSalary: documentForm.newSalary,
                effectiveDate: documentForm.effectiveDate,
                incidentDate: documentForm.incidentDate,
                facts: documentForm.facts,
                desiredAction: documentForm.desiredAction,
                reason: documentForm.reason,
                responseHours: documentForm.responseHours,
                roleDutyOverrides: parseRoleDutyOverrides(documentForm.roleDutyOverrides),
              }
        ),
      });

      if (mode === "salary_review") {
        setSalaryReviewForm((current) => ({
          ...current,
          reason: payload.reason || current.reason,
          comments: payload.comments || current.comments,
        }));
      } else {
        setDocumentForm((current) => ({
          ...current,
          reason: payload.reason || current.reason,
          facts: payload.facts || current.facts,
          desiredAction: payload.desiredAction || current.desiredAction,
          roleDutyOverrides:
            payload.roleDutyOverrides && payload.roleDutyOverrides.length
              ? payload.roleDutyOverrides.join("\n")
              : current.roleDutyOverrides,
        }));
      }

      setSuccess(
        formatWorkflowAssistMessage(
          payload,
          "A stronger draft is ready. Please review it and keep it true to the situation."
        )
      );
    } catch (assistError) {
      setError(assistError instanceof Error ? assistError.message : "Could not prepare drafting help right now.");
    } finally {
      setAssistBusyKey("");
    }
  }

  return (
    <form className="workflow-form" onSubmit={handleSubmit}>
      <FormActions
        cancelHref={workflowRoutes.peopleWorkspace}
        pending={pending}
        pendingLabel="Saving changes..."
        submitLabel="Save Changes"
      />
      <StatusBanner error={error} success={success} />

      <SectionCard
        description="Use the full-page editor for the fields that HR and operator roles update most often."
        title="Employee Details"
      >
        <label>
          <span>Full name</span>
          <input
            disabled={loading}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            required
            value={form.fullName}
          />
        </label>

        <label>
          <span>Company email</span>
          <input
            disabled={loading}
            onChange={(event) => setForm((current) => ({ ...current, companyEmail: event.target.value }))}
            type="email"
            value={form.companyEmail}
          />
        </label>

        <label>
          <span>Phone number</span>
          <input
            disabled={loading}
            onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
            value={form.phoneNumber}
          />
        </label>

        <label>
          <span>Employment type</span>
          <select
            disabled={loading}
            onChange={(event) => setForm((current) => ({ ...current, employmentType: event.target.value }))}
            value={form.employmentType}
          >
            <option>Contract</option>
            <option>Permanent</option>
            <option>Probation</option>
            <option>Casual</option>
            <option>Internship</option>
            <option>Consultancy</option>
          </select>
        </label>
      </SectionCard>

      <SectionCard
        description={
          ["Super Admin", "HR Admin", "Manager", "Payroll Admin"].includes(viewerRole)
            ? "Branch and supervisor changes save directly from this page."
            : "Branch and supervisor changes raised by a supervisor are sent to the GM for approval automatically."
        }
        title="Branch & Reporting Line"
      >
        <label>
          <span>Branch</span>
          <select
            disabled={loading || branches.length === 0}
            onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
            value={form.branchId}
          >
            <option value="">Unassigned</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name ?? branch.code ?? "Branch"}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Supervisor</span>
          <select
            disabled={loading}
            onChange={(event) => setForm((current) => ({ ...current, supervisorEmployeeId: event.target.value }))}
            value={form.supervisorEmployeeId}
          >
            <option value="">Unassigned</option>
            {employees
              .filter((employee) =>
                ["Supervisor", "Manager", "HR Admin", "Super Admin", "Payroll Admin"].includes(
                  employee.userAccount?.role ?? ""
                )
              )
              .filter((employee) => employee.id !== employeeId)
              .map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} - {employee.employeeNumber}
                </option>
              ))}
          </select>
        </label>

        <div className="workflow-form-grid__full workflow-readonly-card">
          <strong>Simple transfer flow</strong>
          <span>
            HR Admin, GM, and Payroll Operator save transfers directly. Supervisor-raised branch or reporting line changes go to the GM for approval first.
          </span>
        </div>
      </SectionCard>

      {canDirectSalaryReview ? (
        <SectionCard
          description="Save gross pay changes directly for future payroll periods and keep a clear review trail."
          title="Review Salary"
        >
          <div className="workflow-form-grid__full action-form" id="salary-review">
            <label>
              <span>Employee name</span>
              <input disabled value={salaryReviewForm.employeeName} />
            </label>

            <label>
              <span>Current gross pay</span>
              <input disabled value={salaryReviewForm.currentSalary} />
            </label>

            <label>
              <span>Proposed new gross pay</span>
              <input
                min="0"
                onChange={(event) => setSalaryReviewForm((current) => ({ ...current, proposedSalary: event.target.value }))}
                type="number"
                value={salaryReviewForm.proposedSalary}
              />
            </label>

            <label>
              <span>Effective date</span>
              <input
                onChange={(event) => setSalaryReviewForm((current) => ({ ...current, effectiveDate: event.target.value }))}
                type="date"
                value={salaryReviewForm.effectiveDate}
              />
            </label>

            <label className="workflow-form-grid__full">
              <span>Reason for review</span>
              <textarea
                onChange={(event) => setSalaryReviewForm((current) => ({ ...current, reason: event.target.value }))}
                rows={3}
                value={salaryReviewForm.reason}
              />
            </label>

            <label className="workflow-form-grid__full">
              <span>Comments</span>
              <textarea
                onChange={(event) => setSalaryReviewForm((current) => ({ ...current, comments: event.target.value }))}
                rows={3}
                value={salaryReviewForm.comments}
              />
            </label>

            <div className="workflow-form-grid__full workflow-actions">
              <button
                className="ghost-button"
                disabled={assistBusyKey.startsWith("assist-salary_review") || salaryReviewPending}
                onClick={() => void handleWorkflowAssist("salary_review")}
                type="button"
              >
                {assistBusyKey.startsWith("assist-salary_review") ? "Drafting..." : "Help me draft this"}
              </button>
              <button
                className="ghost-button"
                disabled={assistBusyKey.startsWith("assist-salary_review") || salaryReviewPending}
                onClick={() => void handleWorkflowAssist("salary_review", "formal")}
                type="button"
              >
                More formal
              </button>
              <button
                className="ghost-button"
                disabled={assistBusyKey.startsWith("assist-salary_review") || salaryReviewPending}
                onClick={() => void handleWorkflowAssist("salary_review", "review")}
                type="button"
              >
                Review wording
              </button>
              <button
                className="primary-button"
                disabled={salaryReviewPending}
                onClick={() => void handleSalaryReviewSave()}
                type="button"
              >
                {salaryReviewPending ? "Saving salary review..." : "Save Salary Review"}
              </button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        description="Generate contracts, appointment letters, salary review letters, commendation letters, and disciplinary letters in the official Robot Cafe format."
        title="Staff Letters & Contracts"
      >
        <label>
          <span>Document type</span>
          <select
            disabled={loading || documentPending}
            onChange={(event) =>
              setDocumentForm((current) => ({
                ...current,
                kind: event.target.value as HrDocumentKind,
              }))
            }
            value={documentForm.kind}
          >
            <option value="contract">Contract</option>
            <option value="appointment_letter">Appointment Letter</option>
            <option value="salary_review">Salary Review</option>
            <option value="commendation_letter">Commendation Letter</option>
            <option value="recommendation_letter">Recommendation Letter</option>
            <option value="warning_letter">Warning Letter</option>
            <option value="show_cause">Show Cause Letter</option>
            <option value="suspension_letter">Suspension Letter</option>
            <option value="dismissal_letter">Dismissal Letter</option>
            <option value="summary_dismissal_letter">Summary Dismissal Letter</option>
          </select>
        </label>

        {documentForm.kind === "salary_review" ? (
          <>
            <label>
              <span>Current salary</span>
              <input
                min="0"
                onChange={(event) => setDocumentForm((current) => ({ ...current, currentSalary: event.target.value }))}
                type="number"
                value={documentForm.currentSalary}
              />
            </label>

            <label>
              <span>New salary</span>
              <input
                min="0"
                onChange={(event) => setDocumentForm((current) => ({ ...current, newSalary: event.target.value }))}
                type="number"
                value={documentForm.newSalary}
              />
            </label>

            <label>
              <span>Effective date</span>
              <input
                onChange={(event) => setDocumentForm((current) => ({ ...current, effectiveDate: event.target.value }))}
                type="date"
                value={documentForm.effectiveDate}
              />
            </label>

            <label className="workflow-form-grid__full">
              <span>Reason / basis</span>
              <textarea
                onChange={(event) => setDocumentForm((current) => ({ ...current, reason: event.target.value }))}
                rows={4}
                value={documentForm.reason}
              />
            </label>
          </>
        ) : null}

        {!["contract", "appointment_letter", "salary_review"].includes(documentForm.kind) ? (
          <>
            <label>
              <span>{["commendation_letter", "recommendation_letter"].includes(documentForm.kind) ? "Recognition date" : "Incident date"}</span>
              <input
                onChange={(event) => setDocumentForm((current) => ({ ...current, incidentDate: event.target.value }))}
                type="date"
                value={documentForm.incidentDate}
              />
            </label>

            {!["commendation_letter", "recommendation_letter"].includes(documentForm.kind) ? (
              <label>
                <span>Response hours</span>
                <input
                  min="24"
                  onChange={(event) => setDocumentForm((current) => ({ ...current, responseHours: event.target.value }))}
                  type="number"
                  value={documentForm.responseHours}
                />
              </label>
            ) : null}

            <label className="workflow-form-grid__full">
              <span>{["commendation_letter", "recommendation_letter"].includes(documentForm.kind) ? "Achievement details" : "Incident facts"}</span>
              <textarea
                onChange={(event) => setDocumentForm((current) => ({ ...current, facts: event.target.value }))}
                rows={5}
                value={documentForm.facts}
              />
            </label>

            <label className="workflow-form-grid__full">
              <span>{["commendation_letter", "recommendation_letter"].includes(documentForm.kind) ? "Recognition basis" : "Reason / basis"}</span>
              <textarea
                onChange={(event) => setDocumentForm((current) => ({ ...current, reason: event.target.value }))}
                rows={3}
                value={documentForm.reason}
              />
            </label>

            <label className="workflow-form-grid__full">
              <span>{["commendation_letter", "recommendation_letter"].includes(documentForm.kind) ? "Manager note / recognition outcome" : "Required action / outcome"}</span>
              <textarea
                onChange={(event) => setDocumentForm((current) => ({ ...current, desiredAction: event.target.value }))}
                rows={3}
                value={documentForm.desiredAction}
              />
            </label>
          </>
        ) : null}

        {["contract", "appointment_letter"].includes(documentForm.kind) ? (
          <label className="workflow-form-grid__full">
            <span>Role duties override (one per line)</span>
            <textarea
              onChange={(event) =>
                setDocumentForm((current) => ({ ...current, roleDutyOverrides: event.target.value }))
              }
              rows={6}
              value={documentForm.roleDutyOverrides}
            />
          </label>
        ) : null}

        <div className="workflow-form-grid__full workflow-actions">
          <button
            className="ghost-button"
            disabled={assistBusyKey.startsWith("assist-hr_document") || documentPending || loading}
            onClick={() => void handleWorkflowAssist("hr_document")}
            type="button"
          >
            {assistBusyKey.startsWith("assist-hr_document")
              ? "Drafting..."
              : ["contract", "appointment_letter"].includes(documentForm.kind)
                ? "Suggest duties"
                : "Help me draft this"}
          </button>
          <button
            className="ghost-button"
            disabled={assistBusyKey.startsWith("assist-hr_document") || documentPending || loading}
            onClick={() => void handleWorkflowAssist("hr_document", "factual")}
            type="button"
          >
            More factual
          </button>
          <button
            className="ghost-button"
            disabled={assistBusyKey.startsWith("assist-hr_document") || documentPending || loading}
            onClick={() => void handleWorkflowAssist("hr_document", "review")}
            type="button"
          >
            Review wording
          </button>
          <button
            className="primary-button"
            disabled={documentPending || loading}
            onClick={() => void handleGenerateDocument()}
            type="button"
          >
            {documentPending
              ? "Preparing letter..."
              : documentForm.kind === "commendation_letter"
                ? "Issue Commendation Letter"
                : documentForm.kind === "recommendation_letter"
                  ? "Issue Recommendation Letter"
                : documentForm.kind === "warning_letter"
                  ? "Issue Warning Letter"
                  : documentForm.kind === "show_cause"
                    ? "Issue Show Cause Letter"
                    : documentForm.kind === "salary_review"
                      ? "Generate Salary Review Letter"
                      : documentForm.kind === "appointment_letter"
                        ? "Generate Appointment Letter"
                        : documentForm.kind === "contract"
                          ? "Generate Contract"
                          : "Issue Letter"}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        description="Generated contracts, commendations, salary review letters, and disciplinary letters are saved back into the employee file automatically."
        title="Employee Documents"
      >
        <div className="workflow-form-grid__full">
          {documentsLoading ? <p>Loading employee documents...</p> : null}
          {!documentsLoading && documents.length === 0 ? <p>No records available yet.</p> : null}
          {!documentsLoading && documents.length ? (
            <div className="note-list">
              {documents.map((document) => (
                <article key={document.id}>
                  <div>
                    <strong>{document.fileName}</strong>
                    <p>
                      {document.category} | {humanizeDocumentKind(document.documentType as HrDocumentKind)} | Version{" "}
                      {document.versionNumber}
                      {document.issueDate ? ` | Issued ${document.issueDate}` : ""}
                    </p>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => void handleDownloadDocument(document.id)}
                    type="button"
                  >
                    Download
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <FormActions
        cancelHref={workflowRoutes.peopleWorkspace}
        pending={pending}
        pendingLabel="Saving changes..."
        submitLabel="Save Changes"
      />
    </form>
  );
}

export function PayrollPeriodCreateForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [periodMonth, setPeriodMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payrollType, setPayrollType] = useState("15th Payroll");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    const [year, month] = periodMonth.split("-");
    if (!year || !month) {
      setError("Select the payroll month before opening the period.");
      setPending(false);
      return;
    }

    try {
      await readJson("/api/payroll/periods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year,
          month,
          payrollType,
        }),
      });

      setSuccess("Payroll period opened. Returning to payroll periods...");
      window.setTimeout(() => {
        router.push(workflowRoutes.payrollPeriodsWorkspace);
        router.refresh();
      }, 450);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not open the payroll period.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="workflow-form" onSubmit={handleSubmit}>
      <FormActions
        cancelHref={workflowRoutes.payrollPeriodsWorkspace}
        pending={pending}
        pendingLabel="Opening period..."
        submitLabel="Open Payroll Period"
      />
      <StatusBanner error={error} success={success} />

      <SectionCard
        description="This creates a live payroll run against the Supabase-backed payroll engine."
        title="Payroll Period"
      >
        <label>
          <span>Payroll month</span>
          <input onChange={(event) => setPeriodMonth(event.target.value)} required type="month" value={periodMonth} />
        </label>

        <label>
          <span>Payroll type</span>
          <select onChange={(event) => setPayrollType(event.target.value)} value={payrollType}>
            <option value="15th Payroll">15th Payroll</option>
            <option value="Month-End Payroll">30th / Month-End Payroll</option>
            <option value="Full Monthly Payroll">Full Monthly Payroll</option>
            <option value="Off-Cycle">Off-Cycle</option>
            <option value="Bonus Payroll">Bonus Payroll</option>
          </select>
        </label>
      </SectionCard>

      <FormActions
        cancelHref={workflowRoutes.payrollPeriodsWorkspace}
        pending={pending}
        pendingLabel="Opening period..."
        submitLabel="Open Payroll Period"
      />
    </form>
  );
}

export function LeaveRequestCreateForm({
  employeeName,
  returnHref = workflowRoutes.leaveWorkspace,
}: {
  employeeName: string;
  returnHref?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [assistPending, setAssistPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [balances, setBalances] = useState<Array<Record<string, unknown>>>([]);
  const [holidays, setHolidays] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    leaveType: "Annual Leave",
    startDate: DEFAULT_LEAVE_START,
    endDate: DEFAULT_LEAVE_END,
    reason: "Planned leave",
    leaveAddress: "",
    contactPhone: "",
    cellPhone: "",
    relievingOfficer: "",
    attachmentNote: "",
  });

  useEffect(() => {
    const queryLeaveType = searchParams.get("leaveType");
    if (queryLeaveType) {
      setForm((current) => ({
        ...current,
        leaveType: queryLeaveType,
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function loadLeaveSetup() {
      setLoading(true);
      setError("");
      try {
        const payload = await readJson<{
          balances: Array<Record<string, unknown>>;
          holidays: Array<Record<string, unknown>>;
          policies: Array<Record<string, unknown>>;
        }>("/api/ess/leave?view=setup");

        if (!active) {
          return;
        }

        setBalances(payload.balances ?? []);
        setHolidays(payload.holidays ?? []);
        setPolicies(payload.policies ?? []);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load leave setup.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLeaveSetup();
    return () => {
      active = false;
    };
  }, []);

  const selectedPolicy = useMemo(
    () =>
      policies.find((policy) => String(policy.leave_type) === form.leaveType) ??
      null,
    [form.leaveType, policies]
  );

  const availableLeaveTypes = useMemo(() => {
    const names = policies
      .map((policy) => String(policy.leave_type ?? "").trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [policies]);

  useEffect(() => {
    if (!availableLeaveTypes.length) {
      return;
    }
    if (!availableLeaveTypes.includes(form.leaveType)) {
      setForm((current) => ({
        ...current,
        leaveType: availableLeaveTypes[0] ?? "Annual Leave",
      }));
    }
  }, [availableLeaveTypes, form.leaveType]);

  const selectedBalance = useMemo(
    () =>
      balances.find((balance) => String(balance.leave_type) === form.leaveType) ??
      null,
    [balances, form.leaveType]
  );

  const leaveCalculation = useMemo(() => {
    const start = new Date(`${form.startDate}T00:00:00.000Z`);
    const end = new Date(`${form.endDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return { requestedDays: 0, expectedResumeDate: "", afterApproval: 0 };
    }

    const holidaySet = new Set(holidays.map((holiday) => String(holiday.holiday_date)));
    const requestCategory = String(selectedPolicy?.request_category ?? "leave");
    const reducingBalance = Boolean(selectedPolicy?.reducing_balance ?? true);
    const countedDates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const dateOnly = cursor.toISOString().slice(0, 10);
      const weekday = cursor.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toLowerCase();
      const isWeekend = weekday === "saturday" || weekday === "sunday";
      if (requestCategory === "off_day") {
        countedDates.push(dateOnly);
      } else if (!isWeekend && !holidaySet.has(dateOnly)) {
        countedDates.push(dateOnly);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const resumeCursor = new Date(end);
    do {
      resumeCursor.setUTCDate(resumeCursor.getUTCDate() + 1);
      const dateOnly = resumeCursor.toISOString().slice(0, 10);
      const weekday = resumeCursor.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toLowerCase();
      const isWeekend = weekday === "saturday" || weekday === "sunday";
      if (requestCategory === "off_day" || (!isWeekend && !holidaySet.has(dateOnly))) {
        break;
      }
    } while (true);

    const requestedDays = countedDates.length || 1;
    const availableBalance = Number(selectedBalance?.balance_days ?? 0);
    return {
      requestedDays,
      expectedResumeDate: resumeCursor.toISOString().slice(0, 10),
      afterApproval: reducingBalance ? Math.max(0, availableBalance - requestedDays) : availableBalance,
    };
  }, [form.endDate, form.startDate, holidays, selectedBalance, selectedPolicy]);

  async function handleWorkflowAssist(
    variant: "draft" | "review" | "shorter" | "formal" | "factual" = "draft"
  ) {
    setAssistPending(true);
    setError("");
    setSuccess("");
    try {
      const payload = await readJson<WorkflowAssistPayload>("/api/ai/workflow-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "leave_request",
          variant,
          employeeName,
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
          attachmentNote: form.attachmentNote,
          leaveAddress: form.leaveAddress,
          relievingOfficer: form.relievingOfficer,
        }),
      });

      setForm((current) => ({
        ...current,
        reason: payload.reason || current.reason,
        attachmentNote: payload.attachmentNote || current.attachmentNote,
      }));
      setSuccess(
        formatWorkflowAssistMessage(
          payload,
          "A stronger leave request draft is ready. Please review it before you submit."
        )
      );
    } catch (assistError) {
      setError(assistError instanceof Error ? assistError.message : "Could not prepare leave drafting help right now.");
    } finally {
      setAssistPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    if (leaveCalculation.requestedDays < 1) {
      setError("The leave end date must be on or after the start date.");
      setPending(false);
      return;
    }

    try {
      await readJson("/api/ess/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeName,
          leaveType: form.leaveType,
          days: String(leaveCalculation.requestedDays),
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
          requestCategory: String(selectedPolicy?.request_category ?? "leave"),
          leaveAddress: form.leaveAddress,
          contactPhone: form.contactPhone,
          cellPhone: form.cellPhone,
          relievingOfficer: form.relievingOfficer,
          attachmentNote: form.attachmentNote,
        }),
      });

      setSuccess("Leave request submitted. Returning to the leave workspace...");
      window.setTimeout(() => {
        router.push(returnHref);
        router.refresh();
      }, 450);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit the leave request.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="workflow-form" onSubmit={handleSubmit}>
      <StatusBanner error={error} success={success} />

      <SectionCard
        description="The request will create a live approval task for the next approver in the leave workflow."
        title="Leave Request"
      >
        <label>
          <span>Leave type</span>
          <select
            onChange={(event) => setForm((current) => ({ ...current, leaveType: event.target.value }))}
            value={form.leaveType}
          >
            {availableLeaveTypes.map((leaveType) => (
              <option key={leaveType} value={leaveType}>
                {leaveType}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Start date</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
            required
            type="date"
            value={form.startDate}
          />
        </label>

        <label>
          <span>End date</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
            required
            type="date"
            value={form.endDate}
          />
        </label>

        <label>
          <span>Working days</span>
          <input disabled value={leaveCalculation.requestedDays > 0 ? `${leaveCalculation.requestedDays} day(s)` : "Check dates"} />
        </label>

        <label>
          <span>Expected resume date</span>
          <input
            disabled
            value={leaveCalculation.expectedResumeDate || "Calculated after valid dates"}
          />
        </label>
      </SectionCard>

      <SectionCard
        description="You only need a few practical details for a complete, approval-ready request."
        title="Supporting Details"
      >
        <label>
          <span>Leave address / contact location</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, leaveAddress: event.target.value }))}
            value={form.leaveAddress}
          />
        </label>

        <label>
          <span>Telephone number</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
            value={form.contactPhone}
          />
        </label>

        <label>
          <span>Cell phone</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, cellPhone: event.target.value }))}
            value={form.cellPhone}
          />
        </label>

        <label>
          <span>Relieving officer / covering person</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, relievingOfficer: event.target.value }))}
            value={form.relievingOfficer}
          />
        </label>

        <label className="workflow-form-grid__full">
          <span>Reason</span>
          <textarea
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
            rows={5}
            value={form.reason}
          />
        </label>

        <label className="workflow-form-grid__full">
          <span>Attachment / document note</span>
          <textarea
            onChange={(event) => setForm((current) => ({ ...current, attachmentNote: event.target.value }))}
            rows={3}
            value={form.attachmentNote}
          />
        </label>
        <div className="workflow-form-grid__full workflow-actions">
          <button
            className="ghost-button"
            disabled={assistPending || pending}
            onClick={() => void handleWorkflowAssist()}
            type="button"
          >
            {assistPending ? "Drafting..." : "Help me draft this"}
          </button>
          <button
            className="ghost-button"
            disabled={assistPending || pending}
            onClick={() => void handleWorkflowAssist("formal")}
            type="button"
          >
            More formal
          </button>
          <button
            className="ghost-button"
            disabled={assistPending || pending}
            onClick={() => void handleWorkflowAssist("review")}
            type="button"
          >
            Review wording
          </button>
        </div>
      </SectionCard>

      <SectionCard
        description="This preview helps the employee and approver see exactly how the request affects entitlement."
        title="Balance Preview"
      >
        {loading ? <p>Loading leave balances...</p> : null}
        <label>
          <span>Entitlement</span>
          <input disabled value={`${Number(selectedPolicy?.annual_allowance ?? 0).toFixed(2)} day(s)`} />
        </label>
        <label>
          <span>Available balance</span>
          <input disabled value={`${Number(selectedBalance?.balance_days ?? 0).toFixed(2)} day(s)`} />
        </label>
        <label>
          <span>Requested days</span>
          <input disabled value={`${leaveCalculation.requestedDays.toFixed(2)} day(s)`} />
        </label>
        <label>
          <span>Balance after approval</span>
          <input disabled value={`${leaveCalculation.afterApproval.toFixed(2)} day(s)`} />
        </label>
        <div className="workflow-form-grid__full">
          {Boolean(selectedPolicy?.reducing_balance ?? true) ? (
            <p className="section-description">
              Pending leave will sit in the approval queue first, then reduce the entitlement only after approval.
            </p>
          ) : (
            <p className="section-description">
              This leave type is tracked separately and will not reduce annual leave balance.
            </p>
          )}
          {Boolean(selectedPolicy?.requires_attachment) ? (
            <p className="section-description">
              Supporting documentation is expected for this leave type.
            </p>
          ) : null}
        </div>
      </SectionCard>

      <FormActions
        cancelHref={returnHref}
        pending={pending}
        pendingLabel="Submitting leave..."
        submitLabel={String(selectedPolicy?.request_category) === "off_day" ? "Request Off Day" : "Apply Leave"}
      />
    </form>
  );
}

export function AppraisalCreateForm({ isEmployeeRole }: { isEmployeeRole: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [workflowMode, setWorkflowMode] = useState("standard");
  const [employees, setEmployees] = useState<Array<{ id: string; label: string }>>([]);
  const [form, setForm] = useState({
    employeeId: "",
    title: "Robot Cafe Q2 Appraisal",
    cycleType: "quarterly",
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
  });

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      setLoading(true);
      setError("");
      try {
        const payload = await readJson<PerformanceWorkspacePayload>("/api/performance/workspace");
        if (!active) {
          return;
        }

        const employeeOptions = payload.workspace.employees ?? [];
        setWorkflowMode(payload.workspace.workflowMode ?? "standard");
        setEmployees(employeeOptions);
        setForm((current) => ({
          ...current,
          employeeId: current.employeeId || employeeOptions[0]?.id || "",
        }));
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load performance setup data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadWorkspace();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    try {
      await readJson("/api/performance/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entityType: "cycle",
          title: form.title,
          cycleType: form.cycleType,
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          employeeIds:
            !isEmployeeRole && form.employeeId && workflowMode !== "robot_cafe_simple"
              ? [form.employeeId]
              : undefined,
          scoringModel: workflowMode === "robot_cafe_simple" ? "simple_qualitative" : "weighted_kpi",
          selfEvaluationEnabled: true,
          supervisorEvaluationEnabled: true,
          gmEvaluationEnabled: true,
        }),
      });

      setSuccess("Appraisal launched. Returning to performance reviews...");
      window.setTimeout(() => {
        router.push(workflowRoutes.performanceWorkspace);
        router.refresh();
      }, 450);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not launch the appraisal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="workflow-form" onSubmit={handleSubmit}>
      <FormActions
        cancelHref={workflowRoutes.performanceWorkspace}
        pending={pending}
        pendingLabel="Launching appraisal..."
        submitLabel="Launch Appraisal"
      />
      <StatusBanner error={error} success={success} />

      <SectionCard
        description={
          workflowMode === "robot_cafe_simple"
            ? "Launch the simple Robot Cafe appraisal flow: employee self-review, supervisor evaluation, GM final review, then one final downloadable form."
            : "Open a live performance review and hand it into the standard Solva HR review flow."
        }
        title="Review Setup"
      >
        {!isEmployeeRole && workflowMode !== "robot_cafe_simple" ? (
          <label>
            <span>Employee</span>
            <select
              disabled={loading || employees.length === 0}
              onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
              required
              value={form.employeeId}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.label}
                </option>
              ))}
            </select>
          </label>
        ) : workflowMode === "robot_cafe_simple" ? (
          <div className="workflow-readonly-card">
            <strong>Simple Robot Cafe flow</strong>
            <span>This will create appraisal reviews for the active staff in scope and move them through employee, supervisor, and GM stages.</span>
          </div>
        ) : (
          <div className="workflow-readonly-card">
            <strong>Employee self review</strong>
            <span>This appraisal will be created for your linked employee profile.</span>
          </div>
        )}

        <label>
          <span>Cycle title</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            required
            value={form.title}
          />
        </label>

        <label>
          <span>Cycle type</span>
          <select
            onChange={(event) => setForm((current) => ({ ...current, cycleType: event.target.value }))}
            value={form.cycleType}
          >
            <option value="quarterly">Quarterly appraisal</option>
            <option value="annual">Annual appraisal</option>
            <option value="mid_year">Mid-year review</option>
            <option value="probation">Probation review</option>
            <option value="custom">Custom review</option>
          </select>
        </label>

        <label>
          <span>Period start</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, periodStart: event.target.value }))}
            required
            type="date"
            value={form.periodStart}
          />
        </label>
        <label>
          <span>Period end</span>
          <input
            onChange={(event) => setForm((current) => ({ ...current, periodEnd: event.target.value }))}
            required
            type="date"
            value={form.periodEnd}
          />
        </label>
      </SectionCard>

      <FormActions
        cancelHref={workflowRoutes.performanceWorkspace}
        pending={pending}
        pendingLabel="Launching appraisal..."
        submitLabel="Launch Appraisal"
      />
    </form>
  );
}
