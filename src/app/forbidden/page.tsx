import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="section-eyebrow">Solva HR</p>
        <h1>Access restricted</h1>
        <p className="section-description">
          Your account is active, but this module is outside your current role permissions. Contact your administrator
          if you need access.
        </p>
        <div className="auth-links">
          <Link href="/">Back to workspace</Link>
          <Link href="/login">Switch account</Link>
        </div>
      </section>
    </main>
  );
}
