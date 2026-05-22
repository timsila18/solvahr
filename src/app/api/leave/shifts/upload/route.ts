import { NextResponse } from "next/server";
import { uploadShiftRoster } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "invalid_shift_roster_upload" }, { status: 400 });
    }

    const result = await uploadShiftRoster({ file });
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const details =
      error instanceof Error && "details" in error
        ? (error as Error & { details?: unknown }).details
        : undefined;
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "invalid_shift_roster_upload" ||
              message === "no_roster_employees_available" ||
              message === "shift_roster_upload_validation_failed" ||
              message.startsWith("invalid_") ||
              message.startsWith("duplicate_")
            ? 400
            : 500;
    return NextResponse.json({ error: message, details }, { status });
  }
}
