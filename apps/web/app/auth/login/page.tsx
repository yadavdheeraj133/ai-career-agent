"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const callbackError = new URLSearchParams(window.location.search).get("error");
    if (callbackError) {
      setError(callbackError.replaceAll("_", " "));
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(identifier.trim(), password);
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to log in.");
      setSubmitting(false);
    }
  }

  function handleLinkedInLogin() {
    window.location.href = `${API_BASE_URL}/auth/linkedin`;
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-mark">AI</div>
          <span>Career Agent</span>
        </div>

        <div className="auth-header">
          <p className="eyebrow">WELCOME BACK</p>
          <h1>Welcome back</h1>
          <p>Log in to continue building your career with AI.</p>
        </div>

      
        <form className="manual-form" onSubmit={handleSubmit}>
          <label>
            Email / Username
            <input
              type="text"
              name="identifier"
              placeholder="Enter your email or username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <div className="forgot-row">
            <Link href="/auth/forgot-password">Forgot password?</Link>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
            <span>→</span>
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register">Create account</Link>
        </p>
      </section>
    </main>
  );
}
