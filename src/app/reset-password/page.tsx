"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    setMessage("Password updated. Redirecting to login...");
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 900);
  }

  return (
    <AuthShell
      eyebrow="Password Recovery"
      title="Set a new password"
      description="Finish the recovery flow and securely return to your Solva HR account."
    >
      <section className="auth-card">
        <div className="auth-card-header">
          <p className="section-eyebrow">Reset password</p>
          <h2>Choose a new password</h2>
          <p className="section-description">
            Finish the recovery flow and set a new password for your Solva HR account.
          </p>
        </div>
        <form className="action-form" onSubmit={handleSubmit}>
          <label>
            <span>New password</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label>
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Updating..." : "Update password"}
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
