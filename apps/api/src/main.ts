import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import {
  buildDemoPayrollRun,
  dashboardMetrics,
  demoCatalogues,
  demoCandidates,
  demoDocumentTemplates,
  demoAuditLogs,
  demoAttendanceSummary,
  demoEmployeeDocuments,
  demoEmployees,
  demoGeneratedDocuments,
  demoGrievances,
  demoLeaveBalances,
  demoInterviews,
  demoLeaveRequests,
  demoOffers,
  demoOnboardingTasks,
  buildDemoPayslips,
  demoDisciplinaryCases,
  demoTrainingCatalog,
  demoTrainingRecords,
  demoTrainingRequests,
  demoPerformanceCycles,
  demoPerformanceGoals,
  demoPerformancePlans,
  demoPerformanceReviews,
  demoProbationReviews,
  demoRequisitions,
  demoTenant,
  demoTimesheets,
  demoOvertimeRequests,
  demoVacancies,
  demoWelfareCases,
  phaseTwoMetrics
} from "./demo-data.js";
import { asyncHandler, sendError } from "./http.js";
import { attachUserContext, requirePermission, userHasPermission } from "./auth.js";
import { writeAuditLog } from "./audit.js";
import { getDatabaseStatus, prisma } from "./prisma.js";
import {
  createEmployeeApprovalRequest,
  decideEmployeeApprovalRequest,
  findEmployeeApprovalRequest,
  listEmployeeApprovalRequests
} from "./runtime-store.js";
import {
  approveOffer,
  createCandidate,
  createEmployee,
  createLeaveRequest,
  decideLeaveRequest,
  getCurrentPayrollRun,
  getCurrentPayrollReports,
  getDashboardPayload,
  listCandidates,
  listCompanies,
  listAuditLogs,
  listDocumentTemplates,
  listEmployeeDocuments,
  listEmployees,
  listGeneratedDocuments,
  listLeaveBalances,
  listInterviews,
  listLeaveRequests,
  listLeaveTypes,
  listOffers,
  listCurrentPayslips,
  listOnboardingTasks,
  listProbationReviews,
  listRequisitions,
  listVacancies,
  releaseCurrentPayslips,
  requestPayrollApproval
} from "./repositories.js";
import {
  approvalDecisionSchema,
  createCandidateSchema,
  createEmployeeSchema,
  createLeaveRequestSchema
} from "./validators.js";

const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
const demoLeaveTypes = [
  { id: "leave-annual", code: "ANNUAL", name: "Annual Leave", requiresAttachment: false, allowHalfDay: true, annualEntitlement: 21, accrualMethod: "annual" },
  { id: "leave-sick", code: "SICK", name: "Sick Leave", requiresAttachment: true, allowHalfDay: true, annualEntitlement: 14, accrualMethod: "annual" },
  { id: "leave-compassionate", code: "COMPASSIONATE", name: "Compassionate Leave", requiresAttachment: false, allowHalfDay: false, annualEntitlement: 5, accrualMethod: "annual" }
];

function cloneForAudit<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function canActAsWorkflowOwner(userRoles: string[], ownerRole: string) {
  return userRoles.includes(ownerRole) || userRoles.includes("company_admin");
}

app.use(cors());
app.use(express.json());
app.use(attachUserContext);

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "solva-hris-api",
    timestamp: new Date().toISOString()
  });
});

app.get(
  "/ready",
  asyncHandler(async (_request, response) => {
    const database = await getDatabaseStatus();
    response.status(database.configured && !database.reachable ? 503 : 200).json({
      status: database.configured && !database.reachable ? "degraded" : "ready",
      service: "solva-hris-api",
      database,
      timestamp: new Date().toISOString()
    });
  })
);

async function withFallback<T>(query: () => Promise<T | null>, fallback: unknown): Promise<T | unknown> {
  try {
    const result = await query();
    return result ?? fallback;
  } catch (error) {
    console.warn("Using demo fallback after data query failed", error);
    return fallback;
  }
}

app.get("/api/dashboard", asyncHandler(async (_request, response) => {
  const persisted = (await withFallback(getDashboardPayload, null)) as Awaited<
    ReturnType<typeof getDashboardPayload>
  >;
  response.json({
    tenant: demoTenant,
    metrics: persisted?.metrics ?? dashboardMetrics,
    phaseTwo: persisted?.phaseTwo ?? phaseTwoMetrics,
    payroll: persisted?.payroll ?? buildDemoPayrollRun()
  });
}));

