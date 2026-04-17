"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { useStagingSession } from "./staging-session";

type DocumentTemplate = {
  id: string;
  code: string;
  name: string;
  category: string;
  status: string;
  mergeFields: string[];
};

type GeneratedDocument = {
  id: string;
  templateCode: string;
  entityType: string;
  entityId: string;
  status: string;
  preview: string;
  workflow?: {
    currentStepLabel?: string;
    currentOwnerRole?: string;
  } | null;
};

export function DocumentGenerationWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [message, setMessage] = useState("Loading document templates");
  const [status, setStatus] = useState<"idle" | "acting">("idle");

  useEffect(() => {
    async function loadDocuments() {
      const [templateResponse, generatedResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/documents/templates`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/documents/generated`, {
          headers: session.headers,
          cache: "no-store"
        })
      ]);

      if (!templateResponse.ok || !generatedResponse.ok) {
        throw new Error("Unable to load document generation data");
      }

      const templateData = (await templateResponse.json()) as DocumentTemplate[];
      const generatedData = (await generatedResponse.json()) as GeneratedDocument[];
      setTemplates(templateData);
      setDocuments(generatedData);
      setMessage(`${templateData.length} templates and ${generatedData.length} generated documents loaded`);
    }

    loadDocuments().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load document generation data");
    });
  }, [apiBaseUrl, session.headers]);

  async function decideDocument(id: string, decision: "approve" | "reject") {
    setStatus("acting");
    setMessage(`${decision === "approve" ? "Approving" : "Rejecting"} generated document`);

    const response = await fetch(`${apiBaseUrl}/api/documents/generated/${id}/${decision}-step`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...session.headers
      },
      body: JSON.stringify({
        comments: `${decision === "approve" ? "Approved" : "Rejected"} from document workspace`
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setStatus("idle");
      setMessage(errorBody?.error?.message ?? "Generated document action failed");
      return;
    }

    const updated = (await response.json()) as GeneratedDocument;
    setDocuments((current) => current.map((item) => (item.id === id ? updated : item)));
    setStatus("idle");
    setMessage(`Document ${decision} step recorded`);
  }

  return (
    <section className="recruitmentWorkspace" aria-label="Document generation workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Document Generation</p>
          <h2>Offer letters, confirmation letters, and HR templates stay close to onboarding and probation workflows.</h2>
        </div>
        <span className="status">Templates</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="recruitmentDetailGrid">
        <div className="leavePolicyGrid">
          {templates.map((template) => (
            <article className="leavePolicyCard" key={template.id}>
              <span>{template.category}</span>
              <strong>{template.name}</strong>
              <small>{template.code}</small>
              <b>{template.status}</b>
              <p>{template.mergeFields.length} merge fields available</p>
            </article>
          ))}
        </div>

        <div className="offerList">
          {documents.map((document) => (
            <article key={document.id}>
              <div>
                <strong>{document.templateCode}</strong>
                <span>
                  {document.entityType} - {document.status}
                </span>
                {document.workflow?.currentStepLabel ? (
                  <span>
                    {document.workflow.currentStepLabel} - {document.workflow.currentOwnerRole ?? "pending owner"}
                  </span>
                ) : null}
                <span>{document.preview}</span>
              </div>
              <div className="decisionActions workflowActionStack">
                {["submitted", "pending_approval"].includes(document.status) ? (
                  <>
                    <button
                      className="secondaryButton"
                      disabled={
                        status === "acting" ||
                        !!document.workflow?.currentOwnerRole &&
                          session.role !== document.workflow.currentOwnerRole &&
                          session.role !== "company_admin"
                      }
                      onClick={() => decideDocument(document.id, "approve")}
                      type="button"
                    >
                      Approve Step
                    </button>
                    <button
                      className="secondaryButton"
                      disabled={
                        status === "acting" ||
                        !!document.workflow?.currentOwnerRole &&
                          session.role !== document.workflow.currentOwnerRole &&
                          session.role !== "company_admin"
                      }
                      onClick={() => decideDocument(document.id, "reject")}
                      type="button"
                    >
                      Reject
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
