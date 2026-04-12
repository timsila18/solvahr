import type { PayrollResult } from "@solva/shared";

type PayrollTableProps = {
  result: PayrollResult;
};

function money(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(value);
}

export function PayrollTable({ result }: PayrollTableProps) {
  const rows = [
    ["Gross Pay", result.grossPay],
    ["Taxable Pay", result.taxablePay],
    ["Deductions", result.totalDeductions],
    ["Employer Costs", result.totalEmployerCosts],
    ["Net Pay", result.netPay]
  ] as const;

  return (
    <div className="payrollTableWrap">
      <table className="payrollTable">
        <thead>
          <tr>
            <th>Item</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, amount]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{money(amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="lineList">
        <strong>Statutory Lines</strong>
        {result.deductions
          .filter((line) => ["PAYE", "SHIF", "NSSF_EE", "AHL_EE"].includes(line.code))
          .map((line) => (
            <span key={line.code}>
              {line.name}: {money(line.amount)}
            </span>
          ))}
      </div>
    </div>
  );
}
