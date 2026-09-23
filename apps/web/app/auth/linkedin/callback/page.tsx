"use client";

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
      window.location.href = "/dashboard";
    } else {
      router.replace("/auth/login?error=missing_token");
    }
  }, [router]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-mark">AI</div>
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
