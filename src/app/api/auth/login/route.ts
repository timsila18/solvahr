import { NextResponse } from "next/server";
import { finalizeUserLogin, recordAuthAttempt } from "@/lib/administration";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const deviceInfo = request.headers.get("user-agent");
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() ?? null;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      await recordAuthAttempt({
        email: body.email,
        outcome: "failed",
        reason: error.message,
        deviceInfo,
        ipAddress,
      });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    try {
      if (data.user?.id) {
        await finalizeUserLogin(data.user.id, data.user.email ?? body.email);
      }
    } catch (statusError) {
      await supabase.auth.signOut();
      const message = statusError instanceof Error ? statusError.message : "account_blocked";
      await recordAuthAttempt({
        email: body.email,
        outcome: "blocked",
        userId: data.user?.id ?? null,
        reason: message,
        deviceInfo,
        ipAddress,
      });

      return NextResponse.json(
        {
          error:
            message === "pending_approval"
              ? "Your organization is still pending approval. Please wait for a Super Admin to activate the workspace."
              : message === "account_blocked"
              ? "Your account has been suspended or deactivated. Please contact an administrator."
              : message,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: data.user?.id ?? null,
          email: data.user?.email ?? body.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "We could not sign you in right now.",
      },
      { status: 500 }
    );
  }
}
