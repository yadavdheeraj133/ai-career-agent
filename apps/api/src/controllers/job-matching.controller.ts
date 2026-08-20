import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  jobMatchingService,
  type JobMatchingInput,
} from "../services/job-matching.service.js";

export class JobMatchingController {
  async matchJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        skills,
        preferredLocation,
        preferredWorkMode,
        preferredJobType,
      } = req.body;

      const input: JobMatchingInput = {
        skills,
        preferredLocation,
        preferredWorkMode,
        preferredJobType,
      };

      const results =
        await jobMatchingService.matchJobs(input);

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const jobMatchingController =
  new JobMatchingController();