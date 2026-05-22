"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type {
  CvPackageKey,
  CvServiceEducationEntry,
  CvServiceExperienceEntry,
  CvServiceExtractionPreview,
  CvServiceMode,
  CvServicePackageDefinition,
  CvServicePublicOrder,
  CvServiceQualificationEntry,
  CvServiceRefereeEntry,
  CvServiceSkillEntry,
  CvServiceWizardPayload,
} from "@/lib/cv-service";

type WizardStep = {
  key: string;
  title: string;
  detail: string;
};

const ENTRY_STEPS: WizardStep[] = [
  { key: "mode", title: "Choose How To Start", detail: "Upload your current CV or build one from scratch." },
  { key: "package", title: "Choose Service Package", detail: "Select the package that matches the level you are applying for." },
];

const UPLOAD_STEPS: WizardStep[] = [
  ...ENTRY_STEPS,
  { key: "upload", title: "Quick Upload & Revamp", detail: "Choose your package, upload your CV, add an optional photo, and tell Solva AI what to sharpen." },
  { key: "payment", title: "Payment", detail: "Use test payment mode to unlock generation." },
  { key: "generation", title: "AI Revamp", detail: "Solva AI restructures, improves, and redesigns your CV." },
  { key: "downloads", title: "Preview & Download", detail: "Review the result, see scores, and download DOCX/PDF." },
];

