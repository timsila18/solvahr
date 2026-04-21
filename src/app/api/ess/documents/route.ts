import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/session";
import { listEmployeeDocuments, uploadEmployeeDocument } from "@/lib/database";

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();

    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const documents = profile.employee_id
      ? await listEmployeeDocuments(profile.employee_id)
      : [];

    return NextResponse.json({ documents });
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

    if (!profile.employee_id) {
      return NextResponse.json({ error: "employee_profile_required" }, { status: 400 });
    }

    const formData = await request.formData();
    const category = String(formData.get("category") ?? "");
    const file = formData.get("file");

    if (!category || !(file instanceof File)) {
      return NextResponse.json({ error: "invalid_document_upload" }, { status: 400 });
    }

    return NextResponse.json(
      {
        document: await uploadEmployeeDocument({
          employeeId: profile.employee_id,
          category,
          file,
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
          : message === "employee_profile_required" || message === "invalid_document_upload"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
