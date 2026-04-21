import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/";

  const redirectUrl = new URL(next, url.origin);
  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const failureUrl = new URL("/login", url.origin);
      failureUrl.searchParams.set("message", error.message);
      return NextResponse.redirect(failureUrl);
    }

    return NextResponse.redirect(redirectUrl);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      const failureUrl = new URL("/login", url.origin);
      failureUrl.searchParams.set("message", error.message);
      return NextResponse.redirect(failureUrl);
    }

    return NextResponse.redirect(redirectUrl);
  }

  const failureUrl = new URL("/login", url.origin);
  failureUrl.searchParams.set("message", "The authentication link is missing required parameters.");
  return NextResponse.redirect(failureUrl);
}
