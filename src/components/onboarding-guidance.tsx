"use client";

import { useEffect, useMemo, useState } from "react";

export type GuidanceAction = {
  label: string;
  description: string;
  moduleKey?: string;
  item?: string;
};

export type ChecklistItem = {
  key: string;
  label: string;
  detail: string;
  completed: boolean;
  auto: boolean;
  moduleKey?: string;
  item?: string;
};

export type TourStep = {
  selector: string;
  title: string;
  body: string;
};

export type TourDefinition = {
  title: string;
  steps: TourStep[];
};

export const ROLE_GUIDANCE: Record<
  string,
  {
    headline: string;
    intro: string;
    actions: GuidanceAction[];
    helpTopics: Array<{ title: string; body: string; moduleKey?: string; item?: string }>;
    defaultTour: "dashboard" | "people" | "payroll" | "leave" | "ess";
  }
> = {
  "HR Admin": {
    headline: "Welcome to your HR workspace",
    intro: "Start by setting up people data, then move into payroll and approvals once the team structure is in place.",
    defaultTour: "people",
    actions: [
      { label: "Add your first employee", description: "Create an employee record with guided sections.", moduleKey: "people", item: "Employee Directory" },
      { label: "Set up departments", description: "Create departments and structure your workforce.", moduleKey: "administration", item: "Department Management" },
      { label: "Prepare payroll", description: "Move into payroll once your people records are ready.", moduleKey: "payroll", item: "Payroll Dashboard" },
    ],
    helpTopics: [
      { title: "How to add employees", body: "Go to People, open Add Employee, complete the personal and employment sections, then save." },
      { title: "How approvals work", body: "Requests flow to the relevant reviewer automatically. Use Pending Approvals to monitor what needs attention.", moduleKey: "dashboard", item: "Pending Approvals" },
      { title: "Where payroll starts", body: "Open Payroll Dashboard after people setup, then open a payroll period and review validations." },
    ],
  },
  "Payroll Admin": {
    headline: "Welcome to payroll operations",
    intro: "Your main path is simple: open a period, review validations, approve the run, then publish outputs and payslips.",
    defaultTour: "payroll",
    actions: [
      { label: "Open payroll period", description: "Create a new payroll cycle with the live workflow.", moduleKey: "payroll", item: "Payroll Periods" },
      { label: "Review payroll", description: "Check validations, variance, and approvals before release.", moduleKey: "payroll", item: "Review & Approval" },
      { label: "Generate payslips", description: "Open payroll outputs and release staff payslips.", moduleKey: "payroll", item: "Payslips" },
    ],
    helpTopics: [
      { title: "How to run payroll", body: "Start in Payroll Periods, then use Process Payroll and Review & Approval before exporting outputs." },
      { title: "Statutory exports", body: "Use Statutory Reports for PAYE, SHIF, NSSF, and Housing Levy summaries.", moduleKey: "payroll", item: "Statutory Reports" },
      { title: "Net-to-bank", body: "Open Net to Bank once payroll is approved to generate payment-ready outputs.", moduleKey: "payroll", item: "Net to Bank" },
    ],
  },
  Manager: {
    headline: "Welcome to your team workspace",
    intro: "Your day-to-day view is centered on approvals, team leave, and performance reviews.",
    defaultTour: "dashboard",
    actions: [
      { label: "Review approvals", description: "See what your team is waiting on.", moduleKey: "dashboard", item: "Pending Approvals" },
      { label: "Check leave requests", description: "Review upcoming leave and staffing impact.", moduleKey: "leave", item: "Leave Requests" },
      { label: "Review performance", description: "Open team performance reviews and appraisal actions.", moduleKey: "performance", item: "Performance Reviews" },
    ],
    helpTopics: [
      { title: "Approving requests", body: "Use Pending Approvals for leave, profile updates, and other assigned reviews." },
      { title: "Team leave visibility", body: "Leave Calendar helps you understand who is away and when.", moduleKey: "leave", item: "Leave Calendar" },
      { title: "Performance reviews", body: "Use Performance Reviews to update progress and launch the next appraisal cycle." },
    ],
  },
  Employee: {
    headline: "Welcome to employee self service",
    intro: "Everything you need is in one place: update your profile, track leave, view payslips, and follow requests.",
    defaultTour: "ess",
    actions: [
      { label: "Complete your profile", description: "Review your personal and employment details.", moduleKey: "ess", item: "My Profile" },
      { label: "Apply for leave", description: "Submit a leave request with balances and approvals built in.", moduleKey: "ess", item: "My Leave" },
      { label: "View payslips", description: "Open your payroll history and download payslips.", moduleKey: "ess", item: "My Payslips" },
    ],
    helpTopics: [
      { title: "Profile updates", body: "Some details save immediately while sensitive updates go through approval." },
      { title: "Leave requests", body: "Use Apply Leave to submit, then track the request in My Requests." },
      { title: "Document uploads", body: "Keep KRA, SHIF, NSSF, and other personal records up to date in My Documents." },
    ],
  },
  default: {
    headline: "Welcome to Solva HR",
    intro: "Use the guided actions below to get started, then explore the modules at your own pace.",
    defaultTour: "dashboard",
    actions: [
      { label: "Open dashboard", description: "See the main approvals, metrics, and quick actions.", moduleKey: "dashboard", item: "Overview" },
      { label: "Explore People", description: "Review employee records and workforce structure.", moduleKey: "people", item: "Employee Directory" },
      { label: "Open Reports", description: "Jump into executive and operational reporting.", moduleKey: "reports", item: "Executive Dashboard" },
    ],
    helpTopics: [
      { title: "Getting around", body: "Use the sidebar for major modules, then the module menu for deeper workspaces." },
      { title: "Quick actions", body: "The dashboard keeps the highest-value actions close so you can start work quickly." },
      { title: "Need help", body: "Open the help panel any time for short guides and module tours." },
    ],
  },
};

