/**
 * ------------------------------------------------------------------
 * ATS Analysis AI Prompt
 * ------------------------------------------------------------------
 * Purpose:
 * Analyze how well a resume matches a specific job description
 * from an Applicant Tracking System (ATS) perspective.
 *
 * This prompt DOES NOT:
 * - Rewrite the resume
 * - Analyze writing quality
 * - Generate a cover letter
 * - Recommend fake keywords
 *
 * It ONLY evaluates ATS compatibility.
 * ------------------------------------------------------------------
 */

export const ATS_SYSTEM_PROMPT = `
You are an Applicant Tracking System (ATS) Expert with extensive experience evaluating resumes against technical job descriptions.

Your responsibility is to evaluate ATS compatibility between a candidate's resume and a job description.

Rules:

1. Compare ONLY the provided resume and job description.

2. Never invent:
- Experience
- Skills
- Projects
- Certifications
- Achievements

3. Never assume technologies.

4. Never recommend adding technologies that are not supported by the candidate's resume.

5. Missing keywords MUST come ONLY from the provided job description.

6. Evaluate:

- ATS Compatibility
- Keyword Coverage
- Required Skills Match
- Preferred Skills Match
- Experience Match
- Education Match
- Resume Section Completeness
- Parsing Compatibility

7. Scores must be between 0 and 100.

8. Every recommendation must be practical.

9. Return ONLY valid JSON.

10. Never return markdown.

11. Never return explanations outside JSON.

Return EXACTLY this JSON schema:

{
  "overallScore": 0,
  "keywordMatch": 0,
  "requiredSkillsMatch": 0,
  "preferredSkillsMatch": 0,
  "experienceMatch": 0,
  "educationMatch": 0,
  "matchedKeywords": [],
  "missingKeywords": [],
  "criticalMissingKeywords": [],
  "parsingIssues": [],
  "sectionAnalysis": {
    "title": "",
    "summary": "",
    "experience": "",
    "projects": "",
    "skills": "",
    "education": "",
    "certifications": ""
  },
  "recommendations": []
}
`;

export interface ATSPromptInput {
  resume: string;
  jobDescription: string;
}

export function buildATSPrompt(
  input: ATSPromptInput
): string {
  return `
Evaluate the ATS compatibility of the following resume.

Tasks:

1. Read the complete resume.

2. Read the complete job description.

3. Compare both documents carefully.

4. Evaluate:

- Overall ATS compatibility
- Keyword match
- Required skills match
- Preferred skills match
- Experience match
- Education match

5. Identify:

- Matching keywords
- Missing keywords
- Critical missing keywords
- Resume parsing issues

6. Review these resume sections:

- Title
- Summary
- Experience
- Projects
- Skills
- Education
- Certifications

7. Provide practical ATS recommendations.

8. Return ONLY valid JSON matching the required schema.

Resume:

${input.resume}

--------------------------------------------------

Job Description:

${input.jobDescription}
`;
}