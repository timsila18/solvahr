import { NextResponse } from "next/server";
import { runAdminUserAction } from "@/lib/administration";

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    const body = (await request.json()) as { action?: string; temporaryPassword?: string };
    const action = body.action;

    if (
      !action ||
      ![
        "activate",
        "suspend",
        "deactivate",
        "reactivate",
        "resend_invite",
        "reset_password",
        "set_temporary_password",
        "revoke_invite",
        "force_sign_out",
      ].includes(action)
    ) {
      return NextResponse.json({ error: "invalid_user_action" }, { status: 400 });
    }

    return NextResponse.json({
      result: await runAdminUserAction(userId, action as never, {
        temporaryPassword: typeof body.temporaryPassword === "string" ? body.temporaryPassword : null,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
