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

      if (!Array.isArray(skills) || skills.length === 0) {
        res.status(400).json({
          success: false,
          message: "skills is required and must be a non-empty array of strings.",
        });
        return;
      }

      if (!skills.every((s: unknown) => typeof s === "string" && s.trim().length > 0 && s.length <= 200)) {
        res.status(400).json({
          success: false,
          message: "Each skill must be a non-empty string with max 200 characters.",
        });
        return;
      }

      const input: JobMatchingInput = {
        skills: skills.map((s: string) => s.trim()),
        preferredLocation: typeof preferredLocation === "string" ? preferredLocation : undefined,
        preferredWorkMode: typeof preferredWorkMode === "string" && ["Remote", "Hybrid", "Onsite"].includes(preferredWorkMode)
          ? preferredWorkMode as "Remote" | "Hybrid" | "Onsite"
          : undefined,
        preferredJobType: typeof preferredJobType === "string" && ["Full-time", "Part-time", "Internship", "Contract", "Freelance"].includes(preferredJobType)
          ? preferredJobType as "Full-time" | "Part-time" | "Internship" | "Contract" | "Freelance"
          : undefined,
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