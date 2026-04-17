"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type TrainingRequest = {
  id: string;
  employeeName: string;
  courseTitle: string;
  manager: string;
  budgetTag: string;
  requestedAt: string;
  status: string;
  workflow?: {
    currentStepLabel?: string;
    currentOwnerRole?: string;
  } | null;
};

export function TrainingRequestsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [message, setMessage] = useState("Loading training requests");
  const [status, setStatus] = useState<"idle" | "acting">("idle");

  useEffect(() => {
    async function loadRequests() {
      const response = await fetch(`${apiBaseUrl}/api/training/requests`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load training requests");
      }

      const data = (await response.json()) as TrainingRequest[];
      setRequests(data);
      setMessage(`${data.length} training requests loaded`);
    }

    loadRequests().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load training requests");
    });
  }, [apiBaseUrl, session.headers]);

  async function decideRequest(id: string, decision: "approve" | "reject") {
    setStatus("acting");
    setMessage(`${decision === "approve" ? "Approving" : "Rejecting"} training request`);

    const response = await fetch(`${apiBaseUrl}/api/training/requests/${id}/${decision}-step`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify({
        comments: `${decision === "approve" ? "Approved" : "Rejected"} from training workspace`
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Training request action failed");
      return;
    }

    const updated = (await response.json()) as TrainingRequest;
    setRequests((current) => current.map((item) => (item.id === id ? updated : item)));
    setStatus("idle");
    setMessage(`Training ${decision} step recorded`);
  }

  return (
    <section className="employeeWorkspace" aria-label="Training requests workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Training Requests</p>
          <h2>Track learning demand, manager sponsorship, and budget ownership.</h2>
        </div>
        <span className="status">Requests</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Requests" value={formatCount(requests.length)} hint="Current demand" />
        <MetricCard label="Submitted" value={formatCount(requests.filter((item) => item.status === "submitted").length)} hint="Pending review" />
        <MetricCard label="Approved" value={formatCount(requests.filter((item) => item.status === "approved").length)} hint="Ready to schedule" />
        <MetricCard label="Budget Tags" value={formatCount(new Set(requests.map((item) => item.budgetTag)).size)} hint="Funding buckets in use" />
      </div>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Course</th>
              <th>Manager</th>
              <th>Budget Tag</th>
              <th>Requested</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((item) => (
              <tr key={item.id}>
                <td>{item.employeeName}</td>
                <td>{item.courseTitle}</td>
                <td>{item.manager}</td>
                <td>{item.budgetTag}</td>
                <td>{item.requestedAt}</td>
                <td>
                  {humanize(item.status)}
                  {item.workflow?.currentStepLabel ? (
                    <>
                      <br />
                      {item.workflow.currentStepLabel} - {humanize(item.workflow.currentOwnerRole ?? "pending_owner")}
                    </>
                  ) : null}
                </td>
                <td>
                  {["submitted", "pending_approval"].includes(item.status) ? (
                    <div className="decisionActions workflowActionStack">
                      <button
                        className="secondaryButton"
                        disabled={
                          status === "acting" ||
                          !!item.workflow?.currentOwnerRole &&
                            session.role !== item.workflow.currentOwnerRole &&
                            session.role !== "company_admin"
                        }
                        onClick={() => decideRequest(item.id, "approve")}
                        type="button"
                      >
                        Approve Step
                      </button>
                      <button
                        className="secondaryButton"
                        disabled={
                          status === "acting" ||
                          !!item.workflow?.currentOwnerRole &&
                            session.role !== item.workflow.currentOwnerRole &&
                            session.role !== "company_admin"
                        }
                        onClick={() => decideRequest(item.id, "reject")}
                        type="button"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