app.get("/api/companies", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listCompanies, [demoTenant]));
}));

app.get("/api/audit/logs", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listAuditLogs, demoAuditLogs));
}));

app.get("/api/attendance/summary", (_request, response) => {
  response.json(demoAttendanceSummary);
});

app.get("/api/attendance/timesheets", (_request, response) => {
  response.json(demoTimesheets);
});

app.get("/api/attendance/overtime", (_request, response) => {
  response.json(demoOvertimeRequests);
});

app.post("/api/attendance/overtime/:id/approve", (request, response) => {
  response.status(202).json({
    id: request.params.id,
    status: "approved",
    message: "Overtime approval recorded",
    persistence: "demo_fallback"
  });
});

app.get("/api/training/catalog", (_request, response) => {
  response.json(demoTrainingCatalog);
});

app.get("/api/training/requests", (_request, response) => {
  response.json(demoTrainingRequests);
});

app.get("/api/training/records", (_request, response) => {
  response.json(demoTrainingRecords);
});

app.get("/api/employees", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listEmployees, [...demoEmployees]));
}));

app.get("/api/employees/documents", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listEmployeeDocuments, demoEmployeeDocuments));
}));

app.get("/api/employee-requests", requirePermission("employees.view"), asyncHandler(async (_request, response) => {
  response.json(listEmployeeApprovalRequests());
}));

app.post(
  "/api/employees",
  asyncHandler(async (request, response) => {
    const canCreate = userHasPermission(request.user, "employees.create");
    const canApprove = userHasPermission(request.user, "employees.approve");

    if (!canCreate && !canApprove) {
      sendError(response, 403, "Forbidden", {
        permission: "employees.create"
      });
      return;
    }

    const input = createEmployeeSchema.parse(request.body);

    if (!canApprove) {
      const approvalRequest = createEmployeeApprovalRequest({
        tenantId: request.user.tenantId,
        requestedByUserId: request.user.id,
        requestedByEmail: request.user.email,
        requestedByName: request.user.email.split("@")[0] ?? request.user.email,
        approverRole: "supervisor",
        payload: input
      });

      await writeAuditLog({
        request,
        action: "employees.create.submitted",
        entityType: "employee_request",
        entityId: approvalRequest.id,
        after: approvalRequest
      });

      response.status(202).json({
        id: approvalRequest.id,
        status: approvalRequest.status,
        approverRole: approvalRequest.approverRole,
        message: "Employee creation submitted for supervisor approval"
      });
      return;
    }

    const employee = await createEmployee(request.user.tenantId, input);

    if (!employee) {
      sendError(response, 503, "Database is not configured for writes", {
        code: "database_not_configured"
      });
      return;
    }

    await writeAuditLog({
      request,
      action: "employees.create",
      entityType: "employee",
      entityId: employee.id,
      after: employee
    });

    response.status(201).json(employee);
  })
);

app.post(
  "/api/employee-requests/:id/approve",
  requirePermission("employees.approve"),
  asyncHandler(async (request, response) => {
    const employeeRequestId = request.params.id;
    if (!employeeRequestId) {
      sendError(response, 400, "Employee request id is required", { code: "missing_employee_request_id" });
      return;
    }

    const input = approvalDecisionSchema.parse(request.body);
    const pendingRequest = findEmployeeApprovalRequest(employeeRequestId);

    if (!pendingRequest) {
      sendError(response, 404, "Employee approval request not found", { code: "employee_request_not_found" });
      return;
    }

    if (!canActAsWorkflowOwner(request.user.roles, pendingRequest.approverRole)) {
      sendError(response, 403, "Forbidden", {
        permission: "employees.approve",
        ownerRole: pendingRequest.approverRole,
        roles: request.user.roles
      });
      return;
    }

    if (pendingRequest.requestedByUserId === request.user.id) {
      sendError(response, 409, "Requester cannot approve their own employee request", {
        code: "self_approval_not_allowed"
      });
      return;
    }

    const before = cloneForAudit(pendingRequest);
    const employee = await createEmployee(pendingRequest.tenantId, pendingRequest.payload);

    if (!employee) {
      sendError(response, 503, "Database is not configured for writes", {
        code: "database_not_configured"
      });
      return;
    }

    const approvalRequest = decideEmployeeApprovalRequest(employeeRequestId, "approved", input.comments);

    await writeAuditLog({
      request,
      action: "employees.create.approve",
      entityType: "employee_request",
      entityId: employeeRequestId,
      before,
      after: approvalRequest
    });

    response.status(202).json({
      id: employeeRequestId,
      status: approvalRequest?.status ?? "approved",
      employeeId: employee?.id ?? null,
      message: employee ? "Employee request approved and employee created" : "Employee request approved"
    });
  })
);