const MANUAL_STEPS: WizardStep[] = [
  ...ENTRY_STEPS,
  { key: "personal", title: "Personal Details", detail: "Add your contact details and location." },
  { key: "target", title: "Target Role", detail: "Describe the job, industry, and country you are targeting." },
  { key: "summary", title: "Professional Summary", detail: "Add your profession, experience, and the tone you want." },
  { key: "experience", title: "Work Experience", detail: "List employers, duties, achievements, and tools." },
  { key: "education", title: "Education", detail: "Add academic history clearly." },
  { key: "qualifications", title: "Certifications", detail: "Add certifications, short courses, and memberships." },
  { key: "skills", title: "Skills", detail: "List technical, soft, and industry skills." },
  { key: "achievements", title: "Achievements", detail: "Capture standout wins or measurable impact." },
  { key: "referees", title: "Referees", detail: "Add 3 referees, or choose referees available on request." },
  { key: "notes", title: "Notes & Instructions", detail: "Tell Solva AI anything important to consider." },
  { key: "payment", title: "Payment", detail: "Use test payment mode to unlock generation." },
  { key: "generation", title: "AI Generation", detail: "Generate the ATS-compliant CV after payment." },
  { key: "downloads", title: "Preview & Download", detail: "Review the result, see scores, and download DOCX/PDF." },
];

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });
  const payload = (await response.json().catch(() => ({ error: "request_failed" }))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}`);
  }
  return payload;
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function createBlankEducation(): CvServiceEducationEntry {
  return { institution: "", qualification: "", year: "", grade: "" };
}

function createBlankQualification(): CvServiceQualificationEntry {
  return { name: "", issuer: "", year: "", type: "Certification" };
}

function createBlankExperience(): CvServiceExperienceEntry {
  return {
    employer: "",
    jobTitle: "",
    startDate: "",
    endDate: "",
    currentRole: false,
    duties: "",
    achievements: "",
    tools: "",
    leadership: "",
  };
}

function createBlankSkill(category = "Technical skills"): CvServiceSkillEntry {
  return { category, items: "" };
}

function createBlankReferee(): CvServiceRefereeEntry {
  return { name: "", designation: "", organization: "", phone: "", email: "", relationship: "" };
}

function countNamedReferees(referees: CvServiceRefereeEntry[]) {
  return referees.filter((entry) => safeString(entry.name)).length;
}

function formatCurrency(amount: number) {
  return `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(amount)}`;
}

function updateArrayItem<T>(items: T[], index: number, next: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? next : item));
}

function createInitialForm(): CvServiceWizardPayload {
  return {
    sourceMode: "manual",
    packageKey: "entry",
    customerName: "",
    phone: "",
    email: "",
    location: "",
    linkedinUrl: "",
    portfolioUrl: "",
    targetRole: "",
    industry: "",
    countryRegion: "Kenya",
    preferredCvStyle: "ATS-friendly premium",
    jobDescription: "",
    currentProfession: "",
    yearsOfExperience: 0,
    careerObjective: "",
    majorAchievements: "",
    preferredTone: "Professional and confident",
    educationEntries: [createBlankEducation()],
    qualificationEntries: [createBlankQualification()],
    experienceEntries: [createBlankExperience()],
    skillEntries: [createBlankSkill(), createBlankSkill("Soft skills"), createBlankSkill("Tools / software")],
    refereeEntries: [createBlankReferee(), createBlankReferee(), createBlankReferee()],
    existingCvText: "",
    existingCvPaste: "",
    specialInstructions: "",
    refereesOnRequest: false,
    profilePhotoPath: "",
    profilePhotoName: "",
    profilePhotoMime: "",
    profilePhotoSize: 0,
  };
}

export function CvServiceWizard({ packages }: { packages: CvServicePackageDefinition[] }) {
  const [sourceMode, setSourceMode] = useState<CvServiceMode | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [draftOrder, setDraftOrder] = useState<CvServicePublicOrder | null>(null);
  const [selectedPackageKey, setSelectedPackageKey] = useState<CvPackageKey>("entry");
  const [uploadedCv, setUploadedCv] = useState<{
    path: string;
    fileName: string;
    mimeType: string;
    size: number;
    signedUrl?: string | null;
  } | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<{
    path: string;
    fileName: string;
    mimeType: string;
    size: number;
    signedUrl?: string | null;
  } | null>(null);
  const [extractionPreview, setExtractionPreview] = useState<CvServiceExtractionPreview | null>(null);
  const [form, setForm] = useState<CvServiceWizardPayload>(createInitialForm());
  const uploadPickerRef = useRef<HTMLInputElement | null>(null);

  const steps = sourceMode === "upload" ? UPLOAD_STEPS : sourceMode === "manual" ? MANUAL_STEPS : ENTRY_STEPS;
  const step = steps[currentStep];
  const selectedPackage = useMemo(
    () => packages.find((entry) => entry.key === selectedPackageKey) ?? packages[0],
    [packages, selectedPackageKey]
  );

  function switchToUploadMode(openPicker = false) {
    setSourceMode("upload");
    setForm((current) => ({ ...current, sourceMode: "upload" }));
    if (openPicker && typeof window !== "undefined") {
      window.requestAnimationFrame(() => uploadPickerRef.current?.click());
    }
  }

  function syncExtractionIntoForm(preview: CvServiceExtractionPreview) {
    setForm((current) => ({
      ...current,
      sourceMode: "upload",
      customerName: preview.customerName || current.customerName,
      phone: preview.phone || current.phone,
      email: preview.email || current.email,
      location: preview.location || current.location,
      linkedinUrl: preview.linkedinUrl || current.linkedinUrl,
      portfolioUrl: preview.portfolioUrl || current.portfolioUrl,
      currentProfession: preview.currentProfession || current.currentProfession,
      careerObjective: preview.careerObjective || current.careerObjective,
      majorAchievements: preview.majorAchievements || current.majorAchievements,
      educationEntries: preview.educationEntries.length ? preview.educationEntries : current.educationEntries,
      qualificationEntries: preview.qualificationEntries.length ? preview.qualificationEntries : current.qualificationEntries,
      experienceEntries: preview.experienceEntries.length ? preview.experienceEntries : current.experienceEntries,
      skillEntries: preview.skillEntries.length ? preview.skillEntries : current.skillEntries,
      refereeEntries: preview.refereeEntries.length ? preview.refereeEntries : current.refereeEntries,
      existingCvText: preview.rawTextPreview || current.existingCvText,
      existingCvPaste: preview.extractedSummary || current.existingCvPaste,
    }));
  }

  async function createDraftOrder() {
    const payload = await readJson<{ order: CvServicePublicOrder }>("/api/public/cv-service/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageKey: selectedPackageKey }),
    });
    setDraftOrder(payload.order);
    return payload.order;
  }

  async function persistDraft(orderToUse?: CvServicePublicOrder | null) {
    const activeOrder = orderToUse ?? draftOrder;
    if (!activeOrder) {
      return null;
    }
    const payload = await readJson<{ order: CvServicePublicOrder }>(`/api/public/cv-service/orders/${activeOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          extractionPreview,
          sourceMode: sourceMode ?? form.sourceMode,
        packageKey: selectedPackageKey,
        uploadedCvPath: uploadedCv?.path ?? "",
        uploadedCvName: uploadedCv?.fileName ?? "",
        uploadedCvMime: uploadedCv?.mimeType ?? "",
        uploadedCvSize: uploadedCv?.size ?? 0,
        profilePhotoPath: profilePhoto?.path ?? "",
        profilePhotoName: profilePhoto?.fileName ?? "",
        profilePhotoMime: profilePhoto?.mimeType ?? "",
        profilePhotoSize: profilePhoto?.size ?? 0,
        token: activeOrder.publicToken,
      }),
    });
    setDraftOrder(payload.order);
    return payload.order;
  }

  async function ensureDraft() {
    if (draftOrder) return draftOrder;
    const order = await createDraftOrder();
    await persistDraft(order);
    return order;
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    setBusyAction("upload-source");
    setMessage("");
    setSourceMode("upload");
    setForm((current) => ({ ...current, sourceMode: "upload" }));
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("kind", "source");
      const response = await fetch("/api/public/cv-service/uploads", { method: "POST", body: formData });
      const payload = (await response.json()) as {
        error?: string;
        file?: {
          path: string;
          fileName: string;
          mimeType: string;
          size: number;
          signedUrl?: string | null;
          extracted?: CvServiceExtractionPreview;
          extractedText?: string;
        };
      };
      if (!response.ok || !payload.file) {
        throw new Error(payload.error ?? "Could not upload the source CV.");
      }
      setUploadedCv(payload.file);
      if (payload.file.extracted) {
        setExtractionPreview(payload.file.extracted);
        syncExtractionIntoForm(payload.file.extracted);
      }
      setCurrentStep((value) => (value === 0 ? 1 : value));
      setMessage("Your CV is in. Next, choose the package, add any optional notes, and move straight to payment.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload the source CV.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleProfilePhotoUpload(file: File | null) {
    if (!file) return;
    setBusyAction("upload-profile-photo");
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("kind", "profile-photo");
      const response = await fetch("/api/public/cv-service/uploads", { method: "POST", body: formData });
      const payload = (await response.json()) as {
        error?: string;
        file?: {
          path: string;
          fileName: string;
          mimeType: string;
          size: number;
          signedUrl?: string | null;
        };
      };
      if (!response.ok || !payload.file) {
        throw new Error(payload.error ?? "Could not upload the profile photo.");
      }
      setProfilePhoto(payload.file);
      setMessage("Profile photo uploaded. It will be used only if you want it in the premium CV design.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload the profile photo.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleSimulatePayment() {
    const activeOrder = await ensureDraft();
    setBusyAction("simulate-payment");
    setMessage("");
    try {
      const payload = await readJson<{ order: CvServicePublicOrder }>(
        `/api/public/cv-service/orders/${activeOrder.id}/payment-test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: activeOrder.publicToken }),
        }
      );
      setDraftOrder(payload.order);
      setMessage("Payment simulation completed. CV generation is now unlocked.");
      setCurrentStep(steps.findIndex((entry) => entry.key === "generation"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not simulate payment.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleGenerateCv() {
    const activeOrder = await ensureDraft();
    setBusyAction("generate-cv");
    setMessage("");
    try {
      await persistDraft(activeOrder);
      const payload = await readJson<{ order: CvServicePublicOrder }>(
        `/api/public/cv-service/orders/${activeOrder.id}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: activeOrder.publicToken }),
        }
      );
      setDraftOrder(payload.order);
      setMessage("Your ATS-compliant CV is ready. Download links are active for 24 hours.");
      setCurrentStep(steps.findIndex((entry) => entry.key === "downloads"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate the CV yet.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleContinue() {
    setMessage("");
    try {
      setBusyAction(`step-${step.key}`);
      if (step.key === "mode") {
        if (!sourceMode) {
          throw new Error("choose_cv_start_mode");
        }
        setForm((current) => ({ ...current, sourceMode }));
      }
      if (step.key === "package") {
        const order = await ensureDraft();
        await persistDraft(order);
      }
      if (["personal", "target", "summary", "experience", "education", "qualifications", "skills", "achievements", "referees", "notes", "upload"].includes(step.key)) {
        await persistDraft();
      }
      setCurrentStep((value) => Math.min(value + 1, steps.length - 1));
    } catch (error) {
      const defaultMessage =
        error instanceof Error && error.message === "choose_cv_start_mode"
          ? "Please choose either upload existing CV or build from scratch."
          : error instanceof Error
            ? error.message
            : "Could not continue.";
      setMessage(defaultMessage);
    } finally {
      setBusyAction("");
    }
  }

  function canMoveNext() {
    switch (step.key) {
      case "mode":
        return Boolean(sourceMode);
      case "package":
        return Boolean(selectedPackageKey);
      case "personal":
        return Boolean(form.customerName && form.phone && form.email);
      case "target":
        return Boolean(form.targetRole || form.jobDescription || form.specialInstructions);
      case "summary":
        return Boolean(form.currentProfession || form.careerObjective || form.majorAchievements);
      case "upload":
        return Boolean(uploadedCv);
      case "referees":
        return form.refereesOnRequest === true || countNamedReferees(form.refereeEntries) >= 3;
      default:
        return true;
    }
  }

  const packageColumns = ["Package", "Best For", "Price", "Content Depth", "Design Level", "Turnaround", "Output Formats"];
  const canRegenerate = (draftOrder?.generationAttempts ?? 0) < 2 && draftOrder?.paymentStatus === "paid";

  return (
    <main className="cv-service-shell">
      <section className="cv-service-hero">
        <div className="cv-service-hero__copy">
          <p className="section-eyebrow">ATS-compliant CV service</p>
          <h1>Premium CV revamp when you already have one. Guided help when you do not.</h1>
          <p className="section-description">
            Use the quick revamp lane if your CV already exists, or keep the full guided builder for a fresh start. Solva AI improves wording, structure, depth, and ATS readiness without inventing facts.
          </p>
          <div className="marketing-proof-strip">
            <span>Quick upload and revamp</span>
            <span>Guided manual builder</span>
            <span>Premium DOCX and PDF output</span>
          </div>
        </div>
        <div className="cv-service-hero__card">
          <strong>What feels different now</strong>
          <ul>
            <li>A fast revamp lane for existing CVs, with optional photo upload.</li>
            <li>Premium blue-and-white layouts inspired by executive presentation CVs.</li>
            <li>ATS score, readability score, and premium DOCX/PDF output after payment.</li>
          </ul>
        </div>
      </section>

      <section className="cv-service-layout">
        <aside className="cv-service-sidebar">
          <div className="cv-progress-card">
            <strong>Progress</strong>
            <p>Step {currentStep + 1} of {steps.length}</p>
            <div className="cv-progress-bar">
              <span style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
            </div>
          </div>
          <div className="cv-step-list">
            {steps.map((entry, index) => (
              <button
                className={`cv-step-chip ${index === currentStep ? "is-active" : ""}`}
                key={entry.key}
                onClick={() => setCurrentStep(index)}
                type="button"
              >
                <strong>{index + 1}. {entry.title}</strong>
                <span>{entry.detail}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="cv-service-surface">
          <header className="cv-service-surface__header">
            <div>
              <p className="section-eyebrow">Step {currentStep + 1}</p>
              <h2>{step.title}</h2>
              <p className="section-description">{step.detail}</p>
            </div>
            <div className="cv-order-meta">
              <span>{selectedPackage?.name}</span>
              <strong>{formatCurrency(selectedPackage?.price ?? 0)}</strong>
            </div>
          </header>

          {step.key === "mode" ? (
            <div className="cv-step-section">
              <div className="cv-choice-grid">
                <button
                  className={`cv-choice-card ${sourceMode === "upload" ? "is-selected" : ""}`}
                  onClick={() => {
                    switchToUploadMode(true);
                  }}
                  type="button"
                >
                  <strong>Upload Existing CV</strong>
                  <p>Already have a CV? Use the quick revamp lane. Upload it, add an optional photo, pay, and get a cleaner, richer, more executive version fast.</p>
                  <span>Upload My CV</span>
                </button>
                <button
                  className={`cv-choice-card ${sourceMode === "manual" ? "is-selected" : ""}`}
                  onClick={() => {
                    setSourceMode("manual");
                    setForm((current) => ({ ...current, sourceMode: "manual" }));
                  }}
                  type="button"
                >
                  <strong>Build CV Step by Step</strong>
                  <p>Do not have a CV? Fill in your details step by step and Solva AI will create a professional CV for you.</p>
                  <span>Start From Scratch</span>
                </button>
              </div>
              <div className="cv-inline-upload-panel cv-inline-upload-panel--premium">
                <div className="cv-inline-upload-panel__header">
                  <div>
                    <p className="section-eyebrow">Quick revamp lane</p>
                    <h4>Already have a CV? Attach it here.</h4>
                  </div>
                  <span className="cv-pill-badge">Fastest path</span>
                </div>
                <div className="cv-warning-note">
                  <strong>Before you upload</strong>
                  <p>
                    If anything in your current CV is outdated, update it first before uploading for revamp. This quick lane is built to upgrade what you provide, not to rebuild facts from scratch.
                  </p>
                </div>
                <label className="cv-field-span-2">
                  <span>Upload your current CV now</span>
                  <input
                    accept=".docx,.pdf,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
                    ref={uploadPickerRef}
                    type="file"
                  />
                </label>
                <p className="section-description">
                  Uploading here automatically switches you into the AI revamp flow. Supported files: DOCX, PDF, and TXT.
                </p>
                {uploadedCv ? (
                  <article className="mini-panel cv-upload-summary">
                    <strong>{uploadedCv.fileName}</strong>
                    <span>{uploadedCv.mimeType}</span>
                    <small>Saved and ready for premium revamp.</small>
                  </article>
                ) : null}
              </div>
            </div>
          ) : null}

          {step.key === "package" ? (
            <div className="cv-step-section">
              <div className="cv-package-grid">
                {packages.map((pkg) => (
                  <button
                    className={`cv-package-card ${selectedPackageKey === pkg.key ? "is-selected" : ""}`}
                    key={pkg.key}
                    onClick={() => {
                      setSelectedPackageKey(pkg.key);
                      setForm((current) => ({ ...current, packageKey: pkg.key }));
                    }}
                    type="button"
                  >
                    <strong>{pkg.name}</strong>
                    <span>{formatCurrency(pkg.price)}</span>
                    <small>{pkg.description}</small>
                  </button>
                ))}
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>{packageColumns.map((column) => <th key={column}>{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {packages.map((pkg) => (
                      <tr key={pkg.key}>
                        <td>{pkg.name}</td>
                        <td>{pkg.bestFor}</td>
                        <td>{formatCurrency(pkg.price)}</td>
                        <td>{pkg.contentDepth}</td>
                        <td>{pkg.designLevel}</td>
                        <td>{pkg.turnaroundPlaceholder}</td>
                        <td>{pkg.outputFormats}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step.key === "upload" ? (
            <div className="cv-step-section cv-form-grid">
              <div className="cv-quick-revamp-card cv-field-span-2">
                <div className="cv-quick-revamp-card__header">
                  <div>
                    <p className="section-eyebrow">Quick revamp lane</p>
                    <h3>Upload, pay, and let Solva AI do the heavy lifting.</h3>
                  </div>
                  <span className="cv-pill-badge">Existing CV upgrade</span>
                </div>
                <p className="section-description">
                  This path is intentionally simple. Make any factual updates in your current CV first, then upload it here for a smoother premium rewrite and redesign.
                </p>
              </div>
              <div className="cv-package-grid cv-field-span-2">
                {packages.map((pkg) => (
                  <button
                    className={`cv-package-card ${selectedPackageKey === pkg.key ? "is-selected" : ""}`}
                    key={pkg.key}
                    onClick={() => {
                      setSelectedPackageKey(pkg.key);
                      setForm((current) => ({ ...current, packageKey: pkg.key }));
                    }}
                    type="button"
                  >
                    <strong>{pkg.name}</strong>
                    <span>{formatCurrency(pkg.price)}</span>
                    <small>{pkg.description}</small>
                  </button>
                ))}
              </div>
              <label className="cv-field-span-2">
                <span>Upload CV (DOCX, PDF, or TXT)</span>
                <input accept=".docx,.pdf,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)} type="file" />
              </label>
              <label className="cv-field-span-2">
                <span>Profile Photo (Optional)</span>
                <input accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={(event) => void handleProfilePhotoUpload(event.target.files?.[0] ?? null)} type="file" />
                <small>Optional passport-style photo for premium designs.</small>
              </label>
              {uploadedCv ? (
                <article className="mini-panel cv-upload-summary cv-field-span-2">
                  <strong>{uploadedCv.fileName}</strong>
                  <span>{uploadedCv.mimeType}</span>
                  <small>Uploaded and ready for premium revamp.</small>
                </article>
              ) : null}
              {profilePhoto ? (
                <article className="mini-panel cv-upload-summary cv-field-span-2">
                  <strong>{profilePhoto.fileName}</strong>
                  <span>{profilePhoto.mimeType}</span>
                  <small>Profile photo saved for optional use in premium CV layouts.</small>
                </article>
              ) : null}
              <label><span>Target job title</span><input value={form.targetRole} onChange={(event) => setForm((current) => ({ ...current, targetRole: event.target.value }))} /></label>
              <label><span>Industry</span><input value={form.industry} onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))} /></label>
              <label><span>Country</span><input value={form.countryRegion} onChange={(event) => setForm((current) => ({ ...current, countryRegion: event.target.value }))} /></label>
              <label><span>Preferred tone</span><input value={form.preferredTone} onChange={(event) => setForm((current) => ({ ...current, preferredTone: event.target.value }))} /></label>
              <label className="cv-field-span-2"><span>Optional instructions</span><textarea rows={6} placeholder="Emphasize leadership, make it stronger for NGO jobs, reduce clutter, make it suitable for HR Officer roles..." value={form.specialInstructions} onChange={(event) => setForm((current) => ({ ...current, specialInstructions: event.target.value }))} /></label>
              <label className="cv-field-span-2"><span>Paste job description if available</span><textarea rows={6} value={form.jobDescription} onChange={(event) => setForm((current) => ({ ...current, jobDescription: event.target.value }))} /></label>
              {extractionPreview?.reviewFlags?.length ? (
                <div className="mini-list queue-list cv-field-span-2">
                  {extractionPreview.reviewFlags.map((flag, index) => (
                    <article key={`flag-${index}`}>
                      <strong>Quick review note</strong>
                      <span>{flag.replace(/^Needs review:\s*/i, "")}</span>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {step.key === "personal" ? (
            <div className="cv-step-section cv-form-grid">
              <label><span>Full name</span><input value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} /></label>
              <label><span>Phone number</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label><span>Location</span><input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} /></label>
              <label><span>LinkedIn URL</span><input value={form.linkedinUrl} onChange={(event) => setForm((current) => ({ ...current, linkedinUrl: event.target.value }))} /></label>
              <label><span>Portfolio / website</span><input value={form.portfolioUrl} onChange={(event) => setForm((current) => ({ ...current, portfolioUrl: event.target.value }))} /></label>
              <label className="cv-field-span-2"><span>Profile Photo (Optional)</span><input accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={(event) => void handleProfilePhotoUpload(event.target.files?.[0] ?? null)} type="file" /></label>
              {profilePhoto ? (
                <article className="mini-panel cv-upload-summary cv-field-span-2">
                  <strong>{profilePhoto.fileName}</strong>
                  <span>{profilePhoto.mimeType}</span>
                  <small>Optional premium portrait saved.</small>
                </article>
              ) : (
                <p className="section-description cv-field-span-2">Optional: add a passport-style PNG or JPG photo for premium layouts. You can skip this completely.</p>
              )}
            </div>
          ) : null}

          {step.key === "target" ? (
            <div className="cv-step-section cv-form-grid">
              <label><span>Target role</span><input value={form.targetRole} onChange={(event) => setForm((current) => ({ ...current, targetRole: event.target.value }))} /></label>
              <label><span>Industry</span><input value={form.industry} onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))} /></label>
              <label><span>Country / region</span><input value={form.countryRegion} onChange={(event) => setForm((current) => ({ ...current, countryRegion: event.target.value }))} /></label>
              <label><span>Preferred CV style</span><input value={form.preferredCvStyle} onChange={(event) => setForm((current) => ({ ...current, preferredCvStyle: event.target.value }))} /></label>
              <label className="cv-field-span-2"><span>Paste job description if available</span><textarea rows={6} value={form.jobDescription} onChange={(event) => setForm((current) => ({ ...current, jobDescription: event.target.value }))} /></label>
            </div>
          ) : null}

          {step.key === "summary" ? (
            <div className="cv-step-section cv-form-grid">
              <label><span>Current profession</span><input value={form.currentProfession} onChange={(event) => setForm((current) => ({ ...current, currentProfession: event.target.value }))} /></label>
              <label><span>Years of experience</span><input type="number" min="0" value={form.yearsOfExperience} onChange={(event) => setForm((current) => ({ ...current, yearsOfExperience: Number(event.target.value) || 0 }))} /></label>
              <label><span>Preferred tone</span><input value={form.preferredTone} onChange={(event) => setForm((current) => ({ ...current, preferredTone: event.target.value }))} /></label>
              <label className="cv-field-span-2"><span>Career objective</span><textarea rows={4} value={form.careerObjective} onChange={(event) => setForm((current) => ({ ...current, careerObjective: event.target.value }))} /></label>
            </div>
          ) : null}

          {step.key === "experience" ? (
            <div className="cv-step-section">
              <div className="cv-repeat-card">
                <div className="cv-repeat-card__header">
                  <strong>Work experience</strong>
                  <button className="ghost-button" onClick={() => setForm((current) => ({ ...current, experienceEntries: [...current.experienceEntries, createBlankExperience()] }))} type="button">Add role</button>
                </div>
                {form.experienceEntries.map((entry, index) => (
                  <div className="cv-form-grid cv-repeat-grid" key={`exp-${index}`}>
                    <label><span>Employer</span><input value={entry.employer} onChange={(event) => setForm((current) => ({ ...current, experienceEntries: updateArrayItem(current.experienceEntries, index, { ...entry, employer: event.target.value }) }))} /></label>
                    <label><span>Job title</span><input value={entry.jobTitle} onChange={(event) => setForm((current) => ({ ...current, experienceEntries: updateArrayItem(current.experienceEntries, index, { ...entry, jobTitle: event.target.value }) }))} /></label>
                    <label><span>Start date</span><input type="month" value={entry.startDate} onChange={(event) => setForm((current) => ({ ...current, experienceEntries: updateArrayItem(current.experienceEntries, index, { ...entry, startDate: event.target.value }) }))} /></label>
                    <label><span>End date</span><input type="month" disabled={entry.currentRole} value={entry.endDate} onChange={(event) => setForm((current) => ({ ...current, experienceEntries: updateArrayItem(current.experienceEntries, index, { ...entry, endDate: event.target.value }) }))} /></label>
                    <label className="checkbox-row"><input type="checkbox" checked={entry.currentRole} onChange={(event) => setForm((current) => ({ ...current, experienceEntries: updateArrayItem(current.experienceEntries, index, { ...entry, currentRole: event.target.checked }) }))} /><span>Current role</span></label>
                    <label className="cv-field-span-2"><span>Duties</span><textarea rows={4} value={entry.duties} onChange={(event) => setForm((current) => ({ ...current, experienceEntries: updateArrayItem(current.experienceEntries, index, { ...entry, duties: event.target.value }) }))} /></label>
                    <label className="cv-field-span-2"><span>Achievements</span><textarea rows={4} value={entry.achievements} onChange={(event) => setForm((current) => ({ ...current, experienceEntries: updateArrayItem(current.experienceEntries, index, { ...entry, achievements: event.target.value }) }))} /></label>
                    <label><span>Tools / software</span><input value={entry.tools} onChange={(event) => setForm((current) => ({ ...current, experienceEntries: updateArrayItem(current.experienceEntries, index, { ...entry, tools: event.target.value }) }))} /></label>
                    <label><span>Leadership responsibilities</span><input value={entry.leadership} onChange={(event) => setForm((current) => ({ ...current, experienceEntries: updateArrayItem(current.experienceEntries, index, { ...entry, leadership: event.target.value }) }))} /></label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step.key === "education" ? (
            <div className="cv-step-section">
              <div className="cv-repeat-card">
                <div className="cv-repeat-card__header">
                  <strong>Education</strong>
                  <button className="ghost-button" onClick={() => setForm((current) => ({ ...current, educationEntries: [...current.educationEntries, createBlankEducation()] }))} type="button">Add education</button>
                </div>
                {form.educationEntries.map((entry, index) => (
                  <div className="cv-form-grid cv-repeat-grid" key={`edu-${index}`}>
                    <label><span>Institution</span><input value={entry.institution} onChange={(event) => setForm((current) => ({ ...current, educationEntries: updateArrayItem(current.educationEntries, index, { ...entry, institution: event.target.value }) }))} /></label>
                    <label><span>Qualification</span><input value={entry.qualification} onChange={(event) => setForm((current) => ({ ...current, educationEntries: updateArrayItem(current.educationEntries, index, { ...entry, qualification: event.target.value }) }))} /></label>
                    <label><span>Year</span><input value={entry.year} onChange={(event) => setForm((current) => ({ ...current, educationEntries: updateArrayItem(current.educationEntries, index, { ...entry, year: event.target.value }) }))} /></label>
                    <label><span>Grade / class</span><input value={entry.grade} onChange={(event) => setForm((current) => ({ ...current, educationEntries: updateArrayItem(current.educationEntries, index, { ...entry, grade: event.target.value }) }))} /></label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step.key === "qualifications" ? (
            <div className="cv-step-section">
              <div className="cv-repeat-card">
                <div className="cv-repeat-card__header">
                  <strong>Certifications and additional qualifications</strong>
                  <button className="ghost-button" onClick={() => setForm((current) => ({ ...current, qualificationEntries: [...current.qualificationEntries, createBlankQualification()] }))} type="button">Add qualification</button>
                </div>
                {form.qualificationEntries.map((entry, index) => (
                  <div className="cv-form-grid cv-repeat-grid" key={`qual-${index}`}>
                    <label><span>Name</span><input value={entry.name} onChange={(event) => setForm((current) => ({ ...current, qualificationEntries: updateArrayItem(current.qualificationEntries, index, { ...entry, name: event.target.value }) }))} /></label>
                    <label><span>Issuer</span><input value={entry.issuer} onChange={(event) => setForm((current) => ({ ...current, qualificationEntries: updateArrayItem(current.qualificationEntries, index, { ...entry, issuer: event.target.value }) }))} /></label>
                    <label><span>Year</span><input value={entry.year} onChange={(event) => setForm((current) => ({ ...current, qualificationEntries: updateArrayItem(current.qualificationEntries, index, { ...entry, year: event.target.value }) }))} /></label>
                    <label><span>Type</span><input value={entry.type} onChange={(event) => setForm((current) => ({ ...current, qualificationEntries: updateArrayItem(current.qualificationEntries, index, { ...entry, type: event.target.value }) }))} /></label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step.key === "skills" ? (
            <div className="cv-step-section">
              <div className="cv-repeat-card">
                <div className="cv-repeat-card__header">
                  <strong>Skills</strong>
                  <button className="ghost-button" onClick={() => setForm((current) => ({ ...current, skillEntries: [...current.skillEntries, createBlankSkill("Additional skill set")] }))} type="button">Add skill group</button>
                </div>
                {form.skillEntries.map((entry, index) => (
                  <div className="cv-form-grid cv-repeat-grid" key={`skill-${index}`}>
                    <label><span>Category</span><input value={entry.category} onChange={(event) => setForm((current) => ({ ...current, skillEntries: updateArrayItem(current.skillEntries, index, { ...entry, category: event.target.value }) }))} /></label>
                    <label className="cv-field-span-2"><span>Items</span><textarea rows={3} value={entry.items} placeholder="Separate items with commas or new lines." onChange={(event) => setForm((current) => ({ ...current, skillEntries: updateArrayItem(current.skillEntries, index, { ...entry, items: event.target.value }) }))} /></label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step.key === "achievements" ? (
            <div className="cv-step-section cv-form-grid">
              <label className="cv-field-span-2"><span>Major achievements</span><textarea rows={6} placeholder="Quantify wins where possible." value={form.majorAchievements} onChange={(event) => setForm((current) => ({ ...current, majorAchievements: event.target.value }))} /></label>
            </div>
          ) : null}

          {step.key === "referees" ? (
            <div className="cv-step-section">
              <div className="cv-repeat-card">
                <div className="cv-repeat-card__header">
                  <strong>Referees</strong>
                  <button className="ghost-button" onClick={() => setForm((current) => ({ ...current, refereeEntries: [...current.refereeEntries, createBlankReferee()] }))} type="button">Add referee</button>
                </div>
                <label className="checkbox-row">
                  <input type="checkbox" checked={form.refereesOnRequest === true} onChange={(event) => setForm((current) => ({ ...current, refereesOnRequest: event.target.checked }))} />
                  <span>Referees available on request</span>
                </label>
                <p className="section-description">
                  Named referees: {countNamedReferees(form.refereeEntries)}. We recommend 3 referees, but you can continue with a warning if you prefer “Referees available on request”.
                </p>
                {form.refereeEntries.map((entry, index) => (
                  <div className="cv-form-grid cv-repeat-grid" key={`ref-${index}`}>
                    <label><span>Referee name</span><input value={entry.name} onChange={(event) => setForm((current) => ({ ...current, refereeEntries: updateArrayItem(current.refereeEntries, index, { ...entry, name: event.target.value }) }))} /></label>
                    <label><span>Designation</span><input value={entry.designation} onChange={(event) => setForm((current) => ({ ...current, refereeEntries: updateArrayItem(current.refereeEntries, index, { ...entry, designation: event.target.value }) }))} /></label>
                    <label><span>Organization</span><input value={entry.organization} onChange={(event) => setForm((current) => ({ ...current, refereeEntries: updateArrayItem(current.refereeEntries, index, { ...entry, organization: event.target.value }) }))} /></label>
                    <label><span>Phone number</span><input value={entry.phone} onChange={(event) => setForm((current) => ({ ...current, refereeEntries: updateArrayItem(current.refereeEntries, index, { ...entry, phone: event.target.value }) }))} /></label>
                    <label><span>Email</span><input value={entry.email} onChange={(event) => setForm((current) => ({ ...current, refereeEntries: updateArrayItem(current.refereeEntries, index, { ...entry, email: event.target.value }) }))} /></label>
                    <label><span>Relationship</span><input value={entry.relationship} onChange={(event) => setForm((current) => ({ ...current, refereeEntries: updateArrayItem(current.refereeEntries, index, { ...entry, relationship: event.target.value }) }))} /></label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step.key === "notes" ? (
            <div className="cv-step-section cv-form-grid">
              <label className="cv-field-span-2">
                <span>Notes / instructions</span>
                <textarea rows={8} placeholder="Make it suitable for NGO jobs, emphasize payroll, reduce clutter, make it more executive..." value={form.specialInstructions} onChange={(event) => setForm((current) => ({ ...current, specialInstructions: event.target.value }))} />
              </label>
            </div>
          ) : null}

          {step.key === "payment" ? (
            <div className="cv-step-section">
              <section className="mini-panel">
                <h4>Test payment mode</h4>
                <p className="section-description">
                  Live M-Pesa STK Push, M-Pesa Express, and card collection will be wired after workflow approval. For now, simulate payment to unlock generation.
                </p>
                <div className="cv-payment-card">
                  <strong>{selectedPackage.name}</strong>
                  <span>{formatCurrency(selectedPackage.price)}</span>
                  <small>Status: {draftOrder?.paymentStatus ?? "pending"}</small>
                  <button className="primary-button" disabled={busyAction === "simulate-payment"} onClick={() => void handleSimulatePayment()} type="button">
                    {busyAction === "simulate-payment" ? "Processing..." : "Simulate payment"}
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {step.key === "generation" ? (
            <div className="cv-step-section">
              <section className="mini-panel">
                <h4>{sourceMode === "upload" ? "AI CV revamp" : "AI CV generation"}</h4>
                <p className="section-description">
                  Solva AI will improve grammar, reduce clutter, strengthen bullets, remove duplication, and keep the final document truthful and ATS-compliant.
                </p>
                <div className="cv-generate-box">
                  <strong>Payment status: {draftOrder?.paymentStatus ?? "pending"}</strong>
                  <span>Generation status: {draftOrder?.generationStatus ?? "pending"}</span>
                  <button className="primary-button" disabled={busyAction === "generate-cv" || draftOrder?.paymentStatus !== "paid"} onClick={() => void handleGenerateCv()} type="button">
                    {busyAction === "generate-cv" ? "Generating..." : sourceMode === "upload" ? "Revamp my CV" : "Generate ATS-compliant CV"}
                  </button>
                </div>
                {draftOrder?.reviewNotes?.length ? (
                  <div className="mini-list queue-list">
                    {draftOrder.reviewNotes.map((note, index) => (
                      <article key={`review-note-${index}`}>
                        <strong>Review note</strong>
                        <span>{note}</span>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          {step.key === "downloads" ? (
            <div className="cv-step-section">
              <div className="cv-summary-grid">
                <article className="cv-download-card">
                  <strong>{draftOrder?.customerName || form.customerName || "Customer"}</strong>
                  <span>{selectedPackage.name}</span>
                  <small>Generated {draftOrder?.generatedAtLabel || "Just now"}</small>
                </article>
                <article className="cv-download-card">
                  <strong>ATS score</strong>
                  <span>{draftOrder?.atsScore || 0} / 100</span>
                  <small>Cleaner headings, keywords, and structure improve ATS parsing.</small>
                </article>
                <article className="cv-download-card">
                  <strong>Readability score</strong>
                  <span>{draftOrder?.readabilityScore || 0} / 100</span>
                  <small>Focused on clean summary, clearer bullets, and easier recruiter reading.</small>
                </article>
                <article className="cv-download-card">
                  <strong>Files available for 24 hours</strong>
                  <span>Payment status: {draftOrder?.paymentStatus ?? "pending"}</span>
                  <small>Downloads remain locked if payment is not confirmed.</small>
                </article>
                <article className="cv-download-card">
                  <strong>AI engine</strong>
                  <span>{draftOrder?.generationEngine || "Solva AI Structured Draft"}</span>
                  <small>
                    Estimated internal AI processing cost: {draftOrder?.estimatedProcessingCostKes ? `KES ${draftOrder.estimatedProcessingCostKes}` : "KES 0"}.
                  </small>
                </article>
              </div>
              {draftOrder?.improvementSummary?.length ? (
                <section className="mini-panel">
                  <h4>Improvement summary</h4>
                  <ul className="cv-note-list">
                    {draftOrder.improvementSummary.map((item, index) => <li key={`improvement-${index}`}>{item}</li>)}
                  </ul>
                </section>
              ) : null}
              {draftOrder?.generatedPreview ? (
                <section className="mini-panel">
                  <h4>CV preview</h4>
                  <p className="section-description">{safeString(draftOrder.generatedPreview.professionalSummary, "Summary preview unavailable.")}</p>
                </section>
              ) : null}
              <div className="cv-download-grid">
                <article className="cv-download-card">
                  <strong>ATS-Friendly Version</strong>
                  <span>Clean structure for recruiter systems</span>
                  <div className="inline-actions">
                    <a className="primary-button" href={draftOrder?.generatedDownloadLinks.docx ?? "#"} rel="noreferrer" target="_blank">Download DOCX</a>
                    <a className="ghost-button" href={draftOrder?.generatedDownloadLinks.pdf ?? "#"} rel="noreferrer" target="_blank">Download PDF</a>
                  </div>
                </article>
                <article className="cv-download-card">
                  <strong>Refine once more</strong>
                  <span>Adjust tone or design level, then regenerate once.</span>
                  <label><span>Preferred tone</span><input value={form.preferredTone} onChange={(event) => setForm((current) => ({ ...current, preferredTone: event.target.value }))} /></label>
                  <label><span>Design style</span><input value={form.preferredCvStyle} onChange={(event) => setForm((current) => ({ ...current, preferredCvStyle: event.target.value }))} /></label>
                  <button className="ghost-button" disabled={!canRegenerate || busyAction === "generate-cv"} onClick={() => void handleGenerateCv()} type="button">
                    {canRegenerate ? "Regenerate once" : "Regeneration used"}
                  </button>
                </article>
              </div>
            </div>
          ) : null}

          <footer className="cv-wizard-actions">
            <div className="auth-links">
              <Link href="/login">Back to login</Link>
              <Link href="/pricing">View Solva HR pricing</Link>
            </div>
            <div className="inline-actions">
              <button className="ghost-button" disabled={currentStep === 0 || busyAction.length > 0} onClick={() => setCurrentStep((value) => Math.max(value - 1, 0))} type="button">
                Back
              </button>
              {!["payment", "generation", "downloads"].includes(step.key) ? (
                <button className="primary-button" disabled={!canMoveNext() || busyAction.length > 0} onClick={() => void handleContinue()} type="button">
                  {busyAction.startsWith("step-") ? "Saving..." : "Continue"}
                </button>
              ) : null}
            </div>
          </footer>

          {message ? <div className="task-banner">{message}</div> : null}
        </section>
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">FAQ</p>
            <h2>Quick answers before you start.</h2>
          </div>
        </div>
        <div className="marketing-feature-grid">
          <article className="marketing-feature-card">
            <strong>Can I upload my old CV?</strong>
            <p className="section-description">Yes. Upload DOCX, PDF, or TXT and let Solva AI extract and improve it.</p>
          </article>
          <article className="marketing-feature-card">
            <strong>Will I be forced to fill everything again?</strong>
            <p className="section-description">No. The quick revamp lane is built so you can upload, add optional notes, pay, and move straight into generation.</p>
          </article>
          <article className="marketing-feature-card">
            <strong>Can I download Word and PDF?</strong>
            <p className="section-description">Yes. The service generates both DOCX and PDF after payment confirmation.</p>
          </article>
          <article className="marketing-feature-card">
            <strong>How long are files available?</strong>
            <p className="section-description">Generated files and bulky uploads are kept for 24 hours before cleanup.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
