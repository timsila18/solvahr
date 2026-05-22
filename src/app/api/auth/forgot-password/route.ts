import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
    };

    if (!body.email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const redirectUrl = new URL("/auth/callback", requestUrl.origin);
    redirectUrl.searchParams.set("next", "/reset-password");

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: redirectUrl.toString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: "Password reset link sent. Check your email.",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "We could not send the reset link right now.",
      },
      { status: 500 }
    );
  }
}
