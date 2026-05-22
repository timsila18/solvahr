import { NextResponse } from "next/server";
import { getPayslip, getPayslipFile } from "@/lib/database";

function toPayslipErrorResponse(message: string) {
  if (message.startsWith("payslip_validation_error:")) {
    return {
      status: 422,
      body: message.replace("payslip_validation_error:", ""),
    };
  }

  return {
    status:
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "payslip_not_found" || message === "payroll_run_not_found"
            ? 404
            : 500,
    body: message,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  const url = new URL(request.url);
  const wantsPdf = url.searchParams.get("format") === "pdf";

  try {
    const { employeeId } = await context.params;
    const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
    const periodId = url.searchParams.get("periodId");

    if (wantsPdf) {
      const file = await getPayslipFile(employeeId, { disposition, periodId });
      return new Response(Buffer.from(file.body), {
        headers: {
          "Content-Type": file.contentType,
          "Content-Disposition": `${disposition}; filename="${file.fileName}"`,
        },
      });
    }

    const payslip = await getPayslip(employeeId, { periodId });

    if (!payslip) {
      return NextResponse.json({ error: "payslip_not_found" }, { status: 404 });
    }

    return NextResponse.json({ payslip });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const response = toPayslipErrorResponse(message);
    if (wantsPdf) {
      return new Response(response.body, { status: response.status });
    }
    return NextResponse.json({ error: response.body }, { status: response.status });
  }
}
