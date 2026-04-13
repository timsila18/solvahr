import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import {
  buildDemoPayrollRun,
  dashboardMetrics,
  demoCatalogues,
  demoCandidates,
  demoDocumentTemplates,
  demoEmployees,
  demoGeneratedDocuments,
  demoInterviews,
  demoLeaveRequests,
  demoOffers,
  demoOnboardingTasks,
  demoProbationReviews,
  demoRequisitions,
  demoTenant,
  demoVacancies,
  phaseTwoMetrics
} from "./demo-data.js";
import { asyncHandler, sendError } from "./http.js";
import { attachUserContext, requirePermission } from "./auth.js";
import { writeAuditLog } from "./audit.js";
import { getDatabaseStatus, prisma } from "./prisma.js";
import {
  approveOffer,
  createCandidate,
  createEmployee,
  createLeaveRequest,
  decideLeaveRequest,
  getDashboardPayload,
  listCandidates,
  listCompanies,
  listDocumentTemplates,
  listEmployees,
  listGeneratedDocuments,
  listInterviews,
  listLeaveRequests,
  listLeaveTypes,
  listOffers,
  listOnboardingTasks,
  listProbationReviews,
  listRequisitions,
  listVacancies,
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

app.get("/api/employees", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listEmployees, [...demoEmployees]));
}));

app.post(
  "/api/employees",
  requirePermission("employees.create"),
  asyncHandler(async (request, response) => {
    const input = createEmployeeSchema.parse(request.body);
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

app.get("/api/leave/requests", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listLeaveRequests, demoLeaveRequests));
}));

app.get("/api/leave/types", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listLeaveTypes, demoLeaveTypes));
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

app.get("/api/payroll/runs/current", (_request, response) => {
  response.json(buildDemoPayrollRun());
});

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
