import { NextResponse } from "next/server";
import { listEmployeeDocuments, uploadEmployeeDocument } from "@/lib/database";

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;
    return NextResponse.json({ documents: await listEmployeeDocuments(employeeId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await context.params;
    const formData = await request.formData();
    const category = String(formData.get("category") ?? "");
    const file = formData.get("file");

    if (!category || !(file instanceof File)) {
      return NextResponse.json({ error: "invalid_document_upload" }, { status: 400 });
    }

    return NextResponse.json(
      {
        document: await uploadEmployeeDocument({
          employeeId,
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
          : message === "file_too_large" || message === "unsupported_file_type"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
