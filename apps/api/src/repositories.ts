import { Prisma } from "@prisma/client";
import { phaseTwoWorkflowDefinitions } from "@solva/shared";
import { buildDemoPayrollRun, dashboardMetrics, demoCatalogues, phaseTwoMetrics } from "./demo-data.js";
import { isDatabaseConfigured, prisma } from "./prisma.js";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  return typeof value === "number" ? value : value.toNumber();
}

function isoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function maskAccountNumber(value: string | null | undefined): string {
  if (!value) {
    return "Pending";
  }

  return `****${value.slice(-4)}`;
}

function normalizePayComponentKind(kind: "EARNING" | "DEDUCTION" | "EMPLOYER_COST") {
  return kind === "EARNING" ? "earning" : kind === "DEDUCTION" ? "deduction" : "employer_cost";
}

type CurrentPayslipPayload = {
  payslipId: string;
  runId: string;
  runEmployeeId: string;
  status: string;
  generatedAt: string;
  releasedAt: string | null;
  company: {
    name: string;
    country: string;
  };
  period: {
    label: string;
    code: string;
    cycle: string;
    startDate: string | null;
    endDate: string | null;
    payDate: string | null;
  };
  employee: {
    employeeId: string;
    displayName: string;
    legalName: string;
    employeeNumber: string;
    payrollNumber: string | null;
    department: string | null;
    branch: string | null;
    paymentMode: string;
    bankName: string;
    accountNumber: string;
  };
  earnings: Array<{
    code: string;
    name: string;
    kind: "earning" | "deduction" | "employer_cost";
    amount: number;
  }>;
  deductions: Array<{
    code: string;
    name: string;
    kind: "earning" | "deduction" | "employer_cost";
    amount: number;
  }>;
  employerCosts: Array<{
    code: string;
    name: string;
    kind: "earning" | "deduction" | "employer_cost";
    amount: number;
  }>;
  totals: {
    grossPay: number;
    taxablePay: number;
    totalDeductions: number;
    totalEmployerCosts: number;
    netPay: number;
  };
};

async function useDatabase<T>(query: () => Promise<T>): Promise<T | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return query();
}

type StoredWorkflowStepDefinition = {
  step: number;
  label: string;
  approverRole: string;
  escalationHours?: number | undefined;
  requiredPermission?: string | undefined;
};

function parseWorkflowDefinitionSteps(value: Prisma.JsonValue): StoredWorkflowStepDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Prisma.JsonObject => typeof item === "object" && item !== null && !Array.isArray(item))
    .map((item) => ({
      step: Number(item.step ?? 0),
      label: String(item.label ?? "Approval step"),
      approverRole: String(item.approverRole ?? "company_admin"),
      escalationHours: item.escalationHours == null ? undefined : Number(item.escalationHours),
      requiredPermission: item.requiredPermission == null ? undefined : String(item.requiredPermission)
    }))
    .filter((item) => item.step > 0);
}

type WorkflowState = {
  entityType: string;
  entityId: string;
  definitionCode: string;
  definitionName: string;
  module: string;
  status: string;
  currentStep: number;
  currentStepLabel: string;
  currentOwnerRole: string;
  steps: Array<{
    step: number;
    label: string;
    approverRole: string;
    status: string;
    comments: string | null;
    decidedAt: string | null;
  }>;
};

function mapWorkflowState(instance: {
  entityType: string;
  entityId: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  currentStep: number;
  definition: { code: string; name: string; module: string; steps: Prisma.JsonValue } | null;
  steps: Array<{
    step: number;
    approverRole: string;
    status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
    comments: string | null;
    decidedAt: Date | null;
  }>;
}) {
  const definedSteps = instance.definition ? parseWorkflowDefinitionSteps(instance.definition.steps) : [];
  const currentStep = instance.steps.find((step) => step.step === instance.currentStep) ?? instance.steps[0];
  const currentStepDefinition = definedSteps.find((step) => step.step === currentStep?.step);

  return {
    entityType: instance.entityType,
    entityId: instance.entityId,
    definitionCode: instance.definition?.code ?? "unknown",
    definitionName: instance.definition?.name ?? "Workflow",
    module: instance.definition?.module ?? "system",
    status: instance.status.toLowerCase(),
    currentStep: instance.currentStep,
    currentStepLabel: currentStepDefinition?.label ?? (currentStep ? `Step ${currentStep.step}` : "Pending"),
    currentOwnerRole: currentStep?.approverRole ?? "company_admin",
    steps: instance.steps.map((step) => ({
      step: step.step,
      label: definedSteps.find((definitionStep) => definitionStep.step === step.step)?.label ?? `Step ${step.step}`,
      approverRole: step.approverRole,
      status: step.status.toLowerCase(),
      comments: step.comments,
      decidedAt: step.decidedAt?.toISOString() ?? null
    }))
  } satisfies WorkflowState;
}

async function createWorkflowInstanceForEntity(
  transaction: Prisma.TransactionClient,
  input: {
    tenantId: string;
    definitionCode: string;
    entityType: string;
    entityId: string;
  }
) {
  let definition = await transaction.workflowDefinition.findUnique({
    where: {
      tenantId_code: {
        tenantId: input.tenantId,
        code: input.definitionCode
      }
    }
  });

  if (!definition) {
    const localDefinition = phaseTwoWorkflowDefinitions.find((item) => item.code === input.definitionCode);
    if (localDefinition) {
      definition = await transaction.workflowDefinition.create({
        data: {
          tenantId: input.tenantId,
          code: localDefinition.code,
          name: localDefinition.name,
          module: localDefinition.module,
          trigger: localDefinition.trigger,
          steps: localDefinition.steps
        }
      });
    }
  }

  if (!definition) {
    return null;
  }

  const steps = parseWorkflowDefinitionSteps(definition.steps);

  const instance = await transaction.workflowInstance.create({
    data: {
      tenantId: input.tenantId,
      definitionId: definition.id,
      entityType: input.entityType,
      entityId: input.entityId,
      status: "SUBMITTED",
      currentStep: steps[0]?.step ?? 1,
      steps: {
        create: steps.map((step) => ({
          step: step.step,
          approverRole: step.approverRole,
          status: step.step === steps[0]?.step ? "SUBMITTED" : "DRAFT"
        }))
      }
    },
    include: {
      definition: true,
      steps: {
        orderBy: { step: "asc" }
      }
    }
  });

  return mapWorkflowState(instance);
}

