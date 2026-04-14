"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type Vacancy = {
  id: string;
  code: string;
  title: string;
  department?: string | null;
  location?: string | null;
  status: string;
  candidateCount: number;
};

type Candidate = {
  id: string;
  vacancyId?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  stage: string;
  screeningScore?: number | null;
  salaryExpectation?: number | null;
  noticePeriod?: string | null;
};

type Offer = {
  id: string;
  candidateName: string;
  vacancyTitle: string;
  status: string;
  offeredSalary: number | null;
  proposedStartDate: string | null;
};

type CandidateForm = {
  vacancyId: string;
  fullName: string;
  email: string;
  phone: string;
  source: string;
  salaryExpectation: string;
  noticePeriod: string;
};

const initialForm: CandidateForm = {
  vacancyId: "",
  fullName: "",
  email: "",
  phone: "",
  source: "Careers Page",
  salaryExpectation: "",
  noticePeriod: ""
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

export function RecruitmentWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState<CandidateForm>(initialForm);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "approving">("loading");
  const [message, setMessage] = useState("Loading recruitment pipeline");

  async function loadRecruitment() {
    setStatus("loading");
    const headers = session.headers;
    const [vacancyResponse, candidateResponse, offerResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/recruitment/vacancies`, { headers, cache: "no-store" }),
      fetch(`${apiBaseUrl}/api/recruitment/candidates`, { headers, cache: "no-store" }),
      fetch(`${apiBaseUrl}/api/recruitment/offers`, { headers, cache: "no-store" })
    ]);

    if (!vacancyResponse.ok || !candidateResponse.ok || !offerResponse.ok) {
      throw new Error("Unable to load recruitment pipeline");
    }

    const vacancyData = (await vacancyResponse.json()) as Vacancy[];
    const candidateData = (await candidateResponse.json()) as Candidate[];
    const offerData = (await offerResponse.json()) as Offer[];

    setVacancies(vacancyData);
    setCandidates(candidateData);
    setOffers(offerData);
    setForm((current) => ({
      ...current,
      vacancyId: current.vacancyId || vacancyData[0]?.id || ""
    }));
    setStatus("idle");
    setMessage(`${candidateData.length} candidates and ${vacancyData.length} vacancies loaded from Supabase`);
  }

  useEffect(() => {
    loadRecruitment().catch((error) => {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Unable to load recruitment pipeline");
    });
  }, [apiBaseUrl, session.headers]);

  async function submitCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("Creating candidate record");

    const response = await fetch(`${apiBaseUrl}/api/recruitment/candidates`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify({
        vacancyId: form.vacancyId || undefined,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        source: form.source.trim() || undefined,
        salaryExpectation: form.salaryExpectation ? Number(form.salaryExpectation) : undefined,
        noticePeriod: form.noticePeriod.trim() || undefined
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Candidate could not be created");
      return;
    }

    setForm((current) => ({
      ...initialForm,
      vacancyId: current.vacancyId,
      source: current.source
    }));
    await loadRecruitment();
    setMessage("Candidate created in Supabase");
  }

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
        comments: "Approved from recruitment workspace"
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Offer could not be approved");
      return;
    }

    await loadRecruitment();
    setMessage("Offer approved in Supabase");
  }

  const stageCounts = candidates.reduce<Record<string, number>>((accumulator, candidate) => {
    accumulator[candidate.stage] = (accumulator[candidate.stage] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <section className="recruitmentWorkspace" id="recruitment-live" aria-label="Recruitment workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Recruitment Workspace</p>
          <h2>Track vacancies, add candidates, and approve offers from Supabase.</h2>
        </div>
        <span className="status">{status === "saving" ? "Saving" : status === "approving" ? "Approving" : "Live"}</span>
      </div>

      <div className="recruitmentGrid">
        <form className="recruitmentForm" onSubmit={submitCandidate}>
          <label>
            Vacancy
            <select
              required
              value={form.vacancyId}
              onChange={(event) => setForm((current) => ({ ...current, vacancyId: event.target.value }))}
            >
              {vacancies.map((vacancy) => (
                <option key={vacancy.id} value={vacancy.id}>
                  {vacancy.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Candidate name
            <input
              required
              minLength={2}
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              placeholder="Grace Wairimu"
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="grace@example.com"
            />
          </label>
          <div className="formSplit">
            <label>
              Source
              <input
                value={form.source}
                onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
              />
            </label>
            <label>
              Salary expectation
              <input
                min="0"
                type="number"
                value={form.salaryExpectation}
                onChange={(event) => setForm((current) => ({ ...current, salaryExpectation: event.target.value }))}
              />
            </label>
          </div>
          <label>
            Notice period
            <input
              value={form.noticePeriod}
              onChange={(event) => setForm((current) => ({ ...current, noticePeriod: event.target.value }))}
              placeholder="30 days"
            />
          </label>
          <button className="primaryButton" disabled={status === "saving" || !vacancies.length} type="submit">
            {status === "saving" ? "Creating..." : "Create Candidate"}
          </button>
          <p>{message}</p>
        </form>

        <div className="recruitmentLists">
          <div className="stageGrid">
            {Object.entries(stageCounts).map(([stage, count]) => (
              <article key={stage}>
                <span>{stage.replaceAll("_", " ")}</span>
                <strong>{count}</strong>
              </article>
            ))}
          </div>

          <div className="compactList">
            {vacancies.slice(0, 3).map((vacancy) => (
              <article key={vacancy.id}>
                <strong>{vacancy.title}</strong>
                <span>
                  {vacancy.code} - {vacancy.status} - {vacancy.candidateCount} candidates
                </span>
              </article>
            ))}
          </div>

          <div className="offerList">
            {offers.slice(0, 3).map((offer) => (
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
      </div>
    </section>
  );
}
