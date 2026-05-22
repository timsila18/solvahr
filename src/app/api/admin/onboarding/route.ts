import { NextResponse } from "next/server";
import { getCompanyOnboardingDashboard, updateCompanyOnboarding } from "@/lib/saas";

export async function GET() {
  try {
    return NextResponse.json({ onboarding: await getCompanyOnboardingDashboard() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      completedStep?: string | null;
      currentStep?: string | null;
    };

    return NextResponse.json({ onboarding: await updateCompanyOnboarding(body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
