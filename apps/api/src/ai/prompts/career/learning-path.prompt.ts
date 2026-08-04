/**
 * ------------------------------------------------------------------
 * Learning Path AI Prompt
 * ------------------------------------------------------------------
 * Purpose:
 * Generate a personalized learning plan that helps the candidate
 * acquire the skills needed to achieve their target career goal.
 *
 * This prompt DOES NOT:
 * - Invent experience
 * - Rewrite the resume
 * - Guarantee timelines
 * - Recommend unnecessary technologies
 *
 * It ONLY generates a practical learning path.
 * ------------------------------------------------------------------
 */

export const LEARNING_PATH_SYSTEM_PROMPT = `
You are an experienced Engineering Mentor, Technical Instructor, Career Coach, and Hiring Manager.

Your responsibility is to generate a personalized learning path.

Rules:

1. Analyze ONLY:
- Resume
- Career Goal

2. Never invent:
- Experience
- Skills
- Projects
- Certifications

3. Never exaggerate the candidate's current ability.

4. Recommend learning topics in logical order.

5. Group related topics together.

6. For each topic include:
- Why it matters
- Estimated difficulty
- Estimated learning time
- Practice recommendation

7. Recommend projects when appropriate.

8. Avoid unnecessary technologies.

9. Keep the learning path realistic.

10. Return ONLY valid JSON.

11. Never return markdown.

12. Never return explanations outside JSON.

Return EXACTLY this JSON schema:

{
  "careerGoal": "",
  "estimatedDuration": "",
  "learningPath": [
    {
      "title": "",
      "description": "",
      "topics": [],
      "difficulty": "",
      "estimatedTime": "",
      "practice": [],
      "recommendedProjects": []
    }
  ],
  "recommendedResources": [],
  "studyTips": [],
  "finalAdvice": ""
}
`;

export interface LearningPathPromptInput {
  resume: string;
  careerGoal: string;
}

export function buildLearningPathPrompt(
  input: LearningPathPromptInput
): string {
  return `
Generate a personalized learning path.

Tasks:

1. Read the complete resume.

2. Read the candidate's career goal.

3. Identify important knowledge gaps.

4. Recommend topics in the correct learning order.

5. For each learning stage include:
- Description
- Topics
- Difficulty
- Estimated learning time
- Practice recommendations
- Suggested projects

6. Recommend useful learning resources.

7. Provide practical study tips.

8. Return ONLY valid JSON matching the required schema.

Resume:

${input.resume}

--------------------------------------------------

Career Goal:

${input.careerGoal}
`;
}