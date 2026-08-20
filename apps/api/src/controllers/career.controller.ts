import { Request, Response, NextFunction } from "express";

import { careerGuidanceAIService } from "../services/career-ai.service.js";

export class CareerController {
  async generateCareerCoach(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        resume,
        currentRole,
        careerGoal,
      } = req.body;

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
      const {
        resume,
        currentRole,
        careerGoal,
      } = req.body;

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
      const { resume, careerGoal } = req.body;

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