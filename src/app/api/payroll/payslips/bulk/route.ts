import { getPayslipBundleFile } from "@/lib/database";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");
    const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    const file = await getPayslipBundleFile({ periodId });

    return new Response(Buffer.from(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `${disposition}; filename="${file.fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message.startsWith("payslip_validation_error:")
        ? 422
        : message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "payroll_run_not_found" || message === "payslip_not_found"
            ? 404
            : 500;
    return new Response(message.replace("payslip_validation_error:", ""), { status });
  }
}
