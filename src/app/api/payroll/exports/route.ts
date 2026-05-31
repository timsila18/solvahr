import { getPayrollExportFile } from "@/lib/database";

const allowed = [
  "wagebill_report",
  "earnings_deductions_analysis",
  "monthly_deduction_posting_list",
  "net_to_bank",
  "net_to_mpesa",
  "paye_report",
  "all_statutory_deductions_report",
  "helb_report",
  "payroll_register",
  "p9_forms",
  "shif_report",
  "nssf_report",
  "housing_levy_report",
] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const exportType = url.searchParams.get("type") ?? "";

  if (!allowed.includes(exportType as (typeof allowed)[number])) {
    return new Response("invalid export type", { status: 400 });
  }

  try {
    const periodId = url.searchParams.get("periodId");
    const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    const file = await getPayrollExportFile(exportType as (typeof allowed)[number], {
      periodId,
    });

    return new Response(Buffer.from(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `${disposition}; filename="${file.fileName}"`,
        "X-Solva-Warnings": encodeURIComponent(JSON.stringify(file.warnings ?? [])),
        "X-Solva-Warning-Summary": encodeURIComponent(
          JSON.stringify((file as { warningSummary?: Record<string, unknown> }).warningSummary ?? {})
        ),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("payroll_") ||
              message.startsWith("bank_") ||
              message.includes("reconciliation") ||
              message.includes("missing")
            ? 400
            : 500;
    return new Response(message, { status });
  }
}
