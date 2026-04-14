"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type Review = {
  id: string;
  employeeName: string;
  reviewer: string;
  cycle: string;
  score: number;
  recommendation: string;
  status: string;
};

type Cycle = {
  id: string;
  code: string;
  name: string;
  reviewType: string;
  status: string;
  startDate: string;
  endDate: string;
  completionRate: number;
};

export function PerformanceReviewsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState("Loading review cycles");

  useEffect(() => {
    async function loadData() {
      const [cycleResponse, reviewResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/performance/cycles`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/performance/reviews`, {
          headers: session.headers,
          cache: "no-store"
        })
      ]);

      if (!cycleResponse.ok || !reviewResponse.ok) {
        throw new Error("Unable to load performance reviews");
      }

      const cycleData = (await cycleResponse.json()) as Cycle[];
      const reviewData = (await reviewResponse.json()) as Review[];
      setCycles(cycleData);
      setReviews(reviewData);
      setMessage(`${cycleData.length} cycles and ${reviewData.length} reviews loaded`);
    }

    loadData().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load performance reviews");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Performance reviews">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Performance Reviews</p>
          <h2>Review cycle completion, ratings, and manager recommendations in one calibration-ready view.</h2>
        </div>
        <span className="status">Reviews</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="leavePolicyGrid">
        {cycles.map((cycle) => (
          <article className="leavePolicyCard" key={cycle.id}>
            <span>{cycle.code}</span>
            <strong>{cycle.name}</strong>
            <small>
              {cycle.reviewType} - {cycle.startDate} to {cycle.endDate}
            </small>
            <b>{cycle.completionRate}% complete</b>
            <p>{cycle.status.replaceAll("_", " ")} cycle</p>
          </article>
        ))}
      </div>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Cycle</th>
              <th>Reviewer</th>
              <th>Score</th>
              <th>Recommendation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id}>
                <td>{review.employeeName}</td>
                <td>{review.cycle}</td>
                <td>{review.reviewer}</td>
                <td>{review.score}</td>
                <td>{review.recommendation}</td>
                <td>{review.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
