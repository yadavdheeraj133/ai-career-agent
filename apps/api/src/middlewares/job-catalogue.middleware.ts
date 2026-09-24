import { Request, Response, NextFunction } from "express";

/**
 * Authorization for global job-catalogue mutations.
 *
 * Smallest correct model given no role column exists:
 * - If `WORKER_SECRET` is configured, a request must present it via the
 *   `x-worker-secret` header, OR the authenticated user's email must be in
 *   `ADMIN_EMAILS` (comma-separated).
 * - If neither is configured, production fails closed (403) while
 *   development/test remain permissive so existing flows and tests work
 *   until the deployment configures authorization.
 */
function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const jobCatalogueAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const workerSecret = process.env.WORKER_SECRET ?? "";
  const adminEmails = getAdminEmails();
  const enforcementConfigured = workerSecret !== "" || adminEmails.length > 0;

  if (!enforcementConfigured) {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message:
          "Job catalogue mutation is disabled: WORKER_SECRET or ADMIN_EMAILS must be configured.",
      });
    }
    return next();
  }

  const providedSecret = req.header("x-worker-secret") ?? "";
  if (workerSecret !== "" && providedSecret === workerSecret) {
    return next();
  }

  const userEmail = req.user?.email?.toLowerCase() ?? "";
  if (userEmail !== "" && adminEmails.includes(userEmail)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden: job catalogue mutation requires worker or admin authorization.",
  });
};
