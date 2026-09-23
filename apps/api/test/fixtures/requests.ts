/**
 * Reusable, valid request bodies for the CRUD endpoints.
 */

export function validJob(overrides: Record<string, unknown> = {}) {
  return {
    title: "Backend Engineer",
    company: "Acme",
    location: "Remote",
    workMode: "Remote",
    jobType: "Full-time",
    experience: "3-5 years",
    salary: "$120k",
    description: "Build the payments pipeline.",
    source: "LinkedIn",
    url: `https://example.test/jobs/${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

export function validResume(overrides: Record<string, unknown> = {}) {
  return {
    title: "My Resume",
    summary: "Backend engineer with five years of experience.",
    skills: ["TypeScript", "PostgreSQL"],
    experience: [
      {
        company: "Acme",
        role: "Backend Engineer",
        startDate: "2021-01",
        description: "Built the billing pipeline.",
      },
    ],
    education: [
      {
        institution: "State University",
        degree: "B.Sc. Computer Science",
        startDate: "2016-08",
        endDate: "2020-06",
      },
    ],
    ...overrides,
  };
}

/** Descriptions of the fixed AI test inputs. */
export const RESUME_TEXT = "Jane Doe — Backend Engineer with five years of TypeScript.";
export const JOB_DESCRIPTION_TEXT = "We need a backend engineer with TypeScript and PostgreSQL.";
