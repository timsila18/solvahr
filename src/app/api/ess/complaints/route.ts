import { NextResponse } from "next/server";
import { createEssComplaint, listEssComplaints } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ complaints: await listEssComplaints() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("missing_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      category?: string;
      subject?: string;
      details?: string;
    };

    if (!body.category || !body.details) {
      return NextResponse.json({ error: "missing_complaint_fields" }, { status: 400 });
    }

    return NextResponse.json(
      {
        complaint: await createEssComplaint({
          category: body.category,
          subject: body.subject,
          details: body.details,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("missing_") || message === "supervisor_not_assigned"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