app.post(
  "/api/employee-requests/:id/reject",
  requirePermission("employees.approve"),
  asyncHandler(async (request, response) => {
    const employeeRequestId = request.params.id;
    if (!employeeRequestId) {
      sendError(response, 400, "Employee request id is required", { code: "missing_employee_request_id" });
      return;
    }

    const input = approvalDecisionSchema.parse(request.body);
    const pendingRequest = findEmployeeApprovalRequest(employeeRequestId);

    if (!pendingRequest) {
      sendError(response, 404, "Employee approval request not found", { code: "employee_request_not_found" });
      return;
    }

    if (!canActAsWorkflowOwner(request.user.roles, pendingRequest.approverRole)) {
      sendError(response, 403, "Forbidden", {
        permission: "employees.approve",
        ownerRole: pendingRequest.approverRole,
        roles: request.user.roles
      });
      return;
    }

    if (pendingRequest.requestedByUserId === request.user.id) {
      sendError(response, 409, "Requester cannot reject their own employee request", {
        code: "self_approval_not_allowed"
      });
      return;
    }

    const before = cloneForAudit(pendingRequest);
    const approvalRequest = decideEmployeeApprovalRequest(employeeRequestId, "rejected", input.comments);

    await writeAuditLog({
      request,
      action: "employees.create.reject",
      entityType: "employee_request",
      entityId: employeeRequestId,
      before,
      after: approvalRequest
    });

    response.status(202).json({
      id: employeeRequestId,
      status: approvalRequest?.status ?? "rejected",
      message: "Employee request rejected"
    });
  })
);

app.get("/api/leave/requests", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listLeaveRequests, demoLeaveRequests));
}));

app.get("/api/leave/types", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listLeaveTypes, demoLeaveTypes));
}));

app.get("/api/leave/balances", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listLeaveBalances, demoLeaveBalances));
}));

app.post(
  "/api/leave/requests",
  requirePermission("leave.apply"),
  asyncHandler(async (request, response) => {
    const input = createLeaveRequestSchema.parse(request.body);
    const leaveRequest = await createLeaveRequest(input);

    if (!leaveRequest) {
      sendError(response, 503, "Database is not configured for writes", {
        code: "database_not_configured"
      });
      return;
    }

    await writeAuditLog({
      request,
      action: "leave.request.create",
      entityType: "leave_request",
      entityId: leaveRequest.id,
      after: leaveRequest
    });

    response.status(201).json(leaveRequest);
  })
);

app.post(
  "/api/leave/requests/:id/approve",
  requirePermission("leave.approve"),
  asyncHandler(async (request, response) => {
    const leaveRequestId = request.params.id;
    if (!leaveRequestId) {
      sendError(response, 400, "Leave request id is required", { code: "missing_leave_request_id" });
      return;
    }

    const input = approvalDecisionSchema.parse(request.body);
    const leaveRequest = await decideLeaveRequest(leaveRequestId, "APPROVED", {
      approverUserId: request.user.id,
      comments: input.comments
    });

    if (!leaveRequest) {
      response.status(202).json({
        id: leaveRequestId,
        status: "approved",
        message: "Leave approval recorded",
        persistence: "demo_fallback"
      });
      return;
    }

    await writeAuditLog({
      request,
      action: "leave.request.approve",
      entityType: "leave_request",
      entityId: leaveRequest.id,
      after: leaveRequest
    });

    response.status(202).json(leaveRequest);
  })
);

