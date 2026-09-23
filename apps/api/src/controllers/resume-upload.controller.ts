import { Request, Response, NextFunction } from "express";
import { resumeUploadService } from "../services/resume-upload.service.js";

export class ResumeUploadController {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "A PDF, DOC, or DOCX resume file is required." });
        return;
      }
      const resume = await resumeUploadService.upload(req.user.id, req.file);
      res.status(200).json({ success: true, message: "Resume uploaded and processed successfully.", data: resume });
    } catch (error) {
      next(error);
    }
  }

  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = await resumeUploadService.getFilePath(req.user.id);
      res.download(file.path, file.originalFileName);
    } catch (error) {
      next(error);
    }
  }
}

export const resumeUploadController = new ResumeUploadController();