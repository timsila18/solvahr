import { NextResponse } from "next/server";
import { createHolidayRecord, listHolidays } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ holidays: await listHolidays() });
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
      holidayDate: string;
      scope?: string;
    };

    return NextResponse.json({ holiday: await createHolidayRecord(body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