app.post(
  "/api/leave/requests/:id/reject",
  requirePermission("leave.approve"),
  asyncHandler(async (request, response) => {
    const leaveRequestId = request.params.id;
    if (!leaveRequestId) {
      sendError(response, 400, "Leave request id is required", { code: "missing_leave_request_id" });
      return;
    }

    const input = approvalDecisionSchema.parse(request.body);
    const leaveRequest = await decideLeaveRequest(leaveRequestId, "REJECTED", {
      approverUserId: request.user.id,
      comments: input.comments
    });

    if (!leaveRequest) {
      response.status(202).json({
        id: leaveRequestId,
        status: "rejected",
        message: "Leave rejection recorded",
        persistence: "demo_fallback"
      });
      return;
    }

    await writeAuditLog({
      request,
      action: "leave.request.reject",
      entityType: "leave_request",
      entityId: leaveRequest.id,
      after: leaveRequest
    });

    response.status(202).json(leaveRequest);
  })
);

app.get("/api/recruitment/requisitions", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listRequisitions, demoRequisitions));
}));

app.get("/api/recruitment/vacancies", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listVacancies, demoVacancies));
}));

app.get("/api/recruitment/candidates", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listCandidates, [...demoCandidates]));
}));

app.post(
  "/api/recruitment/candidates",
  requirePermission("recruitment.manage"),
  asyncHandler(async (request, response) => {
    const input = createCandidateSchema.parse(request.body);
    const candidate = await createCandidate(request.user.tenantId, input);

    if (!candidate) {
      sendError(response, 503, "Database is not configured for writes", {
        code: "database_not_configured"
      });
      return;
    }

    await writeAuditLog({
      request,
      action: "recruitment.candidate.create",
      entityType: "candidate",
      entityId: candidate.id,
      after: candidate
    });

    response.status(201).json(candidate);
  })
);

app.get("/api/recruitment/interviews", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listInterviews, demoInterviews));
}));

app.get("/api/recruitment/offers", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listOffers, demoOffers));
}));

app.post(
  "/api/recruitment/offers/:id/approve",
  requirePermission("recruitment.approve_offers"),
  asyncHandler(async (request, response) => {
    const offerId = request.params.id;
    if (!offerId) {
      sendError(response, 400, "Offer id is required", { code: "missing_offer_id" });
      return;
    }

    const input = approvalDecisionSchema.parse(request.body);
    const offer = await approveOffer(offerId, input.comments);

    if (!offer) {
      response.status(202).json({
        id: offerId,
        status: "pending_next_approval",
        message: "Offer approval step recorded",
        auditAction: "recruitment.offer.approval.step",
        persistence: "demo_fallback"
      });
      return;
    }

    await writeAuditLog({
      request,
      action: "recruitment.offer.approve",
      entityType: "job_offer",
      entityId: offer.id,
      after: offer
    });

    response.status(202).json(offer);
  })
);

app.get("/api/onboarding/tasks", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listOnboardingTasks, demoOnboardingTasks));
}));

app.get("/api/probation/reviews", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listProbationReviews, demoProbationReviews));
}));

app.get("/api/documents/templates", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listDocumentTemplates, demoDocumentTemplates));
}));

app.get("/api/documents/generated", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listGeneratedDocuments, demoGeneratedDocuments));
}));

app.get("/api/welfare/cases", (_request, response) => {
  response.json(demoWelfareCases);
});

app.get("/api/welfare/grievances", (_request, response) => {
  response.json(demoGrievances);
});

app.get("/api/disciplinary/cases", (_request, response) => {
  response.json(demoDisciplinaryCases);
});

