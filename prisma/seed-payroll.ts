import { PrismaClient } from "@prisma/client";
import { activeRulesForDate, calculatePayroll, kenyaStatutoryRules2026 } from "@solva/shared";

const prisma = new PrismaClient();

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: "tenant-solva-demo" }
  });

  const period = await prisma.payrollPeriod.upsert({
    where: {
      tenantId_code_cycle: {
        tenantId: tenant.id,
        code: "2026-04",
        cycle: "MONTHLY"
      }
    },
    update: {
      isOpen: true
    },
    create: {
      tenantId: tenant.id,
      code: "2026-04",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-30"),
      payDate: new Date("2026-04-30"),
      cycle: "MONTHLY"
    }
  });

  const run = await prisma.payrollRun.upsert({
    where: {
      periodId_payGroup_cycle_version: {
        periodId: period.id,
        payGroup: "monthly",
        cycle: "MONTHLY",
        version: 1
      }
    },
    update: {
      status: "READY_FOR_REVIEW"
    },
    create: {
      tenantId: tenant.id,
      periodId: period.id,
      payGroup: "monthly",
      cycle: "MONTHLY",
      version: 1,
      status: "READY_FOR_REVIEW",
      snapshot: jsonValue({ source: "seed-payroll", period: "April 2026" }),
      precheckResult: jsonValue({ warnings: [], exceptions: [] })
    }
  });

  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id },
    include: {
      statutory: true,
      salaryHistory: {
        orderBy: { effectiveFrom: "desc" },
        take: 1
      },
      payrollProfiles: {
        orderBy: { effectiveFrom: "desc" },
        take: 1
      }
    }
  });

  const rules = activeRulesForDate(kenyaStatutoryRules2026, "2026-04-30");

  for (const employee of employees) {
    const basicSalary =
      Number(employee.payrollProfiles[0]?.basicSalary ?? employee.salaryHistory[0]?.basicSalary ?? 85000);
    const result = calculatePayroll({
      tenantId: tenant.id,
      country: "KE",
      period: "2026-04",
      cycle: "monthly",
      employee: {
        tenantId: tenant.id,
        employeeId: employee.id,
        payrollNumber: employee.payrollNumber ?? employee.employeeNumber,
        displayName: employee.preferredName ?? employee.legalName,
        payGroup: "monthly",
        basicSalary,
        statutory: {
          paye: employee.statutory?.payeApplicable ?? true,
          personalRelief: employee.statutory?.personalRelief ?? true,
          shif: employee.statutory?.shifApplicable ?? true,
          nssf: employee.statutory?.nssfApplicable ?? true,
          housingLevy: employee.statutory?.housingLevyApplicable ?? true
        }
      },
      rules,
      components: [
        {
          code: "BASIC",
          name: "Basic Salary",
          kind: "earning",
          amount: basicSalary,
          taxTreatment: "taxable",
          recurring: true
        },
        {
          code: "COMMUTER",
          name: "Commuter Allowance",
          kind: "earning",
          amount: Math.min(10000, Math.round(basicSalary * 0.08)),
          taxTreatment: "taxable",
          recurring: true
        },
        {
          code: "WELFARE",
          name: "Staff Welfare",
          kind: "deduction",
          amount: 500
        }
      ]
    });

    const runEmployee = await prisma.payrollRunEmployee.upsert({
      where: {
        runId_employeeId: {
          runId: run.id,
          employeeId: employee.id
        }
      },
      update: {
        grossPay: result.grossPay,
        taxablePay: result.taxablePay,
        totalDeductions: result.totalDeductions,
        totalEmployerCosts: result.totalEmployerCosts,
        netPay: result.netPay,
        exceptions: jsonValue(result.exceptions)
      },
      create: {
        runId: run.id,
        employeeId: employee.id,
        grossPay: result.grossPay,
        taxablePay: result.taxablePay,
        totalDeductions: result.totalDeductions,
        totalEmployerCosts: result.totalEmployerCosts,
        netPay: result.netPay,
        exceptions: jsonValue(result.exceptions)
      }
    });

    await prisma.payrollResultLine.deleteMany({
      where: { runEmployeeId: runEmployee.id }
    });

    const lines = [...result.earnings, ...result.deductions, ...result.employerCosts];
    await prisma.payrollResultLine.createMany({
      data: lines.map((line) => ({
        runEmployeeId: runEmployee.id,
        code: line.code,
        name: line.name,
        kind: line.kind === "earning" ? "EARNING" : line.kind === "deduction" ? "DEDUCTION" : "EMPLOYER_COST",
        amount: line.amount,
        metadata: jsonValue({})
      }))
    });
  }

  console.log(`Seeded payroll run ${run.id} for ${employees.length} employees`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
