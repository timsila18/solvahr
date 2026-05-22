export type HrDocumentKind =
  | "contract"
  | "appointment_letter"
  | "salary_review"
  | "commendation_letter"
  | "recommendation_letter"
  | "warning_letter"
  | "show_cause"
  | "suspension_letter"
  | "dismissal_letter"
  | "summary_dismissal_letter";

export type HrDocumentCategory =
  | "Contracts"
  | "Salary Reviews"
  | "Disciplinary"
  | "Recommendations"
  | "Promotions"
  | "Confirmations"
  | "Appraisals"
  | "Clearance"
  | "Training";

export type HrSignatoryProfile = {
  name?: string;
  title: string;
  initials: string;
  label?: string;
};

export type RobotCafeStyleProfile = {
  openingPhrase: string;
  dutiesPhrase: string;
  disciplinePhrase: string;
  toneGuide: string;
  numberingStyle: string;
  closingHeading: string;
  acceptanceHeading: string;
};

export type HrDocumentEmployee = {
  id: string;
  employeeNumber: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  designation: string;
  department: string;
  branch: string;
  employmentType: string;
  hireDate: string;
  contractEndDate: string;
  probationMonths: number;
  reportingLine: string;
  salary: number;
  nationalId: string;
  kraPin: string;
  shifNumber: string;
  nssfNumber: string;
};

export type HrDocumentOrganization = {
  name: string;
  addressLines: string[];
  employerIdentifier: string;
};

export type HrDocumentRequest = {
  kind: HrDocumentKind;
  employee: HrDocumentEmployee;
  organization: HrDocumentOrganization;
  issueDate: string;
  generatedAtLabel: string;
  generatedBy: string;
  currentSalary?: number;
  newSalary?: number;
  effectiveDate?: string;
  reason?: string;
  incidentDate?: string;
  facts?: string;
  desiredAction?: string;
  responseHours?: number;
  roleDutyOverrides?: string[];
  contractDurationLabel?: string;
  signatories: {
    humanResources: HrSignatoryProfile;
    generalManager: HrSignatoryProfile;
    supervisor: HrSignatoryProfile;
    authorized: HrSignatoryProfile;
  };
};

export type HrDocumentSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type HrDocumentModel = {
  kind: HrDocumentKind;
  title: string;
  recipientLabel: string;
  referenceLine: string;
  category: HrDocumentCategory;
  fileName: string;
  approvalRecommendedRole?: string | null;
  sections: HrDocumentSection[];
  acknowledgements?: string[];
  signatures: Array<{
    label: string;
    name: string;
    title: string;
    signature: string;
    date: string;
  }>;
};

export const ROBOT_CAFE_STYLE_PROFILE: RobotCafeStyleProfile = {
  openingPhrase:
    "Following your application and subsequent interview, we are pleased to offer you employment",
  dutiesPhrase: "Your duties will include but will not be limited to the following:",
  disciplinePhrase:
    "All disciplinary procedures shall follow fair process in accordance with Kenyan labour laws.",
  toneGuide:
    "Simple formal hospitality HR tone. Clear clauses, direct obligations, Kenyan labour framing, and practical service-delivery language.",
  numberingStyle: "Numbered clauses with short descriptive headings.",
  closingHeading: "Yours faithfully,",
  acceptanceHeading: "Acceptance",
};

