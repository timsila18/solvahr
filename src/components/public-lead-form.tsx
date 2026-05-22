"use client";

import { useState, type FormEvent } from "react";
import { createPublicLead } from "@/lib/solva-api";

const MODULE_OPTIONS = [
  "people",
  "payroll",
  "leave",
  "ess",
  "reports",
  "administration",
  "recruitment",
  "performance",
] as const;

export function PublicLeadForm({
  leadType,
  title,
  description,
}: {
  leadType: "contact_sales" | "book_demo";
  title: string;
  description: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>(["people", "payroll", "reports"]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      await createPublicLead({
        leadType,
        companyName: String(formData.get("companyName") ?? ""),
        contactPerson: String(formData.get("contactPerson") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        employeeCount: Number(formData.get("employeeCount") ?? 0),
        preferredDate: String(formData.get("preferredDate") ?? ""),
        country: String(formData.get("country") ?? "Kenya"),
        notes: String(formData.get("notes") ?? ""),
        modules: selectedModules,
      });

      setMessage(
        leadType === "book_demo"
          ? "Demo request received. We’ll reach out with confirmation details shortly."
          : "Thanks. Our team has your details and will follow up with the right plan options."
      );
      event.currentTarget.reset();
      setSelectedModules(["people", "payroll", "reports"]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not save your request right now.");
    } finally {
      setBusy(false);
    }
  }

  function toggleModule(moduleKey: string) {
    setSelectedModules((current) =>
      current.includes(moduleKey) ? current.filter((item) => item !== moduleKey) : [...current, moduleKey]
    );
  }

  return (
    <section className="marketing-form-card">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Lead capture</p>
          <h2>{title}</h2>
        </div>
      </div>
      <p className="section-description">{description}</p>
      <form className="action-form" onSubmit={handleSubmit}>
        <label>
          <span>Company name</span>
          <input name="companyName" placeholder="Bluewave Consulting Ltd" required type="text" />
        </label>
        <label>
          <span>Contact person</span>
          <input name="contactPerson" placeholder="Aisha Abdalla" required type="text" />
        </label>
        <label>
          <span>Email</span>
          <input name="email" placeholder="aisha@bluewave.co.ke" required type="email" />
        </label>
        <label>
          <span>Phone</span>
          <input name="phone" placeholder="+254 700 000000" type="tel" />
        </label>
        <label>
          <span>Employee count</span>
          <input defaultValue="50" min={1} name="employeeCount" type="number" />
        </label>
        <label>
          <span>Preferred date</span>
          <input name="preferredDate" type="datetime-local" />
        </label>
        <label>
          <span>Country</span>
          <input defaultValue="Kenya" name="country" type="text" />
        </label>
        <label>
          <span>What do you need help with?</span>
          <textarea
            name="notes"
            placeholder="Tell us whether you need payroll setup, migration support, or a guided demo."
          />
        </label>
        <fieldset className="module-picker">
          <legend>Modules of interest</legend>
          <div className="selection-pill-grid">
            {MODULE_OPTIONS.map((moduleKey) => {
              const active = selectedModules.includes(moduleKey);
              return (
                <button
                  className={`selection-pill ${active ? "is-active" : ""}`}
                  key={moduleKey}
                  onClick={() => toggleModule(moduleKey)}
                  type="button"
                >
                  {moduleKey}
                </button>
              );
            })}
          </div>
        </fieldset>
        <button className="primary-button" disabled={busy} type="submit">
          {busy ? "Submitting..." : leadType === "book_demo" ? "Book Demo" : "Contact Sales"}
        </button>
      </form>
      {message ? <div className="task-banner">{message}</div> : null}
    </section>
  );
}
