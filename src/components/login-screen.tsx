"use client";

import Link from "next/link";
import { useState } from "react";

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

export function LoginScreen({
  inboundMessage = "",
  redirectTo = "/",
}: {
  inboundMessage?: string;
  redirectTo?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(inboundMessage);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await withAuthTimeout(
        fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }),
        "Sign in"
      );

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? "We could not sign you in right now.");
        setSubmitting(false);
        return;
      }

      window.location.assign(redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not sign you in right now.");
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-card-header">
        <p className="section-eyebrow">Welcome back</p>
        <h2>Sign in to Solva HR</h2>
        <p className="section-description">
          Secure access for HR, payroll, finance, recruitment, managers, supervisors, and employees.
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
        <label>
          <span>Password</span>
          <div className="password-input-row">
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              className="ghost-button password-visibility-toggle"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="auth-links">
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/signup">Register organization</Link>
      </div>
      <div className="auth-role-strip">
        <span>Super Admin</span>
        <span>HR Admin</span>
        <span>Payroll Admin</span>
        <span>Employee</span>
      </div>
      {message ? <div className="task-banner">{message}</div> : null}
    </section>
  );
}
