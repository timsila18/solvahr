"use client";

import Link from "next/link";
import { useState } from "react";
import { getAuthRedirectUrl } from "@/lib/supabase/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl(),
    });

    setMessage(error ? error.message : "Password reset link sent. Check your email.");
    setSubmitting(false);
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="section-eyebrow">Solva HR</p>
        <h1>Forgot password</h1>
        <p className="section-description">
          We will send a reset link to your email using the configured Supabase redirect URL.
        </p>
        <form className="action-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              required
              type="email"
              value={email}
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <div className="auth-links">
          <Link href="/login">Back to login</Link>
        </div>
        {message ? <div className="task-banner">{message}</div> : null}
      </section>
    </main>
  );
}
