import { NextResponse } from "next/server";
import { getCompanyDocumentDownload } from "@/lib/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    return NextResponse.json({ document: await getCompanyDocumentDownload(documentId) });
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
