import {
  Request,
  Response,
  NextFunction,
} from "express";

import { interviewAIService } from "../services/interview-ai.service.js";

export class InterviewController {
  async prepareInterview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { resume, jobDescription } = req.body;

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