app.get("/api/workflows/overview", asyncHandler(async (_request, response) => {
  const employeeRequests = listEmployeeApprovalRequests();
  const [leaveRequests, offers, probationReviews, payrollRun] = await Promise.all([
    withFallback(listLeaveRequests, demoLeaveRequests),
    withFallback(listOffers, demoOffers),
    withFallback(listProbationReviews, demoProbationReviews),
    withFallback(getCurrentPayrollRun, buildDemoPayrollRun())
  ]);

  const definitions = demoCatalogues.workflowDefinitions;
  const leaveDefinition = definitions.find((item) => item.code === "leave-approval");
  const offerDefinition = definitions.find((item) => item.code === "offer-approval");
  const probationDefinition = definitions.find((item) => item.code === "probation-confirmation");
  const payrollDefinition = definitions.find((item) => item.code === "payroll-approval");

  const queue = [
    ...employeeRequests
      .filter((item) => item.status === "pending_approval")
      .map((item) => ({
        id: `employee-${item.id}`,
        module: "employees",
        entityId: item.id,
        subject: item.payload.legalName,
        title: "Employee creation request",
        status: item.status,
        currentStep: "Supervisor approval",
        ownerRole: item.approverRole,
        dueAt: item.payload.hireDate,
        summary: `${item.payload.employeeNumber} submitted by ${item.requestedByEmail}`,
        availableActions: canActAsWorkflowOwner(_request.user.roles, item.approverRole) ? ["approve", "reject"] : []
      })),
    ...((leaveRequests as typeof demoLeaveRequests)
      .filter((item) => item.status === "submitted")
      .map((item) => ({
        id: `leave-${item.id}`,
        module: "leave",
        entityId: item.id,
        subject: item.employeeName,
        title: item.type,
        status: item.status,
        currentStep: leaveDefinition?.steps[0]?.label ?? "Supervisor review",
        ownerRole: leaveDefinition?.steps[0]?.approverRole ?? "supervisor",
        dueAt: item.startDate,
        summary: `${item.days} day request from ${item.startDate} to ${item.endDate}`,
        availableActions: canActAsWorkflowOwner(_request.user.roles, leaveDefinition?.steps[0]?.approverRole ?? "supervisor")
          ? ["approve", "reject"]
          : []
      }))),
    ...((offers as typeof demoOffers)
      .filter((item) => item.status === "pending_approval")
      .map((item) => ({
        id: `offer-${item.id}`,
        module: "recruitment",
        entityId: item.id,
        subject: item.candidateName,
        title: item.vacancyTitle,
        status: item.status,
        currentStep: offerDefinition?.steps[0]?.label ?? "HR offer review",
        ownerRole: offerDefinition?.steps[0]?.approverRole ?? "hr_admin",
        dueAt: item.proposedStartDate,
        summary: `Offer at KES ${item.offeredSalary?.toLocaleString("en-KE") ?? "pending"} starting ${item.proposedStartDate ?? "TBC"}`,
        availableActions: canActAsWorkflowOwner(_request.user.roles, offerDefinition?.steps[0]?.approverRole ?? "hr_admin")
          ? ["approve"]
          : []
      }))),
    ...((probationReviews as typeof demoProbationReviews)
      .filter((item) => item.status !== "approved")
      .map((item) => ({
        id: `probation-${item.id}`,
        module: "probation",
        entityId: item.id,
        subject: item.employeeName,
        title: "Probation confirmation",
        status: item.status,
        currentStep: probationDefinition?.steps[0]?.label ?? "Manager recommendation",
        ownerRole: probationDefinition?.steps[0]?.approverRole ?? "manager",
        dueAt: item.reviewDate,
        summary: `Score ${item.score ?? 0} with recommendation ${item.recommendation}`,
        availableActions: [] as string[]
      }))),
    {
      id: `payroll-${(payrollRun as ReturnType<typeof buildDemoPayrollRun>).id}`,
      module: "payroll",
      entityId: (payrollRun as ReturnType<typeof buildDemoPayrollRun>).id,
      subject: (payrollRun as ReturnType<typeof buildDemoPayrollRun>).period,
      title: "Current payroll run",
      status: (payrollRun as ReturnType<typeof buildDemoPayrollRun>).status,
      currentStep: payrollDefinition?.steps[0]?.label ?? "Payroll admin review",
      ownerRole: payrollDefinition?.steps[0]?.approverRole ?? "payroll_admin",
      dueAt: "2026-04-30",
      summary: `${(payrollRun as ReturnType<typeof buildDemoPayrollRun>).employeeCount} employees, net ${(
        payrollRun as ReturnType<typeof buildDemoPayrollRun>
      ).totals.netPay.toLocaleString("en-KE")}`,
      availableActions:
        (payrollRun as ReturnType<typeof buildDemoPayrollRun>).status === "pending_approval" ||
        !canActAsWorkflowOwner(_request.user.roles, payrollDefinition?.steps[0]?.approverRole ?? "payroll_admin")
          ? []
          : ["request_approval"]
    }
  ];

  const escalations = queue.filter((item) => {
    if (!item.dueAt) {
      return false;
    }

    return new Date(item.dueAt).getTime() <= new Date("2026-04-20T00:00:00.000Z").getTime();
  });

  response.json({
    queue,
    escalations,
    definitions
  });
}));

app.get("/api/performance/cycles", (_request, response) => {
  response.json(demoPerformanceCycles);
});

app.get("/api/performance/goals", (_request, response) => {
  response.json(demoPerformanceGoals);
});

