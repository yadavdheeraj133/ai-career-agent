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
  fetched: number;
  created: number;
  skipped: number;
  jobs: AggregatedJob[];
}