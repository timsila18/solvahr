import type { CandidatePipelineSummary } from "@solva/shared";

type PipelineCandidate = {
  fullName: string;
  stage: string;
  screeningScore: number;
  source: string;
};

type OnboardingTask = {
  personName: string;
  title: string;
  ownerRole: string;
  dueDate: string;
  status: string;
};

type WorkflowStep = {
  step: number;
  label: string;
  approverRole: string;
  status: string;
};

type PhaseTwoPanelProps = {
  pipeline: CandidatePipelineSummary[];
  candidates: PipelineCandidate[];
  tasks: OnboardingTask[];
  workflowSteps: WorkflowStep[];
};

export function PhaseTwoPanel({ pipeline, candidates, tasks, workflowSteps }: PhaseTwoPanelProps) {
  return (
    <div className="phaseTwoGrid">
      <section className="panel" id="recruitment">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Recruitment ATS</p>
            <h2>Vacancies, candidates, interviews, and offers move through one pipeline.</h2>
          </div>
          <span className="status">Phase 2</span>
        </div>
        <div className="pipeline">
          {pipeline
            .filter((stage) => stage.count > 0)
            .map((stage) => (
              <article className="pipelineStage" key={stage.stage}>
                <span>{stage.label}</span>
                <strong>{stage.count}</strong>
              </article>
            ))}
        </div>
        <div className="compactList">
          {candidates.map((candidate) => (
            <article key={candidate.fullName}>
              <strong>{candidate.fullName}</strong>
              <span>
                {candidate.stage} · {candidate.screeningScore}% · {candidate.source}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" id="onboarding">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Onboarding and Probation</p>
            <h2>Pre-boarding, departmental tasks, and confirmation reviews stay visible.</h2>
          </div>
        </div>
        <div className="compactList">
          {tasks.map((task) => (
            <article key={task.title}>
              <strong>{task.title}</strong>
              <span>
                {task.personName} · {task.ownerRole} · {task.dueDate} · {task.status}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" id="documents">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Documents</p>
            <h2>Offer letters, confirmation letters, and HR documents use merge fields.</h2>
          </div>
          <button className="secondaryButton">Generate Offer</button>
        </div>
        <div className="documentPreview">
          <strong>Kenya Offer Letter</strong>
          <p>Dear Faith Wambui, we are pleased to offer you the role of Payroll Implementation Specialist.</p>
        </div>
      </section>

      <section className="panel" id="workflows">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Approval Workflow</p>
            <h2>Offer approval now follows configurable steps and audit-ready decisions.</h2>
          </div>
        </div>
        <div className="workflowSteps">
          {workflowSteps.map((step) => (
            <article key={step.step}>
              <span>{step.step}</span>
              <div>
                <strong>{step.label}</strong>
                <small>
                  {step.approverRole} · {step.status}
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
