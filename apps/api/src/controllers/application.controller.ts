import { Request, Response, NextFunction } from "express";

import { applicationAIService } from "../services/application-ai.service.js";
import { resolveResumeInput } from "./ai-resume-input.js";

const MAX_INPUT_LENGTH = 50000;

function requireString(value: unknown, maxLength = MAX_INPUT_LENGTH): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export class ApplicationController {
  async generateCoverLetter(
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
      const resume = await resolveResumeInput(req, res);
      if (!resume) {
        return;
      }

      const {
        jobDescription,
        companyName,
        jobTitle,
        candidateName,
        platform,
      } = req.body;

      if (!requireString(jobDescription)) {
        res.status(400).json({
          success: false,
          message: "jobDescription is required and must be a non-empty string.",
        });
        return;
      }

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
      const resume = await resolveResumeInput(req, res);
      if (!resume) {
        return;
      }

      const {
        question,
        jobDescription,
      } = req.body;

      if (!requireString(question) || !requireString(jobDescription)) {
        res.status(400).json({
          success: false,
          message: "question and jobDescription are required and must be non-empty strings.",
        });
        return;
      }

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