const ROLE_DUTIES: Array<{
  match: RegExp;
  duties: string[];
}> = [
  {
    match: /(head chef|chef|sushi chef|pasta chef|grill chef|frier chef|cook)/i,
    duties: [
      "Preparing, cooking, and plating meals to the required quality, taste, and presentation standards.",
      "Maintaining food safety, hygiene, and sanitation standards within the kitchen at all times.",
      "Coordinating timely preparation and service to support smooth front-of-house operations.",
      "Monitoring stock usage, minimizing waste, and reporting shortages or quality concerns promptly.",
      "Following production schedules, recipes, and lawful management instructions within the kitchen.",
    ],
  },
  {
    match: /(supervisor|food and beverage supervisor|restaurant supervisor)/i,
    duties: [
      "Supervising day-to-day restaurant operations and ensuring smooth service delivery.",
      "Monitoring attendance, punctuality, discipline, and performance of team members under your supervision.",
      "Handling customer issues, escalations, and service recovery professionally.",
      "Coordinating staff scheduling, task allocation, shift coverage, and operational reporting.",
      "Ensuring cleanliness, hygiene, safety, and compliance with company standards across the outlet.",
    ],
  },
  {
    match: /(waitress|waiter|hostess|front of house|cashier|barista)/i,
    duties: [
      "Greeting, receiving, and serving customers professionally while maintaining a positive dining experience.",
      "Taking accurate orders, processing payments, and supporting efficient table or counter service.",
      "Explaining menu items, daily specials, and restaurant processes clearly to customers.",
      "Maintaining cleanliness, presentation, and readiness of the service area throughout the shift.",
      "Working closely with kitchen and service teams to ensure prompt and courteous delivery of orders.",
    ],
  },
  {
    match: /(steward|cleaner)/i,
    duties: [
      "Maintaining cleanliness of work stations, service areas, equipment, utensils, and assigned premises.",
      "Supporting hygiene, sanitation, and food safety standards in line with company procedures.",
      "Handling cleaning materials and company property responsibly and reporting shortages or damage promptly.",
      "Assisting in general operational support duties as assigned by the supervisor or management.",
    ],
  },
  {
    match: /(payroll|finance|account)/i,
    duties: [
      "Maintaining accurate payroll or finance records and supporting timely operational reporting.",
      "Handling company information, records, and systems with confidentiality and accuracy.",
      "Supporting compliance, reconciliation, and reporting obligations assigned by management.",
      "Following internal approval controls and safeguarding company resources and records.",
    ],
  },
  {
    match: /(hr|human resource)/i,
    duties: [
      "Supporting recruitment, documentation, employee records, and workplace policy administration.",
      "Maintaining confidentiality in employee matters and ensuring proper HR file management.",
      "Coordinating onboarding, discipline, and staff support processes in line with company procedures.",
      "Preparing timely reports and follow-up actions on employee relations and compliance matters.",
    ],
  },
];

function clean(value: string | null | undefined, fallback = "") {
  return String(value ?? fallback).trim();
}

