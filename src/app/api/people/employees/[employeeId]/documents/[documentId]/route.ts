import { NextResponse } from "next/server";
import {
  deleteEmployeeDocument,
  getEmployeeDocumentDownload,
} from "@/lib/database";

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string; documentId: string }> }
) {
  try {
    const { employeeId, documentId } = await context.params;
    return NextResponse.json({
      document: await getEmployeeDocumentDownload(employeeId, documentId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "document_not_found"
            ? 404
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ employeeId: string; documentId: string }> }
) {
  try {
    const { employeeId, documentId } = await context.params;
    return NextResponse.json(await deleteEmployeeDocument(employeeId, documentId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "document_not_found"
            ? 404
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
