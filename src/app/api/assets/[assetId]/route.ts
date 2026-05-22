import { NextResponse } from "next/server";
import { updateAssetAssignment } from "@/lib/database";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await context.params;
    const body = (await request.json()) as {
      status?: string;
      notes?: string;
      expectedReturnDate?: string;
    };

    if (!body.status) {
      return NextResponse.json({ error: "missing_asset_status" }, { status: 400 });
    }

    return NextResponse.json(
      await updateAssetAssignment(assetId, {
        status: body.status,
        notes: body.notes,
        expectedReturnDate: body.expectedReturnDate,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "asset_assignment_not_found"
            ? 404
            : message.startsWith("missing_")
              ? 400
              : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
