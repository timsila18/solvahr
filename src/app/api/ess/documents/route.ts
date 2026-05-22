import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/session";
import { listIssuedEmployeeDocuments } from "@/lib/database";

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();

    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const documents = profile.employee_id
      ? await listIssuedEmployeeDocuments(profile.employee_id)
      : [];

    return NextResponse.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
