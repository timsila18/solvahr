import { NextResponse } from "next/server";
import { roleCanAccessPeople } from "@/lib/auth";
import {
  deleteEmployeeDocument,
  getEmployeeDocumentDownload,
} from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

async function assertPeopleAdminAccess() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  if (!roleCanAccessPeople(profile.role)) {
    throw new Error("forbidden");
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string; documentId: string }> }
) {
  try {
    await assertPeopleAdminAccess();
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
    await assertPeopleAdminAccess();
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
