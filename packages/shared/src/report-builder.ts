export type ReportDataset =
  | "employee_master"
  | "leave_balances"
  | "payroll_register"
  | "net_to_bank"
  | "statutory_schedule"
  | "wage_bill"
  | "audit_log"
  | "candidate_pipeline"
  | "onboarding_tasks"
  | "probation_reviews";

export type ReportColumn = {
  key: string;
  label: string;
  dataType: "text" | "number" | "money" | "date" | "boolean";
  formula?: string;
  hiddenByDefault?: boolean;
};

export type ReportTemplate = {
  code: string;
  name: string;
  dataset: ReportDataset;
  columns: ReportColumn[];
  filters: Array<{
    field: string;
    operator: "equals" | "contains" | "between" | "in" | "gte" | "lte";
    value?: unknown;
  }>;
  groupBy?: string[];
  aggregations?: Array<{
    field: string;
    function: "sum" | "count" | "average" | "min" | "max";
    label: string;
  }>;
  exportFormats: Array<"xlsx" | "csv" | "pdf">;
};

export const defaultReportTemplates: ReportTemplate[] = [
  {
    code: "candidate-pipeline",
    name: "Candidate Pipeline",
    dataset: "candidate_pipeline",
    columns: [
      { key: "candidateName", label: "Candidate", dataType: "text" },
      { key: "vacancyTitle", label: "Vacancy", dataType: "text" },
      { key: "stage", label: "Stage", dataType: "text" },
      { key: "source", label: "Source", dataType: "text" },
      { key: "screeningScore", label: "Score", dataType: "number" }
    ],
    filters: [],
    groupBy: ["stage"],
    aggregations: [{ field: "candidateName", function: "count", label: "Candidates" }],
    exportFormats: ["xlsx", "csv", "pdf"]
  },
  {
    code: "onboarding-tasks",
    name: "Onboarding Tasks",
    dataset: "onboarding_tasks",
    columns: [
      { key: "personName", label: "Person", dataType: "text" },
      { key: "task", label: "Task", dataType: "text" },
      { key: "ownerRole", label: "Owner", dataType: "text" },
      { key: "dueDate", label: "Due Date", dataType: "date" },
      { key: "status", label: "Status", dataType: "text" }
    ],
    filters: [],
    groupBy: ["ownerRole", "status"],
    aggregations: [{ field: "task", function: "count", label: "Tasks" }],
    exportFormats: ["xlsx", "csv"]
  },
  {
    code: "payroll-register",
    name: "Payroll Register",
    dataset: "payroll_register",
    columns: [
      { key: "payrollNumber", label: "Payroll Number", dataType: "text" },
      { key: "employeeName", label: "Employee", dataType: "text" },
      { key: "department", label: "Department", dataType: "text" },
      { key: "grossPay", label: "Gross Pay", dataType: "money" },
      { key: "taxablePay", label: "Taxable Pay", dataType: "money" },
      { key: "totalDeductions", label: "Deductions", dataType: "money" },
      { key: "netPay", label: "Net Pay", dataType: "money" }
    ],
    filters: [],
    groupBy: ["department"],
    aggregations: [
      { field: "grossPay", function: "sum", label: "Total Gross" },
      { field: "netPay", function: "sum", label: "Total Net" }
    ],
    exportFormats: ["xlsx", "csv", "pdf"]
  },
  {
    code: "net-to-bank",
    name: "Net To Bank",
    dataset: "net_to_bank",
    columns: [
      { key: "employeeName", label: "Employee", dataType: "text" },
      { key: "bankName", label: "Bank", dataType: "text" },
      { key: "bankBranch", label: "Branch", dataType: "text" },
      { key: "accountNumber", label: "Account Number", dataType: "text" },
      { key: "netPay", label: "Net Pay", dataType: "money" }
    ],
    filters: [],
    aggregations: [{ field: "netPay", function: "sum", label: "Bank Total" }],
    exportFormats: ["xlsx", "csv"]
  }
];
