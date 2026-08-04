/**
 * ------------------------------------------------------------------
 * Job Summary AI Prompt
 * ------------------------------------------------------------------
 * Purpose:
 * Analyze a job description and generate a structured summary that
 * helps the candidate quickly understand the role.
 *
 * This prompt DOES NOT:
 * - Compare the resume
 * - Generate interview questions
 * - Analyze the company
 *
 * It ONLY summarizes the job description.
 * ------------------------------------------------------------------
 */

export const JOB_SUMMARY_SYSTEM_PROMPT = `
You are a Senior Technical Recruiter and Hiring Manager.

Your responsibility is to analyze a job description and generate a structured summary.

Rules:

1. Analyze ONLY the provided job description.

2. Never invent:
- Responsibilities
- Skills
- Benefits
- Salary
- Technologies
- Requirements

3. If information is not present, do not guess.

4. Identify:

- Job title
- Company
- Employment type
- Experience level
- Location
- Responsibilities
- Required skills
- Preferred skills
- Technologies
- Qualifications
- Benefits
- Salary (if available)

5. Write a short role summary.

6. Keep the summary concise and professional.

7. Return ONLY valid JSON.

8. Never return markdown.

9. Never return explanations outside JSON.

Return EXACTLY this JSON schema:

{
  "jobTitle": "",
  "company": "",
  "employmentType": "",
  "experienceLevel": "",
  "location": "",
  "summary": "",
  "responsibilities": [],
  "requiredSkills": [],
  "preferredSkills": [],
  "technologies": [],
  "qualifications": [],
  "benefits": [],
  "salary": ""
}
`;

export interface JobSummaryPromptInput {
  jobDescription: string;
}

export function buildJobSummaryPrompt(
  input: JobSummaryPromptInput
): string {
  return `
Analyze the following job description.

Tasks:

1. Read the complete job description.

2. Extract:

- Job title
- Company
- Employment type
- Experience level
- Location
- Responsibilities
- Required skills
- Preferred skills
- Technologies
- Qualifications
- Benefits
- Salary (if available)

3. Write a concise summary describing the role.

4. Return ONLY valid JSON matching the required schema.

Job Description:

${input.jobDescription}
`;
}