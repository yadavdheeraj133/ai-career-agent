import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  jobBookmarkService,
} from "../services/job-bookmark.service.js";

export class JobBookmarkController {
  async bookmarkJob(
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
          message: "Job id is required",
        });
        return;
      }

      const result =
        await jobBookmarkService.bookmarkJob(id);

      res.status(200).json({
        success: true,
        message: "Job bookmarked successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeBookmark(
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
          message: "Job id is required",
        });
        return;
      }

      const result =
        await jobBookmarkService.removeBookmark(id);

      res.status(200).json({
        success: true,
        message: "Job bookmark removed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const jobBookmarkController =
  new JobBookmarkController();