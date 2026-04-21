import { NextResponse } from "next/server";
import { createProfileUpdateRequest } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();

    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      fieldName: string;
      newValue: string;
    };

    if (!body.fieldName || !body.newValue) {
      return NextResponse.json({ error: "missing_profile_update_fields" }, { status: 400 });
    }

    return NextResponse.json(
      await createProfileUpdateRequest({
        employeeName: profile.full_name,
        fieldName: body.fieldName,
        newValue: body.newValue,
      }),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
