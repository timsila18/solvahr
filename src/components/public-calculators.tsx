"use client";

import { useMemo, useState } from "react";

const DEFAULTS = {
  grossPay: 50000,
  annualLeaveEntitlement: 21,
  leaveDaysTaken: 4,
  noticeDays: 30,
  yearsWorked: 3,
  gratuityRate: 0.15,
};

function formatKes(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function safeNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function PublicCalculators() {
  const [grossPay, setGrossPay] = useState(String(DEFAULTS.grossPay));
  const [annualLeaveEntitlement, setAnnualLeaveEntitlement] = useState(String(DEFAULTS.annualLeaveEntitlement));
  const [leaveDaysTaken, setLeaveDaysTaken] = useState(String(DEFAULTS.leaveDaysTaken));
  const [noticeDays, setNoticeDays] = useState(String(DEFAULTS.noticeDays));
  const [yearsWorked, setYearsWorked] = useState(String(DEFAULTS.yearsWorked));
  const [gratuityRate, setGratuityRate] = useState(String(DEFAULTS.gratuityRate));

  const numbers = useMemo(() => {
    const gross = safeNumber(grossPay, DEFAULTS.grossPay);
    const leaveEntitlement = safeNumber(annualLeaveEntitlement, DEFAULTS.annualLeaveEntitlement);
    const leaveTaken = safeNumber(leaveDaysTaken, DEFAULTS.leaveDaysTaken);
    const notice = safeNumber(noticeDays, DEFAULTS.noticeDays);
    const workedYears = safeNumber(yearsWorked, DEFAULTS.yearsWorked);
    const gratuity = safeNumber(gratuityRate, DEFAULTS.gratuityRate);
    const paye = gross <= 24000 ? 0 : (gross - 24000) * 0.1;
    const shif = gross * 0.0275;
    const nssf = Math.min(gross * 0.06, 2160);
    const housingLevy = gross * 0.015;
    const netPay = gross - paye - shif - nssf - housingLevy;
    const leaveBalance = Math.max(leaveEntitlement - leaveTaken, 0);
    const noticePay = (gross / 30) * notice;
    const gratuityPay = gross * gratuity * workedYears;

    return {
      gross,
      paye,
      shif,
      nssf,
      housingLevy,
      netPay,
      leaveBalance,
      noticePay,
      gratuityPay,
      monthlyTakeHome: gross - shif - nssf - housingLevy,
    };
  }, [annualLeaveEntitlement, gratuityRate, grossPay, leaveDaysTaken, noticeDays, yearsWorked]);

  const cards = [
    {
      title: "PAYE Calculator",
      detail: "Quick payroll tax estimate for early budgeting and offer discussions.",
      value: formatKes(numbers.paye),
      note: "Uses a light planning formula for quick public estimation.",
    },
    {
      title: "SHIF Calculator",
      detail: "Estimate the health contribution signal from monthly gross pay.",
      value: formatKes(numbers.shif),
      note: "Useful for quick budgeting before full payroll setup.",
    },
    {
      title: "NSSF Calculator",
      detail: "See the pension/social contribution estimate from the same salary base.",
      value: formatKes(numbers.nssf),
      note: "Solva HR handles final payroll-ready outputs inside the platform.",
    },
    {
      title: "Leave Days Calculator",
      detail: "Track remaining leave days after time already used this year.",
      value: `${numbers.leaveBalance.toFixed(0)} days`,
      note: "Good for policy design and employee planning.",
    },
    {
      title: "Notice Pay Calculator",
      detail: "Estimate notice pay using gross monthly salary and the required days.",
      value: formatKes(numbers.noticePay),
      note: "Supports offboarding and labour-case preparation.",
    },
    {
      title: "Gratuity Calculator",
      detail: "Model gratuity using gross pay, years served, and your chosen rate.",
      value: formatKes(numbers.gratuityPay),
      note: "Adjust the gratuity rate to match your internal policy.",
    },
    {
      title: "Salary Breakdown Tool",
      detail: "Understand gross pay, statutory estimates, and an indicative net position.",
      value: formatKes(numbers.netPay),
      note: "Move from quick estimate to full payroll automation inside Solva HR.",
    },
  ];

  return (
    <section className="marketing-section">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Free tools</p>
          <h2>Helpful HR and payroll calculators that introduce the Solva HR workflow naturally.</h2>
        </div>
      </div>
      <section className="marketing-form-card">
        <div className="calculator-controls">
          <label>
            <span>Gross monthly pay</span>
            <input min="0" onChange={(event) => setGrossPay(event.target.value)} type="number" value={grossPay} />
          </label>
          <label>
            <span>Annual leave entitlement</span>
            <input
              min="0"
              onChange={(event) => setAnnualLeaveEntitlement(event.target.value)}
              type="number"
              value={annualLeaveEntitlement}
            />
          </label>
          <label>
            <span>Leave days taken</span>
            <input min="0" onChange={(event) => setLeaveDaysTaken(event.target.value)} type="number" value={leaveDaysTaken} />
          </label>
          <label>
            <span>Notice days</span>
            <input min="0" onChange={(event) => setNoticeDays(event.target.value)} type="number" value={noticeDays} />
          </label>
          <label>
            <span>Years worked</span>
            <input min="0" onChange={(event) => setYearsWorked(event.target.value)} type="number" value={yearsWorked} />
          </label>
          <label>
            <span>Gratuity rate</span>
            <input
              min="0"
              onChange={(event) => setGratuityRate(event.target.value)}
              step="0.01"
              type="number"
              value={gratuityRate}
            />
          </label>
        </div>
      </section>
      <div className="marketing-feature-grid tools-grid">
        {cards.map((card) => (
          <article className="marketing-feature-card marketing-tool-card" key={card.title}>
            <strong>{card.title}</strong>
            <p>{card.detail}</p>
            <h3>{card.value}</h3>
            <small>{card.note}</small>
          </article>
        ))}
      </div>
      <section className="marketing-form-card">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Ready for full automation?</p>
            <h2>Need full payroll automation? Try Solva HR.</h2>
          </div>
        </div>
        <p className="section-description">
          Move from quick estimation into tenant-safe payroll, ESS, approvals, premium reports, and branded workflows in one platform.
        </p>
        <div className="pricing-card__meta">
          <span>Indicative PAYE: {formatKes(numbers.paye)}</span>
          <span>Indicative SHIF: {formatKes(numbers.shif)}</span>
          <span>Indicative NSSF: {formatKes(numbers.nssf)}</span>
          <span>Indicative take-home before other deductions: {formatKes(numbers.monthlyTakeHome)}</span>
        </div>
      </section>
    </section>
  );
}