async function ensureWorkflowInstanceForEntity(
  transaction: Prisma.TransactionClient,
  input: {
    tenantId: string;
    definitionCode: string;
    entityType: string;
    entityId: string;
  }
) {
  const existing = await transaction.workflowInstance.findFirst({
    where: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId
    },
    orderBy: { createdAt: "desc" },
    include: {
      definition: true,
      steps: {
        orderBy: { step: "asc" }
      }
    }
  });

  if (existing) {
    return mapWorkflowState(existing);
  }

  return createWorkflowInstanceForEntity(transaction, input);
}

async function decideWorkflowInstanceForEntity(
  transaction: Prisma.TransactionClient,
  input: {
    tenantId: string;
    entityType: string;
    entityId: string;
    decision: "approve" | "reject";
    approverUserId: string;
    comments?: string | undefined;
  }
) {
  const instance = await transaction.workflowInstance.findFirst({
    where: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId
    },
    orderBy: { createdAt: "desc" },
    include: {
      definition: true,
      steps: {
        orderBy: { step: "asc" }
      }
    }
  });

  if (!instance) {
    return null;
  }

  const currentStep = instance.steps.find((step) => step.step === instance.currentStep);
  if (!currentStep) {
    return mapWorkflowState(instance);
  }

  await transaction.workflowStep.update({
    where: { id: currentStep.id },
    data: {
      approverUserId: input.approverUserId,
      status: input.decision === "approve" ? "APPROVED" : "REJECTED",
      comments: input.comments ?? null,
      decidedAt: new Date()
    }
  });

  const nextStep = instance.steps.find((step) => step.step > instance.currentStep);

  if (input.decision === "reject" || !nextStep) {
    const finalized = await transaction.workflowInstance.update({
      where: { id: instance.id },
      data: {
        status: input.decision === "reject" ? "REJECTED" : "APPROVED"
      },
      include: {
        definition: true,
        steps: {
          orderBy: { step: "asc" }
        }
      }
    });

    return mapWorkflowState(finalized);
  }

  await transaction.workflowStep.update({
    where: { id: nextStep.id },
    data: {
      status: "SUBMITTED"
    }
  });

  const advanced = await transaction.workflowInstance.update({
    where: { id: instance.id },
    data: {
      currentStep: nextStep.step,
      status: "SUBMITTED"
    },
    include: {
      definition: true,
      steps: {
        orderBy: { step: "asc" }
      }
    }
  });

  return mapWorkflowState(advanced);
}

export async function listWorkflowStatesForEntities(
  entities: Array<{
    entityType: string;
    entityId: string;
  }>
) {
  return useDatabase(async () => {
    if (!entities.length) {
      return [];
    }

    const instances = await prisma.workflowInstance.findMany({
      where: {
        OR: entities.map((entity) => ({
          entityType: entity.entityType,
          entityId: entity.entityId
        }))
      },
      orderBy: { createdAt: "desc" },
      include: {
        definition: true,
        steps: {
          orderBy: { step: "asc" }
        }
      }
    });

    const latest = new Map<string, WorkflowState>();
    for (const instance of instances) {
      const key = `${instance.entityType}:${instance.entityId}`;
      if (!latest.has(key)) {
        latest.set(key, mapWorkflowState(instance));
      }
    }

    return [...latest.values()];
  });
}

export async function listCompanies() {
  return useDatabase(async () =>
    prisma.tenant.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        country: true,
        subscription: true,
        status: true,
        _count: {
          select: {
            employees: true,
            branches: true,
            departments: true
          }
        }
      }
    })
  );
}

export async function listEmployees() {
  return useDatabase(async () => {
    const employees = await prisma.employee.findMany({
      orderBy: { legalName: "asc" },
      include: {
        branch: true,
        department: true,
        costCenter: true,
        statutory: true,
        salaryHistory: {
          orderBy: { effectiveFrom: "desc" },
          take: 1
        }
      }
    });

    return employees.map((employee) => ({
      tenantId: employee.tenantId,
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      payrollNumber: employee.payrollNumber,
      displayName: employee.preferredName ?? employee.legalName,
      legalName: employee.legalName,
      department: employee.department?.name,
      branch: employee.branch?.name,
      costCenter: employee.costCenter?.code,
      payGroup: "monthly",
      basicSalary: decimalToNumber(employee.salaryHistory[0]?.basicSalary) ?? 0,
      status: employee.status.toLowerCase(),
      statutory: {
        paye: employee.statutory?.payeApplicable ?? true,
        personalRelief: employee.statutory?.personalRelief ?? true,
        shif: employee.statutory?.shifApplicable ?? true,
        nssf: employee.statutory?.nssfApplicable ?? true,
        housingLevy: employee.statutory?.housingLevyApplicable ?? true
      }
    }));
  });
}

export async function listEmployeeDocuments() {
  return useDatabase(async () => {
    const documents = await prisma.employeeDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        employee: true
      }
    });

    return documents.map((document) => ({
      id: document.id,
      employeeId: document.employeeId,
      employeeName: document.employee.preferredName ?? document.employee.legalName,
      category: document.category,
      name: document.name,
      restricted: document.restricted,
      expiresAt: isoDate(document.expiresAt),
      version: document.version
    }));
  });
}

type EmployeeApprovalPayload = {
  employeeNumber: string;
  legalName: string;
  companyEmail?: string | undefined;
  hireDate: string;
};

function normalizeApprovalRequestStatus(status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED") {
  switch (status) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    default:
      return "pending_approval";
  }
}

