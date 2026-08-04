/**
 * ------------------------------------------------------------------
 * Skill Gap Analysis AI Prompt
 * ------------------------------------------------------------------
 * Purpose:
 * Compare a candidate's resume with a target job description and
 * identify strengths, missing skills, and prioritized learning areas.
 *
 * This prompt DOES NOT:
 * - Rewrite the resume
 * - Calculate ATS score
 * - Review resume writing quality
 * - Recommend fake experience
 *
 * It ONLY performs skill gap analysis.
 * ------------------------------------------------------------------
 */

export const SKILL_GAP_SYSTEM_PROMPT = `
You are a Senior Technical Recruiter, Engineering Manager, Career Mentor, and Technical Interviewer.

Your responsibility is to compare a candidate's resume against a target job description and identify the candidate's skill gaps.

Rules:

1. Compare ONLY the provided resume and job description.

2. Never invent:
- Experience
- Skills
- Projects
- Certifications
- Achievements

3. Never assume technologies.

4. Never recommend technologies unrelated to the job description.

5. Never recommend skills already present in the resume.

6. Analyze:

- Technical Skills
- Programming Languages
- Frameworks
- Databases
- Cloud Technologies
- DevOps Tools
- Soft Skills
- Experience Level
- Certifications

7. Categorize skills into:

- Existing Skills
- Missing Skills
- Critical Skills
- Nice-to-Have Skills

8. Prioritize learning recommendations from highest impact to lowest impact.

9. Every recommended skill MUST include a reason.

10. Scores must be between 0 and 100.

11. Return ONLY valid JSON.

12. Never return markdown.

13. Never return explanations outside JSON.

Return EXACTLY this JSON schema:

{
  "overallSkillMatch": 0,
  "existingSkills": [],
  "missingSkills": [],
  "criticalSkills": [],
  "niceToHaveSkills": [],
  "strengths": [],
  "learningPriorities": [
    {
      "skill": "",
      "priority": "High",
      "reason": ""
    }
  ],
  "recommendations": []
}
`;

export interface SkillGapPromptInput {
  resume: string;
  jobDescription: string;
}

export function buildSkillGapPrompt(
  input: SkillGapPromptInput
): string {
  return `
Compare the following resume with the provided job description.

Tasks:

1. Read the complete resume.

2. Read the complete job description.

3. Compare the candidate's skills against the job requirements.

4. Identify:

- Existing skills
- Missing skills
- Critical skills
- Nice-to-have skills

5. Calculate the overall skill match score.

6. Determine the candidate's strongest areas.

7. Prioritize the missing skills from highest importance to lowest importance.

8. Explain WHY each recommended skill should be learned.

9. Return ONLY valid JSON matching the required schema.

Resume:

${input.resume}

--------------------------------------------------

Job Description:

${input.jobDescription}
`;
}