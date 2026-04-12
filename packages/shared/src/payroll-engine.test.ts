import assert from "node:assert/strict";
import test from "node:test";
import { calculatePayroll } from "./payroll-engine.js";
import { activeRulesForDate, kenyaStatutoryRules2026 } from "./statutory-rules.js";

test("calculates a Kenya monthly payroll result with statutory lines", () => {
  const result = calculatePayroll({
    tenantId: "tenant-demo",
    country: "KE",
    period: "2026-04",
    cycle: "monthly",
    rules: activeRulesForDate(kenyaStatutoryRules2026, "2026-04-30"),
    employee: {
      tenantId: "tenant-demo",
      employeeId: "emp-001",
      payrollNumber: "SOL-001",
      displayName: "Amina Otieno",
      payGroup: "monthly",
      basicSalary: 120000,
      statutory: {
        paye: true,
        personalRelief: true,
        shif: true,
        nssf: true,
        housingLevy: true
      }
    },
    components: [
      {
        code: "BASIC",
        name: "Basic Salary",
        kind: "earning",
        amount: 120000,
        taxTreatment: "taxable",
        recurring: true
      },
      {
        code: "COMMUTER",
        name: "Commuter Allowance",
        kind: "earning",
        amount: 10000,
        taxTreatment: "taxable",
        recurring: true
      },
      {
        code: "SACCO",
        name: "SACCO Deduction",
        kind: "deduction",
        amount: 5000
      }
    ]
  });

  assert.equal(result.grossPay, 130000);
  assert.equal(result.taxablePay, 130000);
  assert.ok(result.deductions.some((line) => line.code === "PAYE"));
  assert.ok(result.employerCosts.some((line) => line.code === "AHL_ER"));
  assert.equal(result.exceptions.length, 0);
  assert.ok(result.netPay > 0);
});
