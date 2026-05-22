import { NextResponse } from "next/server";
import { getEssProfile, updateEssProfileDirect } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json({ profile: await getEssProfile() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      phone?: string | null;
      mpesaMobileNumber?: string | null;
      email?: string | null;
      gender?: string | null;
      dateOfBirth?: string | null;
      profilePhoto?: string | null;
      nationalId?: string | null;
      kraPin?: string | null;
      shifNumber?: string | null;
      nssfNumber?: string | null;
    };

    return NextResponse.json({ profile: await updateEssProfileDirect(body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "employee_profile_required" || message === "missing_profile_update_fields"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
