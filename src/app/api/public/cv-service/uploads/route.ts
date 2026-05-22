import { NextResponse } from "next/server";
import { uploadCvSourceFile } from "@/lib/cv-service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "cv_source_missing" }, { status: 400 });
    }
    return NextResponse.json(
      { file: await uploadCvSourceFile(file, kind === "profile-photo" ? "profile-photo" : "source") },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "cv_source_missing" ||
      message === "cv_source_type_not_supported" ||
      message === "cv_profile_photo_type_not_supported"
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
