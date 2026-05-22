import { NextResponse } from "next/server";
import { roleCanAccessPeople } from "@/lib/auth";
import {
  listEmployeeActionMessages,
  listEmployeeActionThreads,
  postEmployeeActionMessage,
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
  request: Request,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    await assertPeopleAdminAccess();
    const { employeeId } = await context.params;
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") ?? "";
    const entityId = searchParams.get("entityId") ?? "";

    if (entityType && entityId) {
      return NextResponse.json({
        messages: await listEmployeeActionMessages(employeeId, entityType, entityId),
      });
    }

    return NextResponse.json({
      threads: await listEmployeeActionThreads(employeeId),
    });
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
    await assertPeopleAdminAccess();
    const { employeeId } = await context.params;
    const body = (await request.json()) as {
      entityType: string;
      entityId: string;
      message: string;
    };

    return NextResponse.json(
      {
        message: await postEmployeeActionMessage(employeeId, body.entityType, body.entityId, body.message),
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
