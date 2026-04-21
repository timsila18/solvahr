import { getPayrollExportFile } from "@/lib/mock-platform-store";

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
  const actorEmail = url.searchParams.get("actorEmail") ?? "unknown@solvahr.app";
  const actorRole = url.searchParams.get("actorRole") ?? "Unknown";
  const file = getPayrollExportFile(
    exportType as (typeof allowed)[number],
    actorEmail,
    actorRole
  );

  return new Response(file.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
