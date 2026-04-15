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
};

export function DocumentGenerationWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [message, setMessage] = useState("Loading document templates");

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

        <div className="documentPreview">
          <strong>{documents[0]?.templateCode ?? "No generated document yet"}</strong>
          <p>{documents[0]?.preview ?? "Generated documents will preview here once a template is rendered."}</p>
        </div>
      </div>
    </section>
  );
}
