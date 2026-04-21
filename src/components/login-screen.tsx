"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => searchParams.get("redirectTo") ?? "/", [searchParams]);
  const inboundMessage = useMemo(() => searchParams.get("message") ?? "", [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(inboundMessage);

  useEffect(() => {
    setMessage(inboundMessage);
  }, [inboundMessage]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
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
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            type="password"
            value={password}
          />
        </label>
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="auth-links">
        <Link href="/forgot-password">Forgot password?</Link>
        <Link href="/signup">Create ESS account</Link>
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
