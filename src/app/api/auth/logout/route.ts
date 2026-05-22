import { NextResponse } from "next/server";
import { finalizeUserLogout } from "@/lib/administration";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function signOutCurrentSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }

  if (user?.id && user.email) {
    await finalizeUserLogout(user.id, user.email);
  }
}

export async function GET(request: Request) {
  try {
    await signOutCurrentSession();
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get("redirectTo") ?? "/login";
    return NextResponse.redirect(new URL(redirectTo, url.origin));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "We could not sign you out right now.",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await signOutCurrentSession();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "We could not sign you out right now.",
      },
      { status: 500 }
    );
  }
}
