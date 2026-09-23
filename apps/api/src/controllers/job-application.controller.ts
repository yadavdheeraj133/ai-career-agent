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

      if (!jobId || typeof jobId !== "string") {
        res.status(400).json({
          success: false,
          message: "jobId is required and must be a string.",
        });
        return;
      }

      const allowedStatuses = ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"] as const;

      if (!status || !allowedStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `status is required and must be one of: ${allowedStatuses.join(", ")}.`,
        });
        return;
      }

      const input: JobApplicationInput = {
        jobId,
        status,
        appliedAt,
        notes,
      };

      const application =
        await jobApplicationService.createApplication(
          req.user.id,
          input
        );

      res.status(201).json({
        success: true,
        message: "Job application created successfully.",
        data: application,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        /appliedAt must be a valid/i.test(error.message)
      ) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
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
          req.user.id,
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

  async listApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;

      const allowedStatuses = ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"] as const;

      if (status !== undefined && !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
        res.status(400).json({
          success: false,
          message: `status must be one of: ${allowedStatuses.join(", ")}.`,
        });
        return;
      }

      const applications =
        await jobApplicationService.listApplications(req.user.id, status);

      res.status(200).json({
        success: true,
        data: applications,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Application id is required.",
        });
        return;
      }

      const { status, notes } = req.body;

      const allowedStatuses = ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"] as const;

      if (
        status !== undefined &&
        !allowedStatuses.includes(status as (typeof allowedStatuses)[number])
      ) {
        res.status(400).json({
          success: false,
          message: `status must be one of: ${allowedStatuses.join(", ")}.`,
        });
        return;
      }

      if (notes !== undefined && typeof notes !== "string") {
        res.status(400).json({
          success: false,
          message: "notes must be a string.",
        });
        return;
      }

      const application =
        await jobApplicationService.updateApplication(req.user.id, id, {
          status,
          notes,
        });

      res.status(200).json({
        success: true,
        message: "Job application updated successfully.",
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const jobApplicationController =
  new JobApplicationController();