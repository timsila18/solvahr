import { NextResponse } from "next/server";
import { createAssetRequest, listEssAssets } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

export async function GET() {
  try {
    return NextResponse.json(await listEssAssets());
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

    const body = (await request.json()) as {
      assetName?: string;
      requestType?: string;
      branch?: string;
    };

    if (!body.assetName || !body.requestType) {
      return NextResponse.json({ error: "missing_asset_request_fields" }, { status: 400 });
    }

    return NextResponse.json(
      await createAssetRequest({
        employeeName: profile.full_name,
        assetName: body.assetName,
        requestType: body.requestType,
        branch: body.branch ?? "Assigned branch",
      }),
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message.startsWith("missing_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
