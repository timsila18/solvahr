"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type ProbationReview = {
  id: string;
  employeeName: string;
  reviewDate: string | null;
  manager: string | null;
  score: number | null;
  recommendation: string | null;
  status: string;
};

export function ProbationWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [reviews, setReviews] = useState<ProbationReview[]>([]);
  const [message, setMessage] = useState("Loading probation reviews");

  useEffect(() => {
    async function loadReviews() {
      const response = await fetch(`${apiBaseUrl}/api/probation/reviews`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load probation reviews");
      }

      const data = (await response.json()) as ProbationReview[];
      setReviews(data);
      setMessage(`${data.length} probation reviews loaded`);
    }

    loadReviews().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load probation reviews");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Probation workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Probation Reviews</p>
          <h2>Manager recommendations, review scores, and confirmation outcomes stay visible before decisions are locked.</h2>
        </div>
        <span className="status">Probation</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Review Date</th>
              <th>Manager</th>
              <th>Score</th>
              <th>Recommendation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id}>
                <td>{review.employeeName}</td>
                <td>{review.reviewDate ?? "Pending"}</td>
                <td>{review.manager ?? "Unassigned"}</td>
                <td>{review.score ?? "Pending"}</td>
                <td>{review.recommendation ?? "Pending"}</td>
                <td>{review.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
