import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  jobApplicationService,
  type JobApplicationInput,
} from "../services/job-application.service.js";

export class JobApplicationController {
  async createApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        jobId,
        status,
        appliedAt,
        notes,
      } = req.body;

      const input: JobApplicationInput = {
        jobId,
        status,
        appliedAt,
        notes,
      };

      const application =
        await jobApplicationService.createApplication(
          input
        );

      res.status(201).json({
        success: true,
        message: "Job application created successfully.",
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  async getApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const jobId = Array.isArray(req.params.jobId)
        ? req.params.jobId[0]
        : req.params.jobId;

      if (!jobId) {
        res.status(400).json({
          success: false,
          message: "Job id is required.",
        });
        return;
      }

      const application =
        await jobApplicationService.getApplication(
          jobId
        );

      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const jobApplicationController =
  new JobApplicationController();