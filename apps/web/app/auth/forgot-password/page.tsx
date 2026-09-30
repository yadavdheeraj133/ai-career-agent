"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/api";

type Step = "request" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await apiRequest<{ resetToken: string | null }>(
        "/auth/forgot-password",
        { method: "POST", body: { email: email.trim() }, auth: false }
      );

      const token = response.data?.resetToken ?? null;

      if (token) {
        // Non-production: the API exposes the token so the reset can be
        // completed without an email provider.
        setResetToken(token);
        setStep("reset");
      } else {
        setMessage(
          response.message ??
            "If an account exists for that email, a reset link has been sent."
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to send a reset link."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!resetToken) {
      setError("Your reset session has expired. Please start again.");
      setStep("request");
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiRequest<null>("/auth/reset-password", {
        method: "POST",
        body: { token: resetToken, newPassword },
        auth: false,
      });

      setMessage(response.message ?? "Password has been reset successfully.");
      setResetToken(null);
      setNewPassword("");
      setConfirmPassword("");
      setStep("done");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to reset your password."
      );
    } finally {
      setSubmitting(false);
    }
  }

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
          <p className="eyebrow">ACCOUNT RECOVERY</p>

          {step === "reset" ? (
            <>
              <h1>Create new password</h1>
              <p>Choose a new password for your account.</p>
            </>
          ) : step === "done" ? (
            <>
              <h1>Password updated</h1>
              <p>You can now log in with your new password.</p>
            </>
          ) : (
            <>
              <h1>Forgot password?</h1>
              <p>
                Enter your email and we&apos;ll help you recover access to your
                account.
              </p>
            </>
          )}
        </div>

        {step === "request" ? (
          <form className="manual-form" onSubmit={handleRequest}>
            <label>
              Email
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}
            {message ? <p className="form-notice">{message}</p> : null}

            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Continue"}
              <span>→</span>
            </button>
          </form>
        ) : null}

        {step === "reset" ? (
          <form className="manual-form" onSubmit={handleReset}>
            <label>
              New Password
              <input
                type="password"
                name="newPassword"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                maxLength={32}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>

            <label>
              Confirm New Password
              <input
                type="password"
                name="confirmPassword"
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                minLength={8}
                maxLength={32}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Resetting…" : "Reset Password"}
              <span>→</span>
            </button>
          </form>
        ) : null}

        {step === "done" ? (
          <div className="manual-form">
            {message ? <p className="form-notice">{message}</p> : null}

            <Link href="/auth/login" className="primary-button">
              Back to Login
              <span>→</span>
            </Link>
          </div>
        ) : null}

        <p className="auth-footer">
          Remember your password?{" "}
          <Link href="/auth/login">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
