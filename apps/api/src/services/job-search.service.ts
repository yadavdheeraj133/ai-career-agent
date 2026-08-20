import { jobRepository } from "../repositories/jobs.repository.js";

export interface JobSearchFilters {
  keyword?: string;
  location?: string;
  workMode?: "Remote" | "Hybrid" | "Onsite";
  jobType?:
    | "Full-time"
    | "Part-time"
    | "Internship"
    | "Contract"
    | "Freelance";
  source?: string;
}

export class JobSearchService {
  async searchJobs(filters: JobSearchFilters) {
    const jobs = await jobRepository.findAll();

    const keyword = filters.keyword?.toLowerCase();
    const location = filters.location?.toLowerCase();

    return jobs.filter((job) => {
      const matchesKeyword =
        !keyword ||
        job.title.toLowerCase().includes(keyword) ||
        job.company.toLowerCase().includes(keyword) ||
        job.description?.toLowerCase().includes(keyword);

      const matchesLocation =
        !location ||
        job.location.toLowerCase().includes(location);

      const matchesWorkMode =
        !filters.workMode ||
        job.workMode === filters.workMode;

      const matchesJobType =
        !filters.jobType ||
        job.jobType === filters.jobType;

      const matchesSource =
        !filters.source ||
        job.source.toLowerCase() ===
          filters.source.toLowerCase();

      return (
        matchesKeyword &&
        matchesLocation &&
        matchesWorkMode &&
        matchesJobType &&
        matchesSource
      );
    });
  }
}

export const jobSearchService =
  new JobSearchService();