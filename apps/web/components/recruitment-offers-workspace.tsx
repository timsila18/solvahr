"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type Interview = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
  interviewType: string;
  scheduledAt: string;
  status: string;
  panel: string[];
};

type Offer = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
  status: string;
  offeredSalary: number | null;
  proposedStartDate: string | null;
};

function money(value: number | null | undefined) {
  if (value == null) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(value);
}

export function RecruitmentOffersWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "approving">("loading");
  const [message, setMessage] = useState("Loading interviews and offers");

  async function loadData() {
    setStatus("loading");

    const [interviewResponse, offerResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/recruitment/interviews`, {
        headers: session.headers,
        cache: "no-store"
      }),
      fetch(`${apiBaseUrl}/api/recruitment/offers`, {
        headers: session.headers,
        cache: "no-store"
      })
    ]);

    if (!interviewResponse.ok || !offerResponse.ok) {
      throw new Error("Unable to load interviews and offers");
    }

    const interviewData = (await interviewResponse.json()) as Interview[];
    const offerData = (await offerResponse.json()) as Offer[];
    setInterviews(interviewData);
    setOffers(offerData);
    setStatus("idle");
    setMessage(`${interviewData.length} interviews and ${offerData.length} offers loaded`);
  }

  useEffect(() => {
    loadData().catch((error) => {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Unable to load interviews and offers");
    });
  }, [apiBaseUrl, session.headers]);

  async function approveOffer(id: string) {
    setStatus("approving");
    setMessage("Approving offer");

    const response = await fetch(`${apiBaseUrl}/api/recruitment/offers/${id}/approve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify({
        comments: "Approved from recruitment offers workspace"
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Offer could not be approved");
      return;
    }

    await loadData();
    setMessage("Offer approved in Supabase");
  }

  return (
    <section className="recruitmentWorkspace" aria-label="Recruitment offers and interviews">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Offers and Interviews</p>
          <h2>Keep interview scheduling and offer approvals in one operational view for faster hiring turnaround.</h2>
        </div>
        <span className="status">{status === "approving" ? "Approving" : "Live"}</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="recruitmentDetailGrid">
        <div className="compactList recruitmentInsightList">
          {interviews.map((interview) => (
            <article key={interview.id}>
              <strong>{interview.candidateName}</strong>
              <span>
                {interview.vacancyTitle} - {interview.interviewType} - {new Date(interview.scheduledAt).toLocaleString("en-KE")}
              </span>
            </article>
          ))}
        </div>

        <div className="offerList">
          {offers.map((offer) => (
            <article key={offer.id}>
              <div>
                <strong>{offer.candidateName}</strong>
                <span>
                  {offer.vacancyTitle} - {money(offer.offeredSalary)} - {offer.status}
                </span>
              </div>
              <button
                className="secondaryButton"
                disabled={status === "approving" || offer.status !== "pending_approval"}
                onClick={() => approveOffer(offer.id)}
                type="button"
              >
                Approve Offer
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
