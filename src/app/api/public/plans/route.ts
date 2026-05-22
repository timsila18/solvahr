import { NextResponse } from "next/server";
import { listPublicSubscriptionPlans } from "@/lib/saas";

export async function GET() {
  try {
    return NextResponse.json({ plans: await listPublicSubscriptionPlans() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
