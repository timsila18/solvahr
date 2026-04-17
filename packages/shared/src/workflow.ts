export type ApprovalDecision = "approve" | "reject" | "return";

export type WorkflowStepDefinition = {
  step: number;
  label: string;
  approverRole: string;
  escalationHours?: number;
  requiredPermission?: string;
};

export type WorkflowDefinitionConfig = {
  code: string;
  name: string;
  module: "employees" | "recruitment" | "onboarding" | "probation" | "payroll" | "leave" | "documents";
  trigger: string;
  steps: WorkflowStepDefinition[];
};

export type WorkflowRuntimeStep = WorkflowStepDefinition & {
  status: WorkflowStepStatus;
  comments?: string;
  decidedAt?: string;
};

type WorkflowStepStatus = "pending" | "approved" | "rejected" | "returned" | "skipped";

export type WorkflowInstanceState = {
  definitionCode: string;
  entityType: string;
  entityId: string;
  status: "submitted" | "approved" | "rejected" | "returned" | "cancelled";
  currentStep: number;
  steps: WorkflowRuntimeStep[];
};

export const phaseTwoWorkflowDefinitions: WorkflowDefinitionConfig[] = [
  {
    code: "employee-create-approval",
    name: "Employee Creation Approval",
    module: "employees",
    trigger: "employee.request.submitted",
    steps: [{ step: 1, label: "Supervisor approval", approverRole: "supervisor", escalationHours: 24 }]
  },
  {
    code: "leave-approval",
    name: "Leave Approval",
    module: "leave",
    trigger: "leave.request.submitted",
    steps: [
      { step: 1, label: "Supervisor review", approverRole: "supervisor", escalationHours: 24 },
      { step: 2, label: "HR validation", approverRole: "hr_admin", escalationHours: 24 }
    ]
  },
  {
    code: "manpower-requisition-approval",
    name: "Manpower Requisition Approval",
    module: "recruitment",
    trigger: "requisition.submitted",
    steps: [
      { step: 1, label: "Line manager review", approverRole: "manager", escalationHours: 24 },
      { step: 2, label: "HR validation", approverRole: "hr_admin", escalationHours: 24 },
      { step: 3, label: "Finance budget check", approverRole: "finance_user", escalationHours: 48 }
    ]
  },
  {
    code: "offer-approval",
    name: "Offer Approval",
    module: "recruitment",
    trigger: "offer.created",
    steps: [
      { step: 1, label: "HR offer review", approverRole: "hr_admin", escalationHours: 12 },
      { step: 2, label: "Payroll affordability review", approverRole: "payroll_admin", escalationHours: 24 },
      { step: 3, label: "Company admin approval", approverRole: "company_admin", escalationHours: 24 }
    ]
  },
  {
    code: "probation-confirmation",
    name: "Probation Confirmation",
    module: "probation",
    trigger: "probation.review.submitted",
    steps: [
      { step: 1, label: "Manager recommendation", approverRole: "manager", escalationHours: 24 },
      { step: 2, label: "HR confirmation", approverRole: "hr_admin", escalationHours: 24 }
    ]
  },
  {
    code: "payroll-approval",
    name: "Payroll Approval",
    module: "payroll",
    trigger: "payroll.run.ready_for_review",
    steps: [
      { step: 1, label: "Payroll admin review", approverRole: "payroll_admin", escalationHours: 12 },
      { step: 2, label: "Finance review", approverRole: "finance_user", escalationHours: 24 },
      { step: 3, label: "Company admin sign-off", approverRole: "company_admin", escalationHours: 24 }
    ]
  }
];

export function createWorkflowInstance(
  definition: WorkflowDefinitionConfig,
  entityType: string,
  entityId: string
): WorkflowInstanceState {
  return {
    definitionCode: definition.code,
    entityType,
    entityId,
    status: "submitted",
    currentStep: 1,
    steps: definition.steps.map((step) => ({
      ...step,
      status: step.step === 1 ? "pending" : "skipped"
    }))
  };
}

export function decideWorkflowStep(
  instance: WorkflowInstanceState,
  stepNumber: number,
  decision: ApprovalDecision,
  comments?: string
): WorkflowInstanceState {
  const decidedAt = new Date().toISOString();
  const nextStatus: WorkflowStepStatus =
    decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "returned";
  const steps: WorkflowRuntimeStep[] = instance.steps.map((step) => {
    if (step.step !== stepNumber) {
      return step;
    }

    const decidedStep: WorkflowRuntimeStep = {
      ...step,
      status: nextStatus,
      decidedAt
    };

    if (comments) {
      decidedStep.comments = comments;
    }

    return decidedStep;
  });

  if (decision === "reject" || decision === "return") {
    return {
      ...instance,
      status: decision === "reject" ? "rejected" : "returned",
      steps
    };
  }

  const nextStep = steps.find((step) => step.step > stepNumber);
  if (!nextStep) {
    return {
      ...instance,
      status: "approved",
      currentStep: stepNumber,
      steps
    };
  }

  return {
    ...instance,
    currentStep: nextStep.step,
    steps: steps.map((step) => (step.step === nextStep.step ? { ...step, status: "pending" as const } : step))
  };
}
