import { NextResponse } from "next/server";
import {
  listEmployeeActionMessages,
  postEmployeeActionMessage,
} from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.employee_id) {
      return NextResponse.json({ error: "employee_profile_required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") ?? "";
    const entityId = searchParams.get("entityId") ?? "";

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "invalid_action_message_target" }, { status: 400 });
    }

    return NextResponse.json({
      messages: await listEmployeeActionMessages(profile.employee_id, entityType, entityId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.employee_id) {
      return NextResponse.json({ error: "employee_profile_required" }, { status: 400 });
    }

    const body = (await request.json()) as {
      entityType: string;
      entityId: string;
      message: string;
    };

    return NextResponse.json(
      {
        message: await postEmployeeActionMessage(
          profile.employee_id,
          body.entityType,
          body.entityId,
          body.message
        ),
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
          : message === "message_required"
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
