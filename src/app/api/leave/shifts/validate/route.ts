import { NextResponse } from "next/server";
import { validateShiftRosterUpload } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "invalid_shift_roster_upload" }, { status: 400 });
    }

    const result = await validateShiftRosterUpload({ file });
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "invalid_shift_roster_upload" ||
              message === "no_roster_employees_available" ||
              message.startsWith("invalid_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
