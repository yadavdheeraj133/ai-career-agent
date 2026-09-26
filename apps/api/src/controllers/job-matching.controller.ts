import {
  Request,
  Response,
  NextFunction,
} from "express";

import { prisma } from "../lib/prisma.js";
import {
  jobMatchingService,
  STRONG_MATCH_THRESHOLD,
  type JobMatchResult,
} from "../services/job-matching.service.js";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const WORK_MODES = ["Remote", "Hybrid", "Onsite"] as const;
const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Freelance"] as const;

type MatchFilters = {
  keyword?: string;
  location?: string;
  workMode?: string;
  jobType?: string;
  experience?: string;
};

export class JobMatchingController {
  async matchJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const body = req.body ?? {};
      const hasSkillsKey = Object.prototype.hasOwnProperty.call(body, "skills");
      const incomingSkills = body.skills;

      if (hasSkillsKey) {
        if (
          !Array.isArray(incomingSkills) ||
          incomingSkills.length === 0 ||
          !incomingSkills.every(
            (skill: unknown) =>
              typeof skill === "string" &&
              skill.trim().length > 0 &&
              skill.length <= 200
          )
        ) {
          res.status(400).json({
            success: false,
            message: "skills is required and must be a non-empty array of strings.",
          });
          return;
        }
      }

      const persistedProfile = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          skills: { select: { name: true } },
          preferences: { select: { location: true, workMode: true, jobType: true } },
          resume: { select: { skills: true, parsedProfile: true } },
        },
      });

      const hasPersistedProfile = Boolean(
        persistedProfile &&
          (persistedProfile.skills.length > 0 ||
            persistedProfile.preferences !== null ||
            persistedProfile.resume !== null)
      );

      if (!hasSkillsKey && !hasPersistedProfile && Object.keys(body).length === 0) {
        res.status(400).json({
          success: false,
          message: "skills is required and must be a non-empty array of strings.",
        });
        return;
      }

      let results: JobMatchResult[];

      if (hasPersistedProfile) {
        results = await jobMatchingService.matchJobs(req.user.id);
      } else if (hasSkillsKey) {
        results = await jobMatchingService.matchJobs({
          skills: incomingSkills,
          preferredLocation:
            typeof body.preferredLocation === "string"
              ? body.preferredLocation
              : undefined,
          preferredWorkMode:
            typeof body.preferredWorkMode === "string" &&
            WORK_MODES.includes(body.preferredWorkMode as (typeof WORK_MODES)[number])
              ? (body.preferredWorkMode as (typeof WORK_MODES)[number])
              : undefined,
          preferredJobType:
            typeof body.preferredJobType === "string" &&
            JOB_TYPES.includes(body.preferredJobType as (typeof JOB_TYPES)[number])
              ? (body.preferredJobType as (typeof JOB_TYPES)[number])
              : undefined,
        });
      } else {
        results = await jobMatchingService.matchJobs({ skills: [] });
      }

      results = applyFilters(results, {
        keyword: typeof body.keyword === "string" ? body.keyword : undefined,
        location: typeof body.location === "string" ? body.location : undefined,
        workMode: typeof body.workMode === "string" ? body.workMode : undefined,
        jobType: typeof body.jobType === "string" ? body.jobType : undefined,
        experience: typeof body.experience === "string" ? body.experience : undefined,
      });

      const total = results.length;
      const requestedPage = Number(body.page);
      const requestedPageSize = Number(body.pageSize);
      const wantsPagination =
        body.page !== undefined || body.pageSize !== undefined;

      const pageSize =
        Number.isInteger(requestedPageSize) && requestedPageSize > 0
          ? Math.min(requestedPageSize, MAX_PAGE_SIZE)
          : wantsPagination
            ? DEFAULT_PAGE_SIZE
            : total;

      const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
      const page =
        Number.isInteger(requestedPage) && requestedPage > 0
          ? Math.min(requestedPage, totalPages)
          : 1;

      const startIndex = (page - 1) * pageSize;
      const data = results.slice(startIndex, startIndex + pageSize);

      const strongMatches = results.filter(
        (result) => result.matchScore >= STRONG_MATCH_THRESHOLD
      ).length;
      const averageMatchScore =
        total > 0
          ? Math.round(
              results.reduce((sum, result) => sum + result.matchScore, 0) / total
            )
          : 0;

      res.status(200).json({
        success: true,
        count: data.length,
        total,
        page,
        pageSize,
        totalPages,
        data,
        summary: {
          totalMatches: total,
          strongMatches,
          averageMatchScore,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

function applyFilters(
  results: JobMatchResult[],
  filters: MatchFilters
): JobMatchResult[] {
  const { keyword, location, workMode, jobType, experience } = filters;
  const keywordText = keyword?.toLowerCase();

  return results.filter((result) => {
    if (keywordText) {
      const haystack =
        `${result.job.title} ${result.job.company} ${result.job.description ?? ""}`.toLowerCase();
      if (!haystack.includes(keywordText)) return false;
    }

    if (location) {
      if (!result.job.location?.toLowerCase().includes(location.toLowerCase())) {
        return false;
      }
    }

    if (workMode && result.job.workMode !== workMode) return false;
    if (jobType && result.job.jobType !== jobType) return false;

    if (experience) {
      // "3-5 years" → "3-5": the years label is trimmed so the filter matches
      // jobs stored as "3-5 Years" as well as "3-5 years".
      const label = experience.replace(/\s*years?/i, "").trim();
      if (!label) return true;
      if (!result.job.experience?.toLowerCase().includes(label.toLowerCase())) {
        return false;
      }
    }

    return true;
  });
}

export const jobMatchingController =
  new JobMatchingController();