import { deflateSync, inflateSync } from "node:zlib";

type BinaryContent = Uint8Array;

export const PAYROLL_TEMPLATE_OUTPUT_TYPES = [
  "wagebill_report",
  "earnings_deductions_analysis",
  "monthly_deduction_posting_list",
  "net_to_bank",
  "net_to_mpesa",
  "paye_report",
  "nssf_report",
  "shif_report",
  "helb_report",
] as const;

export type PayrollTemplateOutputType = (typeof PAYROLL_TEMPLATE_OUTPUT_TYPES)[number];
export type PayrollOutputMode = "preview" | "download";

export type PayrollOutputDefinition = {
  label: string;
  extension: "pdf" | "xlsx" | "csv";
  contentType: string;
  previewable: boolean;
};

export const PAYROLL_TEMPLATE_OUTPUT_DEFINITIONS: Record<
  PayrollTemplateOutputType,
  PayrollOutputDefinition
> = {
  wagebill_report: {
    label: "Wagebill Report",
    extension: "pdf",
    contentType: "application/pdf",
    previewable: true,
  },
  earnings_deductions_analysis: {
    label: "Earnings & Deductions Analysis",
    extension: "pdf",
    contentType: "application/pdf",
    previewable: true,
  },
  monthly_deduction_posting_list: {
    label: "Monthly Deduction Posting List",
    extension: "pdf",
    contentType: "application/pdf",
    previewable: true,
  },
  net_to_bank: {
    label: "Net to Bank",
    extension: "xlsx",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    previewable: false,
  },
  net_to_mpesa: {
    label: "Net to MPESA",
    extension: "xlsx",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    previewable: false,
  },
  paye_report: {
    label: "PAYE",
    extension: "xlsx",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    previewable: false,
  },
  nssf_report: {
    label: "NSSF",
    extension: "xlsx",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    previewable: false,
  },
  shif_report: {
    label: "SHIF",
    extension: "xlsx",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    previewable: false,
  },
  helb_report: {
    label: "HELB",
    extension: "csv",
    contentType: "text/csv; charset=utf-8",
    previewable: false,
  },
};

export type PayrollOutputEmployeeRow = {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  surname: string;
  otherNames: string;
  nationalId: string;
  kraPin: string;
  shifNumber: string;
  nssfNumber: string;
  phone: string;
  bankName: string;
  bankBranch: string;
  bankBranchCode: string;
  bankAccount: string;
  departmentId: string;
  departmentName: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  hireDate?: string;
  residentStatus: string;
  typeOfEmployee: string;
  pwd: string;
  identityType: string;
  typeOfHouseGiven: string;
  basicSalary: number;
  grossPay: number;
  netPay: number;
  taxablePay: number;
  totalDeductions: number;
  regularPayments: number;
  arrearsPayments: number;
  carBenefit: number;
  meals: number;
  nonCashBenefits: number;
  housingBenefits: number;
  otherBenefits: number;
  totalGrossPay: number;
  shif: number;
  nssf: number;
  otherPension: number;
  postRetirementMedical: number;
  mortgageInterest: number;
  housingLevy: number;
  monthlyPersonalRelief: number;
  insuranceRelief: number;
  paye: number;
  selfAssessmentPaye: number;
  helbAmount: number;
  voluntaryNssf: number;
  employerNssf: number;
  employerPension: number;
  employerHousingLevy: number;
  nita: number;
  liveMonthlyGrossSalary?: number;
  standardPeriodGross?: number;
  grossWouldBe?: number;
  netWouldBe?: number;
  totalMonthPay?: number;
  actualGross?: number;
  actualNet?: number;
  totalMonthNet?: number;
  reductionReason?: string;
  earnings: Array<{
    key: string;
    code: string;
    label: string;
    regular: number;
    arrears: number;
  }>;
  deductions: Array<{
    key: string;
    code: string;
    label: string;
    amount: number;
    deferred: number;
    voucher: number;
    effected: number;
    commission: number;
    institutionName: string;
    postingGroup: string;
    postingGroupLabel: string;
    subtotalLabel: string;
    postingOrder: number;
  }>;
};

export type PayrollOutputDataset = {
  organizationName: string;
  organizationIdentifier: string;
  organizationLogoMark: string;
  organizationLogoJpeg?: Uint8Array | null;
  platformLogoJpeg?: Uint8Array | null;
  organizationAddressLines: string[];
  reportFooter: string;
  payrollPeriodLabel: string;
  payrollMonthLong: string;
  payrollMonthYear: string;
  payrollMonthYearCsv: string;
  payrollMonthYearAlt: string;
  payrollDatedLabel: string;
  generatedAtLabel: string;
  generatedBy: string;
  generatedByEmail: string;
  rows: PayrollOutputEmployeeRow[];
};

export type PayrollOutputFile = {
  fileName: string;
  body: BinaryContent;
  contentType: string;
  previewable: boolean;
  warnings?: string[];
};

export type SupplementaryPayrollOutputType =
  | "payroll_register"
  | "housing_levy_report"
  | "p9_forms";

export type PayslipPdfDataset = {
  organizationName: string;
  organizationIdentifier: string;
  organizationLogoMark: string;
  organizationLogoJpeg?: Uint8Array | null;
  platformLogoJpeg?: Uint8Array | null;
  organizationAddressLines: string[];
  reportFooter: string;
  payrollPeriodLabel: string;
  payrollMonthShort: string;
  generatedAtLabel: string;
  generatedBy: string;
  employee: {
    employeeNumber: string;
    fullName: string;
    branchName: string;
    departmentName: string;
    designation: string;
    jobGrade: string;
    employmentType: string;
    nationalId: string;
    kraPin: string;
    shifNumber: string;
    nssfNumber: string;
    bankName: string;
    bankBranch: string;
    bankAccount: string;
    hireDate: string;
  };
  warnings?: string[];
  earnings: Array<{
    code: string;
    label: string;
    amount: number;
  }>;
  deductions: Array<{
    code: string;
    label: string;
    amount: number;
  }>;
  employerContributions: Array<{
    code: string;
    label: string;
    amount: number;
  }>;
  summary: {
    basicSalary: number;
    grossPay: number;
    taxablePay: number;
    totalDeductions: number;
    netPay: number;
    employerCost: number;
  };
};

type PostingGroupBucket = {
  key: string;
  label: string;
  subtotalLabel: string;
  order: number;
  rows: Array<{
    frequency: number;
    description: string;
    deductionAmount: number;
    commission: number;
    chequeAmount: number;
  }>;
};

type XlsxCell = {
  value: string | number;
  type?: "string" | "number";
  style?: number;
};

type XlsxSheet = {
  name: string;
  rows: Array<Array<XlsxCell | null>>;
  merges?: string[];
  widths?: number[];
};

const encoder = new TextEncoder();

const EARNING_ORDER = [
  "801",
  "802",
  "805",
  "806",
  "808",
  "809",
  "811",
  "813",
  "817",
  "819",
  "821",
  "829",
  "833",
  "845",
  "847",
  "858",
  "899",
] as const;

const DEDUCTION_ORDER = [
  "901",
  "902",
  "904",
  "907",
  "911",
  "912",
  "914",
  "917",
  "921",
  "928",
  "929",
  "933",
  "934",
  "935",
  "936",
  "937",
  "938",
  "939",
  "940",
  "944",
  "945",
  "946",
  "949",
  "951",
  "953",
  "956",
  "957",
  "990",
] as const;

const POSTING_GROUP_ORDER = [
  "sacco",
  "insurance",
  "hire_purchase",
  "commercial_firms",
  "social_welfare",
  "paymaster",
  "provident_fund",
  "shif",
  "nssf",
  "helb",
  "house_rent",
  "service_charge",
  "internal_receipt",
] as const;

const POSTING_GROUP_LABELS: Record<
  (typeof POSTING_GROUP_ORDER)[number],
  { label: string; subtotalLabel: string; order: number }
> = {
  sacco: { label: "Saccos Posting", subtotalLabel: "A Total Saccos Posting", order: 1 },
  insurance: { label: "Insurance Posting", subtotalLabel: "B Total Insurance Posting", order: 2 },
  hire_purchase: {
    label: "Hire Purchase Posting",
    subtotalLabel: "C Total Hire Purchase Posting",
    order: 3,
  },
  commercial_firms: {
    label: "Commercial Firms Posting",
    subtotalLabel: "D Total Commercial Firms Posting",
    order: 4,
  },
  social_welfare: {
    label: "Social Welfare Associations Posting",
    subtotalLabel: "E Total Social Welfare Associations Posting",
    order: 5,
  },
  paymaster: {
    label: "Paymaster-general posting",
    subtotalLabel: "J Total Paymaster-general posting Posting",
    order: 6,
  },
  provident_fund: {
    label: "Provident-Fund posting",
    subtotalLabel: "K Total Provident-Fund posting Posting",
    order: 7,
  },
  shif: { label: "SHIF posting", subtotalLabel: "L Total SHIF posting Posting", order: 8 },
  nssf: { label: "N.S.S.F posting", subtotalLabel: "M Total N.S.S.F posting Posting", order: 9 },
  helb: { label: "H.E.L.B posting", subtotalLabel: "N Total H.E.L.B posting Posting", order: 10 },
  house_rent: {
    label: "House rent /utility charges posting",
    subtotalLabel: "O Total House rent /utility charges posting Posting",
    order: 11,
  },
  service_charge: {
    label: "Service-charge posting",
    subtotalLabel: "S Total Service-charge posting Posting",
    order: 12,
  },
  internal_receipt: {
    label: "Internal Receipt Posting",
    subtotalLabel: "V Total Internal Receipt Posting Posting",
    order: 13,
  },
};

