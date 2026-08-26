"use client";

import Link from "next/link";

export default function LoginPage() {
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

        <form className="manual-form">
          <label>
            Email / Username
            <input
              type="text"
              name="identifier"
              placeholder="Enter your email or username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              required
            />
          </label>

          <div className="forgot-row">
            <Link href="/forgot-password">Forgot password?</Link>
          </div>

          <button className="primary-button" type="submit">
            Log in
            <span>→</span>
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link href="/register">Create account</Link>
        </p>
      </section>
    </main>
  );
}