app.get("/api/performance/reviews", (_request, response) => {
  response.json(demoPerformanceReviews);
});

app.get("/api/performance/plans", (_request, response) => {
  response.json(demoPerformancePlans);
});

app.get("/api/payroll/runs/current", asyncHandler(async (_request, response) => {
  response.json(await withFallback(getCurrentPayrollRun, buildDemoPayrollRun()));
}));

app.get(
  "/api/payroll/payslips/current",
  requirePermission("payroll.view_sensitive"),
  asyncHandler(async (_request, response) => {
    response.json(await withFallback(listCurrentPayslips, buildDemoPayslips()));
  })
);

app.get("/api/payroll/reports/current", asyncHandler(async (_request, response) => {
  const demoRun = buildDemoPayrollRun();
  const demoReport = {
    run: {
      id: demoRun.id,
      period: demoRun.period,
      cycle: demoRun.cycle,
      status: demoRun.status,
      employeeCount: demoRun.employeeCount
    },
    reports: {
      payrollRegister: demoRun.results.map((result) => ({
        employee: result.payrollNumber,
        payrollNumber: result.payrollNumber,
        grossPay: result.grossPay,
        taxablePay: result.taxablePay,
        totalDeductions: result.totalDeductions,
        employerCosts: result.totalEmployerCosts,
        netPay: result.netPay
      })),
      grossToNet: demoRun.results.map((result) => ({
        employee: result.payrollNumber,
        grossPay: result.grossPay,
        taxablePay: result.taxablePay,
        deductions: result.totalDeductions,
        netPay: result.netPay
      })),
      netToBank: demoRun.results.map((result) => ({
        employee: result.payrollNumber,
        payrollNumber: result.payrollNumber,
        paymentMode: "bank",
        bank: "Pending bank setup",
        accountNumber: "Pending",
        netPay: result.netPay
      })),
      statutorySummary: [],
      employerSpend: {
        grossPay: demoRun.totals.grossPay,
        employerCosts: demoRun.totals.employerCosts,
        totalSpend: demoRun.totals.grossPay + demoRun.totals.employerCosts
      }
    }
  };

  response.json(await withFallback(getCurrentPayrollReports, demoReport));
}));

app.get("/api/reports/templates", (_request, response) => {
  response.json(demoCatalogues.reportTemplates);
});

app.get("/api/settings/catalogues", (_request, response) => {
  response.json(demoCatalogues);
});

app.post(
  "/api/payroll/runs/current/approve",
  requirePermission("payroll.approve"),
  asyncHandler(async (request, response) => {
    const payrollRun = await requestPayrollApproval();

    if (!payrollRun) {
      response.status(202).json({
        status: "pending_approval",
        message: "Payroll approval workflow started",
        auditAction: "payroll.approval.requested",
        persistence: "demo_fallback"
      });
      return;
    }

    await writeAuditLog({
      request,
      action: "payroll.approval.requested",
      entityType: "payroll_run",
      entityId: payrollRun.id,
      after: payrollRun
    });

    response.status(202).json(payrollRun);
  })
);

app.post(
  "/api/payroll/payslips/current/release",
  requirePermission("payroll.release_payslips"),
  asyncHandler(async (request, response) => {
    const payslips = await releaseCurrentPayslips();

    if (!payslips) {
      response.status(202).json({
        status: "released",
        message: "Payslips generated from demo payroll data",
        payslips: buildDemoPayslips().map((payslip) => ({
          ...payslip,
          status: "released",
          releasedAt: new Date().toISOString()
        })),
        persistence: "demo_fallback"
      });
      return;
    }

    await writeAuditLog({
      request,
      action: "payroll.release_payslips",
      entityType: "payroll_run",
      entityId: String(payslips[0]?.runId ?? "current"),
      after: {
        payslipCount: payslips.length,
        status: "released"
      }
    });

    response.status(202).json({
      status: "released",
      payslips
    });
  })
);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    sendError(response, 400, "Validation failed", {
      code: "validation_failed",
      issues: error.issues
    });
    return;
  }

  console.error(error);
  sendError(response, 500, "Unexpected API error", error instanceof Error ? error.message : error);
});

app.listen(port, () => {
  console.log(`Solva HRIS API listening on http://localhost:${port}`);
});

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown();
});

process.on("SIGINT", () => {
  void shutdown();
});
