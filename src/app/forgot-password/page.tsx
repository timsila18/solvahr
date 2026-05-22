"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";

async function withAuthTimeout<T>(promise: Promise<T>, actionLabel: string) {
  return await Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`${actionLabel} timed out. Please try again.`));
      }, 15000);
    }),
  ]);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await withAuthTimeout(
        fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }),
        "Reset link request"
      );

      const payload = (await response.json()) as { error?: string; message?: string };
      setMessage(payload.error ?? payload.message ?? "Password reset link sent. Check your email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not send the reset link right now.");
    } finally {
      setSubmitting(false);
    }
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
