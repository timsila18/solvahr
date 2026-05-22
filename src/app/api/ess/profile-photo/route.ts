import { NextResponse } from "next/server";
import { uploadEssProfilePhoto } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "profile_photo_missing" }, { status: 400 });
    }

    return NextResponse.json({ result: await uploadEssProfilePhoto(file) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "employee_profile_required" ||
              message === "profile_photo_missing" ||
              message === "profile_photo_type_not_supported"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
