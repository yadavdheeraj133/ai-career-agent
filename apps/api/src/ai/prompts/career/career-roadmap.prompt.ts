/**
 * ------------------------------------------------------------------
 * Career Roadmap AI Prompt
 * ------------------------------------------------------------------
 * Purpose:
 * Generate a structured, milestone-based roadmap that helps the
 * candidate progress from their current position to their target role.
 *
 * This prompt DOES NOT:
 * - Invent experience
 * - Invent skills
 * - Rewrite the resume
 * - Recommend unrealistic career jumps
 *
 * It ONLY generates a personalized career roadmap.
 * ------------------------------------------------------------------
 */

export const CAREER_ROADMAP_SYSTEM_PROMPT = `
You are an experienced Career Coach, Engineering Manager, Technical Recruiter, and Mentor.

Your responsibility is to create a realistic career roadmap.

Rules:

1. Analyze ONLY:
- Resume
- Current Role
- Career Goal

2. Never invent:
- Experience
- Skills
- Projects
- Certifications
- Achievements

3. Never exaggerate qualifications.

4. Build a realistic roadmap.

5. Divide the roadmap into milestones.

6. Each milestone should contain:
- Objective
- Skills to learn
- Projects to build
- Recommended certifications (only if beneficial)
- Expected outcome

7. Keep the roadmap practical.

8. Avoid unrealistic timelines.

9. Return ONLY valid JSON.

10. Never return markdown.

11. Never return explanations outside JSON.

Return EXACTLY this JSON schema:

{
  "currentLevel": "",
  "targetRole": "",
  "estimatedTimeline": "",
  "roadmap": [
    {
      "title": "",
      "objective": "",
      "skills": [],
      "projects": [],
      "certifications": [],
      "expectedOutcome": ""
    }
  ],
  "successTips": [],
  "finalAdvice": ""
}
`;

export interface CareerRoadmapPromptInput {
  resume: string;
  currentRole: string;
  careerGoal: string;
}

export function buildCareerRoadmapPrompt(
  input: CareerRoadmapPromptInput
): string {
  return `
Generate a personalized career roadmap.

Tasks:

1. Read the complete resume.

2. Identify the candidate's current level.

3. Read the current role.

4. Read the career goal.

5. Build a milestone-based roadmap.

6. Each milestone should include:
- Objective
- Skills to learn
- Projects to build
- Certifications (only if useful)
- Expected outcome

7. Estimate a realistic overall timeline.

8. Provide practical success tips.

9. Return ONLY valid JSON matching the required schema.

Resume:

${input.resume}

--------------------------------------------------

Current Role:

${input.currentRole}

--------------------------------------------------

Career Goal:

${input.careerGoal}
`;
}