function escapeXml(value: string) {
  return normaliseReportText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapePdf(value: string) {
  return normaliseReportText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function asMoney(value: number) {
  return value.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function asKes(value: number) {
  return `Ksh ${asMoney(value)}`;
}

const PDF_BRAND_BLUE = "0 0 0";
const PDF_BRAND_BLUE_SOFT = "0.985 0.985 0.985";
const PDF_BRAND_BLUE_SOFT_ALT = "1 1 1";
const PDF_BRAND_BORDER = "0.72 0.72 0.72";
const PDF_ROW_BORDER = "0.84 0.84 0.84";
const PDF_REPORT_PAPER_SOFT = "0.965 0.971 0.978";
const PDF_REPORT_PANEL_SOFT = "0.900 0.918 0.942";
const PDF_REPORT_ROW_SOFT = "0.984 0.988 0.993";
const PDF_REPORT_ROW_ALT_SOFT = "0.948 0.958 0.973";
const PDF_REPORT_FOOTER_SOFT = "0.928 0.940 0.956";

function normaliseReportText(value: string) {
  return value
    .replace(/[\u2013\u2014\u2022]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+-\s+/g, " - ")
    .replace(/P\.O\. Box 80402\s+00100/i, "P.O. Box 80402 - 00100")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function compactAddressLines(lines: string[] | undefined) {
  return (lines ?? []).map((line) => normaliseReportText(line)).filter(Boolean).slice(0, 3);
}

function roundAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function columnName(index: number) {
  let value = "";
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }
  return value;
}

function buildCurrencyCell(value: number, bold = false): XlsxCell {
  return {
    value: roundAmount(value),
    type: "number",
    style: bold ? 6 : 3,
  };
}

function buildStringCell(value: string, style = 0): XlsxCell {
  return { value, type: "string", style };
}

function buildNumberCell(value: number, style = 0): XlsxCell {
  return { value, type: "number", style };
}

function sum(values: number[]) {
  return roundAmount(values.reduce((total, value) => total + value, 0));
}

function buildEarningsSummary(dataset: PayrollOutputDataset) {
  const grouped = new Map<
    string,
    {
      code: string;
      label: string;
      frequency: number;
      totalAmount: number;
      regular: number;
      arrears: number;
    }
  >();

  for (const row of dataset.rows) {
    for (const earning of row.earnings) {
      const total = roundAmount(earning.regular + earning.arrears);
      if (total <= 0) continue;
      const key = `${earning.code}:${earning.label}`;
      const current = grouped.get(key) ?? {
        code: earning.code,
        label: earning.label,
        frequency: 0,
        totalAmount: 0,
        regular: 0,
        arrears: 0,
      };
      current.frequency += 1;
      current.totalAmount = roundAmount(current.totalAmount + total);
      current.regular = roundAmount(current.regular + earning.regular);
      current.arrears = roundAmount(current.arrears + earning.arrears);
      grouped.set(key, current);
    }
  }

  const rows = [...grouped.values()].sort((left, right) => {
    const orderDiff =
      (EARNING_ORDER.indexOf(left.code as (typeof EARNING_ORDER)[number]) + 1 || 999) -
      (EARNING_ORDER.indexOf(right.code as (typeof EARNING_ORDER)[number]) + 1 || 999);
    return orderDiff !== 0 ? orderDiff : left.label.localeCompare(right.label);
  });

  return {
    rows,
    totalAmount: sum(rows.map((row) => row.totalAmount)),
    totalRegular: sum(rows.map((row) => row.regular)),
    totalArrears: sum(rows.map((row) => row.arrears)),
  };
}

function buildDeductionsSummary(dataset: PayrollOutputDataset) {
  const grouped = new Map<
    string,
    {
      code: string;
      label: string;
      frequency: number;
      totalAmount: number;
      deferred: number;
      voucher: number;
      combined: number;
    }
  >();

  for (const row of dataset.rows) {
    for (const deduction of row.deductions) {
      if (deduction.amount <= 0 && deduction.deferred <= 0 && deduction.voucher <= 0) continue;
      const key = `${deduction.code}:${deduction.label}`;
      const current = grouped.get(key) ?? {
        code: deduction.code,
        label: deduction.label,
        frequency: 0,
        totalAmount: 0,
        deferred: 0,
        voucher: 0,
        combined: 0,
      };
      current.frequency += 1;
      current.totalAmount = roundAmount(current.totalAmount + deduction.amount);
      current.deferred = roundAmount(current.deferred + deduction.deferred);
      current.voucher = roundAmount(current.voucher + deduction.voucher);
      current.combined = roundAmount(
        current.combined + deduction.effected + deduction.deferred + deduction.voucher
      );
      grouped.set(key, current);
    }
  }

  const rows = [...grouped.values()].sort((left, right) => {
    const orderDiff =
      (DEDUCTION_ORDER.indexOf(left.code as (typeof DEDUCTION_ORDER)[number]) + 1 || 999) -
      (DEDUCTION_ORDER.indexOf(right.code as (typeof DEDUCTION_ORDER)[number]) + 1 || 999);
    return orderDiff !== 0 ? orderDiff : left.label.localeCompare(right.label);
  });

  return {
    rows,
    totalAmount: sum(rows.map((row) => row.totalAmount)),
    totalDeferred: sum(rows.map((row) => row.deferred)),
    totalVoucher: sum(rows.map((row) => row.voucher)),
    totalCombined: sum(rows.map((row) => row.combined)),
  };
}

function buildPostingGroups(dataset: PayrollOutputDataset) {
  const grouped = new Map<string, PostingGroupBucket>();
  const detail = new Map<
    string,
    { groupKey: string; description: string; frequency: number; deductionAmount: number; commission: number }
  >();

  for (const row of dataset.rows) {
    for (const deduction of row.deductions) {
      if (deduction.amount <= 0) continue;
      const detailKey = `${deduction.postingGroup}:${deduction.institutionName}`;
      const current = detail.get(detailKey) ?? {
        groupKey: deduction.postingGroup,
        description: deduction.institutionName,
        frequency: 0,
        deductionAmount: 0,
        commission: 0,
      };
      current.frequency += 1;
      current.deductionAmount = roundAmount(current.deductionAmount + deduction.amount);
      current.commission = roundAmount(current.commission + deduction.commission);
      detail.set(detailKey, current);
    }
  }

  for (const item of detail.values()) {
    const definition = POSTING_GROUP_LABELS[item.groupKey as keyof typeof POSTING_GROUP_LABELS];
    if (!definition) continue;
    const bucket = grouped.get(item.groupKey) ?? {
      key: item.groupKey,
      label: definition.label,
      subtotalLabel: definition.subtotalLabel,
      order: definition.order,
      rows: [],
    };
    bucket.rows.push({
      frequency: item.frequency,
      description: item.description,
      deductionAmount: item.deductionAmount,
      commission: item.commission,
      chequeAmount: roundAmount(item.deductionAmount - item.commission),
    });
    grouped.set(item.groupKey, bucket);
  }

  return [...grouped.values()]
    .sort((left, right) => left.order - right.order)
    .map((bucket) => ({
      ...bucket,
      rows: bucket.rows.sort((left, right) => left.description.localeCompare(right.description)),
    }));
}

function buildDatasetTotals(dataset: PayrollOutputDataset) {
  const earnings = buildEarningsSummary(dataset);
  const deductions = buildDeductionsSummary(dataset);
  const officersIncluded = dataset.rows.length;
  const entriesProcessed = dataset.rows.reduce((total, row) => {
    const earningsEntries = row.earnings.filter(
      (earning) => roundAmount(earning.regular + earning.arrears) > 0
    ).length;
    const deductionEntries = row.deductions.filter(
      (deduction) => roundAmount(deduction.amount + deduction.deferred + deduction.voucher) > 0
    ).length;
    return total + earningsEntries + deductionEntries;
  }, 0);
  const taxableAmount = sum(dataset.rows.map((row) => row.taxablePay));
  const effected = sum(dataset.rows.map((row) => sum(row.deductions.map((deduction) => deduction.effected))));
  const deferred = sum(dataset.rows.map((row) => sum(row.deductions.map((deduction) => deduction.deferred))));
  const voucherDeductions = sum(
    dataset.rows.map((row) => sum(row.deductions.map((deduction) => deduction.voucher)))
  );
  const voucherRemittals = 0;
  const netVoucherAdvance = 0;
  const netWouldBe = roundAmount(earnings.totalAmount - deductions.totalCombined);
  const netActual = roundAmount(
    earnings.totalAmount - effected - voucherDeductions - voucherRemittals + netVoucherAdvance
  );
  const employerNssf = sum(dataset.rows.map((row) => row.employerNssf));
  const employerPension = sum(dataset.rows.map((row) => row.employerPension));
  const nita = sum(dataset.rows.map((row) => row.nita));
  const employerHousingLevy = sum(dataset.rows.map((row) => row.employerHousingLevy));
  const pensionObligation = roundAmount(employerNssf + employerPension);
  const wagebillTotal = roundAmount(
    earnings.totalAmount + pensionObligation + nita + employerHousingLevy
  );

  return {
    earnings,
    deductions,
    officersIncluded,
    entriesProcessed,
    taxableAmount,
    effected,
    deferred,
    voucherDeductions,
    voucherRemittals,
    netVoucherAdvance,
    netWouldBe,
    netActual,
    employerNssf,
    employerPension,
    nita,
    employerHousingLevy,
    pensionObligation,
    wagebillTotal,
  };
}

function buildCsv(rows: string[][]) {
  const content = rows
    .map((row) =>
      row
        .map((value) =>
          /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
        )
        .join(",")
    )
    .join("\r\n");
  return encoder.encode(content);
}

function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ -1) >>> 0;
}

function toDosDate(date: Date) {
  const year = Math.max(date.getFullYear(), 1980);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day,
  };
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((size, part) => size + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function buildZip(entries: Array<{ name: string; data: Uint8Array }>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dos = toDosDate(now);

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, dos.time);
    writeUint16(localView, 12, dos.date);
    writeUint32(localView, 14, crc32(entry.data));
    writeUint32(localView, 18, entry.data.length);
    writeUint32(localView, 22, entry.data.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, dos.time);
    writeUint16(centralView, 14, dos.date);
    writeUint32(centralView, 16, crc32(entry.data));
    writeUint32(centralView, 20, entry.data.length);
    writeUint32(centralView, 24, entry.data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + entry.data.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, entries.length);
  writeUint16(endView, 10, entries.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);

  return concatBytes([...localParts, centralDirectory, end]);
}

function buildWorksheetXml(sheet: XlsxSheet) {
  const rowsXml = sheet.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, columnIndex) => {
          if (!cell) return "";
          const ref = `${columnName(columnIndex + 1)}${rowIndex + 1}`;
          const styleAttr = cell.style ? ` s="${cell.style}"` : "";
          if (cell.type === "number") {
            return `<c r="${ref}"${styleAttr}><v>${cell.value}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t>${escapeXml(String(
            cell.value
          ))}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  const widths = sheet.widths?.length
    ? `<cols>${sheet.widths
        .map(
          (width, index) =>
            `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
        )
        .join("")}</cols>`
    : "";

  const merges = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges
        .map((merge) => `<mergeCell ref="${merge}"/>`)
        .join("")}</mergeCells>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  ${widths}
  <sheetData>${rowsXml}</sheetData>
  ${merges}
</worksheet>`;
}

function buildWorkbookXml(sheets: XlsxSheet[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets
      .map(
        (sheet, index) =>
          `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
      )
      .join("")}
  </sheets>
</workbook>`;
}

function buildWorkbookRelationshipsXml(sheets: XlsxSheet[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join("")}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function buildContentTypesXml(sheets: XlsxSheet[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("")}
</Types>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="#,##0.00"/>
  </numFmts>
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>
  </cellXfs>
</styleSheet>`;
}

function buildRootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function buildCorePropsXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Solva HR</dc:creator>
  <cp:lastModifiedBy>Solva HR</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function buildAppPropsXml(sheets: XlsxSheet[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Solva HR</Application>
  <TitlesOfParts>
    <vt:vector size="${sheets.length}" baseType="lpstr">
      ${sheets.map((sheet) => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join("")}
    </vt:vector>
  </TitlesOfParts>
</Properties>`;
}

function buildWorkbook(sheets: XlsxSheet[]) {
  const entries = [
    { name: "[Content_Types].xml", data: encoder.encode(buildContentTypesXml(sheets)) },
    { name: "_rels/.rels", data: encoder.encode(buildRootRelationshipsXml()) },
    { name: "docProps/core.xml", data: encoder.encode(buildCorePropsXml()) },
    { name: "docProps/app.xml", data: encoder.encode(buildAppPropsXml(sheets)) },
    { name: "xl/workbook.xml", data: encoder.encode(buildWorkbookXml(sheets)) },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: encoder.encode(buildWorkbookRelationshipsXml(sheets)),
    },
    { name: "xl/styles.xml", data: encoder.encode(buildStylesXml()) },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: encoder.encode(buildWorksheetXml(sheet)),
    })),
  ];

  return buildZip(entries);
}

type PdfTextItem = {
  x: number;
  y: number;
  size: number;
  font: "F1" | "F2" | "F3" | "F4";
  text: string;
};

type PdfEmbeddedImage = {
  data: Uint8Array;
  width: number;
  height: number;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  filter: "DCTDecode" | "FlateDecode";
};

type PdfPage = {
  texts: PdfTextItem[];
  lines?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  images?: PdfEmbeddedImage[];
  rects?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: string;
    stroke?: string;
    lineWidth?: number;
  }>;
};

function getJpegDimensions(data: Uint8Array) {
  let offset = 2;

  while (offset < data.length - 9) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = data[offset + 1];
    const length = (data[offset + 2] << 8) | data[offset + 3];

    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    ) {
      const height = (data[offset + 5] << 8) | data[offset + 6];
      const width = (data[offset + 7] << 8) | data[offset + 8];
      return { width, height };
    }

    if (!length || Number.isNaN(length)) {
      break;
    }

    offset += 2 + length;
  }

  throw new Error("invalid_jpeg_dimensions");
}

function paethPredictor(left: number, up: number, upLeft: number) {
  const predictor = left + up - upLeft;
  const distLeft = Math.abs(predictor - left);
  const distUp = Math.abs(predictor - up);
  const distUpLeft = Math.abs(predictor - upLeft);
  if (distLeft <= distUp && distLeft <= distUpLeft) {
    return left;
  }
  if (distUp <= distUpLeft) {
    return up;
  }
  return upLeft;
}

function parsePngToPdfRgbData(data: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (data.length < signature.length || !signature.every((value, index) => data[index] === value)) {
    throw new Error("invalid_png_signature");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Uint8Array[] = [];

  while (offset + 8 <= data.length) {
    const length =
      (data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3];
    const type = Buffer.from(data.slice(offset + 4, offset + 8)).toString("ascii");
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + length;
    if (chunkEnd + 4 > data.length) {
      throw new Error("invalid_png_chunk");
    }

    if (type === "IHDR") {
      width =
        (data[chunkStart] << 24) |
        (data[chunkStart + 1] << 16) |
        (data[chunkStart + 2] << 8) |
        data[chunkStart + 3];
      height =
        (data[chunkStart + 4] << 24) |
        (data[chunkStart + 5] << 16) |
        (data[chunkStart + 6] << 8) |
        data[chunkStart + 7];
      bitDepth = data[chunkStart + 8];
      colorType = data[chunkStart + 9];
    } else if (type === "IDAT") {
      idatChunks.push(data.slice(chunkStart, chunkEnd));
    } else if (type === "IEND") {
      break;
    }

    offset = chunkEnd + 4;
  }

  if (!width || !height || !idatChunks.length) {
    throw new Error("invalid_png_data");
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error("unsupported_png_color_profile");
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks.map((chunk) => Buffer.from(chunk))));
  const expectedLength = height * (stride + 1);
  if (inflated.length < expectedLength) {
    throw new Error("invalid_png_scanlines");
  }

  const rgb = new Uint8Array(width * height * 3);
  const previousRow = new Uint8Array(stride);
  let inflatedOffset = 0;
  let rgbOffset = 0;

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filterType = inflated[inflatedOffset];
    inflatedOffset += 1;
    const row = inflated.slice(inflatedOffset, inflatedOffset + stride);
    inflatedOffset += stride;
    const reconstructed = new Uint8Array(stride);

    for (let index = 0; index < stride; index += 1) {
      const left = index >= bytesPerPixel ? reconstructed[index - bytesPerPixel] : 0;
      const up = previousRow[index] ?? 0;
      const upLeft = index >= bytesPerPixel ? previousRow[index - bytesPerPixel] ?? 0 : 0;
      const value = row[index] ?? 0;

      switch (filterType) {
        case 0:
          reconstructed[index] = value;
          break;
        case 1:
          reconstructed[index] = (value + left) & 0xff;
          break;
        case 2:
          reconstructed[index] = (value + up) & 0xff;
          break;
        case 3:
          reconstructed[index] = (value + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          reconstructed[index] = (value + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new Error("unsupported_png_filter");
      }
    }

    if (colorType === 2) {
      rgb.set(reconstructed, rgbOffset);
      rgbOffset += reconstructed.length;
    } else {
      for (let index = 0; index < reconstructed.length; index += 4) {
        const alpha = reconstructed[index + 3] / 255;
        rgb[rgbOffset] = Math.round(reconstructed[index] * alpha + 255 * (1 - alpha));
        rgb[rgbOffset + 1] = Math.round(reconstructed[index + 1] * alpha + 255 * (1 - alpha));
        rgb[rgbOffset + 2] = Math.round(reconstructed[index + 2] * alpha + 255 * (1 - alpha));
        rgbOffset += 3;
      }
    }

    previousRow.set(reconstructed);
  }

  return {
    data: new Uint8Array(deflateSync(Buffer.from(rgb))),
    width,
    height,
    filter: "FlateDecode" as const,
  };
}

function buildPdf(pages: PdfPage[]) {
  const pageWidth = 595;
  const pageHeight = 842;
  const objects: Array<string | Uint8Array | undefined> = [];

  const fontObjects = {
    F1: 3,
    F2: 4,
    F3: 5,
    F4: 6,
  };

  objects[1] = `1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n`;
  const pageObjectIds: number[] = [];
  const streamObjectIds: number[] = [];
  const imageObjectIds: number[][] = [];

  let nextObjectId = 7;
  for (let index = 0; index < pages.length; index += 1) {
    pageObjectIds.push(nextObjectId);
    streamObjectIds.push(nextObjectId + 1);
    const pageImages = pages[index]?.images ?? [];
    const ids: number[] = [];
    for (let imageIndex = 0; imageIndex < pageImages.length; imageIndex += 1) {
      ids.push(nextObjectId + 2 + imageIndex);
    }
    imageObjectIds.push(ids);
    nextObjectId += 2 + ids.length;
  }

  objects[2] = `2 0 obj<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] >>endobj\n`;
  objects[3] = `3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`;
  objects[4] = `4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n`;
  objects[5] = `5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>endobj\n`;
  objects[6] = `6 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>endobj\n`;

  pages.forEach((page, index) => {
    const streamLines: string[] = [];
    const pageImageIds = imageObjectIds[index] ?? [];
    for (const rect of page.rects ?? []) {
      if (rect.fill) {
        streamLines.push(`${rect.fill} rg ${rect.x} ${rect.y} ${rect.width} ${rect.height} re f`);
      }
      if (rect.stroke) {
        streamLines.push(
          `${rect.stroke} RG ${rect.lineWidth ?? 0.5} w ${rect.x} ${rect.y} ${rect.width} ${rect.height} re S`
        );
      }
    }
    for (const line of page.lines ?? []) {
      streamLines.push(`0.5 w ${line.x1} ${line.y1} m ${line.x2} ${line.y2} l S`);
    }
    (page.images ?? []).forEach((image, imageIndex) => {
      streamLines.push(
        `q ${image.displayWidth} 0 0 ${image.displayHeight} ${image.x} ${image.y} cm /Im${imageIndex + 1} Do Q`
      );
    });
    streamLines.push("0 0 0 rg 0 0 0 RG");
    for (const text of page.texts) {
      streamLines.push(
        `BT /${text.font} ${text.size} Tf 1 0 0 1 ${text.x} ${text.y} Tm (${escapePdf(
          text.text
        )}) Tj ET`
      );
    }
    const stream = streamLines.join("\n");
    const streamLength = Buffer.byteLength(stream, "utf8");
    const streamObjectId = streamObjectIds[index];
    const pageObjectId = pageObjectIds[index];
    objects[streamObjectId] =
      `${streamObjectId} 0 obj<< /Length ${streamLength} >>stream\n${stream}\nendstream\nendobj\n`;
    (page.images ?? []).forEach((image, imageIndex) => {
      const imageObjectId = pageImageIds[imageIndex];
      const header = `${imageObjectId} 0 obj<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${image.filter} /Length ${image.data.length} >>stream\n`;
      const footer = `\nendstream\nendobj\n`;
      objects[imageObjectId] = Buffer.concat([
        Buffer.from(header, "utf8"),
        Buffer.from(image.data),
        Buffer.from(footer, "utf8"),
      ]);
    });
    const xObjectResources = pageImageIds.length
      ? `/XObject << ${pageImageIds.map((id, imageIndex) => `/Im${imageIndex + 1} ${id} 0 R`).join(" ")} >>`
      : "";
    objects[pageObjectId] =
      `${pageObjectId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjects.F1} 0 R /F2 ${fontObjects.F2} 0 R /F3 ${fontObjects.F3} 0 R /F4 ${fontObjects.F4} 0 R >> ${xObjectResources} >> /Contents ${streamObjectId} 0 R >>endobj\n`;
  });

  const sortedObjects = objects
    .map((content, index) => ({ index, content }))
    .filter((entry): entry is { index: number; content: string | Uint8Array } => entry.index > 0 && Boolean(entry.content));
  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n", "utf8")];
  let currentLength = parts[0].length;
  const offsets: number[] = [0];
  for (const entry of sortedObjects) {
    const buffer = typeof entry.content === "string" ? Buffer.from(entry.content, "utf8") : Buffer.from(entry.content);
    offsets[entry.index] = currentLength;
    parts.push(buffer);
    currentLength += buffer.length;
  }
  const xrefStart = currentLength;
  let trailer = `xref\n0 ${sortedObjects.length + 1}\n`;
  trailer += "0000000000 65535 f \n";
  for (const entry of sortedObjects) {
    trailer += `${String(offsets[entry.index]).padStart(10, "0")} 00000 n \n`;
  }
  trailer += `trailer<< /Size ${sortedObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  parts.push(Buffer.from(trailer, "utf8"));
  return new Uint8Array(Buffer.concat(parts));
}

function wrapPdfText(text: string, maxLength: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxLength) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let index = 0; index < word.length; index += maxLength) {
        lines.push(word.slice(index, index + maxLength));
      }
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [text];
}

function addPdfTextBlock(
  texts: PdfTextItem[],
  input: {
    x: number;
    startY: number;
    lines: string[];
    size?: number;
    lineHeight?: number;
    font?: "F1" | "F2" | "F3" | "F4";
  }
) {
  const font = input.font ?? "F1";
  const size = input.size ?? 10;
  const lineHeight = input.lineHeight ?? size + 4;

  input.lines.forEach((line, index) => {
    texts.push({
      x: input.x,
      y: input.startY - index * lineHeight,
      size,
      font,
      text: line,
    });
  });

  return input.startY - input.lines.length * lineHeight;
}

function buildHeaderLogoImage(
  imageBytes: Uint8Array | null | undefined,
  input: { x: number; y: number; maxWidth: number; maxHeight: number }
): PdfEmbeddedImage | null {
  if (!imageBytes?.length) {
    return null;
  }

  try {
    if (imageBytes[0] === 0xff && imageBytes[1] === 0xd8) {
      const { width, height } = getJpegDimensions(imageBytes);
      const scale = Math.min(input.maxWidth / width, input.maxHeight / height, 1);
      return {
        data: imageBytes,
        width,
        height,
        x: input.x,
        y: input.y,
        displayWidth: Number((width * scale).toFixed(2)),
        displayHeight: Number((height * scale).toFixed(2)),
        filter: "DCTDecode",
      };
    }

    if (
      imageBytes[0] === 0x89 &&
      imageBytes[1] === 0x50 &&
      imageBytes[2] === 0x4e &&
      imageBytes[3] === 0x47
    ) {
      const parsed = parsePngToPdfRgbData(imageBytes);
      const scale = Math.min(input.maxWidth / parsed.width, input.maxHeight / parsed.height, 1);
      return {
        ...parsed,
        x: input.x,
        y: input.y,
        displayWidth: Number((parsed.width * scale).toFixed(2)),
        displayHeight: Number((parsed.height * scale).toFixed(2)),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function appendPdfHeader(
  texts: PdfTextItem[],
  rects: NonNullable<PdfPage["rects"]>,
  images: PdfEmbeddedImage[],
  input: {
    pageWidth: number;
    pageHeight: number;
    centerX: number;
    marginX: number;
    topY: number;
    headerHeight: number;
    organizationLogoMark: string;
    organizationLogoJpeg?: Uint8Array | null;
    platformLogoJpeg?: Uint8Array | null;
    organizationNameLines: string[];
    addressLines: string[];
    titleLines: string[];
    periodLine?: string;
    organizationIdentifier?: string;
  }
) {
  const headerTop = input.topY;
  const headerHeight = input.headerHeight;
  const leftLogo = buildHeaderLogoImage(input.organizationLogoJpeg, {
    x: 0,
    y: 0,
    maxWidth: 76,
    maxHeight: 48,
  });
  const rightLogoSlotWidth = 132;
  const rightLogo = buildHeaderLogoImage(input.platformLogoJpeg, {
    x: 0,
    y: 0,
    maxWidth: rightLogoSlotWidth - 12,
    maxHeight: 46,
  });

  rects.push(
    {
      x: input.marginX,
      y: input.pageHeight - headerTop - headerHeight,
      width: input.pageWidth - input.marginX * 2,
      height: headerHeight,
      fill: "1 1 1",
      stroke: PDF_BRAND_BORDER,
      lineWidth: 0.8,
    },
    {
      x: input.marginX,
      y: input.pageHeight - headerTop - 2,
      width: input.pageWidth - input.marginX * 2,
      height: 2,
      fill: PDF_BRAND_BLUE,
    }
  );

  const leftSlotX = input.marginX + 12;
  const leftSlotTop = headerTop + 16;
  rects.push({
    x: leftSlotX - 4,
    y: input.pageHeight - leftSlotTop - 52,
    width: 84,
    height: 56,
    fill: "0.998 0.998 0.998",
    stroke: PDF_BRAND_BORDER,
    lineWidth: 0.5,
  });
  if (leftLogo) {
    images.push({
      ...leftLogo,
      x: leftSlotX,
      y: Number((input.pageHeight - (leftSlotTop + leftLogo.displayHeight)).toFixed(2)),
    });
  } else {
    rects.push({
      x: leftSlotX,
      y: input.pageHeight - leftSlotTop - 40,
      width: 56,
      height: 40,
      fill: "1 1 1",
      stroke: PDF_BRAND_BORDER,
      lineWidth: 0.8,
    });
    texts.push({
      x: leftSlotX + 18,
      y: input.pageHeight - (leftSlotTop + 25),
      size: 16,
      font: "F2",
      text: input.organizationLogoMark,
    });
  }

  const rightSlotOuterX = input.pageWidth - input.marginX - 12 - rightLogoSlotWidth;
  const rightSlotX =
    rightSlotOuterX + (rightLogo ? (rightLogoSlotWidth - rightLogo.displayWidth) / 2 : 20);
  const rightSlotTop = headerTop + 18;
  if (rightLogo) {
    rects.push({
      x: rightSlotOuterX,
      y: input.pageHeight - rightSlotTop - 50,
      width: rightLogoSlotWidth,
      height: 54,
      fill: "0.998 0.998 0.998",
      stroke: PDF_BRAND_BORDER,
      lineWidth: 0.5,
    });
    images.push({
      ...rightLogo,
      x: rightSlotX,
      y: Number((input.pageHeight - (rightSlotTop + rightLogo.displayHeight)).toFixed(2)),
    });
  }

  const centerLeft = input.marginX + 106;
  const centerRight = rightSlotOuterX - 22;
  const availableCenterWidth = Math.max(180, centerRight - centerLeft);
  const maxNameChars = estimateCharsForPdfWidth(availableCenterWidth, 14.4, "F2");
  const maxBodyChars = estimateCharsForPdfWidth(availableCenterWidth, 9.2, "F1");
  const nameLines = input.organizationNameLines.flatMap((line) => wrapPdfText(line, maxNameChars));
  const addressLines = input.addressLines.flatMap((line) => wrapPdfText(line, maxBodyChars));
  const titleLines = input.titleLines.flatMap((line) => wrapPdfText(line, maxNameChars));
  const periodLines = input.periodLine ? wrapPdfText(input.periodLine, maxBodyChars) : [];

  let textTop = headerTop + 18;
  nameLines.forEach((line, index) => {
    texts.push({
      x: input.centerX - estimatePdfTextWidth(line, 14.4, "F2") / 2,
      y: input.pageHeight - (textTop + index * 15),
      size: 14.4,
      font: "F2",
      text: line,
    });
  });
  textTop += nameLines.length * 15 + 4;

  addressLines.forEach((line, index) => {
    texts.push({
      x: input.centerX - estimatePdfTextWidth(line, 9.2, "F1") / 2,
      y: input.pageHeight - (textTop + index * 12),
      size: 9.2,
      font: "F1",
      text: line,
    });
  });
  textTop += addressLines.length * 12 + 7;

  titleLines.forEach((line, index) => {
    texts.push({
      x: input.centerX - estimatePdfTextWidth(line, 12.6, "F2") / 2,
      y: input.pageHeight - (textTop + index * 14),
      size: 12.6,
      font: "F2",
      text: line,
    });
  });
  textTop += titleLines.length * 14 + 5;

  periodLines.forEach((line, index) => {
    texts.push({
      x: input.centerX - estimatePdfTextWidth(line, 9.4, "F1") / 2,
      y: input.pageHeight - (textTop + index * 11),
      size: 9.4,
      font: "F1",
      text: line,
    });
  });

  if (input.organizationIdentifier) {
    const identifierText = `Employer ID: ${input.organizationIdentifier}`;
    texts.push({
      x: input.marginX + 14,
      y: input.pageHeight - (headerTop + headerHeight - 14),
      size: 8.3,
      font: "F1",
      text: identifierText,
    });
  }
}

function paginateTablePdf(input: {
  headerLines: string[];
  title: string;
  rows: string[];
  columnHeader: string;
  generatedBy: string;
  generatedAtLabel: string;
  footerRightLabel: string;
  organizationLogoMark: string;
  organizationLogoJpeg?: Uint8Array | null;
  platformLogoJpeg?: Uint8Array | null;
  reportFooter: string;
}) {
  const pageHeight = 842;
  const pageWidth = 595;
  const centerX = pageWidth / 2;
  const rowHeight = 16;
  const footerY = 62;
  const titleY = 170;
  const tableStartY = 220;
  const rowsPerPage = 31;
  const pages: PdfPage[] = [];
  const chunks: string[][] = [];

  for (let index = 0; index < input.rows.length; index += rowsPerPage) {
    chunks.push(input.rows.slice(index, index + rowsPerPage));
  }

  chunks.forEach((chunk, pageIndex) => {
    const texts: PdfTextItem[] = [];
    const rects: PdfPage["rects"] = [
      { x: 44, y: 114, width: 507, height: 40, fill: PDF_BRAND_BLUE_SOFT_ALT, stroke: PDF_BRAND_BORDER },
    ];
    const images: PdfEmbeddedImage[] = [];
    appendPdfHeader(texts, rects, images, {
      pageWidth,
      pageHeight,
      centerX,
      marginX: 44,
      topY: 44,
      headerHeight: 90,
      organizationLogoMark: input.organizationLogoMark,
      organizationLogoJpeg: input.organizationLogoJpeg,
      platformLogoJpeg: input.platformLogoJpeg,
      organizationNameLines: input.headerLines.slice(0, 1),
      addressLines: input.headerLines.slice(1),
      titleLines: [input.title],
    });
    const columnHeaderY = tableStartY;
    texts.push({
      x: 50,
      y: pageHeight - columnHeaderY,
      size: 8.8,
      font: "F4",
      text: input.columnHeader,
    });
    chunk.forEach((row, rowIndex) => {
      texts.push({
        x: 50,
        y: pageHeight - (columnHeaderY + 24 + rowIndex * rowHeight),
        size: 8.35,
        font: "F3",
        text: row,
      });
    });
    texts.push({
      x: 50,
      y: pageHeight - footerY,
      size: 10,
      font: "F1",
      text: "AUTHORIZED BY: ..................................................",
    });
    texts.push({
      x: 330,
      y: pageHeight - footerY,
      size: 10,
      font: "F1",
      text: `${input.footerRightLabel}: ...........................................`,
    });
    texts.push({
      x: 50,
      y: pageHeight - (footerY - 18),
      size: 9,
      font: "F1",
      text: `${input.reportFooter}  |  Generated By User: ${input.generatedBy}`,
    });
    texts.push({
      x: 325,
      y: pageHeight - (footerY - 18),
      size: 9,
      font: "F1",
      text: input.generatedAtLabel,
    });
    texts.push({
      x: 475,
      y: pageHeight - (footerY - 34),
      size: 9,
      font: "F1",
      text: `Page ${pageIndex + 1} Of ${chunks.length}`,
    });

    pages.push({
      texts,
      rects,
      images,
      lines: [
        { x1: 50, y1: pageHeight - (columnHeaderY + 8), x2: 545, y2: pageHeight - (columnHeaderY + 8) },
        { x1: 50, y1: pageHeight - (footerY - 24), x2: 545, y2: pageHeight - (footerY - 24) },
      ],
    });
  });

  return buildPdf(pages);
}

function buildWagebillPdf(dataset: PayrollOutputDataset) {
  const totals = buildDatasetTotals(dataset);
  const customEarnings = totals.earnings.rows.filter(
    (row) => !["801", "802", "806", "809", "813", "847", "899"].includes(row.code)
  );

  const rows = [
    { section: "Summary", item: "Officers Included", amount: String(totals.officersIncluded), notes: "Employee count in this run" },
    { section: "Summary", item: "Entries Processed", amount: asKes(totals.entriesProcessed), notes: "Payroll rows processed" },
    { section: "Earnings", item: "Total Earnings", amount: asKes(totals.earnings.totalAmount), notes: "All earnings combined" },
    { section: "Earnings", item: "Regular Payments", amount: asKes(totals.earnings.totalRegular), notes: "Normal recurring pay" },
    { section: "Earnings", item: "Arrears Payments", amount: asKes(totals.earnings.totalArrears), notes: "Back pay and arrears" },
    ...(customEarnings.length
      ? [
          {
            section: "Earnings",
            item: "Other Earnings Category",
            amount: asKes(sum(customEarnings.map((row) => row.totalAmount))),
            notes: "All custom or uncategorised earnings",
          },
        ]
      : []),
    { section: "Taxable Amount", item: "Total Taxable Amount", amount: asKes(totals.taxableAmount), notes: "Taxable earnings base" },
    { section: "Deductions", item: "Total Deductions", amount: asKes(totals.deductions.totalCombined), notes: "All deductions combined" },
    { section: "Deductions", item: "Deferred", amount: asKes(totals.deferred), notes: "Deferred deductions" },
    { section: "Deductions", item: "Effected", amount: asKes(totals.effected), notes: "Processed deductions" },
    { section: "Deductions", item: "Voucher Deductions", amount: asKes(totals.voucherDeductions), notes: "Voucher-linked deductions" },
    { section: "Deductions", item: "Voucher Remittals", amount: asKes(totals.voucherRemittals), notes: "Voucher remittals" },
    { section: "Deductions", item: "Net Voucher Advance", amount: asKes(totals.netVoucherAdvance), notes: "Voucher advance movement" },
    { section: "Net Pay", item: "Net Pay (Would Be)", amount: asKes(totals.netWouldBe), notes: "Before actual payout constraints" },
    { section: "Net Pay", item: "Net Pay (Actual)", amount: asKes(totals.netActual), notes: "Actual payroll payout" },
    { section: "Employer Obligations", item: "Pension Obligation (Employer)", amount: asKes(totals.pensionObligation), notes: "Employer pension cost" },
    { section: "Employer Obligations", item: "NSSF Dues", amount: asKes(totals.employerNssf), notes: "Employer NSSF cost" },
    { section: "Employer Obligations", item: "Pension Dues", amount: asKes(totals.employerPension), notes: "Employer pension remittance" },
    { section: "Employer Obligations", item: "NITA", amount: asKes(totals.nita), notes: "Training levy" },
    { section: "Employer Obligations", item: "Housing Levy", amount: asKes(totals.employerHousingLevy), notes: "Employer housing levy" },
    { section: "Final Wagebill", item: "Final Wagebill", amount: asKes(totals.wagebillTotal), notes: "Earnings + Pension + NITA + Housing Levy" },
  ];

  return buildGenericTabularReportPdf({
    organizationName: dataset.organizationName,
    organizationIdentifier: dataset.organizationIdentifier,
    organizationLogoMark: dataset.organizationLogoMark,
    organizationLogoJpeg: dataset.organizationLogoJpeg,
    platformLogoJpeg: dataset.platformLogoJpeg,
    organizationAddressLines: dataset.organizationAddressLines,
    title: "Wagebill Report",
    periodLine: `Wagebill for ${dataset.payrollMonthYearAlt} (${dataset.payrollDatedLabel})`,
    generatedAtLabel: dataset.generatedAtLabel,
    generatedBy: dataset.generatedBy,
    reportFooter: dataset.reportFooter,
    tableStyle: "clean",
    visualTheme: "soft-paper",
    footerLift: 22,
    isEmphasisRow: (row) => {
      const item = String(row.item ?? "");
      return item.toLowerCase().includes("total") || item.toLowerCase().includes("final wagebill");
    },
    columns: [
      { key: "section", label: "Section", widthRatio: 1.2 },
      { key: "item", label: "Item", widthRatio: 2.1 },
      { key: "amount", label: "Amount", widthRatio: 1.2, align: "right" },
      { key: "notes", label: "Explanation", widthRatio: 2.2 },
    ],
    rows,
  });
}

function buildEarningsDeductionsPdf(dataset: PayrollOutputDataset) {
  const earnings = buildEarningsSummary(dataset);
  const deductions = buildDeductionsSummary(dataset);
  const rows = [
    ...earnings.rows.map((row) => ({
      section: "Earnings",
      frequency: String(row.frequency),
      code: row.code,
      description: row.label,
      totalAmount: asKes(row.totalAmount),
      breakdown: `Regular ${asKes(row.regular)} | Arrears ${asKes(row.arrears)}`,
    })),
    {
      section: "Earnings",
      frequency: "",
      code: "",
      description: "TOTAL EARNINGS",
      totalAmount: asKes(earnings.totalAmount),
      breakdown: `Regular ${asKes(earnings.totalRegular)} | Arrears ${asKes(earnings.totalArrears)}`,
    },
    ...deductions.rows.map((row) => ({
      section: "Deductions",
      frequency: String(row.frequency),
      code: row.code,
      description: row.label,
      totalAmount: asKes(row.totalAmount),
      breakdown: `Deferred ${asKes(row.deferred)} | Voucher ${asKes(row.voucher)} | Combined ${asKes(row.combined)}`,
    })),
    {
      section: "Deductions",
      frequency: "",
      code: "",
      description: "TOTAL DEDUCTIONS",
      totalAmount: asKes(deductions.totalAmount),
      breakdown: `Deferred ${asKes(deductions.totalDeferred)} | Voucher ${asKes(deductions.totalVoucher)} | Combined ${asKes(deductions.totalCombined)}`,
    },
  ];

  return buildGenericTabularReportPdf({
    organizationName: dataset.organizationName,
    organizationIdentifier: dataset.organizationIdentifier,
    organizationLogoMark: dataset.organizationLogoMark,
    organizationLogoJpeg: dataset.organizationLogoJpeg,
    platformLogoJpeg: dataset.platformLogoJpeg,
    organizationAddressLines: dataset.organizationAddressLines,
    title: "Earnings & Deductions Analysis",
    periodLine: `Payroll analysis for ${dataset.payrollMonthYearAlt}`,
    generatedAtLabel: dataset.generatedAtLabel,
    generatedBy: dataset.generatedBy,
    reportFooter: dataset.reportFooter,
    tableStyle: "clean",
    visualTheme: "soft-paper",
    footerLift: 22,
    isEmphasisRow: (row) => String(row.description ?? "").toLowerCase().includes("total"),
    columns: [
      { key: "section", label: "Section", widthRatio: 1.1 },
      { key: "frequency", label: "Freq", widthRatio: 0.6, align: "center" },
      { key: "code", label: "Code", widthRatio: 0.7, align: "center" },
      { key: "description", label: "Description", widthRatio: 2.2 },
      { key: "totalAmount", label: "Total Amount", widthRatio: 1.2, align: "right" },
      { key: "breakdown", label: "Breakdown", widthRatio: 2.3 },
    ],
    rows,
  });
}

function buildMonthlyPostingPdf(dataset: PayrollOutputDataset) {
  const postingGroups = buildPostingGroups(dataset);
  const rows = postingGroups.flatMap((group) => {
    const groupRows = group.rows.map((row) => ({
      postingGroup: group.label,
      frequency: String(row.frequency),
      description: row.description,
      deductionAmount: asKes(row.deductionAmount),
      commission: asKes(row.commission),
      chequeAmount: asKes(row.chequeAmount),
    }));
    return [
      ...groupRows,
      {
        postingGroup: group.label,
        frequency: "",
        description: group.subtotalLabel,
        deductionAmount: asKes(sum(group.rows.map((row) => row.deductionAmount))),
        commission: asKes(sum(group.rows.map((row) => row.commission))),
        chequeAmount: asKes(sum(group.rows.map((row) => row.chequeAmount))),
      },
    ];
  });

  rows.push({
    postingGroup: "Grand Total",
    frequency: "",
    description: `Grand Total For ${dataset.organizationIdentifier ? `${dataset.organizationIdentifier} - ` : ""}${dataset.organizationName}`,
    deductionAmount: asKes(sum(postingGroups.flatMap((group) => group.rows.map((row) => row.deductionAmount)))),
    commission: asKes(sum(postingGroups.flatMap((group) => group.rows.map((row) => row.commission)))),
    chequeAmount: asKes(sum(postingGroups.flatMap((group) => group.rows.map((row) => row.chequeAmount)))),
  });

  return buildGenericTabularReportPdf({
    organizationName: dataset.organizationName,
    organizationIdentifier: dataset.organizationIdentifier,
    organizationLogoMark: dataset.organizationLogoMark,
    organizationLogoJpeg: dataset.organizationLogoJpeg,
    platformLogoJpeg: dataset.platformLogoJpeg,
    organizationAddressLines: dataset.organizationAddressLines,
    title: "Monthly Deduction Posting List",
    periodLine: `Deduction posting list for ${dataset.payrollMonthYearAlt}`,
    generatedAtLabel: dataset.generatedAtLabel,
    generatedBy: dataset.generatedBy,
    reportFooter: dataset.reportFooter,
    tableStyle: "clean",
    visualTheme: "soft-paper",
    footerLift: 22,
    isEmphasisRow: (row) => {
      const description = String(row.description ?? "").toLowerCase();
      const postingGroup = String(row.postingGroup ?? "").toLowerCase();
      return description.includes("total") || postingGroup.includes("grand total");
    },
    columns: [
      { key: "postingGroup", label: "Posting Group", widthRatio: 1.5 },
      { key: "frequency", label: "Freq", widthRatio: 0.6, align: "center" },
      { key: "description", label: "Description", widthRatio: 2.5 },
      { key: "deductionAmount", label: "Deduction Amount", widthRatio: 1.2, align: "right" },
      { key: "commission", label: "Commission", widthRatio: 1, align: "right" },
      { key: "chequeAmount", label: "Cheque Amount", widthRatio: 1.1, align: "right" },
    ],
    rows,
  });
}

function buildNetToBankWorkbook(dataset: PayrollOutputDataset) {
  const rows: Array<Array<XlsxCell | null>> = [
    [buildStringCell(`NET TO BANK FOR THE MONTH OF ${dataset.payrollMonthYearCsv}`, 5)],
    [
      buildStringCell("SNO", 2),
      buildStringCell("PayrollNum", 2),
      buildStringCell("Name", 2),
      buildStringCell("Phone", 2),
      buildStringCell("Bank", 2),
      buildStringCell("Branch", 2),
      buildStringCell("Branch Code", 2),
      buildStringCell("AccountNum", 2),
      buildStringCell("Total Month Pay", 2),
      buildStringCell("Gross Would Be", 2),
      buildStringCell("Net Would Be", 2),
      buildStringCell("Actual Gross", 2),
      buildStringCell("Actual Payable Amount", 2),
      buildStringCell("Reduction Reason", 2),
    ],
  ];

  dataset.rows.forEach((row, index) => {
    rows.push([
      buildNumberCell(index + 1),
      buildStringCell(row.employeeNumber),
      buildStringCell(row.fullName),
      buildStringCell(row.phone),
      buildStringCell(row.bankName),
      buildStringCell(row.bankBranch),
      buildStringCell(row.bankBranchCode),
      buildStringCell(row.bankAccount),
      buildCurrencyCell(row.totalMonthPay ?? row.grossPay),
      buildCurrencyCell(row.grossWouldBe ?? row.liveMonthlyGrossSalary ?? row.grossPay),
      buildCurrencyCell(row.netWouldBe ?? row.netPay),
      buildCurrencyCell(row.actualGross ?? row.grossPay),
      buildCurrencyCell(row.actualNet ?? row.netPay),
      buildStringCell(row.reductionReason || ""),
    ]);
  });

  return buildWorkbook([
    {
      name: "Sheet2 (2)",
      rows,
      merges: ["A1:N1"],
      widths: [8, 16, 28, 16, 22, 20, 16, 18, 18, 18, 18, 18, 18, 42],
    },
  ]);
}

function buildNetToMpesaWorkbook(dataset: PayrollOutputDataset) {
  const sortedRows = [...dataset.rows].sort((left, right) => {
    const departmentCompare = left.departmentName.localeCompare(right.departmentName);
    if (departmentCompare !== 0) {
      return departmentCompare;
    }

    return left.fullName.localeCompare(right.fullName);
  });

  const rows: Array<Array<XlsxCell | null>> = [
    [buildStringCell(`NET TO MPESA FOR THE MONTH OF ${dataset.payrollMonthYearCsv}`, 5)],
    [
      buildStringCell("SNO", 2),
      buildStringCell("Staff Number", 2),
      buildStringCell("Employee Name", 2),
      buildStringCell("Department", 2),
      buildStringCell("Phone", 2),
      buildStringCell("Payment Method", 2),
      buildStringCell("Account Number", 2),
      buildStringCell("Total Month Pay", 2),
      buildStringCell("Gross Would Be", 2),
      buildStringCell("Net Would Be", 2),
      buildStringCell("Actual Gross", 2),
      buildStringCell("Actual Payable Amount", 2),
      buildStringCell("Reduction Reason", 2),
    ],
  ];

  let currentDepartment = "";
  sortedRows.forEach((row, index) => {
    if (row.departmentName && row.departmentName !== currentDepartment) {
      currentDepartment = row.departmentName;
      rows.push([buildStringCell(currentDepartment.toUpperCase(), 3)]);
    }

    rows.push([
      buildNumberCell(index + 1),
      buildStringCell(row.employeeNumber),
      buildStringCell(row.fullName),
      buildStringCell(row.departmentName),
      buildStringCell(row.phone || row.bankAccount),
      buildStringCell("MPESA"),
      buildStringCell(row.phone || row.bankAccount),
      buildCurrencyCell(row.totalMonthPay ?? row.grossPay),
      buildCurrencyCell(row.grossWouldBe ?? row.liveMonthlyGrossSalary ?? row.grossPay),
      buildCurrencyCell(row.netWouldBe ?? row.netPay),
      buildCurrencyCell(row.actualGross ?? row.grossPay),
      buildCurrencyCell(row.actualNet ?? row.netPay),
      buildStringCell(row.reductionReason || ""),
    ]);
  });

  rows.push([
    buildStringCell("TOTAL", 2),
    null,
    null,
    null,
    null,
    null,
    buildCurrencyCell(sortedRows.reduce((total, row) => total + (row.totalMonthPay ?? row.grossPay), 0)),
    buildCurrencyCell(sortedRows.reduce((total, row) => total + (row.grossWouldBe ?? row.liveMonthlyGrossSalary ?? row.grossPay), 0)),
    buildCurrencyCell(sortedRows.reduce((total, row) => total + (row.netWouldBe ?? row.netPay), 0)),
    buildCurrencyCell(sortedRows.reduce((total, row) => total + (row.actualGross ?? row.grossPay), 0)),
    buildCurrencyCell(sortedRows.reduce((total, row) => total + (row.actualNet ?? row.netPay), 0)),
    null,
  ]);

  return buildWorkbook([
    {
      name: "Net to MPESA",
      rows,
      merges: ["A1:L1"],
      widths: [8, 16, 28, 20, 16, 14, 18, 18, 18, 18, 18, 42],
    },
  ]);
}

function buildPayeWorkbook(dataset: PayrollOutputDataset) {
  const rows: Array<Array<XlsxCell | null>> = [
    [
      buildStringCell("TAX PIN", 2),
      buildStringCell("NAMES", 2),
      buildStringCell("RESIDENT STATUS", 2),
      buildStringCell("TYPE OF EMPLOYEE", 2),
      buildStringCell("PWD", 2),
      null,
      buildStringCell("GROSS PAY", 2),
      buildStringCell("CAR BENEFIT", 2),
      buildStringCell("MEALS", 2),
      buildStringCell("NON CASH BENEFITS", 2),
      buildStringCell("TYPE OF HOUSE GIVEN", 2),
      buildStringCell("HOUSING BENEFITS", 2),
      buildStringCell("OTHER BENEFITS", 2),
      buildStringCell("TOTAL GROSS PAY", 2),
      buildStringCell("SHIF", 2),
      buildStringCell("NSSF", 2),
      buildStringCell("OTHER PENSION", 2),
      buildStringCell("POST RETIREMENT MEDICAL", 2),
      buildStringCell("MORTGAGE INTEREST", 2),
      buildStringCell("AHL", 2),
      buildStringCell("TAXABLE PAY", 2),
      buildStringCell("MONTHLY PERSONAL RELIEF", 2),
      buildStringCell("INSURANCE RELIEF", 2),
      buildStringCell("PAYE", 2),
      buildStringCell("SELF ASSESMENT PAYE", 2),
    ],
  ];

  dataset.rows.forEach((row) => {
    rows.push([
      buildStringCell(row.kraPin),
      buildStringCell(row.fullName.toUpperCase()),
      buildStringCell(row.residentStatus),
      buildStringCell(row.typeOfEmployee),
      buildStringCell(row.pwd),
      null,
      buildCurrencyCell(row.grossPay),
      buildCurrencyCell(row.carBenefit),
      buildCurrencyCell(row.meals),
      buildCurrencyCell(row.nonCashBenefits),
      buildStringCell(row.typeOfHouseGiven),
      buildCurrencyCell(row.housingBenefits),
      buildCurrencyCell(row.otherBenefits),
      buildCurrencyCell(row.totalGrossPay),
      buildCurrencyCell(row.shif),
      buildCurrencyCell(row.nssf),
      buildCurrencyCell(row.otherPension),
      buildCurrencyCell(row.postRetirementMedical),
      buildCurrencyCell(row.mortgageInterest),
      buildCurrencyCell(row.housingLevy),
      buildCurrencyCell(row.taxablePay),
      buildCurrencyCell(row.monthlyPersonalRelief),
      buildCurrencyCell(row.insuranceRelief),
      buildCurrencyCell(row.paye),
      buildCurrencyCell(row.selfAssessmentPaye),
    ]);
  });

  return buildWorkbook([
    {
      name: "Detailed Individual Payment Bre",
      rows,
      widths: [
        18, 34, 18, 20, 10, 4, 14, 14, 14, 18, 18, 16, 16, 16, 12, 12, 14, 18, 18, 12, 14,
        18, 16, 12, 18,
      ],
    },
  ]);
}

function buildNssfWorkbook(dataset: PayrollOutputDataset) {
  const rows: Array<Array<XlsxCell | null>> = [
    [
      buildStringCell("PAYROLL NUMBER", 2),
      buildStringCell("SURNAME", 2),
      buildStringCell("OTHER NAMES", 2),
      buildStringCell("ID NO", 2),
      buildStringCell("KRA PIN", 2),
      buildStringCell("NSSF NO", 2),
      buildStringCell("GROSS PAY", 2),
      buildStringCell("VOLUNTARY", 2),
    ],
  ];

  dataset.rows
    .filter((row) => row.nssf > 0 || row.voluntaryNssf > 0)
    .forEach((row) => {
      rows.push([
        buildStringCell(row.employeeNumber),
        buildStringCell(row.surname),
        buildStringCell(row.otherNames),
        buildStringCell(row.nationalId),
        buildStringCell(row.kraPin),
        buildStringCell(row.nssfNumber),
        buildCurrencyCell(row.grossPay),
        buildCurrencyCell(row.voluntaryNssf),
      ]);
    });

  return buildWorkbook([
    {
      name: "Sheet1",
      rows,
      widths: [18, 20, 28, 18, 18, 18, 14, 14],
    },
  ]);
}

function buildShifWorkbook(dataset: PayrollOutputDataset) {
  const mainRows: Array<Array<XlsxCell | null>> = [
    [
      buildStringCell("PAYROLL NUMBER", 2),
      buildStringCell("FIRSTNAME", 2),
      buildStringCell("LASTNAME", 2),
      buildStringCell("IDENTITY TYPE", 2),
      buildStringCell("ID NO", 2),
      buildStringCell("KRA PIN", 2),
      buildStringCell("SHIF NO", 2),
      buildStringCell("CONTRIBUTION AMOUNT", 2),
      buildStringCell("PHONE", 2),
    ],
  ];

  dataset.rows
    .filter((row) => row.shif > 0)
    .forEach((row) => {
      mainRows.push([
        buildStringCell(row.employeeNumber),
        buildStringCell(row.firstName),
        buildStringCell(row.lastName),
        buildStringCell(row.identityType),
        buildStringCell(row.nationalId),
        buildStringCell(row.kraPin),
        buildStringCell(row.shifNumber),
        buildCurrencyCell(row.shif),
        buildStringCell(row.phone),
      ]);
    });

  const lookupRows: Array<Array<XlsxCell | null>> = [
    [buildStringCell("IDENTITY TYPE", 2)],
    [buildStringCell("Refugee ID")],
    [buildStringCell("National ID")],
    [buildStringCell("Alien ID")],
    [buildStringCell("Passport Number")],
  ];

  return buildWorkbook([
    {
      name: "Sheet1",
      rows: mainRows,
      widths: [18, 18, 18, 18, 18, 18, 18, 18, 16],
    },
    {
      name: "Sheet2",
      rows: lookupRows,
      widths: [24],
    },
  ]);
}

function buildHelbCsv(dataset: PayrollOutputDataset) {
  return buildCsv([
    ["ID_NUMBER", "NAMES", "STAFF_NUMBER", "AMOUNT"],
    ...dataset.rows
      .filter((row) => row.helbAmount > 0)
      .map((row) => [
        row.nationalId,
        row.fullName,
        row.employeeNumber,
        roundAmount(row.helbAmount).toFixed(2),
      ]),
  ]);
}

function buildPayrollRegisterWorkbook(dataset: PayrollOutputDataset) {
  const rows: Array<Array<XlsxCell | null>> = [
    [buildStringCell(`PAYROLL REGISTER FOR ${dataset.payrollMonthYear.toUpperCase()}`, 5)],
    [
      buildStringCell("PAYROLL NUMBER", 2),
      buildStringCell("NAME", 2),
      buildStringCell("PHONE", 2),
      buildStringCell("DEPARTMENT", 2),
      buildStringCell("BRANCH", 2),
      buildStringCell("TOTAL MONTH PAY", 2),
      buildStringCell("GROSS WOULD BE", 2),
      buildStringCell("NET WOULD BE", 2),
      buildStringCell("ACTUAL GROSS", 2),
      buildStringCell("ACTUAL NET", 2),
      buildStringCell("TOTAL DEDUCTIONS", 2),
      buildStringCell("NET PAY", 2),
      buildStringCell("EMPLOYER COST", 2),
    ],
  ];

  dataset.rows.forEach((row) => {
    rows.push([
      buildStringCell(row.employeeNumber),
      buildStringCell(row.fullName),
      buildStringCell(row.phone),
      buildStringCell(row.departmentName),
      buildStringCell(row.branchName),
      buildCurrencyCell(row.totalMonthPay ?? row.grossPay),
      buildCurrencyCell(row.grossWouldBe ?? row.liveMonthlyGrossSalary ?? row.grossPay),
      buildCurrencyCell(row.netWouldBe ?? row.netPay),
      buildCurrencyCell(row.actualGross ?? row.grossPay),
      buildCurrencyCell(row.actualNet ?? row.netPay),
      buildCurrencyCell(row.totalDeductions),
      buildCurrencyCell(row.netPay),
      buildCurrencyCell(row.grossPay + row.employerNssf + row.employerPension + row.employerHousingLevy + row.nita),
    ]);
  });

  rows.push([
    buildStringCell("TOTAL", 1),
    null,
    null,
    null,
    buildCurrencyCell(sum(dataset.rows.map((row) => row.totalMonthPay ?? row.grossPay)), true),
    buildCurrencyCell(sum(dataset.rows.map((row) => row.grossWouldBe ?? row.liveMonthlyGrossSalary ?? row.grossPay)), true),
    buildCurrencyCell(sum(dataset.rows.map((row) => row.netWouldBe ?? row.netPay)), true),
    buildCurrencyCell(sum(dataset.rows.map((row) => row.actualGross ?? row.grossPay)), true),
    buildCurrencyCell(sum(dataset.rows.map((row) => row.actualNet ?? row.netPay)), true),
    buildCurrencyCell(sum(dataset.rows.map((row) => row.totalDeductions)), true),
    buildCurrencyCell(sum(dataset.rows.map((row) => row.netPay)), true),
    buildCurrencyCell(
      sum(
        dataset.rows.map(
          (row) => row.grossPay + row.employerNssf + row.employerPension + row.employerHousingLevy + row.nita
        )
      ),
      true
    ),
  ]);

  return buildWorkbook([
    {
      name: "Payroll Register",
      rows,
      merges: ["A1:M1"],
      widths: [18, 28, 16, 22, 20, 16, 16, 16, 16, 16, 18, 16, 18],
    },
  ]);
}

function buildHousingLevyWorkbook(dataset: PayrollOutputDataset) {
  const rows: Array<Array<XlsxCell | null>> = [
    [buildStringCell(`HOUSING LEVY FOR ${dataset.payrollMonthYear.toUpperCase()}`, 5)],
    [
      buildStringCell("PAYROLL NUMBER", 2),
      buildStringCell("NAME", 2),
      buildStringCell("ID NO", 2),
      buildStringCell("KRA PIN", 2),
      buildStringCell("GROSS PAY", 2),
      buildStringCell("EMPLOYEE AHL", 2),
      buildStringCell("EMPLOYER AHL", 2),
    ],
  ];

  dataset.rows
    .filter((row) => row.housingLevy > 0 || row.employerHousingLevy > 0)
    .forEach((row) => {
      rows.push([
        buildStringCell(row.employeeNumber),
        buildStringCell(row.fullName),
        buildStringCell(row.nationalId),
        buildStringCell(row.kraPin),
        buildCurrencyCell(row.grossPay),
        buildCurrencyCell(row.housingLevy),
        buildCurrencyCell(row.employerHousingLevy),
      ]);
    });

  return buildWorkbook([
    {
      name: "Housing Levy",
      rows,
      merges: ["A1:G1"],
      widths: [18, 28, 18, 18, 16, 16, 16],
    },
  ]);
}

function buildP9Workbook(dataset: PayrollOutputDataset) {
  const rows: Array<Array<XlsxCell | null>> = [
    [buildStringCell(`P9 READY DATA FOR ${dataset.payrollMonthYear.toUpperCase()}`, 5)],
    [
      buildStringCell("PAYROLL NUMBER", 2),
      buildStringCell("NAME", 2),
      buildStringCell("KRA PIN", 2),
      buildStringCell("GROSS PAY", 2),
      buildStringCell("TAXABLE PAY", 2),
      buildStringCell("PAYE", 2),
      buildStringCell("PERSONAL RELIEF", 2),
      buildStringCell("INSURANCE RELIEF", 2),
      buildStringCell("PENSION", 2),
      buildStringCell("MORTGAGE RELIEF", 2),
    ],
  ];

  dataset.rows.forEach((row) => {
    rows.push([
      buildStringCell(row.employeeNumber),
      buildStringCell(row.fullName),
      buildStringCell(row.kraPin),
      buildCurrencyCell(row.grossPay),
      buildCurrencyCell(row.taxablePay),
      buildCurrencyCell(row.paye),
      buildCurrencyCell(row.monthlyPersonalRelief),
      buildCurrencyCell(row.insuranceRelief),
      buildCurrencyCell(row.otherPension),
      buildCurrencyCell(row.mortgageInterest),
    ]);
  });

  return buildWorkbook([
    {
      name: "P9 Data",
      rows,
      merges: ["A1:J1"],
      widths: [18, 28, 18, 16, 16, 16, 18, 18, 16, 18],
    },
  ]);
}

export function buildSupplementaryPayrollOutput(
  exportType: SupplementaryPayrollOutputType,
  dataset: PayrollOutputDataset
): PayrollOutputFile {
  switch (exportType) {
    case "payroll_register":
      return {
        fileName: `payroll-register-${slugify(dataset.payrollPeriodLabel)}.xlsx`,
        body: buildPayrollRegisterWorkbook(dataset),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        previewable: false,
      };
    case "housing_levy_report":
      return {
        fileName: `housing-levy-${slugify(dataset.payrollPeriodLabel)}.xlsx`,
        body: buildHousingLevyWorkbook(dataset),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        previewable: false,
      };
    case "p9_forms":
      return {
        fileName: `p9-ready-data-${slugify(dataset.payrollPeriodLabel)}.xlsx`,
        body: buildP9Workbook(dataset),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        previewable: false,
      };
  }
}

function estimatePdfTextWidth(
  text: string,
  size: number,
  font: "F1" | "F2" | "F3" | "F4"
) {
  const widthFactor =
    font === "F3" || font === "F4"
      ? 0.58
      : font === "F2"
        ? 0.56
        : 0.52;
  return text.length * size * widthFactor;
}

function estimateCharsForPdfWidth(
  width: number,
  size: number,
  font: "F1" | "F2" | "F3" | "F4"
) {
  return Math.max(8, Math.floor(width / Math.max(1, estimatePdfTextWidth("M", size, font))));
}

function clonePdfJpegImage(image: PdfEmbeddedImage | null): PdfEmbeddedImage | null {
  if (!image) {
    return null;
  }

  return {
    data: image.data,
    width: image.width,
    height: image.height,
    x: image.x,
    y: image.y,
    displayWidth: image.displayWidth,
    displayHeight: image.displayHeight,
    filter: image.filter,
  };
}

function buildPayslipPages(dataset: PayslipPdfDataset) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 40;
  const topMargin = 26;
  const bottomMargin = 24;
  const contentWidth = pageWidth - marginX * 2;
  const footerHeight = 42;
  const centerX = pageWidth / 2;
  const addressLines = compactAddressLines(dataset.organizationAddressLines);
  const texts: PdfTextItem[] = [];
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const rects: NonNullable<PdfPage["rects"]> = [];
  const images: PdfEmbeddedImage[] = [];

  function addText(
    x: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    texts.push({
      x,
      y: pageHeight - topY,
      text,
      font: options?.font ?? "F1",
      size: options?.size ?? 10,
    });
  }

  function addCenteredText(
    center: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    const font = options?.font ?? "F1";
    const size = options?.size ?? 10;
    addText(center - estimatePdfTextWidth(text, size, font) / 2, topY, text, { font, size });
  }

  function addWrappedText(
    x: number,
    topY: number,
    text: string,
    maxChars: number,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number; lineHeight?: number }
  ) {
    const renderedLines = wrapPdfText(text || "-", maxChars);
    const size = options?.size ?? 10;
    const lineHeight = options?.lineHeight ?? size + 2;
    renderedLines.forEach((line, index) => {
      addText(x, topY + index * lineHeight, line, { font: options?.font, size });
    });
    return renderedLines.length * lineHeight;
  }

  function addRightAlignedText(
    rightX: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    const font = options?.font ?? "F1";
    const size = options?.size ?? 10;
    addText(rightX - estimatePdfTextWidth(text, size, font), topY, text, { font, size });
  }

  function addLine(x1: number, topY1: number, x2: number, topY2: number) {
    lines.push({
      x1,
      y1: pageHeight - topY1,
      x2,
      y2: pageHeight - topY2,
    });
  }

  function addRect(
    x: number,
    topY: number,
    width: number,
    height: number,
    options?: { fill?: string; stroke?: string; lineWidth?: number }
  ) {
    rects.push({
      x,
      y: pageHeight - topY - height,
      width,
      height,
      fill: options?.fill,
      stroke: options?.stroke,
      lineWidth: options?.lineWidth,
    });
  }

  const rightX = pageWidth - marginX;
  appendPdfHeader(texts, rects, images, {
    pageWidth,
    pageHeight,
    centerX,
    marginX,
    topY: topMargin,
    headerHeight: 140,
    organizationLogoMark: dataset.organizationLogoMark,
    organizationLogoJpeg: dataset.organizationLogoJpeg,
    platformLogoJpeg: dataset.platformLogoJpeg,
    organizationNameLines: [dataset.organizationName.toUpperCase()],
    addressLines,
    titleLines: ["PAYSLIP"],
    periodLine: dataset.payrollMonthShort.replace("-", " "),
    organizationIdentifier: dataset.organizationIdentifier,
  });

  const infoTop = topMargin + 154;
  addRect(marginX, infoTop, contentWidth, 88, { fill: "1 1 1", stroke: PDF_BRAND_BORDER, lineWidth: 0.8 });
  addText(marginX + 12, infoTop + 16, "Employee Information", { font: "F2", size: 10.8 });

  const labelFont: "F1" = "F1";
  const valueFont: "F2" = "F2";
  const leftLabelX = marginX + 12;
  const leftValueX = marginX + 88;
  const rightLabelX = marginX + 270;
  const rightValueX = marginX + 350;

  const detailRows = [
    ["Name", dataset.employee.fullName, "Staff No", dataset.employee.employeeNumber],
    ["Department", dataset.employee.departmentName || "-", "Designation", dataset.employee.designation || dataset.employee.jobGrade || "-"],
    ["ID Number", dataset.employee.nationalId || "-", "NSSF", dataset.employee.nssfNumber || "-"],
    ["SHIF", dataset.employee.shifNumber || "-", "KRA PIN", dataset.employee.kraPin || "-"],
    ["Bank", dataset.employee.bankName || "-", "Account", dataset.employee.bankAccount || "-"],
  ] as const;

  let detailY = infoTop + 32;
  const leftValueChars = estimateCharsForPdfWidth(150, 8.8, "F2");
  const rightValueChars = estimateCharsForPdfWidth(140, 8.8, "F2");
  detailRows.forEach(([leftLabel, leftValue, rightLabel, rightValue]) => {
    addText(leftLabelX, detailY, leftLabel, { font: labelFont, size: 8.1 });
    addText(rightLabelX, detailY, rightLabel, { font: labelFont, size: 8.1 });
    const leftHeight = addWrappedText(leftValueX, detailY, leftValue, leftValueChars, {
      font: valueFont,
      size: 8.8,
      lineHeight: 10,
    });
    const rightHeight = addWrappedText(rightValueX, detailY, rightValue, rightValueChars, {
      font: valueFont,
      size: 8.8,
      lineHeight: 10,
    });
    detailY += Math.max(leftHeight, rightHeight) + 4;
  });

  let warningBottom = infoTop + 88;
  if (dataset.warnings?.length) {
    const warningTop = infoTop + 94;
    const warningText = dataset.warnings.join(" ");
    const warningChars = estimateCharsForPdfWidth(contentWidth - 84, 8.2, "F1");
    const warningLines = wrapPdfText(warningText, warningChars);
    const warningHeight = 14 + warningLines.length * 9;
    addRect(marginX, warningTop, contentWidth, warningHeight, {
      fill: "0.992 0.992 0.992",
      stroke: PDF_BRAND_BORDER,
      lineWidth: 0.7,
    });
    addText(marginX + 10, warningTop + 12, "Data note", { font: "F2", size: 8.5 });
    warningLines.forEach((line, index) => {
      addText(marginX + 60, warningTop + 12 + index * 9, line, { font: "F1", size: 8.1 });
    });
    warningBottom = warningTop + warningHeight;
  }

  const tableTop = warningBottom + 16;
  const gap = 14;
  const tableWidth = (contentWidth - gap) / 2;

  function drawCompactTable(
    x: number,
    y: number,
    title: string,
    rows: Array<{ code: string; label: string; amount: number }>,
    totalLabel: string,
    totalAmount: number
  ) {
    const codeWidth = 40;
    const amountWidth = 80;
    const descriptionWidth = tableWidth - codeWidth - amountWidth - 16;
    const codeChars = estimateCharsForPdfWidth(codeWidth - 8, 7.8, "F1");
    const descChars = estimateCharsForPdfWidth(descriptionWidth - 8, 7.9, "F1");

    addText(x, y, title.toUpperCase(), { font: "F2", size: 9.8 });
    addRect(x, y + 12, tableWidth, 18, { fill: "0.992 0.992 0.992", stroke: PDF_BRAND_BORDER, lineWidth: 0.7 });
    addText(x + 6, y + 24, "Code", { font: "F2", size: 7.5 });
    addText(x + codeWidth + 6, y + 24, "Description", { font: "F2", size: 7.5 });
    addRightAlignedText(x + tableWidth - 6, y + 24, "Amount", { font: "F2", size: 7.5 });

    let rowY = y + 30;
    const safeRows = rows.length ? rows : [{ code: "-", label: `No ${title.toLowerCase()} lines`, amount: 0 }];
    safeRows.forEach((row, index) => {
      const codeLines = wrapPdfText(row.code || "-", codeChars);
      const descLines = wrapPdfText(row.label || "-", descChars);
      const lineCount = Math.max(codeLines.length, descLines.length, 1);
      const rowHeight = Math.max(18, 6 + lineCount * 9);
      addRect(x, rowY, tableWidth, rowHeight, {
        fill: index % 2 === 0 ? "1 1 1" : "0.995 0.995 0.995",
        stroke: PDF_ROW_BORDER,
        lineWidth: 0.45,
      });
      codeLines.forEach((line, index) => {
        addText(x + 6, rowY + 10 + index * 9, line, { font: "F1", size: 7.7 });
      });
      descLines.forEach((line, index) => {
        addText(x + codeWidth + 6, rowY + 10 + index * 9, line, { font: "F1", size: 7.8 });
      });
      addRightAlignedText(x + tableWidth - 6, rowY + 10, asMoney(row.amount), { font: "F3", size: 7.9 });
      rowY += rowHeight;
    });

    addRect(x, rowY, tableWidth, 20, { fill: "0.992 0.992 0.992", stroke: PDF_BRAND_BORDER, lineWidth: 0.7 });
    addText(x + 6, rowY + 13, totalLabel, { font: "F2", size: 8.1 });
    addRightAlignedText(x + tableWidth - 6, rowY + 13, asMoney(totalAmount), { font: "F2", size: 8.2 });
    return rowY + 20;
  }

  const earningsBottom = drawCompactTable(marginX, tableTop, "Earnings", dataset.earnings, "TOTAL EARNINGS", dataset.summary.grossPay);
  const deductionsBottom = drawCompactTable(
    marginX + tableWidth + gap,
    tableTop,
    "Deductions",
    dataset.deductions,
    "TOTAL DEDUCTIONS",
    dataset.summary.totalDeductions
  );

  const contributionsTop = Math.max(earningsBottom, deductionsBottom) + 12;
  const contributionsWidth = tableWidth;
  const summaryWidth = contentWidth - contributionsWidth - 14;

  drawCompactTable(
    marginX,
    contributionsTop,
    "Employer Contributions",
    dataset.employerContributions,
    "TOTAL EMPLOYER COST",
    dataset.summary.employerCost - dataset.summary.netPay
  );

  const summaryX = marginX + contributionsWidth + 14;
  const summaryTop = contributionsTop;
  addText(summaryX, summaryTop, "SUMMARY", { font: "F2", size: 10 });
  addRect(summaryX, summaryTop + 12, summaryWidth, 102, { fill: "1 1 1", stroke: PDF_BRAND_BORDER, lineWidth: 0.8 });

  const summaryRows = [
    ["Gross Salary", asKes(dataset.summary.basicSalary)],
    ["Gross Pay", asKes(dataset.summary.grossPay)],
    ["Taxable Pay", asKes(dataset.summary.taxablePay)],
    ["Total Deductions", asKes(dataset.summary.totalDeductions)],
  ] as const;

  let summaryY = summaryTop + 28;
  summaryRows.forEach(([label, value]) => {
    addText(summaryX + 10, summaryY, label, { font: "F1", size: 8.8 });
    addRightAlignedText(summaryX + summaryWidth - 10, summaryY, value, { font: "F3", size: 8.8 });
    addLine(summaryX + 8, summaryY + 8, summaryX + summaryWidth - 8, summaryY + 8);
    summaryY += 20;
  });
  addRect(summaryX + 8, summaryTop + 90, summaryWidth - 16, 18, { fill: "0.988 0.988 0.988", stroke: PDF_BRAND_BORDER, lineWidth: 0.8 });
  addText(summaryX + 16, summaryTop + 102, "NET PAY", { font: "F2", size: 9.2 });
  addRightAlignedText(summaryX + summaryWidth - 16, summaryTop + 102, asKes(dataset.summary.netPay), { font: "F2", size: 10.2 });

  const footerTop = pageHeight - footerHeight - bottomMargin;
  addRect(marginX, footerTop + 6, contentWidth, 28, { fill: "0.996 0.996 0.996", stroke: PDF_BRAND_BORDER, lineWidth: 0.7 });
  addText(marginX + 10, footerTop + 18, "Confidential payroll document", { font: "F1", size: 8.1 });
  addText(marginX + 10, footerTop + 30, `Generated ${dataset.generatedAtLabel}`, { font: "F1", size: 8.1 });
  addRightAlignedText(rightX - 10, footerTop + 18, dataset.reportFooter || "Generated by Solva HR - www.solvahr.co.ke", { font: "F1", size: 8.1 });
  addRightAlignedText(rightX - 10, footerTop + 30, "Page 1 of 1", { font: "F1", size: 8.1 });

  return [
    {
      texts,
      lines,
      rects,
      images,
    },
  ];
}

export function buildPayslipPdf(dataset: PayslipPdfDataset) {
  return buildPdf(buildPayslipPages(dataset));
}

export function buildPayslipBundlePdf(datasets: PayslipPdfDataset[]) {
  const pages = datasets.flatMap((dataset) => buildPayslipPages(dataset));
  const totalPages = pages.length;

  pages.forEach((page, index) => {
    const existingIndex = page.texts.findIndex((item) => item.text.startsWith("Page "));
    const pageLabel = {
      x: 489,
      y: 24,
      font: "F1" as const,
      size: 8.4,
      text: `Page ${index + 1} of ${totalPages}`,
    };
    if (existingIndex >= 0) {
      page.texts[existingIndex] = pageLabel;
    } else {
      page.texts.push(pageLabel);
    }
  });

  return buildPdf(pages);
}

export type GenericReportPdfColumn = {
  key: string;
  label: string;
  widthRatio?: number;
  align?: "left" | "right" | "center";
};

export function buildGenericTabularReportPdf(input: {
  organizationName: string;
  organizationIdentifier?: string;
  organizationLogoMark: string;
  organizationLogoJpeg?: Uint8Array | null;
  platformLogoJpeg?: Uint8Array | null;
  organizationAddressLines?: string[];
  title: string;
  periodLine?: string;
  generatedAtLabel: string;
  generatedBy: string;
  reportFooter: string;
  columns: GenericReportPdfColumn[];
  rows: Array<Record<string, unknown>>;
  tableStyle?: "grid" | "clean";
  visualTheme?: "default" | "soft-paper";
  footerLift?: number;
  isEmphasisRow?: (row: Record<string, unknown>) => boolean;
}) {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 38;
  const topMargin = 26;
  const bottomMargin = 28;
  const headerHeight = 138;
  const footerHeight = 36;
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;
  const addressLines = compactAddressLines(input.organizationAddressLines);
  const pages: PdfPage[] = [];
  const totalRatio = input.columns.reduce((sum, column) => sum + (column.widthRatio ?? 1), 0) || 1;
  const columnWidths = input.columns.map((column) =>
    Number((((column.widthRatio ?? 1) / totalRatio) * (contentWidth - 2)).toFixed(2))
  );
  const isSoftPaperTheme = input.visualTheme === "soft-paper";
  const footerLift = input.footerLift ?? 0;

  let texts: PdfTextItem[] = [];
  let lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  let rects: NonNullable<PdfPage["rects"]> = [];
  let images: PdfEmbeddedImage[] = [];
  let currentTopY = topMargin + headerHeight + 24;

  function addText(
    x: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    texts.push({
      x,
      y: pageHeight - topY,
      text: normaliseReportText(text),
      font: options?.font ?? "F1",
      size: options?.size ?? 9.2,
    });
  }

  function addRightAlignedText(
    rightX: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    const font = options?.font ?? "F1";
    const size = options?.size ?? 9.2;
    addText(rightX - estimatePdfTextWidth(text, size, font), topY, text, { font, size });
  }

  function addCenteredText(
    center: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    const font = options?.font ?? "F1";
    const size = options?.size ?? 9.2;
    addText(center - estimatePdfTextWidth(text, size, font) / 2, topY, text, { font, size });
  }

  function addRect(
    x: number,
    topY: number,
    width: number,
    height: number,
    options?: { fill?: string; stroke?: string; lineWidth?: number }
  ) {
    rects.push({
      x,
      y: pageHeight - topY - height,
      width,
      height,
      fill: options?.fill,
      stroke: options?.stroke,
      lineWidth: options?.lineWidth,
    });
  }

  function addLine(x1: number, topY1: number, x2: number, topY2: number) {
    lines.push({
      x1,
      y1: pageHeight - topY1,
      x2,
      y2: pageHeight - topY2,
    });
  }

  function drawFooter(pageNumber: number) {
    const footerTop = pageHeight - footerHeight - bottomMargin - footerLift;
    addRect(marginX, footerTop, contentWidth, 24, {
      fill: isSoftPaperTheme ? PDF_REPORT_FOOTER_SOFT : "0.997 0.997 0.997",
      stroke: PDF_BRAND_BORDER,
      lineWidth: 0.6,
    });
    addText(marginX + 10, footerTop + 15, `Generated ${input.generatedAtLabel}`, { size: 8.1 });
    addCenteredText(centerX, footerTop + 15, input.reportFooter || "Generated by Solva HR - www.solvahr.co.ke", { size: 8.1 });
    addRightAlignedText(pageWidth - marginX - 10, footerTop + 15, `Page ${pageNumber}`, { size: 8.1 });
  }

  function drawTableHeader() {
    addRect(marginX, currentTopY, contentWidth, 18, {
      fill: isSoftPaperTheme ? PDF_REPORT_PANEL_SOFT : "0.992 0.992 0.992",
      ...(input.tableStyle === "clean"
        ? {}
        : {
            stroke: PDF_BRAND_BORDER,
            lineWidth: 0.7,
          }),
    });

    let cursorX = marginX + 6;
    input.columns.forEach((column, index) => {
      const width = columnWidths[index];
      const label = normaliseReportText(column.label);
      if (column.align === "right") {
        addRightAlignedText(cursorX + width - 6, currentTopY + 12, label, { font: "F2", size: 8.2 });
      } else if (column.align === "center") {
        addCenteredText(cursorX + width / 2, currentTopY + 12, label, { font: "F2", size: 8.2 });
      } else {
        addText(cursorX, currentTopY + 12, label, { font: "F2", size: 8.2 });
      }
      cursorX += width;
      if (input.tableStyle !== "clean" && index < input.columns.length - 1) {
        addLine(cursorX, currentTopY, cursorX, currentTopY + 18);
      }
    });
    addLine(marginX, currentTopY + 18, marginX + contentWidth, currentTopY + 18);
    currentTopY += 18;
  }

  function startPage() {
    texts = [];
    lines = [];
    rects = [];
    images = [];
    appendPdfHeader(texts, rects, images, {
      pageWidth,
      pageHeight,
      centerX,
      marginX,
      topY: topMargin,
      headerHeight,
      organizationLogoMark: input.organizationLogoMark,
      organizationLogoJpeg: input.organizationLogoJpeg,
      platformLogoJpeg: input.platformLogoJpeg,
      organizationNameLines: [input.organizationName.toUpperCase()],
      addressLines,
      titleLines: [input.title.toUpperCase()],
      periodLine: input.periodLine,
      organizationIdentifier: input.organizationIdentifier,
    });
    if (isSoftPaperTheme) {
      const paperTop = topMargin + headerHeight + 12;
      const footerTop = pageHeight - footerHeight - bottomMargin - footerLift;
      addRect(marginX, paperTop, contentWidth, footerTop - paperTop - 8, {
        fill: PDF_REPORT_PAPER_SOFT,
      });
    }
    currentTopY = topMargin + headerHeight + 24;
    drawTableHeader();
  }

  function pushCurrentPage() {
    drawFooter(pages.length + 1);
    pages.push({
      texts,
      lines,
      rects,
      images,
    });
  }

  function renderRow(row: Record<string, unknown>, rowIndex: number) {
    const lineHeight = 9;
    const cellLines = input.columns.map((column, index) => {
      const width = columnWidths[index];
      const rawValue = row[column.key];
      const text = rawValue == null ? "-" : String(rawValue);
      const chars = Math.max(6, estimateCharsForPdfWidth(width - 10, 7.9, "F1"));
      return wrapPdfText(normaliseReportText(text), chars);
    });
    const maxLines = Math.max(...cellLines.map((entry) => entry.length), 1);
    const rowHeight = Math.max(16, 7 + maxLines * lineHeight);
    const footerTop = pageHeight - footerHeight - bottomMargin - footerLift;
    const isEmphasisRow = input.isEmphasisRow?.(row) ?? false;

    if (currentTopY + rowHeight + 8 > footerTop) {
      pushCurrentPage();
      startPage();
    }

    addRect(marginX, currentTopY, contentWidth, rowHeight, input.tableStyle === "clean"
      ? {
          fill: isEmphasisRow
            ? (isSoftPaperTheme ? PDF_REPORT_PANEL_SOFT : "0.992 0.992 0.992")
            : rowIndex % 2 === 0
              ? (isSoftPaperTheme ? PDF_REPORT_ROW_SOFT : "1 1 1")
              : (isSoftPaperTheme ? PDF_REPORT_ROW_ALT_SOFT : "0.997 0.997 0.997"),
        }
      : {
          fill: isEmphasisRow
            ? (isSoftPaperTheme ? PDF_REPORT_PANEL_SOFT : "0.992 0.992 0.992")
            : rowIndex % 2 === 0
              ? (isSoftPaperTheme ? PDF_REPORT_ROW_SOFT : "1 1 1")
              : (isSoftPaperTheme ? PDF_REPORT_ROW_ALT_SOFT : "0.997 0.997 0.997"),
          stroke: PDF_ROW_BORDER,
          lineWidth: isEmphasisRow ? 0.65 : 0.45,
        });

    let cursorX = marginX + 6;
    input.columns.forEach((column, index) => {
      const width = columnWidths[index];
      const valueLines = cellLines[index];
      valueLines.forEach((line, lineIndex) => {
        const lineTop = currentTopY + 10 + lineIndex * lineHeight;
        const font = isEmphasisRow ? "F2" : "F1";
        if (column.align === "right") {
          addRightAlignedText(cursorX + width - 6, lineTop, line, { size: 7.9, font });
        } else if (column.align === "center") {
          addCenteredText(cursorX + width / 2, lineTop, line, { size: 7.9, font });
        } else {
          addText(cursorX, lineTop, line, { size: 7.9, font });
        }
      });
      cursorX += width;
      if (input.tableStyle !== "clean" && index < input.columns.length - 1) {
        addLine(cursorX, currentTopY, cursorX, currentTopY + rowHeight);
      }
    });
    if (input.tableStyle === "clean") {
      addLine(marginX, currentTopY + rowHeight, marginX + contentWidth, currentTopY + rowHeight);
    }

    currentTopY += rowHeight;
  }

  startPage();

  const rows = input.rows.length
    ? input.rows
    : [
        Object.fromEntries(
          input.columns.map((column, index) => [column.key, index === 0 ? "No rows available" : ""])
        ),
      ];

  rows.forEach((row, index) => renderRow(row, index));
  pushCurrentPage();

  return buildPdf(pages);
}

export type PerformanceAppraisalPdfDataset = {
  organizationName: string;
  organizationIdentifier: string;
  organizationLogoMark: string;
  organizationLogoJpeg?: Uint8Array | null;
  platformLogoJpeg?: Uint8Array | null;
  organizationAddressLines: string[];
  reportFooter: string;
  reportTitle: string;
  workflowMode?: "standard" | "robot_cafe_simple";
  appraisalPeriodLabel: string;
  generatedAtLabel: string;
  generatedBy: string;
  statusLabel: "PROVISIONAL" | "FINAL" | string;
  personalParticulars: {
    name: string;
    staffNumber: string;
    department: string;
    designation: string;
    termsOfService: string;
    supervisorName: string;
    appraisalPeriod: string;
  };
  departmentalObjectives: string[];
  performanceTargets: Array<{
    agreedTarget: string;
    performanceIndicator: string;
    targetValue: string;
    resultsAchieved: string;
    selfScore: number;
    supervisorScore: number;
    gmScore: number;
    finalScore: number;
  }>;
  workPlans: Array<{
    activity: string;
    expectedOutput: string;
    timeline: string;
    progress: string;
    comments: string;
  }>;
  scoreSummary: {
    totalScore: number;
    meanScore: number;
    ratingBand: string;
  };
  ratingScale: Array<{
    label: string;
    rangeLabel: string;
  }>;
  additionalAssignments: Array<{
    assignment: string;
    dateAssigned: string;
    assignedBy: string;
    endDate: string;
    progressStatus: string;
  }>;
  supervisorEvaluation: {
    score: number;
    comments: string;
    recommendation: string;
  };
  appraiseeEvaluation: {
    score: number;
    comments: string;
    discussionHeld: string;
    discussionHelped: string;
    supervisorContribution: string;
  };
  gmEvaluation: {
    score: number;
    comments: string;
    finalRating: string;
    finalDecision: string;
  };
  developmentNeeds: {
    training: string;
    supportRequired: string;
    timeline: string;
  };
  actions: {
    rewardRecommendation: string;
    pipRecommendation: string;
    promotionRecommendation: string;
    sanctionRecommendation: string;
    finalAction: string;
  };
  signatures: {
    appraisee: string;
    supervisor: string;
    gm: string;
    hr: string;
  };
  simpleWorkflow?: {
    employeeSelfReview: {
      whatWentWell: string;
      challenges: string;
      supportNeeded: string;
    };
    reviewAreas: Array<{
      title: string;
      performanceIndicator: string;
      expectedOutput: string;
      selfScore: number;
      supervisorScore: number;
      gmScore: number;
      finalScore: number;
      evaluatorComments: string;
    }>;
    supervisorReview: {
      strengths: string;
      improvements: string;
      recommendation: string;
    };
    gmReview: {
      managementRemark: string;
      finalOutcome: string;
      nextAction: string;
    };
    acknowledgementText: string;
    signatories: {
      appraisee: {
        name: string;
        title: string;
        initials: string;
        signedAt: string;
      };
      supervisor: {
        name: string;
        title: string;
        initials: string;
        signedAt: string;
      };
      gm: {
        name: string;
        title: string;
        initials: string;
        signedAt: string;
      };
    };
  };
};

export type PerformanceAppraisalPdfFile = {
  fileName: string;
  body: Uint8Array;
  contentType: string;
  previewable: true;
};

export function buildPerformanceAppraisalReportPdf(
  dataset: PerformanceAppraisalPdfDataset
): PerformanceAppraisalPdfFile {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 38;
  const topMargin = 24;
  const bottomMargin = 24;
  const headerHeight = 144;
  const footerHeight = 32;
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;
  const addressLines = compactAddressLines(dataset.organizationAddressLines);
  const pages: PdfPage[] = [];

  let texts: PdfTextItem[] = [];
  let rects: NonNullable<PdfPage["rects"]> = [];
  let lines: NonNullable<PdfPage["lines"]> = [];
  let images: PdfEmbeddedImage[] = [];
  let currentTopY = topMargin + headerHeight + 18;

  function addText(
    x: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    texts.push({
      x,
      y: pageHeight - topY,
      text: normaliseReportText(text),
      font: options?.font ?? "F1",
      size: options?.size ?? 8.9,
    });
  }

  function addCenteredText(
    center: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    const font = options?.font ?? "F1";
    const size = options?.size ?? 8.9;
    addText(center - estimatePdfTextWidth(text, size, font) / 2, topY, text, { font, size });
  }

  function addRightAlignedText(
    rightX: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    const font = options?.font ?? "F1";
    const size = options?.size ?? 8.9;
    addText(rightX - estimatePdfTextWidth(text, size, font), topY, text, { font, size });
  }

  function addRect(
    x: number,
    topY: number,
    width: number,
    height: number,
    options?: { fill?: string; stroke?: string; lineWidth?: number }
  ) {
    rects.push({
      x,
      y: pageHeight - topY - height,
      width,
      height,
      fill: options?.fill,
      stroke: options?.stroke,
      lineWidth: options?.lineWidth,
    });
  }

  function addLine(x1: number, topY1: number, x2: number, topY2: number) {
    lines.push({
      x1,
      y1: pageHeight - topY1,
      x2,
      y2: pageHeight - topY2,
    });
  }

  function ensureSpace(height: number) {
    if (currentTopY + height <= pageHeight - bottomMargin - footerHeight - 8) {
      return;
    }
    pushPage();
    startPage();
  }

  function drawFooter(pageNumber: number) {
    const footerTop = pageHeight - footerHeight - bottomMargin;
    addRect(marginX, footerTop, contentWidth, 22, {
      fill: "0.997 0.997 0.997",
      stroke: PDF_BRAND_BORDER,
      lineWidth: 0.6,
    });
    addText(marginX + 10, footerTop + 14, `Generated ${dataset.generatedAtLabel}`, { size: 8 });
    addCenteredText(centerX, footerTop + 14, dataset.reportFooter || "Generated by Solva HR", { size: 8 });
    addRightAlignedText(pageWidth - marginX - 10, footerTop + 14, `Page ${pageNumber}`, { size: 8 });
  }

  function startPage() {
    texts = [];
    rects = [];
    lines = [];
    images = [];
    appendPdfHeader(texts, rects, images, {
      pageWidth,
      pageHeight,
      centerX,
      marginX,
      topY: topMargin,
      headerHeight,
      organizationLogoMark: dataset.organizationLogoMark,
      organizationLogoJpeg: dataset.organizationLogoJpeg,
      platformLogoJpeg: dataset.platformLogoJpeg,
      organizationNameLines: [dataset.organizationName.toUpperCase()],
      addressLines,
      titleLines: [dataset.reportTitle.toUpperCase()],
      periodLine: dataset.appraisalPeriodLabel,
      organizationIdentifier: dataset.organizationIdentifier,
    });
    addRect(centerX - 48, topMargin + headerHeight - 28, 96, 16, {
      fill: "0.992 0.992 0.992",
      stroke: PDF_BRAND_BORDER,
      lineWidth: 0.6,
    });
    addCenteredText(centerX, topMargin + headerHeight - 17, dataset.statusLabel, { font: "F2", size: 8.2 });
    currentTopY = topMargin + headerHeight + 18;
  }

  function pushPage() {
    drawFooter(pages.length + 1);
    pages.push({
      texts,
      rects,
      lines,
      images,
    });
  }

  function sectionTitle(title: string) {
    ensureSpace(24);
    addText(marginX, currentTopY + 10, title.toUpperCase(), { font: "F2", size: 10 });
    addLine(marginX, currentTopY + 14, pageWidth - marginX, currentTopY + 14);
    currentTopY += 20;
  }

  function keyValueRows(rows: Array<[string, string, string, string]>) {
    const leftLabelX = marginX + 8;
    const leftValueX = marginX + 108;
    const rightLabelX = marginX + 286;
    const rightValueX = marginX + 382;
    const leftValueChars = Math.max(14, estimateCharsForPdfWidth(rightLabelX - leftValueX - 10, 8.4, "F2"));
    const rightValueChars = Math.max(14, estimateCharsForPdfWidth(pageWidth - marginX - rightValueX - 8, 8.4, "F2"));
    const leftLabelChars = Math.max(10, estimateCharsForPdfWidth(leftValueX - leftLabelX - 8, 8, "F1"));
    const rightLabelChars = Math.max(10, estimateCharsForPdfWidth(rightValueX - rightLabelX - 8, 8, "F1"));

    rows.forEach(([leftLabel, leftValue, rightLabel, rightValue]) => {
      const leftLabelLines = wrapPdfText(leftLabel || "-", leftLabelChars);
      const leftValueLines = wrapPdfText(leftValue || "-", leftValueChars);
      const rightLabelLines = wrapPdfText(rightLabel || "-", rightLabelChars);
      const rightValueLines = wrapPdfText(rightValue || "-", rightValueChars);
      const lineHeight = 9;
      const maxLines = Math.max(
        leftLabelLines.length,
        leftValueLines.length,
        rightLabelLines.length,
        rightValueLines.length,
        1
      );
      const rowHeight = Math.max(18, 7 + maxLines * lineHeight);

      ensureSpace(rowHeight + 2);
      addRect(marginX, currentTopY, contentWidth, rowHeight, {
        fill: "1 1 1",
        stroke: PDF_ROW_BORDER,
        lineWidth: 0.45,
      });

      leftLabelLines.forEach((line, index) => {
        addText(leftLabelX, currentTopY + 10 + index * lineHeight, line, { font: "F1", size: 8.1 });
      });
      leftValueLines.forEach((line, index) => {
        addText(leftValueX, currentTopY + 10 + index * lineHeight, line, { font: "F2", size: 8.6 });
      });
      rightLabelLines.forEach((line, index) => {
        addText(rightLabelX, currentTopY + 10 + index * lineHeight, line, { font: "F1", size: 8.1 });
      });
      rightValueLines.forEach((line, index) => {
        addText(rightValueX, currentTopY + 10 + index * lineHeight, line, { font: "F2", size: 8.6 });
      });

      addLine(leftValueX - 8, currentTopY, leftValueX - 8, currentTopY + rowHeight);
      addLine(rightLabelX - 10, currentTopY, rightLabelX - 10, currentTopY + rowHeight);
      addLine(rightValueX - 8, currentTopY, rightValueX - 8, currentTopY + rowHeight);
      currentTopY += rowHeight;
    });
  }

  function bulletLines(linesInput: string[]) {
    if (!linesInput.length) {
      ensureSpace(16);
      addText(marginX + 10, currentTopY + 11, "No data yet.", { size: 8.5 });
      currentTopY += 16;
      return;
    }
    linesInput.forEach((line) => {
      const wrapped = wrapPdfText(line, 105);
      ensureSpace(12 + wrapped.length * 9);
      wrapped.forEach((entry, index) => {
        addText(marginX + 8 + (index === 0 ? 0 : 10), currentTopY + 11 + index * 9, index === 0 ? `- ${entry}` : entry, {
          size: 8.3,
        });
      });
      currentTopY += wrapped.length * 9 + 6;
    });
  }

  function drawTable(columns: GenericReportPdfColumn[], rows: Array<Record<string, unknown>>) {
    const totalRatio = columns.reduce((sum, column) => sum + (column.widthRatio ?? 1), 0) || 1;
    const columnWidths = columns.map((column) =>
      Number((((column.widthRatio ?? 1) / totalRatio) * (contentWidth - 2)).toFixed(2))
    );

    ensureSpace(20);
    addRect(marginX, currentTopY, contentWidth, 18, {
      fill: "0.992 0.992 0.992",
      stroke: PDF_BRAND_BORDER,
      lineWidth: 0.7,
    });
    let cursorX = marginX + 6;
    columns.forEach((column, index) => {
      const width = columnWidths[index];
      if (column.align === "right") {
        addRightAlignedText(cursorX + width - 6, currentTopY + 12, column.label, { font: "F2", size: 8.1 });
      } else if (column.align === "center") {
        addCenteredText(cursorX + width / 2, currentTopY + 12, column.label, { font: "F2", size: 8.1 });
      } else {
        addText(cursorX, currentTopY + 12, column.label, { font: "F2", size: 8.1 });
      }
      cursorX += width;
      if (index < columns.length - 1) {
        addLine(cursorX, currentTopY, cursorX, currentTopY + 18);
      }
    });
    currentTopY += 18;

    const safeRows = rows.length
      ? rows
      : [Object.fromEntries(columns.map((column, index) => [column.key, index === 0 ? "No data yet" : ""]))];

    safeRows.forEach((row, rowIndex) => {
      const lineHeight = 9;
      const cellLines = columns.map((column, index) => {
        const width = columnWidths[index];
        const rawValue = row[column.key];
        const text = rawValue == null ? "-" : String(rawValue);
        const chars = Math.max(6, estimateCharsForPdfWidth(width - 10, 7.8, "F1"));
        return wrapPdfText(normaliseReportText(text), chars);
      });
      const maxLines = Math.max(...cellLines.map((entry) => entry.length), 1);
      const rowHeight = Math.max(18, 6 + maxLines * lineHeight);
      ensureSpace(rowHeight);
      addRect(marginX, currentTopY, contentWidth, rowHeight, {
        fill: rowIndex % 2 === 0 ? "1 1 1" : "0.997 0.997 0.997",
        stroke: PDF_ROW_BORDER,
        lineWidth: 0.45,
      });
      let rowCursorX = marginX + 6;
      columns.forEach((column, index) => {
        const width = columnWidths[index];
        const linesForCell = cellLines[index];
        linesForCell.forEach((line, lineIndex) => {
          const lineTop = currentTopY + 10 + lineIndex * lineHeight;
          if (column.align === "right") {
            addRightAlignedText(rowCursorX + width - 6, lineTop, line, { size: 7.8 });
          } else if (column.align === "center") {
            addCenteredText(rowCursorX + width / 2, lineTop, line, { size: 7.8 });
          } else {
            addText(rowCursorX, lineTop, line, { size: 7.8 });
          }
        });
        rowCursorX += width;
        if (index < columns.length - 1) {
          addLine(rowCursorX, currentTopY, rowCursorX, currentTopY + rowHeight);
        }
      });
      currentTopY += rowHeight;
    });
    currentTopY += 10;
  }

  function drawSimpleTextBlock(title: string, text: string, chars = 108) {
    ensureSpace(24);
    addText(marginX, currentTopY + 10, title.toUpperCase(), { font: "F2", size: 9.5 });
    addLine(marginX, currentTopY + 14, pageWidth - marginX, currentTopY + 14);
    currentTopY += 18;
    const wrapped = wrapPdfText(text || "-", chars);
    wrapped.forEach((line) => {
      ensureSpace(11);
      addText(marginX + 8, currentTopY + 9, line, { size: 8.5 });
      currentTopY += 9;
    });
    currentTopY += 6;
  }

  function drawSignatureCards(
    cards: Array<{ label: string; initials: string; name: string; title: string; signedAt: string }>
  ) {
    const gap = 12;
    const cardWidth = (contentWidth - gap * 2) / 3;
    const cardHeight = 78;
    ensureSpace(cardHeight + 10);
    cards.forEach((card, index) => {
      const x = marginX + index * (cardWidth + gap);
      addRect(x, currentTopY, cardWidth, cardHeight, {
        fill: "1 1 1",
        stroke: PDF_BRAND_BORDER,
        lineWidth: 0.65,
      });
      addText(x + 8, currentTopY + 12, card.label.toUpperCase(), { font: "F2", size: 7.9 });
      addText(x + 8, currentTopY + 34, card.initials, { font: "F4", size: 18 });
      addText(x + 8, currentTopY + 50, card.name || "-", { font: "F2", size: 8.4 });
      addText(x + 8, currentTopY + 61, card.title || "-", { size: 8 });
      addText(x + 8, currentTopY + 71, `Date: ${card.signedAt || "-"}`, { size: 7.8 });
    });
    currentTopY += cardHeight + 10;
  }

  function formatSimpleScore(score: number) {
    const normalized = Number.isFinite(score) ? Math.round(score) : 0;
    const label =
      normalized >= 5
        ? "Excellent"
        : normalized >= 4
          ? "Very Good"
          : normalized >= 3
            ? "Good"
            : normalized >= 2
              ? "Fair"
              : normalized >= 1
                ? "Needs Improvement"
                : "Pending";
    return normalized > 0 ? `${normalized}/5 (${label})` : label;
  }

  startPage();

  if (dataset.workflowMode === "robot_cafe_simple" && dataset.simpleWorkflow) {
    const employeeSelfReview = dataset.simpleWorkflow.employeeSelfReview;
    const supervisorReview = dataset.simpleWorkflow.supervisorReview;
    const gmReview = dataset.simpleWorkflow.gmReview;

    sectionTitle("Employee Details");
    keyValueRows([
      ["Name", dataset.personalParticulars.name, "Staff Number", dataset.personalParticulars.staffNumber],
      ["Department", dataset.personalParticulars.department, "Designation", dataset.personalParticulars.designation],
      ["Terms of Service", dataset.personalParticulars.termsOfService, "Supervisor", dataset.personalParticulars.supervisorName],
      ["Appraisal Period", dataset.personalParticulars.appraisalPeriod, "Status", dataset.statusLabel],
    ]);

    sectionTitle("Employee Self-Review");
    drawSimpleTextBlock("What went well during this period?", employeeSelfReview.whatWentWell);
    drawSimpleTextBlock("What challenges did you face?", employeeSelfReview.challenges);
    drawSimpleTextBlock("What support or training would help you perform better?", employeeSelfReview.supportNeeded);

    sectionTitle("Supervisor Review");
    drawTable(
      [
        { key: "title", label: "Area", widthRatio: 1.3 },
        { key: "performanceIndicator", label: "Focus", widthRatio: 1.5 },
        { key: "expectedOutput", label: "Expected Standard", widthRatio: 2.2 },
        { key: "selfScore", label: "Self", widthRatio: 0.8 },
        { key: "supervisorScore", label: "Supervisor", widthRatio: 0.95 },
        { key: "gmScore", label: "GM", widthRatio: 0.75 },
        { key: "finalScore", label: "Final", widthRatio: 0.85 },
      ],
      dataset.simpleWorkflow.reviewAreas.map((area) => ({
        title: area.title,
        performanceIndicator: area.performanceIndicator,
        expectedOutput: area.expectedOutput,
        selfScore: formatSimpleScore(area.selfScore),
        supervisorScore: formatSimpleScore(area.supervisorScore),
        gmScore: formatSimpleScore(area.gmScore),
        finalScore: formatSimpleScore(area.finalScore),
      }))
    );

    drawSimpleTextBlock("Supervisor strengths observed", supervisorReview.strengths);
    drawSimpleTextBlock("Areas to improve", supervisorReview.improvements);
    drawSimpleTextBlock("Supervisor recommendation", supervisorReview.recommendation);

    sectionTitle("Score Summary");
    keyValueRows([
      [
        "Employee Share",
        `${dataset.appraiseeEvaluation.score.toFixed(2)}/33`,
        "Supervisor Share",
        `${dataset.supervisorEvaluation.score.toFixed(2)}/33`,
      ],
      [
        "GM Share",
        `${dataset.gmEvaluation.score.toFixed(2)}/33`,
        "Total",
        `${dataset.scoreSummary.totalScore.toFixed(2)}/99`,
      ],
    ]);

    sectionTitle("General Manager Final Review");
    drawSimpleTextBlock("Management remark", gmReview.managementRemark);
    keyValueRows([
      ["Final Outcome", gmReview.finalOutcome || "-", "Next Action", gmReview.nextAction || "-"],
    ]);

    sectionTitle("Employee Acknowledgement");
    drawSimpleTextBlock("Acknowledgement", dataset.simpleWorkflow.acknowledgementText, 112);

    sectionTitle("Auto-Generated Sign-Off");
    drawSignatureCards([
      {
        label: "Employee acknowledgement",
        initials: dataset.simpleWorkflow.signatories.appraisee.initials,
        name: dataset.simpleWorkflow.signatories.appraisee.name,
        title: dataset.simpleWorkflow.signatories.appraisee.title,
        signedAt: dataset.simpleWorkflow.signatories.appraisee.signedAt,
      },
      {
        label: "Supervisor sign-off",
        initials: dataset.simpleWorkflow.signatories.supervisor.initials,
        name: dataset.simpleWorkflow.signatories.supervisor.name,
        title: dataset.simpleWorkflow.signatories.supervisor.title,
        signedAt: dataset.simpleWorkflow.signatories.supervisor.signedAt,
      },
      {
        label: "GM sign-off",
        initials: dataset.simpleWorkflow.signatories.gm.initials,
        name: dataset.simpleWorkflow.signatories.gm.name,
        title: dataset.simpleWorkflow.signatories.gm.title,
        signedAt: dataset.simpleWorkflow.signatories.gm.signedAt,
      },
    ]);

    pushPage();

    const fileName = `performance-appraisal-${slugify(dataset.personalParticulars.staffNumber || dataset.personalParticulars.name)}-${slugify(dataset.appraisalPeriodLabel)}.pdf`;
    return {
      fileName,
      body: buildPdf(pages),
      contentType: "application/pdf",
      previewable: true,
    };
  }

  sectionTitle("Section 1: Personal Particulars");
  keyValueRows([
    ["Name", dataset.personalParticulars.name, "Staff Number", dataset.personalParticulars.staffNumber],
    ["Department", dataset.personalParticulars.department, "Designation", dataset.personalParticulars.designation],
    ["Terms of Service", dataset.personalParticulars.termsOfService, "Supervisor", dataset.personalParticulars.supervisorName],
    ["Appraisal Period", dataset.personalParticulars.appraisalPeriod, "", ""],
  ]);

  sectionTitle("Section 2: Departmental Objectives");
  bulletLines(dataset.departmentalObjectives);

  sectionTitle("Section 3: Individual Performance Targets");
  drawTable(
    [
      { key: "agreedTarget", label: "Agreed Performance Target", widthRatio: 2.3 },
      { key: "performanceIndicator", label: "Performance Indicator", widthRatio: 1.5 },
      { key: "targetValue", label: "Target", widthRatio: 1, align: "right" },
      { key: "resultsAchieved", label: "Result", widthRatio: 1, align: "right" },
      { key: "selfScore", label: "Self", widthRatio: 0.8, align: "right" },
      { key: "supervisorScore", label: "Supervisor", widthRatio: 0.95, align: "right" },
      { key: "gmScore", label: "GM", widthRatio: 0.75, align: "right" },
      { key: "finalScore", label: "Final", widthRatio: 0.8, align: "right" },
    ],
    dataset.performanceTargets
  );

  sectionTitle("Section 4: Quarterly Activities / Work Plan");
  drawTable(
    [
      { key: "activity", label: "Activity", widthRatio: 2.1 },
      { key: "expectedOutput", label: "Expected Output", widthRatio: 1.7 },
      { key: "timeline", label: "Timeline", widthRatio: 1.1 },
      { key: "progress", label: "Progress", widthRatio: 0.8, align: "right" },
      { key: "comments", label: "Comments", widthRatio: 1.6 },
    ],
    dataset.workPlans
  );

  sectionTitle("Section 5: Appraisal Score Summary");
  keyValueRows([
    ["Total Score", dataset.scoreSummary.totalScore.toFixed(2), "Mean Score / Appraisal Score (%)", dataset.scoreSummary.meanScore.toFixed(2)],
    ["Rating Band", dataset.scoreSummary.ratingBand, "", ""],
  ]);

  sectionTitle("Section 6: Rating Scale");
  drawTable(
    [
      { key: "label", label: "Rating" },
      { key: "rangeLabel", label: "Achievement Range" },
    ],
    dataset.ratingScale
  );

  sectionTitle("Section 7: Additional Assignments");
  drawTable(
    [
      { key: "assignment", label: "Assignment", widthRatio: 2.4 },
      { key: "dateAssigned", label: "Date Assigned", widthRatio: 1 },
      { key: "assignedBy", label: "Assigned By", widthRatio: 1.5 },
      { key: "endDate", label: "End Date", widthRatio: 1 },
      { key: "progressStatus", label: "Progress Status", widthRatio: 1.1 },
    ],
    dataset.additionalAssignments
  );

  sectionTitle("Section 8: Supervisor Evaluation");
  keyValueRows([
    ["Supervisor Score", dataset.supervisorEvaluation.score.toFixed(2), "Recommendation", dataset.supervisorEvaluation.recommendation],
    ["Supervisor Comments", dataset.supervisorEvaluation.comments || "-", "", ""],
  ]);

  sectionTitle("Section 9: Appraisee Evaluation");
  keyValueRows([
    ["Self Score", dataset.appraiseeEvaluation.score.toFixed(2), "Discussion Took Place", dataset.appraiseeEvaluation.discussionHeld],
    ["Discussion Helped", dataset.appraiseeEvaluation.discussionHelped, "Supervisor Contribution", dataset.appraiseeEvaluation.supervisorContribution || "-"],
    ["Appraisee Comments", dataset.appraiseeEvaluation.comments || "-", "", ""],
  ]);

  sectionTitle("Section 10: GM Evaluation / Calibration");
  keyValueRows([
    ["GM Score", dataset.gmEvaluation.score.toFixed(2), "Final Rating", dataset.gmEvaluation.finalRating || "-"],
    ["Final Decision", dataset.gmEvaluation.finalDecision || "-", "GM Comments", dataset.gmEvaluation.comments || "-"],
  ]);

  sectionTitle("Section 11: Development / Training Needs");
  keyValueRows([
    ["Recommended Training", dataset.developmentNeeds.training || "-", "Support Required", dataset.developmentNeeds.supportRequired || "-"],
    ["Timeline", dataset.developmentNeeds.timeline || "-", "", ""],
  ]);

  sectionTitle("Section 12: Reward / Sanction / Action");
  keyValueRows([
    ["Reward Recommendation", dataset.actions.rewardRecommendation || "-", "PIP Recommendation", dataset.actions.pipRecommendation || "-"],
    ["Promotion Recommendation", dataset.actions.promotionRecommendation || "-", "Sanction Recommendation", dataset.actions.sanctionRecommendation || "-"],
    ["Final HR / GM Action", dataset.actions.finalAction || "-", "", ""],
  ]);

  sectionTitle("Section 13: Signatures");
  drawTable(
    [
      { key: "role", label: "Role", widthRatio: 1.1 },
      { key: "name", label: "Name", widthRatio: 2 },
      { key: "status", label: "Status", widthRatio: 0.8 },
    ],
    [
      { role: "Appraisee", name: dataset.signatures.appraisee, status: dataset.statusLabel === "FINAL" ? "Signed" : "Pending" },
      { role: "Supervisor", name: dataset.signatures.supervisor, status: dataset.statusLabel === "FINAL" ? "Signed" : "Pending" },
      { role: "GM", name: dataset.signatures.gm, status: dataset.statusLabel === "FINAL" ? "Signed" : "Pending" },
      { role: "HR/Admin", name: dataset.signatures.hr, status: dataset.statusLabel === "FINAL" ? "Signed" : "Pending" },
    ]
  );

  pushPage();

  const fileName = `performance-appraisal-${slugify(dataset.personalParticulars.staffNumber || dataset.personalParticulars.name)}-${slugify(dataset.appraisalPeriodLabel)}.pdf`;
  return {
    fileName,
    body: buildPdf(pages),
    contentType: "application/pdf",
    previewable: true,
  };
}

export type LeaveApplicationFormDataset = {
  organizationName: string;
  organizationIdentifier: string;
  organizationLogoMark: string;
  organizationLogoJpeg?: Uint8Array | null;
  platformLogoJpeg?: Uint8Array | null;
  organizationAddressLines: string[];
  reportFooter: string;
  generatedAtLabel: string;
  formReference: string;
  applicant: {
    name: string;
    designation: string;
    staffNumber: string;
    department: string;
    workStation: string;
    leaveType: string;
    numberOfDays: number;
    fromDate: string;
    toDate: string;
    expectedResumeDate: string;
    leaveAddress: string;
    telephoneNumber: string;
    cellPhone: string;
    relievingOfficer: string;
    attachmentNote: string;
  };
  supervisorSection: {
    recommendDays: number;
    notRecommendedReason: string;
    comments: string;
    designation: string;
    date: string;
    name: string;
  };
  hrComputation: {
    entitlement: number;
    accruedDays: number;
    takenDays: number;
    pendingDays: number;
    totalDaysDue: number;
    totalDaysRequested: number;
    balanceAfterApproval: number;
    resumeDate: string;
    computedBy: string;
    designation: string;
    date: string;
  };
  payrollImpact: {
    leaveAllowance: string;
    unpaidLeaveDeductionFlag: string;
    payrollMonthAffected: string;
  };
  finalApproval: {
    decision: string;
    approvalDate: string;
    approverName: string;
    approverRole: string;
  };
  reason: string;
};

export type HrDocumentPdfDataset = {
  organizationName: string;
  organizationIdentifier: string;
  organizationLogoMark: string;
  organizationLogoJpeg?: Uint8Array | null;
  platformLogoJpeg?: Uint8Array | null;
  organizationAddressLines: string[];
  reportFooter: string;
  generatedAtLabel: string;
  issueDateLabel: string;
  title: string;
  recipientLabel: string;
  referenceLine: string;
  documentCode: string;
  sections: Array<{
    heading?: string;
    paragraphs?: string[];
    bullets?: string[];
  }>;
  acknowledgements?: string[];
  signatures: Array<{
    label: string;
    name: string;
    title: string;
    signature: string;
    date: string;
  }>;
};

export function buildHrDocumentPdf(dataset: HrDocumentPdfDataset): PayrollOutputFile {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 38;
  const topMargin = 24;
  const bottomMargin = 24;
  const headerHeight = 138;
  const footerHeight = 30;
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;
  const addressLines = compactAddressLines(dataset.organizationAddressLines);
  const pages: PdfPage[] = [];

  let texts: PdfTextItem[] = [];
  let rects: NonNullable<PdfPage["rects"]> = [];
  let lines: NonNullable<PdfPage["lines"]> = [];
  let images: PdfEmbeddedImage[] = [];
  let currentTopY = topMargin + headerHeight + 16;

  function addText(
    x: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    texts.push({
      x,
      y: pageHeight - topY,
      text: normaliseReportText(text),
      font: options?.font ?? "F1",
      size: options?.size ?? 8.9,
    });
  }

  function addCenteredText(
    center: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    const font = options?.font ?? "F1";
    const size = options?.size ?? 8.9;
    addText(center - estimatePdfTextWidth(text, size, font) / 2, topY, text, { font, size });
  }

  function addRightAlignedText(
    rightX: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    const font = options?.font ?? "F1";
    const size = options?.size ?? 8.9;
    addText(rightX - estimatePdfTextWidth(text, size, font), topY, text, { font, size });
  }

  function addRect(
    x: number,
    topY: number,
    width: number,
    height: number,
    options?: { fill?: string; stroke?: string; lineWidth?: number }
  ) {
    rects.push({
      x,
      y: pageHeight - topY - height,
      width,
      height,
      fill: options?.fill,
      stroke: options?.stroke,
      lineWidth: options?.lineWidth,
    });
  }

  function addLine(x1: number, topY1: number, x2: number, topY2: number) {
    lines.push({
      x1,
      y1: pageHeight - topY1,
      x2,
      y2: pageHeight - topY2,
    });
  }

  function drawFooter(pageNumber: number) {
    const footerTop = pageHeight - footerHeight - bottomMargin;
    addRect(marginX, footerTop, contentWidth, 20, {
      fill: "0.997 0.997 0.997",
      stroke: PDF_BRAND_BORDER,
      lineWidth: 0.6,
    });
    addText(marginX + 10, footerTop + 13, `Generated ${dataset.generatedAtLabel}`, { size: 7.9 });
    addCenteredText(centerX, footerTop + 13, dataset.reportFooter || "Generated by Solva HR", { size: 7.9 });
    addRightAlignedText(pageWidth - marginX - 10, footerTop + 13, `Page ${pageNumber}`, { size: 7.9 });
  }

  function startPage() {
    texts = [];
    rects = [];
    lines = [];
    images = [];
    appendPdfHeader(texts, rects, images, {
      pageWidth,
      pageHeight,
      centerX,
      marginX,
      topY: topMargin,
      headerHeight,
      organizationLogoMark: dataset.organizationLogoMark,
      organizationLogoJpeg: dataset.organizationLogoJpeg,
      platformLogoJpeg: dataset.platformLogoJpeg,
      organizationNameLines: [dataset.organizationName.toUpperCase()],
      addressLines,
      titleLines: [dataset.title.toUpperCase()],
      periodLine: dataset.documentCode,
      organizationIdentifier: dataset.organizationIdentifier,
    });
    currentTopY = topMargin + headerHeight + 16;
    addText(marginX, currentTopY + 10, dataset.recipientLabel, { font: "F2", size: 9.2 });
    addRightAlignedText(pageWidth - marginX, currentTopY + 10, `Date: ${dataset.issueDateLabel}`, {
      font: "F2",
      size: 9.2,
    });
    currentTopY += 18;
    addText(marginX, currentTopY + 10, dataset.referenceLine, { font: "F2", size: 9.1 });
    addLine(marginX, currentTopY + 14, pageWidth - marginX, currentTopY + 14);
    currentTopY += 18;
  }

  function pushPage() {
    drawFooter(pages.length + 1);
    pages.push({ texts, rects, lines, images });
  }

  function ensureSpace(height: number) {
    if (currentTopY + height <= pageHeight - bottomMargin - footerHeight - 8) {
      return;
    }
    pushPage();
    startPage();
  }

  function addParagraph(paragraph: string, options?: { indent?: number; font?: "F1" | "F2" | "F3" | "F4" }) {
    const lineWidthChars = estimateCharsForPdfWidth(contentWidth - 24 - (options?.indent ?? 0), 8.9, options?.font ?? "F1");
    const wrapped = wrapPdfText(paragraph, lineWidthChars);
    ensureSpace(12 + wrapped.length * 10);
    wrapped.forEach((line, index) => {
      addText(marginX + 8 + (options?.indent ?? 0), currentTopY + 10 + index * 10, line, {
        font: options?.font ?? "F1",
        size: 8.9,
      });
    });
    currentTopY += 12 + wrapped.length * 10;
  }

  function addBullets(items: string[]) {
    items.forEach((item) => {
      const wrapped = wrapPdfText(item, estimateCharsForPdfWidth(contentWidth - 48, 8.8, "F1"));
      ensureSpace(12 + wrapped.length * 10);
      wrapped.forEach((line, index) => {
        addText(index === 0 ? marginX + 14 : marginX + 28, currentTopY + 10 + index * 10, line, {
          size: 8.8,
        });
      });
      currentTopY += 12 + wrapped.length * 10;
    });
  }

  startPage();

  dataset.sections.forEach((section) => {
    if (section.heading) {
      ensureSpace(20);
      addText(marginX, currentTopY + 10, section.heading, { font: "F2", size: 9.4 });
      currentTopY += 14;
    }
    (section.paragraphs ?? []).forEach((paragraph) => addParagraph(paragraph));
    if (section.bullets?.length) {
      addBullets(section.bullets);
    }
    currentTopY += 4;
  });

  if (dataset.acknowledgements?.length) {
    ensureSpace(18 + dataset.acknowledgements.length * 11);
    dataset.acknowledgements.forEach((entry, index) => {
      addText(marginX, currentTopY + 10 + index * 11, entry, { font: index === 0 ? "F2" : "F1", size: index === 0 ? 9.3 : 8.9 });
    });
    currentTopY += 16 + dataset.acknowledgements.length * 11;
  }

  ensureSpace(92);
  const signatureStartTop = currentTopY + 8;
  dataset.signatures.forEach((signature, index) => {
    const x = index % 2 === 0 ? marginX : marginX + contentWidth / 2 + 8;
    const y = signatureStartTop + Math.floor(index / 2) * 44;
    addText(x, y, signature.label, { font: "F2", size: 8.9 });
    addText(x, y + 22, `Name: ${signature.name}`, { size: 8.7 });
    addText(x, y + 34, `Title: ${signature.title}`, { size: 8.4 });
    addText(x, y + 46, `Signature: ${signature.signature}`, { size: 8.7 });
    addText(x, y + 58, `Date: ${signature.date}`, { size: 8.7 });
  });

  pushPage();

  return {
    fileName: `${slugify(dataset.title)}-${slugify(dataset.recipientLabel)}.pdf`,
    body: buildPdf(pages),
    contentType: "application/pdf",
    previewable: true,
  };
}

export function buildLeaveApplicationFormPdf(dataset: LeaveApplicationFormDataset): PayrollOutputFile {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 38;
  const topMargin = 24;
  const bottomMargin = 24;
  const headerHeight = 138;
  const footerHeight = 30;
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;
  const addressLines = compactAddressLines(dataset.organizationAddressLines);
  const pages: PdfPage[] = [];

  let texts: PdfTextItem[] = [];
  let rects: NonNullable<PdfPage["rects"]> = [];
  let lines: NonNullable<PdfPage["lines"]> = [];
  let images: PdfEmbeddedImage[] = [];
  let currentTopY = topMargin + headerHeight + 16;

  function addText(
    x: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    texts.push({
      x,
      y: pageHeight - topY,
      text: normaliseReportText(text),
      font: options?.font ?? "F1",
      size: options?.size ?? 8.7,
    });
  }

  function addCenteredText(
    center: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    const font = options?.font ?? "F1";
    const size = options?.size ?? 8.7;
    addText(center - estimatePdfTextWidth(text, size, font) / 2, topY, text, { font, size });
  }

  function addRightAlignedText(
    rightX: number,
    topY: number,
    text: string,
    options?: { font?: "F1" | "F2" | "F3" | "F4"; size?: number }
  ) {
    const font = options?.font ?? "F1";
    const size = options?.size ?? 8.7;
    addText(rightX - estimatePdfTextWidth(text, size, font), topY, text, { font, size });
  }

  function addRect(
    x: number,
    topY: number,
    width: number,
    height: number,
    options?: { fill?: string; stroke?: string; lineWidth?: number }
  ) {
    rects.push({
      x,
      y: pageHeight - topY - height,
      width,
      height,
      fill: options?.fill,
      stroke: options?.stroke,
      lineWidth: options?.lineWidth,
    });
  }

  function addLine(x1: number, topY1: number, x2: number, topY2: number) {
    lines.push({
      x1,
      y1: pageHeight - topY1,
      x2,
      y2: pageHeight - topY2,
    });
  }

  function ensureSpace(height: number) {
    if (currentTopY + height <= pageHeight - bottomMargin - footerHeight - 8) {
      return;
    }
    pushPage();
    startPage();
  }

  function drawFooter(pageNumber: number) {
    const footerTop = pageHeight - footerHeight - bottomMargin;
    addRect(marginX, footerTop, contentWidth, 20, {
      fill: "0.997 0.997 0.997",
      stroke: PDF_BRAND_BORDER,
      lineWidth: 0.6,
    });
    addText(marginX + 10, footerTop + 13, `Generated ${dataset.generatedAtLabel}`, { size: 7.9 });
    addCenteredText(centerX, footerTop + 13, dataset.reportFooter || "Generated by Solva HR", { size: 7.9 });
    addRightAlignedText(pageWidth - marginX - 10, footerTop + 13, `Page ${pageNumber}`, { size: 7.9 });
  }

  function startPage() {
    texts = [];
    rects = [];
    lines = [];
    images = [];
    appendPdfHeader(texts, rects, images, {
      pageWidth,
      pageHeight,
      centerX,
      marginX,
      topY: topMargin,
      headerHeight,
      organizationLogoMark: dataset.organizationLogoMark,
      organizationLogoJpeg: dataset.organizationLogoJpeg,
      platformLogoJpeg: dataset.platformLogoJpeg,
      organizationNameLines: [dataset.organizationName.toUpperCase()],
      addressLines,
      titleLines: ["LEAVE APPLICATION FORM"],
      periodLine: `Form Ref ${dataset.formReference}`,
      organizationIdentifier: dataset.organizationIdentifier,
    });
    currentTopY = topMargin + headerHeight + 16;
  }

  function pushPage() {
    drawFooter(pages.length + 1);
    pages.push({ texts, rects, lines, images });
  }

  function sectionTitle(title: string) {
    ensureSpace(22);
    addText(marginX, currentTopY + 10, title.toUpperCase(), { font: "F2", size: 9.6 });
    addLine(marginX, currentTopY + 14, pageWidth - marginX, currentTopY + 14);
    currentTopY += 18;
  }

  function keyValueRows(rows: Array<[string, string, string, string]>) {
    const leftLabelX = marginX + 8;
    const leftValueX = marginX + 120;
    const rightLabelX = marginX + 294;
    const rightValueX = marginX + 394;
    rows.forEach(([leftLabel, leftValue, rightLabel, rightValue]) => {
      ensureSpace(18);
      addText(leftLabelX, currentTopY + 10, leftLabel, { size: 8.1 });
      addText(leftValueX, currentTopY + 10, leftValue || "-", { font: "F2", size: 8.5 });
      addText(rightLabelX, currentTopY + 10, rightLabel, { size: 8.1 });
      addText(rightValueX, currentTopY + 10, rightValue || "-", { font: "F2", size: 8.5 });
      addLine(marginX, currentTopY + 15, pageWidth - marginX, currentTopY + 15);
      currentTopY += 18;
    });
  }

  function notesBlock(label: string, value: string) {
    const noteLines = wrapPdfText(value || "-", 98);
    ensureSpace(16 + noteLines.length * 9);
    addText(marginX + 8, currentTopY + 10, label, { size: 8.1 });
    noteLines.forEach((line, index) => {
      addText(marginX + 116, currentTopY + 10 + index * 9, line, { font: "F2", size: 8.4 });
    });
    addLine(marginX, currentTopY + 14 + noteLines.length * 9, pageWidth - marginX, currentTopY + 14 + noteLines.length * 9);
    currentTopY += 18 + noteLines.length * 9;
  }

  startPage();

  sectionTitle("Part I: To Be Completed by Applicant");
  keyValueRows([
    ["Name", dataset.applicant.name, "Designation", dataset.applicant.designation],
    ["Staff Number", dataset.applicant.staffNumber, "Department / Work Station", `${dataset.applicant.department} / ${dataset.applicant.workStation}`.trim()],
    ["Nature of Leave", dataset.applicant.leaveType, "Days Applied For", dataset.applicant.numberOfDays.toFixed(2)],
    ["From Date", dataset.applicant.fromDate, "To Date", dataset.applicant.toDate],
    ["Expected Resume Date", dataset.applicant.expectedResumeDate, "", ""],
  ]);
  notesBlock("Reason", dataset.reason);
  notesBlock("Leave Address", dataset.applicant.leaveAddress);
  keyValueRows([
    ["Telephone Number", dataset.applicant.telephoneNumber, "Cell Phone", dataset.applicant.cellPhone],
    ["Person Covering Duties", dataset.applicant.relievingOfficer, "Signature", "________________"],
  ]);
  notesBlock("Attachment / Document Note", dataset.applicant.attachmentNote || "No document note supplied.");

  sectionTitle("Part II: To Be Completed by Supervisor");
  keyValueRows([
    ["I Recommend", `${dataset.supervisorSection.recommendDays.toFixed(2)} day(s)`, "Designation", dataset.supervisorSection.designation],
    ["Supervisor Name", dataset.supervisorSection.name, "Date", dataset.supervisorSection.date],
  ]);
  notesBlock("Supervisor Comments", dataset.supervisorSection.comments || "No comment supplied.");
  notesBlock("I Do Not Recommend Leave, Reason", dataset.supervisorSection.notRecommendedReason || "Not applicable.");

  sectionTitle("Part III: To Be Completed by HR / Admin");
  keyValueRows([
    ["Leave Entitlement", dataset.hrComputation.entitlement.toFixed(2), "Leave Accrued", dataset.hrComputation.accruedDays.toFixed(2)],
    ["Leave Already Taken", dataset.hrComputation.takenDays.toFixed(2), "Pending Leave", dataset.hrComputation.pendingDays.toFixed(2)],
    ["Total Days Due", dataset.hrComputation.totalDaysDue.toFixed(2), "Total Days Requested", dataset.hrComputation.totalDaysRequested.toFixed(2)],
    ["Balance After Approval", dataset.hrComputation.balanceAfterApproval.toFixed(2), "Resume Duty On", dataset.hrComputation.resumeDate],
    ["Computed By", dataset.hrComputation.computedBy, "Designation", dataset.hrComputation.designation],
    ["Signature", "________________", "Date", dataset.hrComputation.date],
  ]);

  sectionTitle("Part IV: Payroll Impact");
  keyValueRows([
    ["Leave Allowance", dataset.payrollImpact.leaveAllowance, "Unpaid Leave Deduction Flag", dataset.payrollImpact.unpaidLeaveDeductionFlag],
    ["Payroll Month Affected", dataset.payrollImpact.payrollMonthAffected, "", ""],
  ]);

  sectionTitle("Part V: Final Approval");
  keyValueRows([
    ["Decision", dataset.finalApproval.decision, "Approval Date", dataset.finalApproval.approvalDate],
    ["Approver Name", dataset.finalApproval.approverName, "Approver Role", dataset.finalApproval.approverRole],
    ["Signature", "________________", "Official Stamp", "________________"],
  ]);

  pushPage();

  const fileName = `leave-application-${slugify(dataset.applicant.staffNumber || dataset.applicant.name)}-${slugify(dataset.applicant.fromDate)}.pdf`;
  return {
    fileName,
    body: buildPdf(pages),
    contentType: "application/pdf",
    previewable: true,
  };
}

export function buildPayrollTemplateOutput(
  exportType: PayrollTemplateOutputType,
  dataset: PayrollOutputDataset
): PayrollOutputFile {
  const definition = PAYROLL_TEMPLATE_OUTPUT_DEFINITIONS[exportType];
  const fileStem = `${slugify(definition.label)}-${slugify(dataset.payrollPeriodLabel)}`;
  let body: Uint8Array;

  switch (exportType) {
    case "wagebill_report":
      body = buildWagebillPdf(dataset);
      break;
    case "earnings_deductions_analysis":
      body = buildEarningsDeductionsPdf(dataset);
      break;
    case "monthly_deduction_posting_list":
      body = buildMonthlyPostingPdf(dataset);
      break;
    case "net_to_bank":
      body = buildNetToBankWorkbook(dataset);
      break;
    case "net_to_mpesa":
      body = buildNetToMpesaWorkbook(dataset);
      break;
    case "paye_report":
      body = buildPayeWorkbook(dataset);
      break;
    case "nssf_report":
      body = buildNssfWorkbook(dataset);
      break;
    case "shif_report":
      body = buildShifWorkbook(dataset);
      break;
    case "helb_report":
      body = buildHelbCsv(dataset);
      break;
    default:
      throw new Error("unsupported_payroll_template_output");
  }

  return {
    fileName: `${fileStem}.${definition.extension}`,
    body,
    contentType: definition.contentType,
    previewable: definition.previewable,
  };
}