function mapEmployeeApprovalRequest(record: {
  id: string;
  tenantId: string;
  requestedByUserId: string | null;
  requestedByEmail: string;
  requestedByName: string;
  approverRole: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  payload: Prisma.JsonValue;
  approvedEmployeeId: string | null;
  decisionComments: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const payload = record.payload as EmployeeApprovalPayload;

  return {
    id: record.id,
    tenantId: record.tenantId,
    requestedByUserId: record.requestedByUserId,
    requestedByEmail: record.requestedByEmail,
    requestedByName: record.requestedByName,
    approverRole: record.approverRole,
    status: normalizeApprovalRequestStatus(record.status),
    payload,
    approvedEmployeeId: record.approvedEmployeeId,
    decisionComments: record.decisionComments,
    decidedAt: record.decidedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export async function listEmployeeApprovalRequests() {
  return useDatabase(async () => {
    const requests = await prisma.employeeApprovalRequest.findMany({
      orderBy: { createdAt: "desc" }
    });

    return requests.map(mapEmployeeApprovalRequest);
  });
}

export async function createEmployeeApprovalRequestRecord(input: {
  tenantId: string;
  requestedByUserId?: string | null;
  requestedByEmail: string;
  requestedByName: string;
  approverRole: string;
  payload: EmployeeApprovalPayload;
}) {
  return useDatabase(async () => {
    const request = await prisma.$transaction(
      async (transaction) => {
        const createdRequest = await transaction.employeeApprovalRequest.create({
          data: {
            tenantId: input.tenantId,
            requestedByUserId: input.requestedByUserId ?? null,
            requestedByEmail: input.requestedByEmail,
            requestedByName: input.requestedByName,
            approverRole: input.approverRole,
            payload: input.payload
          }
        });

        await createWorkflowInstanceForEntity(transaction, {
          tenantId: input.tenantId,
          definitionCode: "employee-create-approval",
          entityType: "employee_request",
          entityId: createdRequest.id
        });

        return createdRequest;
      },
      { timeout: 15000, maxWait: 5000 }
    );

    return mapEmployeeApprovalRequest(request);
  });
}

export async function findEmployeeApprovalRequestById(id: string) {
  return useDatabase(async () => {
    const request = await prisma.employeeApprovalRequest.findUnique({
      where: { id }
    });

    return request ? mapEmployeeApprovalRequest(request) : null;
  });
}

export async function decideEmployeeApprovalRequestRecord(
  id: string,
  decision: "approved" | "rejected",
  input: {
    approverUserId: string;
    comments?: string | undefined;
    approvedEmployeeId?: string | null;
  }
) {
  return useDatabase(async () => {
    const request = await prisma.$transaction(
      async (transaction) => {
        const existing = await transaction.employeeApprovalRequest.findUnique({
          where: { id },
          select: { tenantId: true }
        });

        const updated = await transaction.employeeApprovalRequest.update({
          where: { id },
          data: {
            status: decision === "approved" ? "APPROVED" : "REJECTED",
            decisionComments: input.comments ?? null,
            approvedEmployeeId: input.approvedEmployeeId ?? null,
            decidedAt: new Date()
          }
        });

        if (existing) {
          await decideWorkflowInstanceForEntity(transaction, {
            tenantId: existing.tenantId,
            entityType: "employee_request",
            entityId: id,
            decision: decision === "approved" ? "approve" : "reject",
            approverUserId: input.approverUserId,
            comments: input.comments
          });
        }

        return updated;
      },
      { timeout: 15000, maxWait: 5000 }
    );

    return mapEmployeeApprovalRequest(request);
  });
}

function classifyAuditRisk(action: string) {
  if (
    action.includes("terminate") ||
    action.includes("payroll") ||
    action.includes("bank") ||
    action.includes("approve")
  ) {
    return "high";
  }

  if (action.includes("export") || action.includes("create") || action.includes("update")) {
    return "medium";
  }

  return "low";
}

function inferAuditModule(entityType: string, action: string) {
  if (entityType.includes("leave") || action.startsWith("leave.")) {
    return "leave";
  }

  if (entityType.includes("payroll") || action.startsWith("payroll.")) {
    return "payroll";
  }

  if (entityType.includes("offer") || entityType.includes("candidate") || action.startsWith("recruitment.")) {
    return "recruitment";
  }

  if (entityType.includes("welfare") || entityType.includes("disciplinary") || action.startsWith("relations.")) {
    return "relations";
  }

  if (entityType.includes("employee") || action.startsWith("employees.")) {
    return "employees";
  }

  if (entityType.includes("report") || action.includes(".export")) {
    return "reports";
  }

  return "system";
}

export async function listAuditLogs() {
  return useDatabase(async () => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        actor: true
      }
    });

    return logs.map((log) => ({
      id: log.id,
      actorName: log.actor?.name ?? log.actor?.email ?? "System",
      actorEmail: log.actor?.email ?? "system@solvahr.app",
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      module: inferAuditModule(log.entityType, log.action),
      riskLevel: classifyAuditRisk(log.action),
      summary: `${log.action} on ${log.entityType}${log.entityId ? ` ${log.entityId}` : ""}`.trim(),
      createdAt: log.createdAt.toISOString(),
      ipAddress: log.ipAddress ?? "unknown"
    }));
  });
}

export async function listLeaveRequests() {
  return useDatabase(async () => {
    const requests = await prisma.leaveRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        employee: true,
        leaveType: true,
        approvals: true
      }
    });

    return requests.map((request) => ({
      id: request.id,
      employeeName: request.employee.preferredName ?? request.employee.legalName,
      type: request.leaveType.name,
      days: decimalToNumber(request.days),
      startDate: isoDate(request.startDate),
      endDate: isoDate(request.endDate),
      status: request.status.toLowerCase(),
      approver: request.approvals[0]?.approverUserId ?? null
    }));
  });
}

export async function listLeaveTypes() {
  return useDatabase(async () => {
    const leaveTypes = await prisma.leaveType.findMany({
      orderBy: { name: "asc" },
      include: {
        policy: true
      }
    });

    return leaveTypes.map((leaveType) => ({
      id: leaveType.id,
      code: leaveType.code,
      name: leaveType.name,
      requiresAttachment: leaveType.requiresAttachment,
      allowHalfDay: leaveType.allowHalfDay,
      annualEntitlement: decimalToNumber(leaveType.policy?.annualEntitlement),
      accrualMethod: leaveType.policy?.accrualMethod ?? null
    }));
  });
}

export async function listLeaveBalances() {
  return useDatabase(async () => {
    const balances = await prisma.leaveBalance.findMany({
      orderBy: [{ periodYear: "desc" }, { employee: { legalName: "asc" } }],
      include: {
        employee: true,
        leaveType: true
      }
    });

    return balances.map((balance) => ({
      id: balance.id,
      employeeId: balance.employeeId,
      employeeName: balance.employee.preferredName ?? balance.employee.legalName,
      employeeNumber: balance.employee.employeeNumber,
      leaveTypeCode: balance.leaveType.code,
      leaveTypeName: balance.leaveType.name,
      periodYear: balance.periodYear,
      opening: decimalToNumber(balance.opening) ?? 0,
      accrued: decimalToNumber(balance.accrued) ?? 0,
      taken: decimalToNumber(balance.taken) ?? 0,
      adjusted: decimalToNumber(balance.adjusted) ?? 0,
      closing: decimalToNumber(balance.closing) ?? 0
    }));
  });
}

