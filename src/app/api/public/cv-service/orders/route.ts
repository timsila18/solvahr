import { NextResponse } from "next/server";
import { createCvServiceDraft } from "@/lib/cv-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { packageKey?: "entry" | "mid" | "senior" | "executive" };
    if (!body.packageKey) {
      return NextResponse.json({ error: "missing_cv_package" }, { status: 400 });
    }
    return NextResponse.json({ order: await createCvServiceDraft(body.packageKey) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "invalid_cv_package" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
