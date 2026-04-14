"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type EmployeeDocument = {
  id: string;
  employeeId: string;
  employeeName: string;
  category: string;
  name: string;
  restricted: boolean;
  expiresAt: string | null;
  version: number;
};

export function EmployeeDocumentsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [message, setMessage] = useState("Loading employee documents");

  useEffect(() => {
    async function loadDocuments() {
      const response = await fetch(`${apiBaseUrl}/api/employees/documents`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load employee documents");
      }

      const data = (await response.json()) as EmployeeDocument[];
      setDocuments(data);
      setMessage(`${data.length} employee documents loaded`);
    }

    loadDocuments().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load employee documents");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Employee documents workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Employee Documents</p>
          <h2>Contracts, IDs, tax records, and restricted files stay visible and access-aware in one records view.</h2>
        </div>
        <span className="status">Records</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="leavePolicyGrid">
        {documents.map((document) => (
          <article className="leavePolicyCard" key={document.id}>
            <span>{document.category}</span>
            <strong>{document.name}</strong>
            <small>{document.employeeName}</small>
            <b>{document.restricted ? "Restricted" : "Standard access"}</b>
            <p>
              Version {document.version}
              {document.expiresAt ? ` - expires ${document.expiresAt}` : " - no expiry"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
