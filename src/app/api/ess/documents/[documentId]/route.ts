import { NextResponse } from "next/server";
import { deleteMyDocument, getMyDocumentDownload } from "@/lib/database";

export async function GET(_: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await params;
    return NextResponse.json({ document: await getMyDocumentDownload(documentId) });
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

export async function DELETE(_: Request, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await params;
    return NextResponse.json(await deleteMyDocument(documentId));
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
