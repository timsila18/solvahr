import { NextResponse } from "next/server";
import { uploadCompanyLogo } from "@/lib/administration";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "logo_file_missing" }, { status: 400 });
    }

    return NextResponse.json(
      {
        result: await uploadCompanyLogo({ file }),
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
          : message === "logo_file_missing" || message === "unsupported_logo_type"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
