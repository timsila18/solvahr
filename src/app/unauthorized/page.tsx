import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="section-eyebrow">Solva HR</p>
        <h1>Sign in required</h1>
        <p className="section-description">
          Your session is missing or expired. Sign in again to continue with your Solva HR workspace.
        </p>
        <div className="auth-links">
          <Link href="/login">Go to login</Link>
        </div>
      </section>
    </main>
  );
}