function formatCurrency(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return `KES ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string, fallback = "______________") {
  if (!value) {
    return fallback;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const day = date.getUTCDate();
  const month = date.toLocaleString("en-KE", {
    month: "long",
    timeZone: "UTC",
  });
  const year = date.getUTCFullYear();
  const suffix =
    day % 10 === 1 && day % 100 !== 11
      ? "st"
      : day % 10 === 2 && day % 100 !== 12
        ? "nd"
        : day % 10 === 3 && day % 100 !== 13
          ? "rd"
          : "th";
  return `${day}${suffix} ${month} ${year}`;
}

function getInitials(name: string) {
  const parts = clean(name)
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return "N/A";
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? "").filter(Boolean).join(".");
}

export function inferRobotCafeRoleDuties(designation: string, department: string, overrides?: string[]) {
  if (overrides?.length) {
    return overrides.map((item) => clean(item)).filter(Boolean);
  }

  const designationLabel = clean(designation);
  for (const profile of ROLE_DUTIES) {
    if (profile.match.test(designationLabel)) {
      return profile.duties;
    }
  }

  return [
    `Performing the duties assigned to the ${designationLabel || "role"} in support of ${clean(department, "restaurant")} operations.`,
    "Complying with company policies, lawful management instructions, and operational standards at all times.",
    "Maintaining professionalism, punctuality, teamwork, and accountability in the workplace.",
  ];
}

function getDefaultContractDurationLabel(input: HrDocumentRequest) {
  if (clean(input.contractDurationLabel)) {
    return clean(input.contractDurationLabel);
  }
  return "one (1) year contract";
}

function getContractEndDate(startDate: string, currentEndDate: string) {
  if (clean(currentEndDate)) {
    return clean(currentEndDate);
  }

  if (!clean(startDate)) {
    return "";
  }

  const date = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const next = new Date(Date.UTC(date.getUTCFullYear() + 1, date.getUTCMonth(), date.getUTCDate()));
  next.setUTCDate(next.getUTCDate() - 1);
  return next.toISOString().slice(0, 10);
}

function buildSignatureLines(input: HrDocumentRequest, mode: "contract" | "disciplinary" | "salary") {
  const employeeInitials = getInitials(input.employee.fullName);
  const issueDate = formatDate(input.issueDate);
  const managementName = clean(input.signatories.authorized.name, clean(input.signatories.authorized.title, "General Manager"));
  const managementTitle = clean(input.signatories.authorized.label, "Authorized Signatory");
  const managementSignature = clean(input.signatories.authorized.initials, "GM");
  const organizationLabel = `For ${clean(input.organization.name, "the organization")}`;

  if (mode === "salary") {
    return [
      {
        label: organizationLabel,
        name: managementName,
        title: managementTitle,
        signature: managementSignature,
        date: issueDate,
      },
      {
        label: `Acknowledged by ${input.employee.fullName}`,
        name: input.employee.fullName,
        title: input.employee.designation,
        signature: employeeInitials,
        date: issueDate,
      },
    ];
  }

  if (mode === "disciplinary") {
    return [
      {
        label: "Issued by Management",
        name: managementName,
        title: managementTitle,
        signature: managementSignature,
        date: issueDate,
      },
      {
        label: "Employee acknowledgment",
        name: input.employee.fullName,
        title: input.employee.designation,
        signature: employeeInitials,
        date: issueDate,
      },
    ];
  }

  return [
    {
      label: organizationLabel,
      name: managementName,
      title: managementTitle,
      signature: managementSignature,
      date: issueDate,
    },
    {
      label: "Employee acceptance",
      name: input.employee.fullName,
      title: input.employee.designation,
      signature: employeeInitials,
      date: issueDate,
    },
  ];
}

function buildReferenceLine(input: HrDocumentRequest, title: string) {
  if (input.kind === "contract" || input.kind === "appointment_letter") {
    return `RE: ${title.toUpperCase()}`;
  }
  if (input.kind === "salary_review") {
    return "RE: SALARY REVIEW";
  }
  return `RE: ${title.toUpperCase()}`;
}

export function buildRobotCafeHrDocument(input: HrDocumentRequest): HrDocumentModel {
  const employeeName = input.employee.fullName;
  const designation = clean(input.employee.designation, "Employee");
  const department = clean(input.employee.department, "Operations");
  const duties = inferRobotCafeRoleDuties(designation, department, input.roleDutyOverrides);
  const salary = formatCurrency(input.employee.salary);
  const contractDuration = getDefaultContractDurationLabel(input);
  const probationMonths = Math.max(1, Number(input.employee.probationMonths || 3));
  const reportingLine = clean(input.employee.reportingLine, "the Restaurant Manager or any other person designated by management");
  const startDateLabel = formatDate(input.employee.hireDate);
  const contractEndLabel = formatDate(getContractEndDate(input.employee.hireDate, input.employee.contractEndDate), "______________");
  const issueDateLabel = formatDate(input.issueDate);

  if (input.kind === "contract" || input.kind === "appointment_letter") {
    const title =
      input.kind === "contract"
        ? `Offer of Employment - ${designation}`
        : `Appointment Letter - ${designation}`;

    return {
      kind: input.kind,
      title,
      recipientLabel: `Employee Name: ${employeeName}`,
      referenceLine: buildReferenceLine(input, title),
      category: "Contracts",
      fileName: `${employeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${input.kind}.pdf`,
      sections: [
        {
          paragraphs: [
            `${ROBOT_CAFE_STYLE_PROFILE.openingPhrase} as ${designation} at ${input.organization.name}, effective ${startDateLabel}.`,
          ],
        },
        {
          heading: "1. Position and Reporting",
          paragraphs: [
            `You will serve as ${designation} and will report directly to ${reportingLine}.`,
          ],
        },
        {
          heading: "2. Salary",
          paragraphs: [
            `You will earn a gross monthly salary of ${salary} payable monthly. This salary will be subject to statutory deductions including PAYE, NSSF, and SHIF as required by law.`,
          ],
        },
        {
          heading: "3. Contract Duration",
          paragraphs: [
            `This appointment shall run on a ${contractDuration} commencing on ${startDateLabel} and, unless earlier terminated in accordance with this letter, shall run up to ${contractEndLabel}.`,
          ],
        },
        {
          heading: "4. Probation Period",
          paragraphs: [
            `You will serve a probation period of ${probationMonths} month(s) from the date of commencement. During this period, either party may terminate this contract by giving seven (7) days written notice or payment in lieu of notice. Upon successful completion of probation, your employment will be confirmed in writing.`,
          ],
        },
        {
          heading: "5. Duties and Responsibilities",
          paragraphs: [ROBOT_CAFE_STYLE_PROFILE.dutiesPhrase],
          bullets: duties.map((duty, index) => {
            const numerals = ["i)", "ii)", "iii)", "iv)", "v)", "vi)", "vii)", "viii)", "ix)", "x)"];
            return `${numerals[index] ?? `${index + 1})`} ${duty}`;
          }),
        },
        {
          heading: "6. Working Hours",
          paragraphs: [
            "Your normal working hours shall be not more than fifty-two (52) hours per week, spread over six (6) working days, with one (1) rest day per week. Due to the nature of the hospitality industry, you may be required to work shifts, weekends, and public holidays. Any authorized overtime will be compensated in accordance with applicable labour laws.",
          ],
        },
        {
          heading: "7. Leave Entitlement",
          paragraphs: [
            "After successful completion of probation, you will be entitled to twenty-one (21) working days annual leave after every completed year of service together with public holidays, sick leave, and other statutory leave as provided by Kenyan labour laws. Leave shall be taken at a time agreed upon with management.",
          ],
        },
        {
          heading: "8. Workplace Conduct",
          paragraphs: [
            "You are expected to maintain discipline, punctuality, professionalism, teamwork, and compliance with company policies and operational standards at all times.",
          ],
        },
        {
          heading: "9. Termination of Employment",
          paragraphs: [
            "After confirmation, either party may terminate this contract by giving one (1) month written notice or payment in lieu of notice, unless termination arises from lawful grounds for summary dismissal.",
          ],
        },
        {
          heading: "10. Gross Misconduct",
          paragraphs: [
            "The Company may summarily dismiss an employee for gross misconduct including but not limited to absence from duty without lawful cause, neglect or improper performance of duties, theft, fraud, misappropriation of company property, physical or verbal abuse, and reporting to work intoxicated or consuming alcohol while on duty.",
            ROBOT_CAFE_STYLE_PROFILE.disciplinePhrase,
          ],
        },
        {
          heading: "11. Final Dues",
          paragraphs: [
            "Upon termination of employment, the employee will receive salary earned up to the last working day together with payment for accrued but unused leave days after satisfactory clearance and return of company property.",
          ],
        },
      ],
      acknowledgements: [
        `${ROBOT_CAFE_STYLE_PROFILE.acceptanceHeading}`,
        "Please sign below to confirm your understanding and acceptance of the terms of this employment.",
      ],
      signatures: buildSignatureLines(input, "contract"),
    };
  }

  if (input.kind === "salary_review") {
    const currentSalary = formatCurrency(Number(input.currentSalary ?? input.employee.salary));
    const newSalary = formatCurrency(Number(input.newSalary ?? input.employee.salary));
    const effectiveDate = formatDate(clean(input.effectiveDate, input.issueDate));
    return {
      kind: input.kind,
      title: "Salary Review Letter",
      recipientLabel: `Employee Name: ${employeeName}`,
      referenceLine: buildReferenceLine(input, "Salary Review"),
      category: "Salary Reviews",
      fileName: `${employeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-salary-review.pdf`,
      approvalRecommendedRole: "Manager",
      sections: [
        {
          paragraphs: [
            `Following management review of your performance, contribution, and commitment to the operations of ${input.organization.name}, we are pleased to inform you that your salary has been reviewed.`,
            `Effective ${effectiveDate}, your gross monthly salary will increase from ${currentSalary} to ${newSalary} per month, subject to statutory deductions in accordance with Kenyan law.`,
            clean(input.reason)
              ? clean(input.reason)
              : "This review is in recognition of your efforts, leadership, and continued contribution towards maintaining operational efficiency and service standards within the organization.",
            "All other terms and conditions of your employment remain unchanged.",
            `We appreciate your dedication and look forward to your continued commitment and growth with ${input.organization.name}.`,
          ],
        },
      ],
      acknowledgements: [
        "ACKNOWLEDGMENT",
        `I, ${employeeName}, acknowledge receipt and acceptance of this salary review letter.`,
      ],
      signatures: buildSignatureLines(input, "salary"),
    };
  }

  if (input.kind === "commendation_letter") {
    const recognitionDate = formatDate(clean(input.incidentDate, input.issueDate));
    const recognitionReason =
      clean(input.reason) ||
      clean(input.facts) ||
      `your commitment, professionalism, and positive contribution to the operations of ${input.organization.name}`;

    return {
      kind: input.kind,
      title: "Commendation Letter",
      recipientLabel: `TO: ${employeeName}`,
      referenceLine: buildReferenceLine(input, "Commendation Letter"),
      category: "Recommendations",
      fileName: `${employeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-commendation-letter.pdf`,
      approvalRecommendedRole: "Supervisor",
      sections: [
        {
          paragraphs: [
            `This letter serves as formal commendation for your performance and contribution noted on ${recognitionDate}.`,
            `Management has taken note of ${recognitionReason}. Your conduct reflects positively on the standards expected at ${input.organization.name}.`,
            `You are expected to continue demonstrating professionalism, teamwork, accountability, and the service discipline that supports smooth hospitality operations.`,
          ],
        },
        {
          heading: "Recognition Notes",
          bullets: [
            `Role acknowledged: ${designation}.`,
            `Department: ${department}.`,
            clean(input.facts)
              ? clean(input.facts)
              : "Your positive attitude and dependable work ethic have been appreciated by management.",
          ],
        },
        {
          heading: "Management Note",
          paragraphs: [
            clean(input.desiredAction)
              ? clean(input.desiredAction)
              : "Please receive this commendation as recognition of your effort and as encouragement to sustain the same standard of work going forward.",
          ],
        },
      ],
      acknowledgements: [
        "ACKNOWLEDGMENT",
        `I, ${employeeName}, acknowledge receipt of this commendation letter.`,
      ],
      signatures: buildSignatureLines(input, "disciplinary"),
    };
  }

  if (input.kind === "recommendation_letter") {
    const recommendationDate = formatDate(clean(input.incidentDate, input.issueDate));
    const recommendationBasis =
      clean(input.reason) ||
      clean(input.facts) ||
      `your performance, conduct, and contribution to the operations of ${input.organization.name}`;

    return {
      kind: input.kind,
      title: "Recommendation Letter",
      recipientLabel: `TO: ${employeeName}`,
      referenceLine: buildReferenceLine(input, "Recommendation Letter"),
      category: "Recommendations",
      fileName: `${employeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-recommendation-letter.pdf`,
      approvalRecommendedRole: "Supervisor",
      sections: [
        {
          paragraphs: [
            `This letter serves as formal recommendation in respect of your work and service as at ${recommendationDate}.`,
            `Management wishes to place on record that ${recommendationBasis}. Your conduct and contribution have reflected positively on the standards expected at ${input.organization.name}.`,
            "You are encouraged to continue demonstrating professionalism, discipline, accountability, teamwork, and commitment to service delivery in your role.",
          ],
        },
        {
          heading: "Recommendation Summary",
          bullets: [
            `Recommended employee: ${employeeName}.`,
            `Designation: ${designation}.`,
            `Department: ${department}.`,
            clean(input.facts)
              ? clean(input.facts)
              : "This recommendation is issued in recognition of consistent performance and dependable service.",
          ],
        },
        {
          heading: "Management Note",
          paragraphs: [
            clean(input.desiredAction)
              ? clean(input.desiredAction)
              : "This recommendation may be relied upon for internal recognition, development consideration, or any other lawful employment purpose approved by management.",
          ],
        },
      ],
      acknowledgements: [
        "ACKNOWLEDGMENT",
        `I, ${employeeName}, acknowledge receipt of this recommendation letter.`,
      ],
      signatures: buildSignatureLines(input, "disciplinary"),
    };
  }

  const incidentDate = formatDate(clean(input.incidentDate, input.issueDate));
  const responseHours = Math.max(24, Number(input.responseHours || 72));
  const disciplinaryCategory: HrDocumentCategory = "Disciplinary";
  const disciplinaryTitleMap: Record<HrDocumentKind, string> = {
    contract: "",
    appointment_letter: "",
    salary_review: "",
    commendation_letter: "",
    recommendation_letter: "",
    warning_letter: "Warning Letter",
    show_cause: "Show Cause Letter",
    suspension_letter: "Suspension Letter",
    dismissal_letter: "Dismissal Letter",
    summary_dismissal_letter: "Summary Dismissal Letter",
  };
  const title = disciplinaryTitleMap[input.kind];
  const conductFacts =
    clean(input.facts) ||
    "It has been noted with concern that your conduct fell below the standards expected by the Company.";

  const disciplinarySections: HrDocumentSection[] = [];

  if (input.kind === "warning_letter") {
    disciplinarySections.push({
      paragraphs: [
        `This letter serves as a formal warning concerning the incident of ${incidentDate}. ${conductFacts}`,
        `You are expected to maintain professionalism, discipline, punctuality, and compliance with company standards at all times. Any recurrence of similar misconduct may lead to further disciplinary action, which may include a final warning, suspension, or termination in accordance with the Employment Act and company policy.`,
      ],
    });
  } else if (input.kind === "show_cause") {
    disciplinarySections.push({
      paragraphs: [
        `It has been noted with concern that on ${incidentDate}, ${conductFacts}`,
        `Your conduct amounts to negligence of duty and failure to adhere to the Company's expected standards of professionalism, punctuality, discipline, and responsibility.`,
        `You are therefore required to explain in writing why disciplinary action should not be taken against you and why you should continue to be retained as a member of staff at ${input.organization.name}. Your written response should reach management within ${responseHours} hours from receipt of this letter.`,
        "Failure to respond within the stipulated time may lead to further disciplinary action being taken based on the information available to management.",
      ],
    });
  } else if (input.kind === "suspension_letter") {
    disciplinarySections.push({
      paragraphs: [
        `Following review of the incident dated ${incidentDate}, management has resolved to suspend you from duty pending further disciplinary action. ${conductFacts}`,
        `During the suspension period, you are required to remain available for any disciplinary hearing, investigation, or management communication relating to this matter.`,
        ROBOT_CAFE_STYLE_PROFILE.disciplinePhrase,
      ],
    });
  } else if (input.kind === "dismissal_letter" || input.kind === "summary_dismissal_letter") {
    disciplinarySections.push({
      paragraphs: [
        `Following management review of the incident dated ${incidentDate}, the Company has resolved to terminate your employment. ${conductFacts}`,
        input.kind === "summary_dismissal_letter"
          ? "The termination takes effect immediately on grounds amounting to gross misconduct."
          : "The termination is being effected after due process in accordance with your employment terms and Kenyan labour laws.",
        "You are required to commence immediate clearance and handover of all Company property and responsibilities.",
      ],
    });
  }

  if (clean(input.desiredAction)) {
    disciplinarySections.push({
      heading: "Required Action",
      paragraphs: [clean(input.desiredAction)],
    });
  }

  return {
    kind: input.kind,
    title,
    recipientLabel: `TO: ${employeeName}`,
    referenceLine: buildReferenceLine(input, title),
    category: disciplinaryCategory,
    fileName: `${employeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${input.kind}.pdf`,
    approvalRecommendedRole:
      input.kind === "warning_letter"
        ? "Supervisor"
        : input.kind === "show_cause"
          ? "HR Admin"
          : "Manager",
    sections: disciplinarySections,
    signatures: buildSignatureLines(input, "disciplinary"),
  };
}
