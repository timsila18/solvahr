import { PrismaClient } from "@prisma/client";
import { kenyaStatutoryRules2026, permissions, phaseTwoWorkflowDefinitions, rolePermissionMatrix } from "@solva/shared";

const prisma = new PrismaClient();

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

async function ensureUser(input: {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roleCode: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      id: input.id,
      tenantId: input.tenantId,
      name: input.name,
      isActive: true
    },
    create: {
      id: input.id,
      tenantId: input.tenantId,
      email: input.email,
      name: input.name,
      passwordHash: "staging-auth-not-enabled",
      isActive: true
    }
  });

  const role = await prisma.role.findUnique({
    where: {
      tenantId_code: {
        tenantId: input.tenantId,
        code: input.roleCode
      }
    }
  });

  if (role) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id
      }
    });
  }

  return user;
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant-solva-demo" },
    update: {},
    create: {
      id: "tenant-solva-demo",
      name: "Solva Demo Manufacturing",
      legalName: "Solva Demo Manufacturing Limited",
      country: "KE",
      subscription: "enterprise"
    }
  });

  await Promise.all(
    permissions.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: {
          code,
          module: code.split(".")[0] ?? "system",
          action: code.split(".")[1] ?? "manage"
        }
      })
    )
  );

  for (const [roleCode, rolePermissions] of Object.entries(rolePermissionMatrix)) {
    const role = await prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: roleCode } },
      update: {},
      create: {
        tenantId: tenant.id,
        code: roleCode,
        name: roleCode
          .split("_")
          .map((part) => part[0]?.toUpperCase() + part.slice(1))
          .join(" ")
      }
    });

    const permissionRows = await prisma.permission.findMany({
      where: { code: { in: rolePermissions } }
    });

    await Promise.all(
      permissionRows.map((permission) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id
          }
        })
      )
    );
  }

  await Promise.all([
    ensureUser({
      id: "demo-operator",
      tenantId: tenant.id,
      email: "operator@solvahr.app",
      name: "Solva Operator",
      roleCode: "operator"
    }),
    ensureUser({
      id: "demo-supervisor",
      tenantId: tenant.id,
      email: "supervisor@solvahr.app",
      name: "Solva Supervisor",
      roleCode: "supervisor"
    }),
    ensureUser({
      id: "demo-company-admin",
      tenantId: tenant.id,
      email: "companyadmin@solvahr.app",
      name: "Solva Company Admin",
      roleCode: "company_admin"
    }),
    ensureUser({
      id: "demo-hr-admin",
      tenantId: tenant.id,
      email: "hradmin@solvahr.app",
      name: "Solva HR Admin",
      roleCode: "hr_admin"
    }),
    ensureUser({
      id: "demo-payroll-admin",
      tenantId: tenant.id,
      email: "payrolladmin@solvahr.app",
      name: "Solva Payroll Admin",
      roleCode: "payroll_admin"
    }),
    ensureUser({
      id: "demo-manager",
      tenantId: tenant.id,
      email: "manager@solvahr.app",
      name: "Solva Manager",
      roleCode: "manager"
    }),
    ensureUser({
      id: "demo-recruiter",
      tenantId: tenant.id,
      email: "recruiter@solvahr.app",
      name: "Solva Recruiter",
      roleCode: "recruiter"
    }),
    ensureUser({
      id: "demo-employee",
      tenantId: tenant.id,
      email: "employee@solvahr.app",
      name: "Solva Employee",
      roleCode: "employee"
    }),
    ensureUser({
      id: "demo-auditor",
      tenantId: tenant.id,
      email: "auditor@solvahr.app",
      name: "Solva Auditor",
      roleCode: "auditor"
    })
  ]);

  const branch = await prisma.branch.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "NRB-HQ" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "NRB-HQ",
      name: "Nairobi HQ",
      location: "Nairobi"
    }
  });

  const department = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "PEOPLE" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "PEOPLE",
      name: "People Operations"
    }
  });

  const position = await prisma.position.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "HRM" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "HRM",
      title: "HR Manager"
    }
  });

  const grade = await prisma.grade.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "M2" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "M2",
      name: "Manager II"
    }
  });

  const costCenter = await prisma.costCenter.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "HR-001" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "HR-001",
      name: "People Operations"
    }
  });

  const employee = await prisma.employee.upsert({
    where: { tenantId_employeeNumber: { tenantId: tenant.id, employeeNumber: "E-001" } },
    update: {},
    create: {
      tenantId: tenant.id,
      employeeNumber: "E-001",
      payrollNumber: "SOL-001",
      legalName: "Amina Achieng Otieno",
      preferredName: "Amina",
      kraPin: "A000000000A",
      nssfNumber: "NSSF-001",
      shifNumber: "SHA-001",
      companyEmail: "amina.otieno@example.com",
      phone: "+254700000001",
      hireDate: new Date("2022-01-10"),
      branchId: branch.id,
      departmentId: department.id,
      positionId: position.id,
      gradeId: grade.id,
      costCenterId: costCenter.id
    }
  });

  await prisma.employeeBankDetail.upsert({
    where: { employeeId: employee.id },
    update: {},
    create: {
      employeeId: employee.id,
      bankName: "Demo Bank Kenya",
      branchName: "Westlands",
      accountNumber: "1234567890"
    }
  });

  await prisma.employeeStatutoryDetail.upsert({
    where: { employeeId: employee.id },
    update: {},
    create: {
      employeeId: employee.id
    }
  });

  await prisma.payrollEmployeeProfile.create({
    data: {
      employeeId: employee.id,
      payGroup: "monthly",
      basicSalary: "120000.00",
      effectiveFrom: new Date("2026-01-01")
    }
  });

  for (const rule of kenyaStatutoryRules2026) {
    await prisma.payrollStatutoryRule.create({
      data: {
        tenantId: tenant.id,
        country: rule.country,
        code: rule.code,
        name: rule.name,
        effectiveStart: new Date(rule.effectiveStart),
        effectiveEnd: rule.effectiveEnd ? new Date(rule.effectiveEnd) : null,
        formulaType: rule.formulaType,
        employeeRate: rule.employeeRate,
        employerRate: rule.employerRate,
        minimum: rule.minimum,
        maximum: rule.maximum,
        thresholds: jsonValue(rule.thresholds ?? []),
        dueDateMetadata: jsonValue(rule.metadata ?? {})
      }
    });
  }

  for (const workflow of phaseTwoWorkflowDefinitions) {
    await prisma.workflowDefinition.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: workflow.code } },
      update: {
        name: workflow.name,
        module: workflow.module,
        trigger: workflow.trigger,
        steps: jsonValue(workflow.steps)
      },
      create: {
        tenantId: tenant.id,
        code: workflow.code,
        name: workflow.name,
        module: workflow.module,
        trigger: workflow.trigger,
        steps: jsonValue(workflow.steps)
      }
    });
  }

  const requisition = await prisma.requisition.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "REQ-2026-014" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "REQ-2026-014",
      title: "Payroll Implementation Specialist",
      departmentId: department.id,
      positionId: position.id,
      hiringManagerId: employee.id,
      headcount: 1,
      budgetedSalaryMin: "140000.00",
      budgetedSalaryMax: "180000.00",
      justification: "Support payroll outsourcing clients and statutory export implementation.",
      status: "APPROVED"
    }
  });

  const vacancy = await prisma.vacancy.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "VAC-2026-009" } },
    update: {},
    create: {
      tenantId: tenant.id,
      requisitionId: requisition.id,
      code: "VAC-2026-009",
      title: "Payroll Implementation Specialist",
      departmentId: department.id,
      location: "Nairobi HQ",
      employmentType: "full_time",
      status: "OPEN",
      postingSummary: "Own HRIS payroll implementation, statutory exports, and client onboarding.",
      requirements: jsonValue(["Kenya payroll experience", "Strong Excel and HRIS implementation skills"]),
      closingDate: new Date("2026-04-30")
    }
  });

  const candidate = await prisma.candidate.create({
    data: {
      tenantId: tenant.id,
      vacancyId: vacancy.id,
      fullName: "Faith Wambui",
      email: "faith.wambui@example.com",
      phone: "+254700100202",
      source: "Careers Page",
      stage: "OFFER",
      salaryExpectation: "175000.00",
      noticePeriod: "45 days",
      screeningScore: "91.00"
    }
  });

  const template = await prisma.documentTemplate.upsert({
    where: { tenantId_code_version: { tenantId: tenant.id, code: "offer-letter-ke", version: 1 } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "offer-letter-ke",
      name: "Kenya Offer Letter",
      category: "recruitment",
      status: "ACTIVE",
      version: 1,
      body: "Dear {{candidate.fullName}}, we are pleased to offer you the role of {{vacancy.title}}.",
      mergeFields: jsonValue(["candidate.fullName", "vacancy.title", "offer.offeredSalary", "offer.proposedStartDate"])
    }
  });

  const generatedDocument = await prisma.generatedDocument.create({
    data: {
      tenantId: tenant.id,
      templateId: template.id,
      entityType: "job_offer",
      entityId: candidate.id,
      renderedBody: "Dear Faith Wambui, we are pleased to offer you the role of Payroll Implementation Specialist."
    }
  });

  await prisma.jobOffer.create({
    data: {
      tenantId: tenant.id,
      vacancyId: vacancy.id,
      candidateId: candidate.id,
      status: "PENDING_APPROVAL",
      offeredSalary: "170000.00",
      proposedStartDate: new Date("2026-05-06"),
      benefits: jsonValue(["Medical cover", "Pension eligibility"]),
      generatedDocumentId: generatedDocument.id
    }
  });

  await prisma.onboardingTask.createMany({
    data: [
      {
        tenantId: tenant.id,
        candidateId: candidate.id,
        ownerRole: "candidate",
        title: "Submit KRA PIN, SHA, NSSF, and bank details",
        category: "Pre-boarding",
        dueDate: new Date("2026-04-25"),
        status: "IN_PROGRESS"
      },
      {
        tenantId: tenant.id,
        candidateId: candidate.id,
        ownerRole: "admin_officer",
        title: "Prepare laptop, email, and HRIS employee account",
        category: "IT",
        dueDate: new Date("2026-05-02")
      },
      {
        tenantId: tenant.id,
        employeeId: employee.id,
        ownerRole: "manager",
        title: "Complete 90-day probation review",
        category: "Probation",
        dueDate: new Date("2026-04-18"),
        status: "IN_PROGRESS"
      }
    ]
  });

  await prisma.probationReview.create({
    data: {
      tenantId: tenant.id,
      employeeId: employee.id,
      reviewDate: new Date("2026-04-18"),
      managerId: employee.id,
      status: "SUBMITTED",
      score: "78.00",
      recommendation: "extend_probation",
      comments: "Progress is strong, with extra payroll controls coaching recommended."
    }
  });
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
