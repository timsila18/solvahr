"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/solva-api";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function parseSignupError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "We could not create your account right now.";
}

export function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          phone: phone || null,
          password,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new ApiError(response.status, payload.error ?? "signup_failed");
      }

      const supabase = getSupabaseBrowserClient();
      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInResult.error) {
        throw signInResult.error;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setMessage(parseSignupError(error));
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-card-header">
        <p className="section-eyebrow">Create account</p>
        <h2>Start employee self service</h2>
        <p className="section-description">
          Create an employee-linked ESS account and sign in immediately to your Solva HR workspace.
        </p>
      </div>
      <form className="action-form" onSubmit={handleSubmit}>
        <label>
          <span>Full name</span>
          <input
            autoComplete="name"
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Jane Njeri"
            required
            type="text"
            value={fullName}
          />
        </label>
        <label>
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jane@company.com"
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          <span>Phone</span>
          <input
            autoComplete="tel"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+254 700 000000"
            type="tel"
            value={phone}
          />
        </label>
        <label>
          <span>Password</span>
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            type="password"
            value={password}
          />
        </label>
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <div className="auth-links">
        <Link href="/login">Already have an account? Sign in</Link>
      </div>
      {message ? <div className="task-banner">{message}</div> : null}
    </section>
  );
}
