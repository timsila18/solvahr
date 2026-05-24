import { NextResponse } from "next/server";
import { importEmployeeRecords } from "@/lib/database";
import { getCurrentUserProfile } from "@/lib/session";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "unknown_error";
}

async function assertBulkPeopleAccess() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("unauthorized");
  }
  if (!["Manager", "HR Admin", "Super Admin"].includes(profile.role)) {
    throw new Error("forbidden");
  }
  return profile;
}

export async function POST(request: Request) {
  try {
    await assertBulkPeopleAccess();
    const body = (await request.json()) as {
      rows?: Array<Record<string, unknown>>;
    };

    return NextResponse.json(await importEmployeeRecords({ rows: body.rows ?? [] }), { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error);
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("missing_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
