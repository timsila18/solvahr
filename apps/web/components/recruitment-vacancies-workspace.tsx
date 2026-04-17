"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type Requisition = {
  id: string;
  code: string;
  title: string;
  department?: string | null;
  hiringManager?: string | null;
  headcount: number;
  budgetRange?: string | null;
  status: string;
  justification: string;
  workflow?: {
    currentStepLabel?: string;
    currentOwnerRole?: string;
  } | null;
};

type Vacancy = {
  id: string;
  requisitionId?: string | null;
  code: string;
  title: string;
  department?: string | null;
  location?: string | null;
  status: string;
  closingDate?: string | null;
  candidateCount: number;
};

export function RecruitmentVacanciesWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [message, setMessage] = useState("Loading requisitions and vacancies");
  const [status, setStatus] = useState<"idle" | "acting">("idle");

  useEffect(() => {
    async function loadData() {
      const [requisitionResponse, vacancyResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/recruitment/requisitions`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/recruitment/vacancies`, {
          headers: session.headers,
          cache: "no-store"
        })
      ]);

      if (!requisitionResponse.ok || !vacancyResponse.ok) {
        throw new Error("Unable to load recruitment planning data");
      }

      const requisitionData = (await requisitionResponse.json()) as Requisition[];
      const vacancyData = (await vacancyResponse.json()) as Vacancy[];
      setRequisitions(requisitionData);
      setVacancies(vacancyData);
      setMessage(`${requisitionData.length} requisitions and ${vacancyData.length} vacancies loaded`);
    }

    loadData().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load recruitment planning data");
    });
  }, [apiBaseUrl, session.headers]);

  async function decideRequisition(id: string, decision: "approve" | "reject") {
    setStatus("acting");
    setMessage(`${decision === "approve" ? "Approving" : "Rejecting"} requisition`);

    const response = await fetch(`${apiBaseUrl}/api/recruitment/requisitions/${id}/${decision}-step`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify({
        comments: `${decision === "approve" ? "Approved" : "Rejected"} from requisition workspace`
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Requisition workflow action failed");
      return;
    }

    const updated = (await response.json()) as Requisition;
    setRequisitions((current) => current.map((item) => (item.id === id ? updated : item)));
    setStatus("idle");
    setMessage(`Requisition ${decision} step recorded`);
  }

  const openVacancies = vacancies.filter((vacancy) => vacancy.status === "open").length;
  const submittedRequisitions = requisitions.filter((requisition) => requisition.status === "submitted").length;

  return (
    <section className="recruitmentWorkspace" aria-label="Recruitment vacancies and requisitions">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Vacancies and Requisitions</p>
          <h2>Track approved hiring demand, active vacancies, budget range, and vacancy pressure by role.</h2>
        </div>
        <span className="status">Planning</span>
      </div>

      <div className="leaveSummaryGrid">
        <article>
          <span>Open Vacancies</span>
          <strong>{openVacancies}</strong>
        </article>
        <article>
          <span>Submitted Requisitions</span>
          <strong>{submittedRequisitions}</strong>
        </article>
        <article>
          <span>Candidate Load</span>
          <strong>{vacancies.reduce((total, vacancy) => total + vacancy.candidateCount, 0)}</strong>
        </article>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="recruitmentDetailGrid">
        <div className="reportTableWrap">
          <table className="reportTable">
            <thead>
              <tr>
                <th>Requisition</th>
                <th>Department</th>
                <th>Headcount</th>
                <th>Budget</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map((requisition) => (
                <tr key={requisition.id}>
                  <td>
                    {requisition.title}
                    <br />
                    {requisition.code}
                  </td>
                  <td>{requisition.department ?? "Unassigned"}</td>
                  <td>{requisition.headcount}</td>
                  <td>{requisition.budgetRange ?? "Pending budget"}</td>
                  <td>
                    {requisition.status}
                    {requisition.workflow?.currentStepLabel ? (
                      <>
                        <br />
                        {requisition.workflow.currentStepLabel} - {requisition.workflow.currentOwnerRole ?? "pending owner"}
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="compactList recruitmentInsightList">
          {requisitions.map((requisition) => (
            <article key={requisition.id}>
              <strong>{requisition.code} - {requisition.title}</strong>
              <span>
                {requisition.department ?? "Unassigned"} - {requisition.status} - {requisition.headcount} headcount
              </span>
              <span>{requisition.justification}</span>
              {["submitted", "pending_approval"].includes(requisition.status) ? (
                <div className="decisionActions workflowActionStack">
                  <button
                    className="secondaryButton"
                    disabled={
                      status === "acting" ||
                      !!requisition.workflow?.currentOwnerRole &&
                        session.role !== requisition.workflow.currentOwnerRole &&
                        session.role !== "company_admin"
                    }
                    onClick={() => decideRequisition(requisition.id, "approve")}
                    type="button"
                  >
                    Approve Step
                  </button>
                  <button
                    className="secondaryButton"
                    disabled={
                      status === "acting" ||
                      !!requisition.workflow?.currentOwnerRole &&
                        session.role !== requisition.workflow.currentOwnerRole &&
                        session.role !== "company_admin"
                    }
                    onClick={() => decideRequisition(requisition.id, "reject")}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {vacancies.map((vacancy) => (
            <article key={vacancy.id}>
              <strong>{vacancy.title}</strong>
              <span>
                {vacancy.location ?? "Location pending"} - {vacancy.status} - {vacancy.candidateCount} candidates
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