function roleConfig(role: string) {
  return ROLE_GUIDANCE[role] ?? ROLE_GUIDANCE.default;
}

export function WelcomeExperience({
  roleName,
  isOpen,
  onStartTour,
  onSkip,
  onOpenAction,
}: {
  roleName: string;
  isOpen: boolean;
  onStartTour: (tourKey: "dashboard" | "people" | "payroll" | "leave" | "ess") => void;
  onSkip: () => void;
  onOpenAction: (action: GuidanceAction) => void;
}) {
  const config = roleConfig(roleName);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="guidance-modal-backdrop" role="presentation">
      <section aria-label="Welcome to Solva HR" className="guidance-modal">
        <p className="section-eyebrow">Welcome</p>
        <h2>{config.headline}</h2>
        <p className="section-description">{config.intro}</p>
        <div className="guidance-action-list">
          {config.actions.map((action) => (
            <button
              className="guidance-action-card"
              key={action.label}
              onClick={() => onOpenAction(action)}
              type="button"
            >
              <strong>{action.label}</strong>
              <small>{action.description}</small>
            </button>
          ))}
        </div>
        <div className="guidance-modal-actions">
          <button className="primary-button" onClick={() => onStartTour(config.defaultTour)} type="button">
            Start quick tour
          </button>
          <button className="ghost-button" onClick={onSkip} type="button">
            Skip for now
          </button>
        </div>
      </section>
    </div>
  );
}

