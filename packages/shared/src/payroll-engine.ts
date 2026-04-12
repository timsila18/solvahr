import type {
  PayComponent,
  PayrollCalculationInput,
  PayrollLine,
  PayrollResult,
  StatutoryRule
} from "./types.js";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function byCode(rules: StatutoryRule[], code: string): StatutoryRule | undefined {
  return rules.find((rule) => rule.code === code);
}

function sumComponents(components: PayComponent[], predicate: (component: PayComponent) => boolean): number {
  return roundMoney(components.filter(predicate).reduce((total, component) => total + component.amount, 0));
}

function calculateBandedTax(taxablePay: number, rule: StatutoryRule): number {
  const thresholds = rule.thresholds ?? [];
  const tax = thresholds.reduce((total, band) => {
    if (taxablePay <= band.from) {
      return total;
    }

    const bandUpper = band.to ?? taxablePay;
    const taxableInBand = Math.min(taxablePay, bandUpper) - band.from;
    return total + Math.max(taxableInBand, 0) * band.rate;
  }, 0);

  return roundMoney(tax);
}

function calculatePercentage(base: number, rule: StatutoryRule, rateKey: "employeeRate" | "employerRate"): number {
  const rate = rule[rateKey] ?? 0;
  const rawAmount = base * rate;
  const withMinimum = rule.minimum ? Math.max(rawAmount, rule.minimum) : rawAmount;
  const withMaximum = rule.maximum ? Math.min(withMinimum, rule.maximum) : withMinimum;
  return roundMoney(withMaximum);
}

function calculateNssf(base: number, rule: StatutoryRule, rateKey: "employeeRate" | "employerRate"): number {
  const metadata = rule.metadata ?? {};
  const lowerLimit = Number(metadata.lowerEarningsLimit ?? 0);
  const upperLimit = Number(metadata.upperEarningsLimit ?? base);
  const pensionablePay = Math.min(Math.max(base, lowerLimit), upperLimit);
  return calculatePercentage(pensionablePay, rule, rateKey);
}

function toLine(component: PayComponent): PayrollLine {
  return {
    code: component.code,
    name: component.name,
    kind: component.kind,
    amount: roundMoney(component.amount)
  };
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollResult {
  const earnings = input.components.filter((component) => component.kind === "earning").map(toLine);
  const manualDeductions = input.components.filter((component) => component.kind === "deduction").map(toLine);
  const manualEmployerCosts = input.components.filter((component) => component.kind === "employer_cost").map(toLine);

  const grossPay = sumComponents(input.components, (component) => component.kind === "earning");
  const preTaxDeductions = sumComponents(input.components, (component) => component.taxTreatment === "pre_tax_deduction");
  const nonTaxableEarnings = sumComponents(
    input.components,
    (component) => component.kind === "earning" && component.taxTreatment === "non_taxable"
  );
  const taxablePay = roundMoney(Math.max(grossPay - nonTaxableEarnings - preTaxDeductions, 0));

  const statutoryDeductions: PayrollLine[] = [];
  const statutoryEmployerCosts: PayrollLine[] = [];
  const exceptions: string[] = [];

  if (input.employee.statutory.shif) {
    const rule = byCode(input.rules, "SHIF");
    if (rule) {
      statutoryDeductions.push({
        code: "SHIF",
        name: rule.name,
        kind: "deduction",
        amount: calculatePercentage(grossPay, rule, "employeeRate")
      });
    } else {
      exceptions.push("Missing active SHIF rule");
    }
  }

  if (input.employee.statutory.nssf) {
    const rule = byCode(input.rules, "NSSF");
    if (rule) {
      statutoryDeductions.push({
        code: "NSSF_EE",
        name: "NSSF employee contribution",
        kind: "deduction",
        amount: calculateNssf(grossPay, rule, "employeeRate")
      });
      statutoryEmployerCosts.push({
        code: "NSSF_ER",
        name: "NSSF employer contribution",
        kind: "employer_cost",
        amount: calculateNssf(grossPay, rule, "employerRate")
      });
    } else {
      exceptions.push("Missing active NSSF rule");
    }
  }

  if (input.employee.statutory.housingLevy) {
    const rule = byCode(input.rules, "AHL");
    if (rule) {
      statutoryDeductions.push({
        code: "AHL_EE",
        name: "Affordable Housing Levy employee",
        kind: "deduction",
        amount: calculatePercentage(grossPay, rule, "employeeRate")
      });
      statutoryEmployerCosts.push({
        code: "AHL_ER",
        name: "Affordable Housing Levy employer",
        kind: "employer_cost",
        amount: calculatePercentage(grossPay, rule, "employerRate")
      });
    } else {
      exceptions.push("Missing active Affordable Housing Levy rule");
    }
  }

  if (input.employee.statutory.paye) {
    const payeRule = byCode(input.rules, "PAYE");
    const reliefRule = byCode(input.rules, "PERSONAL_RELIEF");
    if (payeRule) {
      const grossTax = calculateBandedTax(taxablePay, payeRule);
      const relief = input.employee.statutory.personalRelief ? reliefRule?.maximum ?? 0 : 0;
      statutoryDeductions.push({
        code: "PAYE",
        name: "PAYE",
        kind: "deduction",
        amount: roundMoney(Math.max(grossTax - relief, 0))
      });
    } else {
      exceptions.push("Missing active PAYE rule");
    }
  }

  const deductions = [...manualDeductions, ...statutoryDeductions];
  const employerCosts = [...manualEmployerCosts, ...statutoryEmployerCosts];
  const totalDeductions = roundMoney(deductions.reduce((total, line) => total + line.amount, 0));
  const totalEmployerCosts = roundMoney(employerCosts.reduce((total, line) => total + line.amount, 0));
  const netPay = roundMoney(grossPay - totalDeductions);

  if (netPay < 0) {
    exceptions.push("Negative net pay");
  }

  return {
    employeeId: input.employee.employeeId,
    payrollNumber: input.employee.payrollNumber,
    grossPay,
    taxablePay,
    totalDeductions,
    totalEmployerCosts,
    netPay,
    earnings,
    deductions,
    employerCosts,
    exceptions
  };
}