export async function listRequisitions() {
  return useDatabase(async () => {
    const requisitions = await prisma.requisition.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        department: true
      }
    });

    const workflowStates = await listWorkflowStatesForEntities(
      requisitions.map((requisition) => ({
        entityType: "requisition",
        entityId: requisition.id
      }))
    );
    const workflowStateMap = new Map((workflowStates ?? []).map((item) => [`requisition:${item.entityId}`, item]));

    return requisitions.map((requisition) => ({
      id: requisition.id,
      code: requisition.code,
      title: requisition.title,
      department: requisition.department?.name,
      hiringManager: requisition.hiringManagerId,
      headcount: requisition.headcount,
      budgetRange:
        requisition.budgetedSalaryMin && requisition.budgetedSalaryMax
          ? `KES ${requisition.budgetedSalaryMin} - ${requisition.budgetedSalaryMax}`
          : null,
      status: workflowStateMap.get(`requisition:${requisition.id}`)?.status ?? requisition.status.toLowerCase(),
      justification: requisition.justification,
      workflow: workflowStateMap.get(`requisition:${requisition.id}`) ?? null
    }));
  });
}

export async function listVacancies() {
  return useDatabase(async () => {
    const vacancies = await prisma.vacancy.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        department: true,
        _count: {
          select: { candidates: true }
        }
      }
    });

    return vacancies.map((vacancy) => ({
      id: vacancy.id,
      requisitionId: vacancy.requisitionId,
      code: vacancy.code,
      title: vacancy.title,
      department: vacancy.department?.name,
      location: vacancy.location,
      status: vacancy.status.toLowerCase(),
      closingDate: isoDate(vacancy.closingDate),
      candidateCount: vacancy._count.candidates
    }));
  });
}

export async function listCandidates() {
  return useDatabase(async () => {
    const candidates = await prisma.candidate.findMany({
      orderBy: { createdAt: "desc" }
    });

    return candidates.map((candidate) => ({
      id: candidate.id,
      vacancyId: candidate.vacancyId,
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      source: candidate.source,
      stage: candidate.stage.toLowerCase(),
      screeningScore: decimalToNumber(candidate.screeningScore),
      salaryExpectation: decimalToNumber(candidate.salaryExpectation),
      noticePeriod: candidate.noticePeriod
    }));
  });
}

export async function listInterviews() {
  return useDatabase(async () => {
    const interviews = await prisma.interview.findMany({
      orderBy: { scheduledAt: "asc" },
      include: {
        candidate: true,
        vacancy: true
      }
    });

    return interviews.map((interview) => ({
      id: interview.id,
      candidateName: interview.candidate.fullName,
      vacancyTitle: interview.vacancy.title,
      interviewType: interview.interviewType,
      scheduledAt: interview.scheduledAt.toISOString(),
      status: interview.status,
      panel: interview.panel
    }));
  });
}

export async function listOffers() {
  return useDatabase(async () => {
    const offers = await prisma.jobOffer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        candidate: true,
        vacancy: true
      }
    });

    const workflowStates = await listWorkflowStatesForEntities(
      offers.map((offer) => ({
        entityType: "job_offer",
        entityId: offer.id
      }))
    );
    const workflowStateMap = new Map((workflowStates ?? []).map((item) => [`job_offer:${item.entityId}`, item]));

    return offers.map((offer) => ({
      id: offer.id,
      candidateName: offer.candidate.fullName,
      vacancyTitle: offer.vacancy.title,
      status: workflowStateMap.get(`job_offer:${offer.id}`)?.status ?? offer.status.toLowerCase(),
      offeredSalary: decimalToNumber(offer.offeredSalary),
      proposedStartDate: isoDate(offer.proposedStartDate),
      workflow: workflowStateMap.get(`job_offer:${offer.id}`) ?? null
    }));
  });
}

export async function listOnboardingTasks() {
  return useDatabase(async () => {
    const tasks = await prisma.onboardingTask.findMany({
      orderBy: { dueDate: "asc" },
      include: {
        candidate: true,
        employee: true
      }
    });

    return tasks.map((task) => ({
      id: task.id,
      personName: task.candidate?.fullName ?? task.employee?.preferredName ?? task.employee?.legalName ?? "Unassigned",
      category: task.category,
      title: task.title,
      ownerRole: task.ownerRole,
      dueDate: isoDate(task.dueDate),
      status: task.status.toLowerCase()
    }));
  });
}

export async function listProbationReviews() {
  return useDatabase(async () => {
    const reviews = await prisma.probationReview.findMany({
      orderBy: { reviewDate: "asc" },
      include: { employee: true }
    });

    return reviews.map((review) => ({
      id: review.id,
      employeeName: review.employee.preferredName ?? review.employee.legalName,
      reviewDate: isoDate(review.reviewDate),
      manager: review.managerId,
      score: decimalToNumber(review.score),
      recommendation: review.recommendation,
      status: review.status.toLowerCase()
    }));
  });
}

export async function listDocumentTemplates() {
  return useDatabase(async () =>
    prisma.documentTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        status: true,
        mergeFields: true
      }
    })
  );
}

export async function listGeneratedDocuments() {
  return useDatabase(async () => {
    const documents = await prisma.generatedDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: { template: true }
    });

    const workflowStates = await listWorkflowStatesForEntities(
      documents.map((document) => ({
        entityType: "generated_document",
        entityId: document.id
      }))
    );
    const workflowStateMap = new Map((workflowStates ?? []).map((item) => [`generated_document:${item.entityId}`, item]));

    return documents.map((document) => ({
      id: document.id,
      templateCode: document.template.code,
      entityType: document.entityType,
      entityId: document.entityId,
      status: workflowStateMap.get(`generated_document:${document.id}`)?.status ?? document.status,
      preview: document.renderedBody,
      workflow: workflowStateMap.get(`generated_document:${document.id}`) ?? null
    }));
  });
}

export async function listTrainingRequests() {
  return useDatabase(async () => {
    const requests = await prisma.trainingRequest.findMany({
      orderBy: { requestedAt: "desc" }
    });

    const workflowStates = await listWorkflowStatesForEntities(
      requests.map((request) => ({
        entityType: "training_request",
        entityId: request.id
      }))
    );
    const workflowStateMap = new Map((workflowStates ?? []).map((item) => [`training_request:${item.entityId}`, item]));

    return requests.map((request) => ({
      id: request.id,
      code: request.code,
      employeeName: request.employeeName,
      courseTitle: request.courseTitle,
      manager: request.managerName,
      budgetTag: request.budgetTag,
      requestedAt: isoDate(request.requestedAt),
      status: workflowStateMap.get(`training_request:${request.id}`)?.status ?? request.status.toLowerCase(),
      workflow: workflowStateMap.get(`training_request:${request.id}`) ?? null
    }));
  });
}

