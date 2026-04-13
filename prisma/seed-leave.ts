import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const leaveTypes = [
  {
    code: "ANNUAL",
    name: "Annual Leave",
    requiresAttachment: false,
    allowHalfDay: true,
    annualEntitlement: "21.00",
    carryForwardCap: "10.00"
  },
  {
    code: "SICK",
    name: "Sick Leave",
    requiresAttachment: true,
    allowHalfDay: true,
    annualEntitlement: "14.00",
    carryForwardCap: "0.00"
  },
  {
    code: "COMPASSIONATE",
    name: "Compassionate Leave",
    requiresAttachment: false,
    allowHalfDay: false,
    annualEntitlement: "5.00",
    carryForwardCap: "0.00"
  }
];

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: "tenant-solva-demo" }
  });

  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id },
    select: { id: true }
  });

  for (const item of leaveTypes) {
    const leaveType = await prisma.leaveType.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: item.code
        }
      },
      update: {
        name: item.name,
        requiresAttachment: item.requiresAttachment,
        allowHalfDay: item.allowHalfDay
      },
      create: {
        tenantId: tenant.id,
        code: item.code,
        name: item.name,
        requiresAttachment: item.requiresAttachment,
        allowHalfDay: item.allowHalfDay
      }
    });

    await prisma.leavePolicy.upsert({
      where: { leaveTypeId: leaveType.id },
      update: {
        annualEntitlement: item.annualEntitlement,
        carryForwardCap: item.carryForwardCap
      },
      create: {
        leaveTypeId: leaveType.id,
        annualEntitlement: item.annualEntitlement,
        carryForwardCap: item.carryForwardCap,
        accrualMethod: "annual"
      }
    });

    await Promise.all(
      employees.map((employee) =>
        prisma.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_periodYear: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              periodYear: 2026
            }
          },
          update: {},
          create: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            periodYear: 2026,
            opening: "0.00",
            accrued: item.annualEntitlement,
            taken: "0.00",
            adjusted: "0.00",
            closing: item.annualEntitlement
          }
        })
      )
    );
  }

  console.log(`Seeded ${leaveTypes.length} leave types for ${employees.length} employees`);
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
