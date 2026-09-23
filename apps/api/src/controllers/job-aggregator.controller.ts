import { Request, Response, NextFunction } from "express";

import { jobAggregatorService } from "../services/job-aggregator.service.js";

const MAX_BATCH_SIZE = 100;

export class JobAggregatorController {
  async aggregateJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { jobs } = req.body;

      if (!Array.isArray(jobs) || jobs.length === 0) {
        res.status(400).json({
          success: false,
          message: "jobs is required and must be a non-empty array.",
        });
        return;
      }

      if (jobs.length > MAX_BATCH_SIZE) {
        res.status(400).json({
          success: false,
          message: `jobs array must not exceed ${MAX_BATCH_SIZE} items.`,
        });
        return;
      }

      const result =
        await jobAggregatorService.aggregateJobs(jobs);

      res.status(200).json({
        success: true,
        message: "Jobs aggregated successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const jobAggregatorController =
  new JobAggregatorController();