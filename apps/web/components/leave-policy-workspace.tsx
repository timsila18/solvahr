"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type LeaveType = {
  id: string;
  code: string;
  name: string;
  annualEntitlement: number | null;
};

type LeaveRequest = {
  id: string;
  employeeName: string;
  type: string;
  days: number | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
};

export function LeavePolicyWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [message, setMessage] = useState("Loading leave policies");

  useEffect(() => {
    async function loadPolicyData() {
      const [typeResponse, requestResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/leave/types`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/leave/requests`, {
          headers: session.headers,
          cache: "no-store"
        })
      ]);

      if (!typeResponse.ok || !requestResponse.ok) {
        throw new Error("Unable to load leave policy data");
      }

      const typeData = (await typeResponse.json()) as LeaveType[];
      const requestData = (await requestResponse.json()) as LeaveRequest[];
      setLeaveTypes(typeData);
      setRequests(requestData);
      setMessage(`${typeData.length} leave policies and ${requestData.length} requests loaded`);
    }

    loadPolicyData().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load leave policy data");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="leaveWorkspace" aria-label="Leave policy workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Leave Policies</p>
          <h2>Review entitlement rules, approval demand, and how each leave type is currently being used.</h2>
        </div>
        <span className="status">Config</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="leavePolicyGrid">
        {leaveTypes.map((leaveType) => {
          const relatedRequests = requests.filter((request) => request.type === leaveType.name);
          const pending = relatedRequests.filter((request) => request.status === "submitted").length;
          const approvedDays = relatedRequests
            .filter((request) => request.status === "approved")
            .reduce((total, request) => total + (request.days ?? 0), 0);

          return (
            <article className="leavePolicyCard" key={leaveType.id}>
              <span>{leaveType.code}</span>
              <strong>{leaveType.name}</strong>
              <small>{leaveType.annualEntitlement ?? 0} days annual entitlement</small>
              <b>{pending} pending requests</b>
              <p>{approvedDays} approved days already consumed this year.</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
