import {
  Request,
  Response,
  NextFunction,
} from "express";

import { interviewAIService } from "../services/interview-ai.service.js";
import { resolveResumeInput } from "./ai-resume-input.js";

const MAX_INPUT_LENGTH = 50000;

function requireString(value: unknown, maxLength = MAX_INPUT_LENGTH): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export class InterviewController {
  async prepareInterview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resume = await resolveResumeInput(req, res);
      if (!resume) {
        return;
      }

      const jobDescription = req.body?.jobDescription;

      if (!requireString(jobDescription)) {
        res.status(400).json({
          success: false,
          message: "jobDescription is required and must be a non-empty string.",
        });
        return;
      }

      const result =
        await interviewAIService.prepareInterview(
          resume,
          jobDescription
        );

      res.status(200).json({
        success: true,
        message:
          "Interview preparation generated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateJobSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { jobDescription } = req.body;

      if (!requireString(jobDescription)) {
        res.status(400).json({
          success: false,
          message: "jobDescription is required and must be a non-empty string.",
        });
        return;
      }

      const result =
        await interviewAIService.generateJobSummary(
          jobDescription
        );

      res.status(200).json({
        success: true,
        message:
          "Job summary generated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateCompanyInsight(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { companyInformation } = req.body;

      if (!requireString(companyInformation)) {
        res.status(400).json({
          success: false,
          message: "companyInformation is required and must be a non-empty string.",
        });
        return;
      }

      const result =
        await interviewAIService.generateCompanyInsight(
          companyInformation
        );

      res.status(200).json({
        success: true,
        message:
          "Company insight generated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const interviewController =
  new InterviewController();
