import { NextResponse } from "next/server";
import { createTrainingRequest, listEssTrainingRecords } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

export async function GET() {
  try {
    return NextResponse.json({ training: await listEssTrainingRecords() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      programName?: string;
      schedule?: string;
      budget?: string;
      notes?: string;
    };

    if (!body.programName || !body.schedule) {
      return NextResponse.json({ error: "missing_training_request_fields" }, { status: 400 });
    }

    return NextResponse.json(
      await createTrainingRequest({
        employeeName: profile.full_name,
        programName: body.programName,
        schedule: body.schedule,
        budget: body.budget ?? "0",
        notes: body.notes ?? "",
      }),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
