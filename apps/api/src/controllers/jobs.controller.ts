import { NextFunction, Request, Response } from "express";
import { jobService } from "../services/jobs.service.js";
import {
  createJobSchema,
  updateJobSchema,
} from "../validators/auth/jobs.validator.js";

export class JobController {
  async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createJobSchema.parse(req.body);

      const job = await jobService.createJob(data);

      return res.status(201).json({
        success: true,
        message: "Job created successfully",
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const jobs = await jobService.getAllJobs();

      return res.status(200).json({
        success: true,
        count: jobs.length,
        data: jobs,
      });
    } catch (error) {
      next(error);
    }
  }

  async getJobById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Job id is required",
        });
      }

      const job = await jobService.getJobById(id);

      return res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateJob(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Job id is required",
        });
      }

      const data = updateJobSchema.parse(req.body);

      const job = await jobService.updateJob(id, data);

      return res.status(200).json({
        success: true,
        message: "Job updated successfully",
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteJob(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Job id is required",
        });
      }

      await jobService.deleteJob(id);

      return res.status(200).json({
        success: true,
        message: "Job deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

export const jobController = new JobController();