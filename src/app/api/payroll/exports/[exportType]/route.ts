import { getPayrollExportFile } from "@/lib/database";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ exportType: string }>;
  }
) {
  const { exportType } = await context.params;
  const allowed = ["net_to_bank", "paye_report", "payroll_register", "p9_forms"] as const;

  if (!allowed.includes(exportType as (typeof allowed)[number])) {
    return new Response("invalid export type", { status: 400 });
  }

  const url = new URL(request.url);
  void url;

  try {
    const file = await getPayrollExportFile(exportType as (typeof allowed)[number]);

    return new Response(file.body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return new Response(message, { status });
  }
}
