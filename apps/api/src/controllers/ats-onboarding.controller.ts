import { Request, Response, NextFunction } from "express";
import { atsOnboardingService } from "../services/ats-onboarding.service.js";

export class AtsOnboardingController {
  async status(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await atsOnboardingService.getStatus(req.user.id);
      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobDescription } = req.body as { jobDescription?: unknown };

      if (typeof jobDescription !== "string" || jobDescription.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "jobDescription is required and must be a non-empty string.",
        });
        return;
      }

      const result = await atsOnboardingService.runCheck(req.user.id, jobDescription);

      res.status(200).json({
        success: true,
        message: result.passed
          ? "ATS check passed. You can continue onboarding."
          : "ATS check completed. Improve your resume to reach the required score.",
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && /no resume found/i.test(error.message)) {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const atsOnboardingController = new AtsOnboardingController();
