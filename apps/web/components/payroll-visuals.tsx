"use client";

import { formatCount, humanize, money } from "../lib/reporting";

type ChartDatum = {
  label: string;
  value: number;
  accent?: string;
};

type PayrollBarChartProps = {
  title: string;
  subtitle: string;
  data: ChartDatum[];
  formatter?: (value: number) => string;
};

export function PayrollBarChart({
  title,
  subtitle,
  data,
  formatter = money
}: PayrollBarChartProps) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <article className="payrollChartCard">
      <div className="payrollSectionHeader">
        <div>
          <p className="eyebrow">{title}</p>
          <h3>{subtitle}</h3>
        </div>
      </div>
      <div className="payrollBars">
        {data.map((item) => (
          <div className="payrollBarRow" key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <span>{formatter(item.value)}</span>
            </div>
            <div className="payrollBarTrack">
              <span
                className="payrollBarFill"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: item.accent ?? "linear-gradient(90deg, #0f4fd9, #2d7ff9)"
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

type PayrollBreakdownChartProps = {
  title: string;
  subtitle: string;
  data: ChartDatum[];
};

export function PayrollBreakdownChart({ title, subtitle, data }: PayrollBreakdownChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <article className="payrollChartCard">
      <div className="payrollSectionHeader">
        <div>
          <p className="eyebrow">{title}</p>
          <h3>{subtitle}</h3>
        </div>
        <strong>{money(total)}</strong>
      </div>

      <div className="payrollDonutShell" aria-hidden="true">
        <div className="payrollDonutTrack">
          {data.map((item) => (
            <span
              className="payrollDonutSegment"
              key={item.label}
              style={{
                flexBasis: `${(item.value / total) * 100}%`,
                background: item.accent ?? "#0f4fd9"
              }}
            />
          ))}
        </div>
      </div>

      <div className="payrollLegend">
        {data.map((item) => (
          <div className="payrollLegendRow" key={item.label}>
            <span className="payrollLegendSwatch" style={{ background: item.accent ?? "#0f4fd9" }} />
            <strong>{item.label}</strong>
            <small>{formatCount(Math.round((item.value / total) * 100))}%</small>
            <b>{money(item.value)}</b>
          </div>
        ))}
      </div>
    </article>
  );
}

type PayrollStatCardsProps = {
  data: ChartDatum[];
  formatter?: (value: number) => string;
};

export function PayrollStatCards({ data, formatter = money }: PayrollStatCardsProps) {
  return (
    <div className="payrollMiniMetricGrid">
      {data.map((item) => (
        <article className="payrollMiniMetric" key={item.label}>
          <span>{humanize(item.label)}</span>
          <strong>{formatter(item.value)}</strong>
        </article>
      ))}
    </div>
  );
}
