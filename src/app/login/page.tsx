import { Suspense } from "react";
import { LoginScreen } from "@/components/login-screen";

export default function LoginPage() {
  return (
    <main className="auth-screen">
      <Suspense
        fallback={
          <section className="auth-card">
            <p className="section-description">Loading sign-in...</p>
          </section>
        }
      >
        <LoginScreen />
      </Suspense>
    </main>
  );
}
