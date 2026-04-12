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

app.get("/api/dashboard", (_request, response) => {
  response.json({
    tenant: demoTenant,
    metrics: dashboardMetrics,
    phaseTwo: phaseTwoMetrics,
    payroll: buildDemoPayrollRun()
  });
});

app.get("/api/companies", (_request, response) => {
  response.json([demoTenant]);
});

app.get("/api/employees", (_request, response) => {
  response.json(demoEmployees);
});

app.get("/api/leave/requests", (_request, response) => {
  response.json(demoLeaveRequests);
});

app.get("/api/recruitment/requisitions", (_request, response) => {
  response.json(demoRequisitions);
});

app.get("/api/recruitment/vacancies", (_request, response) => {
  response.json(demoVacancies);
});

app.get("/api/recruitment/candidates", (_request, response) => {
  response.json(demoCandidates);
});

app.get("/api/recruitment/interviews", (_request, response) => {
  response.json(demoInterviews);
});

app.get("/api/recruitment/offers", (_request, response) => {
  response.json(demoOffers);
});

app.post("/api/recruitment/offers/:id/approve", (request, response) => {
  response.status(202).json({
    id: request.params.id,
    status: "pending_next_approval",
    message: "Offer approval step recorded",
    auditAction: "recruitment.offer.approval.step"
  });
});

app.get("/api/onboarding/tasks", (_request, response) => {
  response.json(demoOnboardingTasks);
});

app.get("/api/probation/reviews", (_request, response) => {
  response.json(demoProbationReviews);
});

app.get("/api/documents/templates", (_request, response) => {
  response.json(demoDocumentTemplates);
});

app.get("/api/documents/generated", (_request, response) => {
  response.json(demoGeneratedDocuments);
});

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

app.listen(port, () => {
  console.log(`Solva HRIS API listening on http://localhost:${port}`);
});
