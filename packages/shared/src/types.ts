export type ID = string;

export type TenantScoped = {
  tenantId: ID;
};

export type Money = {
  amount: number;
  currency: "KES" | "USD" | "EUR" | string;
};

export type EmploymentStatus =
  | "active"
  | "probation"
  | "suspended"
  | "on_leave"
  | "terminated"
  | "archived";

export type PayrollCycle = "monthly" | "first_half" | "second_half" | "weekly";

export type PayrollRunStatus =
  | "draft"
  | "precheck_failed"
  | "processing"
  | "ready_for_review"
  | "pending_approval"
  | "approved"
  | "locked"
  | "released"
  | "reversed";

export type PayComponentKind = "earning" | "deduction" | "employer_cost";

export type TaxTreatment = "taxable" | "non_taxable" | "pre_tax_deduction";

export type PayComponent = {
  code: string;
  name: string;
  kind: PayComponentKind;
  amount: number;
  taxTreatment?: TaxTreatment;
  recurring?: boolean;
};

export type PayrollEmployeeProfile = TenantScoped & {
  employeeId: ID;
  payrollNumber: string;
  displayName: string;
  department?: string;
  branch?: string;
  costCenter?: string;
  payGroup: string;
  basicSalary: number;
  statutory: {
    paye: boolean;
    personalRelief: boolean;
    shif: boolean;
    nssf: boolean;
    housingLevy: boolean;
  };
};

export type PayrollCalculationInput = {
  tenantId: ID;
  country: "KE" | string;
  period: string;
  cycle: PayrollCycle;
  employee: PayrollEmployeeProfile;
  components: PayComponent[];
  rules: StatutoryRule[];
};

export type StatutoryRule = {
  country: string;
  code: "PAYE" | "PERSONAL_RELIEF" | "SHIF" | "NSSF" | "AHL" | string;
  name: string;
  effectiveStart: string;
  effectiveEnd?: string | null;
  formulaType: "banded_tax" | "percentage" | "tiered_percentage" | "fixed_relief";
  employeeRate?: number;
  employerRate?: number;
  minimum?: number;
  maximum?: number;
  thresholds?: Array<{
    from: number;
    to?: number | null;
    rate: number;
  }>;
  metadata?: Record<string, unknown>;
};

export type PayrollLine = {
  code: string;
  name: string;
  kind: PayComponentKind;
  amount: number;
};

export type PayrollResult = {
  employeeId: ID;
  payrollNumber: string;
  grossPay: number;
  taxablePay: number;
  totalDeductions: number;
  totalEmployerCosts: number;
  netPay: number;
  earnings: PayrollLine[];
  deductions: PayrollLine[];
  employerCosts: PayrollLine[];
  exceptions: string[];
};
