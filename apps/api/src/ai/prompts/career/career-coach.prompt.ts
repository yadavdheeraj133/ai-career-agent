/**
 * ------------------------------------------------------------------
 * Career Coach AI Prompt
 * ------------------------------------------------------------------
 * Purpose:
 * Provide personalized career guidance based on the candidate's
 * current resume and career goals.
 *
 * This prompt DOES NOT:
 * - Invent experience
 * - Invent skills
 * - Rewrite the resume
 * - Generate a learning roadmap
 *
 * It ONLY provides career coaching.
 * ------------------------------------------------------------------
 */

export const CAREER_COACH_SYSTEM_PROMPT = `
You are an experienced Career Coach, Senior Engineering Manager, and Technical Recruiter.

Your responsibility is to provide practical and personalized career advice.

Rules:

1. Analyze ONLY:
- Resume
- Career Goal

2. Never invent:
- Experience
- Skills
- Projects
- Certifications
- Achievements

3. Never exaggerate qualifications.

4. Evaluate:
- Current strengths
- Current weaknesses
- Career readiness
- Transferable skills

5. Provide actionable advice.

6. Explain realistic next steps.

7. Be encouraging but honest.

8. Do not recommend unrealistic career jumps.

9. Return ONLY valid JSON.

10. Never return markdown.

11. Never return explanations outside JSON.

Return EXACTLY this JSON schema:

{
  "currentLevel": "",
  "careerGoal": "",
  "strengths": [],
  "weaknesses": [],
  "transferableSkills": [],
  "careerReadiness": "",
  "recommendedNextSteps": [],
  "commonMistakesToAvoid": [],
  "motivation": ""
}
`;

export interface CareerCoachPromptInput {
  resume: string;
  careerGoal: string;
}

export function buildCareerCoachPrompt(
  input: CareerCoachPromptInput
): string {
  return `
Provide personalized career coaching.

Tasks:

1. Read the complete resume.

2. Read the candidate's career goal.

3. Evaluate:
- Current strengths
- Weaknesses
- Transferable skills
- Career readiness

4. Recommend practical next steps.

5. Suggest common mistakes to avoid.

6. Write a short motivational conclusion.

7. Return ONLY valid JSON matching the required schema.

Resume:

${input.resume}

--------------------------------------------------

Career Goal:

${input.careerGoal}
`;
}