import { MarketingSite } from "@/components/marketing-site";

const SETUP_STEPS = [
  {
    title: "Upload employee data",
    detail: "Bring in your employee register, salary data, statutory numbers, phone data, branches, departments, and designations.",
  },
  {
    title: "Map payroll structure",
    detail: "Confirm pay frequency, salary structure, approval flow, and payment method before the first test payroll.",
  },
  {
    title: "Configure leave and ESS",
    detail: "Set leave policies, working days, shifts, and the ESS experience that employees will use on their phones.",
  },
  {
    title: "Brand the tenant",
    detail: "Add logo, colors, welcome message, company short name, and email signature branding so the workspace feels owned by the client.",
  },
  {
    title: "Test the real workflows",
    detail: "Verify payroll preview, leave approval, report exports, and ESS login before go-live.",
  },
  {
    title: "Go live fast",
    detail: "Move from setup into a live payroll and HR workspace with approvals, reports, and exports ready for daily use.",
  },
];

export default function GuidedSetupPage() {
  return (
    <MarketingSite variant="guided-setup">
      <section className="marketing-section">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Guided setup checklist</p>
            <h2>Everything a new employer needs to become operational within hours.</h2>
          </div>
        </div>
        <div className="marketing-feature-grid">
          {SETUP_STEPS.map((step, index) => (
            <article className="marketing-feature-card" key={step.title}>
              <p className="pricing-card__eyebrow">Step {index + 1}</p>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingSite>
  );
}
