// apps/api/src/controllers/ai.controller.ts

import { Request, Response, NextFunction } from "express";

import { careerAIService } from "../services/resume-ai.service.js";

export class AIController {
  async analyzeResume(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { resume } = req.body;

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
      const { resume, jobDescription } = req.body;

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
      const { resume, jobDescription } = req.body;

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
      const { resume, jobDescription } = req.body;

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
      const { resume, jobDescription } = req.body;

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
      const { resume, jobDescription } = req.body;

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
      const { resume, jobDescription } = req.body;

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