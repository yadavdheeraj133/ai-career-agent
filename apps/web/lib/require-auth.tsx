"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "./auth-context";

/**
 * Client-side route guard. Renders a themed loading state while the session is
 * resolved and redirects to the login page when the user is unauthenticated.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <span className="app-loading-spinner" aria-hidden="true" />
        <p>{status === "loading" ? "Loading your session…" : "Redirecting to login…"}</p>
      </div>
    );
  }

  return <>{children}</>;
}
