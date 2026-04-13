import { Prisma } from "@prisma/client";
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

async function useDatabase<T>(query: () => Promise<T>): Promise<T | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return query();
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

export async function listRequisitions() {
  return useDatabase(async () => {
    const requisitions = await prisma.requisition.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        department: true
      }
    });

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
      status: requisition.status.toLowerCase(),
      justification: requisition.justification
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
        vacancy: true,
        workflowInstance: {
          include: { steps: { orderBy: { step: "asc" } } }
        }
      }
    });

    return offers.map((offer) => ({
      id: offer.id,
      candidateName: offer.candidate.fullName,
      vacancyTitle: offer.vacancy.title,
      status: offer.status.toLowerCase(),
      offeredSalary: decimalToNumber(offer.offeredSalary),
      proposedStartDate: isoDate(offer.proposedStartDate),
      workflow: offer.workflowInstance
        ? {
            entityType: offer.workflowInstance.entityType,
            entityId: offer.workflowInstance.entityId,
            status: offer.workflowInstance.status.toLowerCase(),
            currentStep: offer.workflowInstance.currentStep,
            steps: offer.workflowInstance.steps.map((step) => ({
              step: step.step,
              approverRole: step.approverRole,
              status: step.status.toLowerCase(),
              comments: step.comments,
              decidedAt: step.decidedAt?.toISOString()
            }))
          }
        : null
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

    return documents.map((document) => ({
      id: document.id,
      templateCode: document.template.code,
      entityType: document.entityType,
      entityId: document.entityId,
      status: document.status,
      preview: document.renderedBody
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

  return prisma.leaveRequest.create({
    data: {
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      days: input.days,
      reason: input.reason ?? null
    }
  });
}

export async function approveOffer(id: string, comments?: string | undefined) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const offer = await prisma.jobOffer.update({
    where: { id },
    data: {
      status: "APPROVED"
    }
  });

  if (comments) {
    await prisma.auditLog.create({
      data: {
        tenantId: offer.tenantId,
        action: "recruitment.offer.comment",
        entityType: "job_offer",
        entityId: offer.id,
        after: { comments }
      }
    });
  }

  return offer;
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

  return prisma.payrollRun.update({
    where: { id: currentRun.id },
    data: {
      status: "PENDING_APPROVAL"
    }
  });
}
