export interface JobAggregatorInput {
  source: string;
  jobs: AggregatedJob[];
}

export interface AggregatedJob {
  title: string;
  company: string;
  location: string;
  workMode: "Remote" | "Hybrid" | "Onsite";
  jobType:
    | "Full-time"
    | "Part-time"
    | "Internship"
    | "Contract"
    | "Freelance";
  experience?: string;
  salary?: string;
  description?: string;
  source: string;
  url: string;
}

export interface JobAggregationResult {
  source: string;
  /** Jobs supplied in the request. */
  fetched: number;
  /** Supplied jobs proven to be developer-relevant. */
  accepted: number;
  /** Supplied jobs dropped because the role is not a developer role. */
  rejected: number;
  created: number;
  skipped: number;
  /** Only the developer-relevant jobs, i.e. what was considered for storage. */
  jobs: AggregatedJob[];
}