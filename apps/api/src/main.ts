import cors from "cors";
import express from "express";
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
import { getDatabaseStatus, prisma } from "./prisma.js";
import {
  getDashboardPayload,
  listCandidates,
  listCompanies,
  listDocumentTemplates,
  listEmployees,
  listGeneratedDocuments,
  listInterviews,
  listLeaveRequests,
  listOffers,
  listOnboardingTasks,
  listProbationReviews,
  listRequisitions,
  listVacancies
} from "./repositories.js";

const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

app.use(cors());
app.use(express.json());

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

app.get("/api/leave/requests", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listLeaveRequests, demoLeaveRequests));
}));

app.get("/api/recruitment/requisitions", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listRequisitions, demoRequisitions));
}));

app.get("/api/recruitment/vacancies", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listVacancies, demoVacancies));
}));

app.get("/api/recruitment/candidates", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listCandidates, [...demoCandidates]));
}));

app.get("/api/recruitment/interviews", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listInterviews, demoInterviews));
}));

app.get("/api/recruitment/offers", asyncHandler(async (_request, response) => {
  response.json(await withFallback(listOffers, demoOffers));
}));

app.post("/api/recruitment/offers/:id/approve", (request, response) => {
  response.status(202).json({
    id: request.params.id,
    status: "pending_next_approval",
    message: "Offer approval step recorded",
    auditAction: "recruitment.offer.approval.step"
  });
});

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

app.post("/api/payroll/runs/current/approve", (_request, response) => {
  response.status(202).json({
    status: "pending_approval",
    message: "Payroll approval workflow started",
    auditAction: "payroll.approval.requested"
  });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
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
