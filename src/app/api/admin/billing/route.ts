import { NextResponse } from "next/server";
import { getCompanyBillingDashboard, updateCompanySubscription } from "@/lib/saas";

export async function GET() {
  try {
    return NextResponse.json({ billing: await getCompanyBillingDashboard() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      planId: string;
      billingCycle?: "monthly" | "annual";
      selectedModules?: string[];
    };

    return NextResponse.json({ billing: await updateCompanySubscription(body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "plan_not_found"
            ? 404
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