export async function listOvertimeRequests() {
  return useDatabase(async () => {
    const requests = await prisma.overtimeRequest.findMany({
      orderBy: [{ shiftDate: "desc" }, { createdAt: "desc" }]
    });

    const workflowStates = await listWorkflowStatesForEntities(
      requests.map((request) => ({
        entityType: "overtime_request",
        entityId: request.id
      }))
    );
    const workflowStateMap = new Map((workflowStates ?? []).map((item) => [`overtime_request:${item.entityId}`, item]));

    return requests.map((request) => ({
      id: request.id,
      code: request.code,
      employeeName: request.employeeName,
      employeeNumber: request.employeeNumber,
      shiftDate: isoDate(request.shiftDate),
      hours: decimalToNumber(request.hours),
      reason: request.reason,
      approver: request.approverName,
      status: workflowStateMap.get(`overtime_request:${request.id}`)?.status ?? request.status.toLowerCase(),
      workflow: workflowStateMap.get(`overtime_request:${request.id}`) ?? null
    }));
  });
}

export async function getDashboardPayload() {
  return useDatabase(async () => {
    const [headcount, openVacancies, leavePending, offersPendingApproval, onboardingOpenTasks, probationReviewsDue] =
      await Promise.all([
        prisma.employee.count(),
        prisma.vacancy.count({ where: { status: "OPEN" } }),
        prisma.leaveRequest.count({ where: { status: "SUBMITTED" } }),
        prisma.jobOffer.count({ where: { status: "PENDING_APPROVAL" } }),
        prisma.onboardingTask.count({ where: { status: { not: "COMPLETED" } } }),
        prisma.probationReview.count({ where: { status: "SUBMITTED" } })
      ]);

    return {
      metrics: {
        ...dashboardMetrics,
        headcount,
        openVacancies,
        leavePending
      },
      phaseTwo: {
        ...phaseTwoMetrics,
        openVacancies,
        offersPendingApproval,
        onboardingOpenTasks,
        probationReviewsDue
      },
      payroll: buildDemoPayrollRun(),
      catalogues: demoCatalogues
    };
  });
}

export async function getCurrentPayrollRun() {
  return useDatabase(async () => {
    const run = await prisma.payrollRun.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        period: true,
        employees: {
          include: {
            employee: true,
            lines: true
          },
          orderBy: {
            employee: {
              legalName: "asc"
            }
          }
        }
      }
    });

    if (!run) {
      return null;
    }

    const workflowStates = await listWorkflowStatesForEntities([
      {
        entityType: "payroll_run",
        entityId: run.id
      }
    ]);
    const workflow = workflowStates?.[0] ?? null;

    const results = run.employees.map((runEmployee) => {
      const lines = runEmployee.lines.map((line) => ({
        code: line.code,
        name: line.name,
        kind:
          line.kind === "EARNING"
            ? "earning"
            : line.kind === "DEDUCTION"
              ? "deduction"
              : "employer_cost",
        amount: decimalToNumber(line.amount) ?? 0
      }));

      return {
        employeeId: runEmployee.employeeId,
        payrollNumber: runEmployee.employee.payrollNumber ?? runEmployee.employee.employeeNumber,
        displayName: runEmployee.employee.preferredName ?? runEmployee.employee.legalName,
        grossPay: decimalToNumber(runEmployee.grossPay) ?? 0,
        taxablePay: decimalToNumber(runEmployee.taxablePay) ?? 0,
        totalDeductions: decimalToNumber(runEmployee.totalDeductions) ?? 0,
        totalEmployerCosts: decimalToNumber(runEmployee.totalEmployerCosts) ?? 0,
        netPay: decimalToNumber(runEmployee.netPay) ?? 0,
        earnings: lines.filter((line) => line.kind === "earning"),
        deductions: lines.filter((line) => line.kind === "deduction"),
        employerCosts: lines.filter((line) => line.kind === "employer_cost"),
        exceptions: Array.isArray(runEmployee.exceptions) ? runEmployee.exceptions : []
      };
    });

    const totals = results.reduce(
      (accumulator, result) => ({
        grossPay: accumulator.grossPay + result.grossPay,
        deductions: accumulator.deductions + result.totalDeductions,
        employerCosts: accumulator.employerCosts + result.totalEmployerCosts,
        netPay: accumulator.netPay + result.netPay
      }),
      { grossPay: 0, deductions: 0, employerCosts: 0, netPay: 0 }
    );

    return {
      id: run.id,
      period: `${run.period.code} (${isoDate(run.period.startDate)} to ${isoDate(run.period.endDate)})`,
      cycle: run.cycle.toLowerCase(),
      status: workflow?.status ?? run.status.toLowerCase(),
      version: run.version,
      employeeCount: results.length,
      workflow,
      totals,
      results
    };
  });
}

export async function getCurrentPayrollReports() {
  const run = await getCurrentPayrollRun();

  if (!run) {
    return null;
  }

  const payrollRegister = run.results.map((result) => ({
    employeeId: result.employeeId,
    employee: result.displayName,
    payrollNumber: result.payrollNumber,
    grossPay: result.grossPay,
    taxablePay: result.taxablePay,
    totalDeductions: result.totalDeductions,
    employerCosts: result.totalEmployerCosts,
    netPay: result.netPay
  }));

  const statutorySummary = run.results
    .flatMap((result) => [...result.deductions, ...result.employerCosts])
    .filter((line) => ["PAYE", "SHIF", "NSSF_EE", "NSSF_ER", "AHL_EE", "AHL_ER"].includes(line.code))
    .reduce<Array<{ code: string; name: string; amount: number }>>((rows, line) => {
      const existing = rows.find((row) => row.code === line.code);
      if (existing) {
        existing.amount += line.amount;
      } else {
        rows.push({ code: line.code, name: line.name, amount: line.amount });
      }

      return rows;
    }, []);

  return {
    run: {
      id: run.id,
      period: run.period,
      cycle: run.cycle,
      status: run.status,
      employeeCount: run.employeeCount
    },
    reports: {
      payrollRegister,
      grossToNet: payrollRegister.map((row) => ({
        employee: row.employee,
        grossPay: row.grossPay,
        taxablePay: row.taxablePay,
        deductions: row.totalDeductions,
        netPay: row.netPay
      })),
      netToBank: payrollRegister.map((row) => ({
        employee: row.employee,
        payrollNumber: row.payrollNumber,
        paymentMode: "bank",
        bank: "Pending bank setup",
        accountNumber: "Pending",
        netPay: row.netPay
      })),
      statutorySummary,
      employerSpend: {
        grossPay: run.totals.grossPay,
        employerCosts: run.totals.employerCosts,
        totalSpend: run.totals.grossPay + run.totals.employerCosts
      }
    }
  };
}

