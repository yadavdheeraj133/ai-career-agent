"use client";

import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand">
          <div className="brand-mark">AI</div>
          <span>Career Agent</span>
        </div>

        <div className="auth-header">
          <p className="eyebrow">GET STARTED</p>

          <h1>Create your account</h1>

          <p>
            Build a smarter career path with your personal AI career agent.
          </p>
        </div>

        <button className="linkedin-button" type="button">
          <span className="linkedin-icon">in</span>
          Continue with LinkedIn
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        <Link href="/register/manual" className="manual-button">
          <span>Register manually</span>
          <span>→</span>
        </Link>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}