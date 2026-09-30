"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { setToken } from "@/lib/api";

export default function LinkedInCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const token = hashParams.get("token");
    const error = params.get("error") ?? hashParams.get("error");

    if (error) {
      router.replace(`/auth/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      setToken(token);
      // A brand-new LinkedIn account starts Skills onboarding; an existing
      // account goes straight to the dashboard.
      const isNewUser = hashParams.get("new") === "1";
      window.location.replace(isNewUser ? "/skill" : "/dashboard");
    } else {
      router.replace("/auth/login?error=missing_token");
    }
  }, [router]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-mark">
            <Image src="/logo.png" alt="AI Career Agent" width={34} height={34} />
          </div>
          <span>Career Agent</span>
        </div>
        <div className="auth-header">
          <h1>Signing in with LinkedIn...</h1>
          <p>Please wait while we complete your authentication.</p>
        </div>
      </section>
    </main>
  );
}