export async function listCurrentPayslips(): Promise<CurrentPayslipPayload[] | null> {
  return useDatabase(async () => {
    const run = await prisma.payrollRun.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        period: true,
        employees: {
          orderBy: {
            employee: {
              legalName: "asc"
            }
          },
          include: {
            employee: {
              include: {
                branch: true,
                department: true,
                bankDetails: true
              }
            },
            lines: true,
            payslip: true
          }
        }
      }
    });

    if (!run) {
      return [];
    }

    return run.employees.map((runEmployee) => {
      const payload: CurrentPayslipPayload =
        runEmployee.payslip?.payload && typeof runEmployee.payslip.payload === "object"
          ? (runEmployee.payslip.payload as unknown as CurrentPayslipPayload)
          : {
              payslipId: runEmployee.payslip?.id ?? `draft-${runEmployee.id}`,
              runId: run.id,
              runEmployeeId: runEmployee.id,
              status: runEmployee.payslip?.releasedAt ? "released" : "draft",
              generatedAt: new Date().toISOString(),
              releasedAt: runEmployee.payslip?.releasedAt?.toISOString() ?? null,
              company: {
                name: "Solva Demo Manufacturing",
                country: "KE"
              },
              period: {
                label: `${run.period.code} (${isoDate(run.period.startDate)} to ${isoDate(run.period.endDate)})`,
                code: run.period.code,
                cycle: run.cycle.toLowerCase(),
                startDate: isoDate(run.period.startDate),
                endDate: isoDate(run.period.endDate),
                payDate: isoDate(run.period.payDate)
              },
              employee: {
                employeeId: runEmployee.employee.id,
                displayName: runEmployee.employee.preferredName ?? runEmployee.employee.legalName,
                legalName: runEmployee.employee.legalName,
                employeeNumber: runEmployee.employee.employeeNumber,
                payrollNumber: runEmployee.employee.payrollNumber ?? runEmployee.employee.employeeNumber,
                department: runEmployee.employee.department?.name ?? null,
                branch: runEmployee.employee.branch?.name ?? null,
                paymentMode: runEmployee.employee.bankDetails?.paymentMode ?? "bank",
                bankName: runEmployee.employee.bankDetails?.bankName ?? "Pending bank setup",
                accountNumber: maskAccountNumber(runEmployee.employee.bankDetails?.accountNumber)
              },
              earnings: runEmployee.lines
                .filter((line) => line.kind === "EARNING")
                .map((line) => ({
                  code: line.code,
                  name: line.name,
                  kind: normalizePayComponentKind(line.kind),
                  amount: decimalToNumber(line.amount) ?? 0
                })),
              deductions: runEmployee.lines
                .filter((line) => line.kind === "DEDUCTION")
                .map((line) => ({
                  code: line.code,
                  name: line.name,
                  kind: normalizePayComponentKind(line.kind),
                  amount: decimalToNumber(line.amount) ?? 0
                })),
              employerCosts: runEmployee.lines
                .filter((line) => line.kind === "EMPLOYER_COST")
                .map((line) => ({
                  code: line.code,
                  name: line.name,
                  kind: normalizePayComponentKind(line.kind),
                  amount: decimalToNumber(line.amount) ?? 0
                })),
              totals: {
                grossPay: decimalToNumber(runEmployee.grossPay) ?? 0,
                taxablePay: decimalToNumber(runEmployee.taxablePay) ?? 0,
                totalDeductions: decimalToNumber(runEmployee.totalDeductions) ?? 0,
                totalEmployerCosts: decimalToNumber(runEmployee.totalEmployerCosts) ?? 0,
                netPay: decimalToNumber(runEmployee.netPay) ?? 0
              }
            };

      return payload;
    });
  });
}

export async function releaseCurrentPayslips() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const payslips = await listCurrentPayslips();
  if (!payslips || !Array.isArray(payslips) || !payslips.length) {
    return [];
  }

  const releasedAt = new Date();

  await prisma.$transaction(
    payslips.map((payslip) =>
      prisma.payrollPayslip.upsert({
        where: {
          runEmployeeId: String(payslip.runEmployeeId)
        },
        update: {
          releasedAt,
          payload: {
            ...(payslip as Record<string, unknown>),
            status: "released",
            releasedAt: releasedAt.toISOString()
          }
        },
        create: {
          runEmployeeId: String(payslip.runEmployeeId),
          releasedAt,
          payload: {
            ...(payslip as Record<string, unknown>),
            status: "released",
            releasedAt: releasedAt.toISOString()
          }
        }
      })
    )
  );

  return listCurrentPayslips();
}

export async function createEmployee(tenantId: string, input: {
  employeeNumber: string;
  payrollNumber?: string | undefined;
  legalName: string;
  preferredName?: string | undefined;
  companyEmail?: string | undefined;
  phone?: string | undefined;
  hireDate: string;
  departmentId?: string | undefined;
  branchId?: string | undefined;
  positionId?: string | undefined;
  gradeId?: string | undefined;
  costCenterId?: string | undefined;
}) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.employee.create({
    data: {
      tenantId,
      employeeNumber: input.employeeNumber,
      payrollNumber: input.payrollNumber ?? null,
      legalName: input.legalName,
      preferredName: input.preferredName ?? null,
      companyEmail: input.companyEmail ?? null,
      phone: input.phone ?? null,
      hireDate: new Date(input.hireDate),
      departmentId: input.departmentId ?? null,
      branchId: input.branchId ?? null,
      positionId: input.positionId ?? null,
      gradeId: input.gradeId ?? null,
      costCenterId: input.costCenterId ?? null
    }
  });
}

export async function createCandidate(tenantId: string, input: {
  vacancyId?: string | undefined;
  fullName: string;
  email: string;
  phone?: string | undefined;
  source?: string | undefined;
  salaryExpectation?: number | undefined;
  noticePeriod?: string | undefined;
  notes?: string | undefined;
}) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.candidate.create({
    data: {
      tenantId,
      vacancyId: input.vacancyId ?? null,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone ?? null,
      source: input.source ?? null,
      salaryExpectation: input.salaryExpectation ?? null,
      noticePeriod: input.noticePeriod ?? null,
      notes: input.notes ?? null
    }
  });
}

export async function createLeaveRequest(input: {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string | undefined;
}) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.$transaction(
    async (transaction) => {
      const employee = await transaction.employee.findUnique({
        where: { id: input.employeeId },
        select: { tenantId: true }
      });

      const leaveRequest = await transaction.leaveRequest.create({
        data: {
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          days: input.days,
          reason: input.reason ?? null
        }
      });

      if (employee) {
        await createWorkflowInstanceForEntity(transaction, {
          tenantId: employee.tenantId,
          definitionCode: "leave-approval",
          entityType: "leave_request",
          entityId: leaveRequest.id
        });
      }

      return leaveRequest;
    },
    { timeout: 15000, maxWait: 5000 }
  );
}

