import { Request, Response } from "express";
import { linkedinService } from "../services/linkedin.service.js";
import { env } from "../config/env.js";

/**
 * GET /auth/linkedin
 *
 * Redirects the user to LinkedIn's authorization page.
 */
export const linkedinAuth = async (_req: Request, res: Response) => {
  try {
    const { url, state } = linkedinService.generateAuthUrl();

    // Store state in a signed, httpOnly cookie for CSRF validation on callback.
    res.cookie("linkedin_oauth_state", state, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes
      signed: true,
    });

    return res.redirect(url);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to initiate LinkedIn auth";

    // If LinkedIn is not configured, redirect to frontend with error
    if (message.includes("not configured")) {
      const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";
      return res.redirect(`${frontendUrl}/auth/login?error=linkedin_not_configured`);
    }

    return res.status(500).json({
      success: false,
      message,
      data: null,
    });
  }
};

/**
 * GET /auth/linkedin/callback
 *
 * Handles the LinkedIn OAuth callback, exchanges the code for tokens,
 * fetches user info, creates/finds the user, and redirects to the frontend
 * with the JWT token in the URL fragment for the existing frontend session.
 */
export const linkedinCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";

  // Handle LinkedIn returning an error (e.g. user denied access)
  if (error) {
    return res.redirect(
      `${frontendUrl}/auth/login?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return res.redirect(`${frontendUrl}/auth/login?error=missing_code`);
  }

  // Validate CSRF state
  const storedState = req.signedCookies?.linkedin_oauth_state as string | undefined;

  if (!state || state !== storedState) {
    return res.redirect(`${frontendUrl}/auth/login?error=invalid_state`);
  }

  // Clear the state cookie
  res.clearCookie("linkedin_oauth_state");

  try {
    const result = await linkedinService.handleCallback(code);

    // Fragments are processed by the browser and are not sent in the HTTP
    // request, which keeps the application token out of server access logs.
    return res.redirect(
      `${frontendUrl}/auth/linkedin/callback#token=${encodeURIComponent(result.token)}`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LinkedIn authentication failed";

    return res.redirect(
      `${frontendUrl}/auth/login?error=${encodeURIComponent(message)}`
    );
  }
};
