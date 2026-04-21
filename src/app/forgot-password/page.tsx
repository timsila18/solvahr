"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
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
    <AuthShell
      eyebrow="Password Recovery"
      title="Recover your Solva HR account"
      description="Send yourself a password reset link and return to your payroll, leave, and ESS workspace."
    >
      <section className="auth-card">
        <div className="auth-card-header">
          <p className="section-eyebrow">Forgot password</p>
          <h2>Request a reset link</h2>
          <p className="section-description">
            We will send a reset link to your email using the configured Supabase redirect URL.
          </p>
        </div>
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
    </AuthShell>
  );
}
