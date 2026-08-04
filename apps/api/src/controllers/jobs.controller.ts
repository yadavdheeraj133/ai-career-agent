import { Request, Response } from "express";
import { jobService } from "../services/jobs.service.js";
import {
  createJobSchema,
  updateJobSchema,
} from "../validators/auth/jobs.validator.js";

export class JobController {
  async createJob(req: Request, res: Response) {
    const data = createJobSchema.parse(req.body);

    const job = await jobService.createJob(data);

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: job,
    });
  }

  async getAllJobs(req: Request, res: Response) {
    const jobs = await jobService.getAllJobs();

    return res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  }

  async getJobById(req: Request, res: Response) {
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
  }

  async updateJob(req: Request, res: Response) {
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
  }

  async deleteJob(req: Request, res: Response) {
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
  }
}

export const jobController = new JobController();