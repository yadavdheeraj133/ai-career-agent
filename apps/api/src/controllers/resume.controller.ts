import { Request, Response } from "express";
import { resumeService } from "../services/resume.service.js";
import { createResumeSchema, updateResumeSchema } from "../validators/auth/create-resume.validator.js";

export class ResumeController {
  async createResume(req: Request, res: Response) {
    try {
      const data = createResumeSchema.parse(req.body);

      const resume = await resumeService.createResume(
        req.user.id,
        data
      );

      return res.status(201).json({
        success: true,
        message: "Resume created successfully.",
        data: resume,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getResume(req: Request, res: Response) {
    try {
      const resume = await resumeService.getResume(req.user.id);

      return res.status(200).json({
        success: true,
        data: resume,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * The canonical structured resume. This is what the web viewer and every AI
   * feature read, so there is one shape for a user's resume across the app.
   */
  async getResumeDocument(req: Request, res: Response) {
    try {
      const primary = await resumeService.getPrimaryResume(req.user.id);

      if (!primary) {
        return res.status(404).json({
          success: false,
          message: "No resume found. Upload your resume to continue.",
        });
      }

      return res.status(200).json({
        success: true,
        data: primary,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateResume(req: Request, res: Response) {
    try {
      const data = updateResumeSchema.parse(req.body);

      const resume = await resumeService.updateResume(
        req.user.id,
        data
      );

      return res.status(200).json({
        success: true,
        message: "Resume updated successfully.",
        data: resume,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteResume(req: Request, res: Response) {
    try {
      await resumeService.deleteResume(req.user.id);

      return res.status(200).json({
        success: true,
        message: "Resume deleted successfully.",
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export const resumeController = new ResumeController();