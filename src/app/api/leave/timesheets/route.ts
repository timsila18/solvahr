import { NextResponse } from "next/server";
import { createTimesheet, listTimesheets } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ timesheets: await listTimesheets() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      weekStart: string;
      totalHours: string;
      notes?: string;
    };

    return NextResponse.json({
      task: await createTimesheet(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

