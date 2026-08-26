"use client";

import Link from "next/link";

export default function ManualRegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-mark">AI</div>
          <span>Career Agent</span>
        </div>

        <div className="auth-header">
          <p className="eyebrow">CREATE ACCOUNT</p>

          <h1>Create your account</h1>

          <p>
            Enter your details to create your AI Career Agent account.
          </p>
        </div>

        <form className="manual-form">
          <label>
            Full name

            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </label>

          <label>
            Email

            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              name="password"
              placeholder="Create a password"
              autoComplete="new-password"
              required
            />
          </label>

          <button className="primary-button" type="submit">
            Create account
            <span>→</span>
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}