export function OnboardingChecklist({
  roleName,
  items,
  progress,
  nextAction,
  hidden,
  onToggleItem,
  onOpenAction,
  onDismiss,
  onStartTour,
  onOpenHelp,
}: {
  roleName: string;
  items: ChecklistItem[];
  progress: number;
  nextAction?: GuidanceAction | null;
  hidden: boolean;
  onToggleItem: (key: string) => void;
  onOpenAction: (action: GuidanceAction) => void;
  onDismiss: () => void;
  onStartTour: () => void;
  onOpenHelp: () => void;
}) {
  if (hidden || items.length === 0) {
    return null;
  }

  return (
    <section className="surface-card onboarding-checklist">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Getting Started</p>
          <h3>{roleName} setup checklist</h3>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" onClick={onStartTour} type="button">
            Start tour
          </button>
          <button className="ghost-button" onClick={onOpenHelp} type="button">
            Need help?
          </button>
          <button className="ghost-button" onClick={onDismiss} type="button">
            Hide
          </button>
        </div>
      </div>
      <div className="checklist-progress">
        <div className="checklist-progress__bar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <strong>{progress}% complete</strong>
      </div>
      {nextAction ? (
        <div className="next-best-action">
          <span>Next best action</span>
          <strong>{nextAction.label}</strong>
          <small>{nextAction.description}</small>
          <button className="primary-button" onClick={() => onOpenAction(nextAction)} type="button">
            Open now
          </button>
        </div>
      ) : null}
      <div className="checklist-list">
        {items.map((item) => (
          <article className={`checklist-item ${item.completed ? "is-complete" : ""}`} key={item.key}>
            <label className="checklist-item__copy">
              <input checked={item.completed} onChange={() => onToggleItem(item.key)} type="checkbox" />
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
            </label>
            {item.moduleKey && item.item ? (
              <button
                className="ghost-button"
                onClick={() => onOpenAction({ label: item.label, description: item.detail, moduleKey: item.moduleKey, item: item.item })}
                type="button"
              >
                Open
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function HelpPanel({
  roleName,
  open,
  onClose,
  onOpenTopic,
  onStartTour,
}: {
  roleName: string;
  open: boolean;
  onClose: () => void;
  onOpenTopic: (topic: GuidanceAction) => void;
  onStartTour: (tourKey: "dashboard" | "people" | "payroll" | "leave" | "ess") => void;
}) {
  const config = roleConfig(roleName);

  if (!open) {
    return null;
  }

  return (
    <div className="help-panel-backdrop" role="presentation">
      <aside aria-label="Help and onboarding" className="help-panel">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Help Center</p>
            <h3>{roleName} guidance</h3>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="help-panel-section">
          <h4>Quick guides</h4>
          <div className="help-topic-list">
            {config.helpTopics.map((topic) => (
              <article className="help-topic-card" key={topic.title}>
                <strong>{topic.title}</strong>
                <p>{topic.body}</p>
                {topic.moduleKey && topic.item ? (
                  <button
                    className="ghost-button"
                    onClick={() => onOpenTopic({ label: topic.title, description: topic.body, moduleKey: topic.moduleKey, item: topic.item })}
                    type="button"
                  >
                    Open workspace
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </div>
        <div className="help-panel-section">
          <h4>Product tours</h4>
          <div className="help-tour-list">
            {(["dashboard", "people", "payroll", "leave", "ess"] as const).map((tourKey) => (
              <button className="guidance-action-card" key={tourKey} onClick={() => onStartTour(tourKey)} type="button">
                <strong>{tourKey.charAt(0).toUpperCase() + tourKey.slice(1)} tour</strong>
                <small>See the most important actions in a few short steps.</small>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function GuidedTour({
  tour,
  onFinish,
  onSkip,
}: {
  tour: TourDefinition | null;
  onFinish: () => void;
  onSkip: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = tour?.steps[stepIndex];
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setStepIndex(0);
  }, [tour?.title]);

  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }

    const element = document.querySelector(step.selector) as HTMLElement | null;
    if (!element) {
      setRect(null);
      return;
    }

    const updateRect = () => setRect(element.getBoundingClientRect());
    element.classList.add("tour-target-active");
    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      element.classList.remove("tour-target-active");
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [step]);

  const cardStyle = useMemo(() => {
    if (!rect || typeof window === "undefined") {
      return {};
    }

    const top = Math.min(window.innerHeight - 240, rect.bottom + 18);
    const left = Math.min(window.innerWidth - 360, Math.max(16, rect.left));
    return {
      top,
      left,
    };
  }, [rect]);

  if (!tour || !step) {
    return null;
  }

  return (
    <div className="tour-overlay" role="presentation">
      {rect ? (
        <div
          className="tour-highlight"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      ) : null}
      <section className="tour-card" style={cardStyle}>
        <p className="section-eyebrow">{tour.title}</p>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button className="ghost-button" onClick={onSkip} type="button">
            Skip
          </button>
          <span>
            Step {stepIndex + 1} of {tour.steps.length}
          </span>
          {stepIndex < tour.steps.length - 1 ? (
            <button className="primary-button" onClick={() => setStepIndex((current) => current + 1)} type="button">
              Next
            </button>
          ) : (
            <button className="primary-button" onClick={onFinish} type="button">
              Finish
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
