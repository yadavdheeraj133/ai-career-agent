import { Request, Response, NextFunction } from "express";

import { jobAggregatorService } from "../services/job-aggregator.service.js";

export class JobAggregatorController {
  async aggregateJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { jobs } = req.body;

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