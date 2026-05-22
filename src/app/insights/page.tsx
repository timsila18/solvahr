import { MarketingSite } from "@/components/marketing-site";

const INSIGHTS = [
  {
    title: "Payroll close reminders",
    detail: "Keep payroll close cleaner by checking missing statutory identifiers, payout phone data, and approvals before the run starts.",
  },
  {
    title: "Employee ESS adoption",
    detail: "The fastest HR teams push staff to self-serve payslips, leave, and documents early so operations stay lighter for HR.",
  },
  {
    title: "Performance rhythm",
    detail: "Short weekly manager reviews often produce better follow-through than bulky quarterly conversations alone.",
  },
  {
    title: "Compliance hygiene",
    detail: "Good master data saves time every month. Missing KRA, SHIF, NSSF, or bank details always become payroll pressure later.",
  },
  {
    title: "Operational visibility",
    detail: "Executives trust HR systems more when reports are boardroom-ready and approval trails are easy to explain.",
  },
  {
    title: "Branch readiness",
    detail: "Multi-branch teams benefit from shared structures, but each branch still needs clean ownership for shifts, leave, and payroll exceptions.",
  },
];

export default function InsightsPage() {
  return (
    <MarketingSite variant="insights">
      <section className="marketing-section">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Solva HR Insights</p>
            <h2>Short practical notes that keep HR and payroll teams sharp.</h2>
          </div>
        </div>
        <div className="marketing-feature-grid">
          {INSIGHTS.map((insight) => (
            <article className="marketing-feature-card" key={insight.title}>
              <strong>{insight.title}</strong>
              <p>{insight.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingSite>
  );
}
