import { NextResponse } from "next/server";
import { createCompanyReferral, listCompanyReferrals } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json(await listCompanyReferrals());
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      companyName: string;
      contactPerson: string;
      contactEmail?: string;
      contactPhone?: string;
      industry?: string;
      notes?: string;
      rewardType?: string;
      rewardValue?: string;
    };

    return NextResponse.json({ referral: await createCompanyReferral(body) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "missing_referral_fields"
        ? 400
        : message === "unauthorized"
          ? 401
          : message === "forbidden"
            ? 403
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