export async function decideLeaveRequest(
  id: string,
  decision: "APPROVED" | "REJECTED",
  input: {
    approverUserId: string;
    comments?: string | undefined;
  }
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.$transaction(
    async (transaction) => {
      const existingRequest = await transaction.leaveRequest.findUnique({
        where: { id },
        include: {
          employee: true,
          leaveType: true,
          approvals: true
        }
      });

      if (!existingRequest) {
        return null;
      }

      await transaction.leaveApproval.create({
        data: {
          leaveRequestId: id,
          approverUserId: input.approverUserId,
          step: existingRequest.approvals.length + 1,
          status: decision,
          comments: input.comments ?? null,
          decidedAt: new Date()
        }
      });

      const workflowState = await decideWorkflowInstanceForEntity(transaction, {
        tenantId: existingRequest.employee.tenantId,
        entityType: "leave_request",
        entityId: id,
        decision: decision === "APPROVED" ? "approve" : "reject",
        approverUserId: input.approverUserId,
        comments: input.comments
      });

      const leaveRequest = await transaction.leaveRequest.update({
        where: { id },
        data: {
          status:
            workflowState?.status === "approved"
              ? "APPROVED"
              : workflowState?.status === "rejected"
                ? "REJECTED"
                : "SUBMITTED"
        },
        include: {
          employee: true,
          leaveType: true,
          approvals: true
        }
      });

      return {
        id: leaveRequest.id,
        employeeName: leaveRequest.employee.preferredName ?? leaveRequest.employee.legalName,
        type: leaveRequest.leaveType.name,
        days: decimalToNumber(leaveRequest.days),
        startDate: isoDate(leaveRequest.startDate),
        endDate: isoDate(leaveRequest.endDate),
        status: workflowState?.status === "submitted" ? "submitted" : leaveRequest.status.toLowerCase(),
        approver: input.approverUserId
      };
    },
    { timeout: 15000, maxWait: 5000 }
  );
}

export async function decideOfferApproval(
  id: string,
  decision: "approve" | "reject",
  input: {
    approverUserId: string;
    comments?: string | undefined;
  }
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.$transaction(
    async (transaction) => {
      const offer = await transaction.jobOffer.findUnique({
        where: { id },
        include: {
          candidate: true,
          vacancy: true
        }
      });

      if (!offer) {
        return null;
      }

      const workflowState = await ensureWorkflowInstanceForEntity(transaction, {
        tenantId: offer.tenantId,
        definitionCode: "offer-approval",
        entityType: "job_offer",
        entityId: offer.id
      });

      const nextWorkflowState = workflowState
        ? await decideWorkflowInstanceForEntity(transaction, {
            tenantId: offer.tenantId,
            entityType: "job_offer",
            entityId: offer.id,
            decision,
            approverUserId: input.approverUserId,
            comments: input.comments
          })
        : null;

      const updatedOffer = await transaction.jobOffer.update({
        where: { id },
        data: {
          status:
            nextWorkflowState?.status === "approved"
              ? "APPROVED"
              : nextWorkflowState?.status === "rejected"
                ? "WITHDRAWN"
                : "PENDING_APPROVAL"
        }
      });

      return {
        id: updatedOffer.id,
        candidateName: offer.candidate.fullName,
        vacancyTitle: offer.vacancy.title,
        status: nextWorkflowState?.status ?? updatedOffer.status.toLowerCase(),
        offeredSalary: decimalToNumber(updatedOffer.offeredSalary),
        proposedStartDate: isoDate(updatedOffer.proposedStartDate),
        workflow: nextWorkflowState ?? workflowState
      };
    },
    { timeout: 15000, maxWait: 5000 }
  );
}

export async function decideRequisitionApproval(
  id: string,
  decision: "approve" | "reject",
  input: {
    approverUserId: string;
    comments?: string | undefined;
  }
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.$transaction(
    async (transaction) => {
      const requisition = await transaction.requisition.findUnique({
        where: { id },
        include: {
          department: true
        }
      });

      if (!requisition) {
        return null;
      }

      const workflowState = await ensureWorkflowInstanceForEntity(transaction, {
        tenantId: requisition.tenantId,
        definitionCode: "manpower-requisition-approval",
        entityType: "requisition",
        entityId: requisition.id
      });

      const nextWorkflowState = workflowState
        ? await decideWorkflowInstanceForEntity(transaction, {
            tenantId: requisition.tenantId,
            entityType: "requisition",
            entityId: requisition.id,
            decision,
            approverUserId: input.approverUserId,
            comments: input.comments
          })
        : null;

      const updatedRequisition = await transaction.requisition.update({
        where: { id },
        data: {
          status:
            nextWorkflowState?.status === "approved"
              ? "APPROVED"
              : nextWorkflowState?.status === "rejected"
                ? "REJECTED"
                : "SUBMITTED"
        },
        include: {
          department: true
        }
      });

      return {
        id: updatedRequisition.id,
        code: updatedRequisition.code,
        title: updatedRequisition.title,
        department: updatedRequisition.department?.name,
        hiringManager: updatedRequisition.hiringManagerId,
        headcount: updatedRequisition.headcount,
        budgetRange:
          updatedRequisition.budgetedSalaryMin && updatedRequisition.budgetedSalaryMax
            ? `KES ${updatedRequisition.budgetedSalaryMin} - ${updatedRequisition.budgetedSalaryMax}`
            : null,
        status: nextWorkflowState?.status ?? updatedRequisition.status.toLowerCase(),
        justification: updatedRequisition.justification,
        workflow: nextWorkflowState ?? workflowState
      };
    },
    { timeout: 15000, maxWait: 5000 }
  );
}

