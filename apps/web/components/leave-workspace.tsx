"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type EmployeeOption = {
  employeeId: string;
  employeeNumber: string;
  displayName: string;
};

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

type LeaveForm = {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialForm: LeaveForm = {
  employeeId: "",
  leaveTypeId: "",
  startDate: today,
  endDate: today,
  days: "1",
  reason: ""
};

export function LeaveWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [form, setForm] = useState<LeaveForm>(initialForm);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "deciding">("loading");
  const [message, setMessage] = useState("Loading leave workflow data");

  async function loadLeaveData() {
    setStatus("loading");
    const headers = session.headers;
    const [employeeResponse, typeResponse, requestResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/employees`, { headers, cache: "no-store" }),
      fetch(`${apiBaseUrl}/api/leave/types`, { headers, cache: "no-store" }),
      fetch(`${apiBaseUrl}/api/leave/requests`, { headers, cache: "no-store" })
    ]);

    if (!employeeResponse.ok || !typeResponse.ok || !requestResponse.ok) {
      throw new Error("Unable to load leave workflow data");
    }

    const employeeData = (await employeeResponse.json()) as EmployeeOption[];
    const typeData = (await typeResponse.json()) as LeaveType[];
    const requestData = (await requestResponse.json()) as LeaveRequest[];

    setEmployees(employeeData);
    setLeaveTypes(typeData);
    setRequests(requestData);
    setForm((current) => ({
      ...current,
      employeeId: current.employeeId || employeeData[0]?.employeeId || "",
      leaveTypeId: current.leaveTypeId || typeData[0]?.id || ""
    }));
    setStatus("idle");
    setMessage(`${requestData.length} leave requests loaded from Supabase`);
  }

  useEffect(() => {
    loadLeaveData().catch((error) => {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Unable to load leave workflow data");
    });
  }, [apiBaseUrl, session.headers]);

  async function submitLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("Submitting leave request");

    const response = await fetch(`${apiBaseUrl}/api/leave/requests`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify({
        employeeId: form.employeeId,
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        days: Number(form.days),
        reason: form.reason.trim() || undefined
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Leave request could not be submitted");
      return;
    }

    setForm((current) => ({
      ...current,
      reason: ""
    }));
    await loadLeaveData();
    setMessage("Leave request submitted to Supabase");
  }

  async function decideLeaveRequest(id: string, decision: "approve" | "reject") {
    setStatus("deciding");
    setMessage(`${decision === "approve" ? "Approving" : "Rejecting"} leave request`);

    const response = await fetch(`${apiBaseUrl}/api/leave/requests/${id}/${decision}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify({
        comments: decision === "approve" ? "Approved from manager workspace" : "Rejected from manager workspace"
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Leave decision could not be recorded");
      return;
    }

    await loadLeaveData();
    setMessage(`Leave request ${decision === "approve" ? "approved" : "rejected"} in Supabase`);
  }

  return (
    <section className="leaveWorkspace" id="leave" aria-label="Leave workflow">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Leave Workflow</p>
          <h2>Submit leave and watch the live request queue update.</h2>
        </div>
        <span className="status">{status === "saving" ? "Submitting" : status === "deciding" ? "Deciding" : "Live"}</span>
      </div>

      <div className="leaveGrid">
        <form className="leaveForm" onSubmit={submitLeave}>
          <label>
            Employee
            <select
              required
              value={form.employeeId}
              onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
            >
              {employees.map((employee) => (
                <option key={employee.employeeId} value={employee.employeeId}>
                  {employee.displayName} - {employee.employeeNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            Leave type
            <select
              required
              value={form.leaveTypeId}
              onChange={(event) => setForm((current) => ({ ...current, leaveTypeId: event.target.value }))}
            >
              {leaveTypes.map((leaveType) => (
                <option key={leaveType.id} value={leaveType.id}>
                  {leaveType.name}
                </option>
              ))}
            </select>
          </label>
          <div className="formSplit">
            <label>
              Start
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              />
            </label>
            <label>
              End
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              />
            </label>
          </div>
          <label>
            Days
            <input
              required
              min="0.5"
              step="0.5"
              type="number"
              value={form.days}
              onChange={(event) => setForm((current) => ({ ...current, days: event.target.value }))}
            />
          </label>
          <label>
            Reason
            <textarea
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Family commitment, medical appointment, exam leave..."
            />
          </label>
          <button className="primaryButton" disabled={status === "saving" || !employees.length || !leaveTypes.length} type="submit">
            {status === "saving" ? "Submitting..." : "Submit Leave"}
          </button>
          <p>{message}</p>
        </form>

        <div className="leaveList">
          {requests.slice(0, 6).map((request) => (
            <article key={request.id}>
              <div>
                <strong>{request.employeeName}</strong>
                <span>{request.type}</span>
              </div>
              <p>
                {request.startDate} to {request.endDate} - {request.days ?? 0} days
              </p>
              <b>{request.status}</b>
              <div className="decisionActions">
                <button
                  className="secondaryButton"
                  disabled={status === "deciding" || request.status !== "submitted"}
                  onClick={() => decideLeaveRequest(request.id, "approve")}
                  type="button"
                >
                  Approve
                </button>
                <button
                  className="secondaryButton"
                  disabled={status === "deciding" || request.status !== "submitted"}
                  onClick={() => decideLeaveRequest(request.id, "reject")}
                  type="button"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
          {!requests.length ? <p>No leave requests submitted yet.</p> : null}
        </div>
      </div>
    </section>
  );
}
