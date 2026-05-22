import { NextResponse } from "next/server";
import { updateRoleDefinition } from "@/lib/administration";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ roleKey: string }> }
) {
  try {
    const { roleKey } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json({
      role: await updateRoleDefinition(roleKey, body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