export async function decideGeneratedDocumentApproval(
  id: string,
  decision: "approve" | "reject",
  input: {
    approverUserId: string;
    comments?: string | undefined;
  }
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.$transaction(
    async (transaction) => {
      const document = await transaction.generatedDocument.findUnique({
        where: { id },
        include: { template: true }
      });

      if (!document) {
        return null;
      }

      const workflowState = await ensureWorkflowInstanceForEntity(transaction, {
        tenantId: document.tenantId,
        definitionCode: "document-approval",
        entityType: "generated_document",
        entityId: document.id
      });

      const nextWorkflowState = workflowState
        ? await decideWorkflowInstanceForEntity(transaction, {
            tenantId: document.tenantId,
            entityType: "generated_document",
            entityId: document.id,
            decision,
            approverUserId: input.approverUserId,
            comments: input.comments
          })
        : null;

      const updatedDocument = await transaction.generatedDocument.update({
        where: { id },
        data: {
          status:
            nextWorkflowState?.status === "approved"
              ? "approved"
              : nextWorkflowState?.status === "rejected"
                ? "rejected"
                : "submitted"
        },
        include: { template: true }
      });

      return {
        id: updatedDocument.id,
        templateCode: updatedDocument.template.code,
        entityType: updatedDocument.entityType,
        entityId: updatedDocument.entityId,
        status: nextWorkflowState?.status ?? updatedDocument.status,
        preview: updatedDocument.renderedBody,
        workflow: nextWorkflowState ?? workflowState
      };
    },
    { timeout: 15000, maxWait: 5000 }
  );
}

export async function decideTrainingRequestApproval(
  id: string,
  decision: "approve" | "reject",
  input: {
    approverUserId: string;
    comments?: string | undefined;
  }
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.$transaction(
    async (transaction) => {
      const request = await transaction.trainingRequest.findUnique({
        where: { id }
      });

      if (!request) {
        return null;
      }

      const workflowState = await ensureWorkflowInstanceForEntity(transaction, {
        tenantId: request.tenantId,
        definitionCode: "training-request-approval",
        entityType: "training_request",
        entityId: request.id
      });

      const nextWorkflowState = workflowState
        ? await decideWorkflowInstanceForEntity(transaction, {
            tenantId: request.tenantId,
            entityType: "training_request",
            entityId: request.id,
            decision,
            approverUserId: input.approverUserId,
            comments: input.comments
          })
        : null;

      const updatedRequest = await transaction.trainingRequest.update({
        where: { id },
        data: {
          status:
            nextWorkflowState?.status === "approved"
              ? "APPROVED"
              : nextWorkflowState?.status === "rejected"
                ? "REJECTED"
                : "SUBMITTED"
        }
      });

      return {
        id: updatedRequest.id,
        code: updatedRequest.code,
        employeeName: updatedRequest.employeeName,
        courseTitle: updatedRequest.courseTitle,
        manager: updatedRequest.managerName,
        budgetTag: updatedRequest.budgetTag,
        requestedAt: isoDate(updatedRequest.requestedAt),
        status: nextWorkflowState?.status ?? updatedRequest.status.toLowerCase(),
        workflow: nextWorkflowState ?? workflowState
      };
    },
    { timeout: 15000, maxWait: 5000 }
  );
}

export async function decideOvertimeRequestApproval(
  id: string,
  decision: "approve" | "reject",
  input: {
    approverUserId: string;
    comments?: string | undefined;
  }
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.$transaction(
    async (transaction) => {
      const request = await transaction.overtimeRequest.findUnique({
        where: { id }
      });

      if (!request) {
        return null;
      }

      const workflowState = await ensureWorkflowInstanceForEntity(transaction, {
        tenantId: request.tenantId,
        definitionCode: "overtime-approval",
        entityType: "overtime_request",
        entityId: request.id
      });

      const nextWorkflowState = workflowState
        ? await decideWorkflowInstanceForEntity(transaction, {
            tenantId: request.tenantId,
            entityType: "overtime_request",
            entityId: request.id,
            decision,
            approverUserId: input.approverUserId,
            comments: input.comments
          })
        : null;

      const updatedRequest = await transaction.overtimeRequest.update({
        where: { id },
        data: {
          status:
            nextWorkflowState?.status === "approved"
              ? "APPROVED"
              : nextWorkflowState?.status === "rejected"
                ? "REJECTED"
                : "SUBMITTED"
        }
      });

      return {
        id: updatedRequest.id,
        code: updatedRequest.code,
        employeeName: updatedRequest.employeeName,
        employeeNumber: updatedRequest.employeeNumber,
        shiftDate: isoDate(updatedRequest.shiftDate),
        hours: decimalToNumber(updatedRequest.hours),
        reason: updatedRequest.reason,
        approver: updatedRequest.approverName,
        status: nextWorkflowState?.status ?? updatedRequest.status.toLowerCase(),
        workflow: nextWorkflowState ?? workflowState
      };
    },
    { timeout: 15000, maxWait: 5000 }
  );
}

export async function requestPayrollApproval() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const currentRun = await prisma.payrollRun.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      status: {
        in: ["DRAFT", "READY_FOR_REVIEW"]
      }
    }
  });

  if (!currentRun) {
    return null;
  }

  return prisma.$transaction(
    async (transaction) => {
      const workflowState = await ensureWorkflowInstanceForEntity(transaction, {
        tenantId: currentRun.tenantId,
        definitionCode: "payroll-approval",
        entityType: "payroll_run",
        entityId: currentRun.id
      });

      const updatedRun = await transaction.payrollRun.update({
        where: { id: currentRun.id },
        data: {
          status: "PENDING_APPROVAL"
        }
        });

      return {
        ...updatedRun,
        workflow: workflowState
      };
    },
    { timeout: 15000, maxWait: 5000 }
  );
}

export async function decidePayrollApproval(
  decision: "approve" | "reject",
  input: {
    approverUserId: string;
    comments?: string | undefined;
  }
) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const currentRun = await prisma.payrollRun.findFirst({
    orderBy: { createdAt: "desc" },
    where: {
      status: "PENDING_APPROVAL"
    }
  });

  if (!currentRun) {
    return null;
  }

  return prisma.$transaction(
    async (transaction) => {
      await ensureWorkflowInstanceForEntity(transaction, {
        tenantId: currentRun.tenantId,
        definitionCode: "payroll-approval",
        entityType: "payroll_run",
        entityId: currentRun.id
      });

      const workflowState = await decideWorkflowInstanceForEntity(transaction, {
        tenantId: currentRun.tenantId,
        entityType: "payroll_run",
        entityId: currentRun.id,
        decision,
        approverUserId: input.approverUserId,
        comments: input.comments
      });

      const updatedRun = await transaction.payrollRun.update({
        where: { id: currentRun.id },
        data: {
          status:
            workflowState?.status === "approved"
              ? "APPROVED"
              : workflowState?.status === "rejected"
                ? "READY_FOR_REVIEW"
                : "PENDING_APPROVAL"
        }
      });

      return {
        ...updatedRun,
        status: workflowState?.status ?? updatedRun.status.toLowerCase(),
        workflow: workflowState
      };
    },
    { timeout: 15000, maxWait: 5000 }
  );
}
