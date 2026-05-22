import { NextResponse } from "next/server";
import { createShift, listShifts } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json(await listShifts());
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code: string;
      name: string;
      startTime: string;
      endTime: string;
      breakMinutes?: string;
    };

    return NextResponse.json({ shift: await createShift(body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

