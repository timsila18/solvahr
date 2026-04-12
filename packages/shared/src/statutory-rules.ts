import type { StatutoryRule } from "./types.js";

export const kenyaStatutoryRules2026: StatutoryRule[] = [
  {
    country: "KE",
    code: "PAYE",
    name: "PAYE monthly graduated tax bands",
    effectiveStart: "2023-07-01",
    formulaType: "banded_tax",
    thresholds: [
      { from: 0, to: 24000, rate: 0.1 },
      { from: 24000, to: 32333, rate: 0.25 },
      { from: 32333, to: 500000, rate: 0.3 },
      { from: 500000, to: 800000, rate: 0.325 },
      { from: 800000, to: null, rate: 0.35 }
    ],
    metadata: {
      source: "KRA PAYE guidance",
      dueDayOfFollowingMonth: 9
    }
  },
  {
    country: "KE",
    code: "PERSONAL_RELIEF",
    name: "PAYE personal relief",
    effectiveStart: "2023-07-01",
    formulaType: "fixed_relief",
    maximum: 2400
  },
  {
    country: "KE",
    code: "SHIF",
    name: "Social Health Insurance Fund employee contribution",
    effectiveStart: "2024-10-01",
    formulaType: "percentage",
    employeeRate: 0.0275,
    minimum: 300,
    metadata: {
      employerContribution: false
    }
  },
  {
    country: "KE",
    code: "AHL",
    name: "Affordable Housing Levy",
    effectiveStart: "2024-03-19",
    formulaType: "percentage",
    employeeRate: 0.015,
    employerRate: 0.015
  },
  {
    country: "KE",
    code: "NSSF",
    name: "NSSF tiered pension contribution",
    effectiveStart: "2026-02-01",
    formulaType: "tiered_percentage",
    employeeRate: 0.06,
    employerRate: 0.06,
    maximum: 6480,
    metadata: {
      lowerEarningsLimit: 9000,
      upperEarningsLimit: 108000
    }
  }
];

export function activeRulesForDate(rules: StatutoryRule[], isoDate: string): StatutoryRule[] {
  const target = new Date(isoDate).getTime();
  return rules.filter((rule) => {
    const start = new Date(rule.effectiveStart).getTime();
    const end = rule.effectiveEnd ? new Date(rule.effectiveEnd).getTime() : Number.POSITIVE_INFINITY;
    return start <= target && target <= end;
  });
}
