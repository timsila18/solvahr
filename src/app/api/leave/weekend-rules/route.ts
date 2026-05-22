import { NextResponse } from "next/server";
import { listWeekendRules, saveWeekendRule } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ weekendRules: await listWeekendRules() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name: string;
      workingDays: string[];
      halfDays?: string[];
    };

    return NextResponse.json({ weekendRule: await saveWeekendRule(body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

