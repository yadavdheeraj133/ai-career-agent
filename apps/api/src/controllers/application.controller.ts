import { Request, Response, NextFunction } from "express";

import { applicationAIService } from "../services/application-ai.service.js";

export class ApplicationController {
  async generateCoverLetter(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { resume, jobDescription } = req.body;

      const result =
        await applicationAIService.generateCoverLetter(
          resume,
          jobDescription
        );

      res.status(200).json({
        success: true,
        message: "Cover letter generated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateApplicationMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        resume,
        jobDescription,
        companyName,
        jobTitle,
        candidateName,
        platform,
      } = req.body;

      const result =
        await applicationAIService.generateApplicationMessage(
          resume,
          jobDescription,
          companyName,
          jobTitle,
          candidateName,
          platform
        );

      res.status(200).json({
        success: true,
        message:
          "Application message generated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateApplicationAnswer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        question,
        resume,
        jobDescription,
      } = req.body;

      const result =
        await applicationAIService.generateApplicationAnswer(
          question,
          resume,
          jobDescription
        );

      res.status(200).json({
        success: true,
        message:
          "Application answer generated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const applicationController =
  new ApplicationController();