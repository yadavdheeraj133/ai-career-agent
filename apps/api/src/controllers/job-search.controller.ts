import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  jobSearchService,
  type JobSearchFilters,
} from "../services/job-search.service.js";

export class JobSearchController {
  async searchJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters: JobSearchFilters = {
        keyword:
          typeof req.query.keyword === "string"
            ? req.query.keyword
            : undefined,

        location:
          typeof req.query.location === "string"
            ? req.query.location
            : undefined,

        workMode:
          typeof req.query.workMode === "string"
            ? (req.query.workMode as JobSearchFilters["workMode"])
            : undefined,

        jobType:
          typeof req.query.jobType === "string"
            ? (req.query.jobType as JobSearchFilters["jobType"])
            : undefined,

        experience:
          typeof req.query.experience === "string"
            ? req.query.experience
            : undefined,

        source:
          typeof req.query.source === "string"
            ? req.query.source
            : undefined,
      };

      const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, Number.parseInt(String(req.query.pageSize ?? "50"), 10) || 50)
      );

      const result = await jobSearchService.searchJobs(filters, { page, pageSize });

      res.status(200).json({
        success: true,
        count: result.jobs.length,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        data: result.jobs,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const jobSearchController =
  new JobSearchController();