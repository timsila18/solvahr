"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type WorkflowDefinition = {
  code: string;
  name: string;
  module: string;
  trigger: string;
  steps: Array<{
    step: number;
    label: string;
    approverRole: string;
    escalationHours?: number;
  }>;
};

type WorkflowQueueItem = {
  id: string;
  module: string;
  entityType: string;
  entityId: string;
  subject: string;
  title: string;
  status: string;
  currentStep: string;
  ownerRole: string;
  dueAt?: string | null;
  summary: string;
  availableActions: string[];
};

type WorkflowOverview = {
  queue: WorkflowQueueItem[];
  escalations: WorkflowQueueItem[];
  definitions: WorkflowDefinition[];
};

export function WorkflowQueueWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [overview, setOverview] = useState<WorkflowOverview | null>(null);
  const [message, setMessage] = useState("Loading workflow queue");
  const [actionState, setActionState] = useState<"idle" | "acting">("idle");

  async function loadOverview() {
    const response = await fetch(`${apiBaseUrl}/api/workflows/overview`, {
      headers: session.headers,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load workflow queue");
    }

    const data = (await response.json()) as WorkflowOverview;
    setOverview(data);
    setMessage(`${data.queue.length} approval items loaded`);
  }

  useEffect(() => {
    loadOverview().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load workflow queue");
    });
  }, [apiBaseUrl, session.headers]);

  async function runAction(item: WorkflowQueueItem, action: string) {
    setActionState("acting");
    setMessage(`${humanize(action)} in progress`);

    let path = "";
    let body: Record<string, string> | undefined;

    if (item.entityType === "leave_request" && (action === "approve" || action === "reject")) {
      path = `/api/leave/requests/${item.entityId}/${action}`;
      body = {
        comments: `Decision from workflow center: ${action}`
      };
    } else if (item.entityType === "employee_request" && (action === "approve" || action === "reject")) {
      path = `/api/employee-requests/${item.entityId}/${action}`;
      body = {
        comments: `Employee request ${action} from workflow center`
      };
    } else if (item.entityType === "job_offer" && (action === "approve" || action === "reject")) {
      path = `/api/recruitment/offers/${item.entityId}/${action}`;
      body = {
        comments: `${humanize(action)} from workflow center`
      };
    } else if (item.entityType === "requisition" && (action === "approve" || action === "reject")) {
      path = `/api/recruitment/requisitions/${item.entityId}/${action}-step`;
      body = {
        comments: `${humanize(action)} from workflow center`
      };
    } else if (item.entityType === "training_request" && (action === "approve" || action === "reject")) {
      path = `/api/training/requests/${item.entityId}/${action}-step`;
      body = {
        comments: `${humanize(action)} from workflow center`
      };
    } else if (item.entityType === "overtime_request" && (action === "approve" || action === "reject")) {
      path = `/api/attendance/overtime/${item.entityId}/${action}-step`;
      body = {
        comments: `${humanize(action)} from workflow center`
      };
    } else if (item.entityType === "generated_document" && (action === "approve" || action === "reject")) {
      path = `/api/documents/generated/${item.entityId}/${action}-step`;
      body = {
        comments: `${humanize(action)} from workflow center`
      };
    } else if (item.entityType === "payroll_run" && action === "request_approval") {
      path = "/api/payroll/runs/current/approve";
      body = {};
    } else if (item.entityType === "payroll_run" && action === "approve") {
      path = "/api/payroll/runs/current/approve-step";
      body = {
        comments: "Approved from workflow center"
      };
    } else if (item.entityType === "payroll_run" && action === "reject") {
      path = "/api/payroll/runs/current/reject-step";
      body = {
        comments: "Rejected from workflow center"
      };
    } else {
      setActionState("idle");
      setMessage("This workflow item is view-only for now");
      return;
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify(body ?? {})
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setActionState("idle");
      setMessage(errorBody?.error?.message ?? "Workflow action failed");
      return;
    }

    await loadOverview();
    setActionState("idle");
    setMessage(`${humanize(action)} completed from workflow center`);
  }

  const queue = overview?.queue ?? [];

  return (
    <section className="employeeWorkspace" aria-label="Workflow queue workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Workflow Queue</p>
          <h2>Approvals from the live system in one operational inbox.</h2>
        </div>
        <span className="status">{actionState === "acting" ? "Acting" : "Queue"}</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Queue" value={formatCount(queue.length)} hint="Items needing action" />
        <MetricCard label="Escalations" value={formatCount(overview?.escalations.length ?? 0)} hint="Due soon or overdue" />
        <MetricCard label="Modules" value={formatCount(new Set(queue.map((item) => item.module)).size)} hint="Cross-module approval scope" />
        <MetricCard label="View Only" value={formatCount(queue.filter((item) => !item.availableActions.length).length)} hint="Tracked but not actionable yet" />
      </div>

      <div className="offerList">
        {queue.map((item) => (
          <article key={item.id}>
            <div>
              <strong>{item.subject} - {item.title}</strong>
              <span>
                {humanize(item.module)} - {humanize(item.status)} - {item.currentStep} - {humanize(item.ownerRole)}
              </span>
              <span>{item.summary}</span>
            </div>
            <div className="decisionActions workflowActionStack">
              {item.availableActions.length ? item.availableActions.map((action) => (
                <button
                  className="secondaryButton"
                  disabled={actionState === "acting"}
                  key={`${item.id}-${action}`}
                  onClick={() => runAction(item, action)}
                  type="button"
                >
                  {humanize(action)}
                </button>
              )) : <span className="tableBadge">View only</span>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
