// apps/api/src/controllers/ai.controller.ts

import { Request, Response, NextFunction } from "express";

import { careerAIService } from "../services/resume-ai.service.js";
import { resolveResumeInput } from "./ai-resume-input.js";

const MAX_INPUT_LENGTH = 50000;

function requireString(value: unknown, maxLength = MAX_INPUT_LENGTH): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export class AIController {
  /**
   * Loads the resume for an AI call, preferring the caller's own text and
   * falling back to their stored primary resume.
   */
  private resolveResume(req: Request, res: Response): Promise<string | null> {
    return resolveResumeInput(req, res);
  }

  async analyzeResume(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resume = await this.resolveResume(req, res);
      if (!resume) {
        return;
      }

      const result =
        await careerAIService.analyzeResume(resume);

      res.status(200).json({
        success: true,
        message: "Resume analyzed successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async analyzeATS(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resume = await this.resolveResume(req, res);
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
        await careerAIService.analyzeATS(
          resume,
          jobDescription
        );

      res.status(200).json({
        success: true,
        message: "ATS analysis completed successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async analyzeSkillGap(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resume = await this.resolveResume(req, res);
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
        await careerAIService.analyzeSkillGap(
          resume,
          jobDescription
        );

      res.status(200).json({
        success: true,
        message:
          "Skill gap analysis completed successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async tailorResume(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resume = await this.resolveResume(req, res);
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
        await careerAIService.tailorResume(
          resume,
          jobDescription
        );

      res.status(200).json({
        success: true,
        message: "Resume tailored successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async matchResumeWithJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resume = await this.resolveResume(req, res);
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
        await careerAIService.matchResumeWithJob(
          resume,
          jobDescription
        );

      res.status(200).json({
        success: true,
        message:
          "Resume and job match analysis completed successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateAIVerdict(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resume = await this.resolveResume(req, res);
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
        await careerAIService.generateAIVerdict(
          resume,
          jobDescription
        );

      res.status(200).json({
        success: true,
        message: "AI verdict generated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async calculateInterviewProbability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resume = await this.resolveResume(req, res);
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
        await careerAIService.calculateInterviewProbability(
          resume,
          jobDescription
        );

      res.status(200).json({
        success: true,
        message:
          "Interview probability calculated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AIController();
