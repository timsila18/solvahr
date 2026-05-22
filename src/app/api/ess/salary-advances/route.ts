import { NextResponse } from "next/server";
import { createEssSalaryAdvanceRequest } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      amount?: number | string;
      reason?: string;
    };

    return NextResponse.json(
      {
        request: await createEssSalaryAdvanceRequest({
          amount: body.amount ?? 0,
          reason: body.reason ?? "",
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("invalid_") || message.startsWith("missing_") || message.includes("salary_advance")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
