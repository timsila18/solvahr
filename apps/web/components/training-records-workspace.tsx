"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type TrainingRecord = {
  id: string;
  employeeName: string;
  courseTitle: string;
  completedOn: string;
  certificateStatus: string;
  cpdHours: number;
  outcome: string;
};

export function TrainingRecordsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [message, setMessage] = useState("Loading training records");

  useEffect(() => {
    async function loadRecords() {
      const response = await fetch(`${apiBaseUrl}/api/training/records`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load training records");
      }

      const data = (await response.json()) as TrainingRecord[];
      setRecords(data);
      setMessage(`${data.length} training records loaded`);
    }

    loadRecords().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load training records");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Training records workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Learning Records</p>
          <h2>Keep completion history, certificates, and CPD totals visible for HR and compliance use.</h2>
        </div>
        <span className="status">Records</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Completions" value={formatCount(records.length)} hint="Recorded learning history" />
        <MetricCard label="CPD Hours" value={formatCount(records.reduce((total, item) => total + item.cpdHours, 0))} hint="Accumulated professional learning" />
        <MetricCard label="Uploaded Certs" value={formatCount(records.filter((item) => item.certificateStatus === "uploaded").length)} hint="Certificates on file" />
        <MetricCard label="Pending Upload" value={formatCount(records.filter((item) => item.certificateStatus !== "uploaded").length)} hint="Still missing evidence" />
      </div>

      <div className="offerList">
        {records.map((item) => (
          <article key={item.id}>
            <div>
              <strong>{item.employeeName} - {item.courseTitle}</strong>
              <span>
                {item.completedOn} - {item.cpdHours} CPD hrs - {humanize(item.outcome)}
              </span>
            </div>
            <span className="tableBadge">{humanize(item.certificateStatus)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
