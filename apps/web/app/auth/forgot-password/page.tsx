"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-mark">AI</div>
          <span>Career Agent</span>
        </div>

        <div className="auth-header">
          <p className="eyebrow">ACCOUNT RECOVERY</p>
          <h1>Forgot password?</h1>
          <p>
            Enter your email and we'll help you recover access to your account.
          </p>
        </div>

        <form className="manual-form">
          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <button className="primary-button" type="submit">
            Continue
            <span>→</span>
          </button>
        </form>

        <p className="auth-footer">
          Remember your password?{" "}
          <Link href="/login">Back to login</Link>
        </p>
      </section>
    </main>
  );
}