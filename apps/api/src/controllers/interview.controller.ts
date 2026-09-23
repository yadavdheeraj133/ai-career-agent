import {
  Request,
  Response,
  NextFunction,
} from "express";

import { interviewAIService } from "../services/interview-ai.service.js";

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
      const { resume, jobDescription } = req.body;

      if (!requireString(resume) || !requireString(jobDescription)) {
        res.status(400).json({
          success: false,
          message: "resume and jobDescription are required and must be non-empty strings.",
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
