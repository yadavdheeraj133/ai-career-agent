import { Request, Response, NextFunction } from "express";

import { careerGuidanceAIService } from "../services/career-ai.service.js";
import { resolveResumeInput } from "./ai-resume-input.js";

const MAX_INPUT_LENGTH = 50000;

function requireString(value: unknown, maxLength = MAX_INPUT_LENGTH): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export class CareerController {
  async generateCareerCoach(
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
        currentRole,
        careerGoal,
      } = req.body;

      if (!requireString(careerGoal)) {
        res.status(400).json({
          success: false,
          message: "careerGoal is required and must be a non-empty string.",
        });
        return;
      }

      const result =
        await careerGuidanceAIService.generateCareerCoach(
          resume,
          currentRole,
          careerGoal
        );

      res.status(200).json({
        success: true,
        message:
          "Career coaching generated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateCareerRoadmap(
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
        currentRole,
        careerGoal,
      } = req.body;

      if (!requireString(careerGoal)) {
        res.status(400).json({
          success: false,
          message: "careerGoal is required and must be a non-empty string.",
        });
        return;
      }

      const result =
        await careerGuidanceAIService.generateCareerRoadmap(
          resume,
          currentRole,
          careerGoal
        );

      res.status(200).json({
        success: true,
        message:
          "Career roadmap generated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateLearningPath(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resume = await resolveResumeInput(req, res);
      if (!resume) {
        return;
      }

      const careerGoal = req.body?.careerGoal;

      if (!requireString(careerGoal)) {
        res.status(400).json({
          success: false,
          message: "careerGoal is required and must be a non-empty string.",
        });
        return;
      }

      const result =
        await careerGuidanceAIService.generateLearningPath(
          resume,
          careerGoal
        );

      res.status(200).json({
        success: true,
        message:
          "Learning path generated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const careerController =
  new CareerController();
