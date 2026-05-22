import { NextResponse } from "next/server";
import { changeEssPassword } from "@/lib/database";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    return NextResponse.json(
      await changeEssPassword({
        currentPassword: String(body.currentPassword ?? ""),
        newPassword: String(body.newPassword ?? ""),
        confirmPassword: String(body.confirmPassword ?? ""),
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "unauthorized"
        ? 401
        : [
              "password_fields_required",
              "password_confirmation_mismatch",
              "password_too_short",
              "current_password_incorrect",
            ].includes(message)
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
