import { NextResponse } from "next/server";
import { listCompanyDocuments, uploadCompanyDocument } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

export async function GET() {
  try {
    return NextResponse.json({ documents: await listCompanyDocuments() });
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

    const formData = await request.formData();
    const category = String(formData.get("category") ?? "");
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "");
    const issueDate = String(formData.get("issueDate") ?? "");
    const file = formData.get("file");

    if (!category || !title || !(file instanceof File)) {
      return NextResponse.json({ error: "invalid_document_upload" }, { status: 400 });
    }

    return NextResponse.json(
      {
        document: await uploadCompanyDocument({
          category,
          title,
          description,
          issueDate,
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
          : message === "invalid_document_upload"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
