import { jobRepository } from "../repositories/jobs.repository.js";

export interface JobMatchingInput {
  skills: string[];
  preferredLocation?: string;
  preferredWorkMode?: "Remote" | "Hybrid" | "Onsite";
  preferredJobType?:
    | "Full-time"
    | "Part-time"
    | "Internship"
    | "Contract"
    | "Freelance";
}

export interface JobMatchResult {
  job: Awaited<ReturnType<typeof jobRepository.findAll>>[number];
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export class JobMatchingService {
  async matchJobs(
    input: JobMatchingInput
  ): Promise<JobMatchResult[]> {
    const jobs = await jobRepository.findAll();

    const candidateSkills = input.skills.map((skill) =>
      skill.toLowerCase().trim()
    );

    const results: JobMatchResult[] = [];

    for (const job of jobs) {
      const jobText = `
        ${job.title}
        ${job.description ?? ""}
        ${job.experience ?? ""}
      `.toLowerCase();

      const matchedSkills = candidateSkills.filter(
        (skill) =>
          skill.length > 0 &&
          jobText.includes(skill)
      );

      const missingSkills = candidateSkills.filter(
        (skill) =>
          skill.length > 0 &&
          !jobText.includes(skill)
      );

      const skillScore =
        candidateSkills.length > 0
          ? (matchedSkills.length /
              candidateSkills.length) *
            70
          : 0;

      const locationScore =
        !input.preferredLocation ||
        job.location
          .toLowerCase()
          .includes(
            input.preferredLocation.toLowerCase()
          )
          ? 10
          : 0;

      const workModeScore =
        !input.preferredWorkMode ||
        job.workMode === input.preferredWorkMode
          ? 10
          : 0;

      const jobTypeScore =
        !input.preferredJobType ||
        job.jobType === input.preferredJobType
          ? 10
          : 0;

      const matchScore = Math.round(
        Math.min(
          100,
          skillScore +
            locationScore +
            workModeScore +
            jobTypeScore
        )
      );

      results.push({
        job,
        matchScore,
        matchedSkills,
        missingSkills,
      });
    }

    return results.sort(
      (a, b) => b.matchScore - a.matchScore
    );
  }
}

export const jobMatchingService =
  new JobMatchingService();