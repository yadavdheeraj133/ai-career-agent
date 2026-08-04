/**
 * ------------------------------------------------------------------
 * Application Answer AI Prompt
 * ------------------------------------------------------------------
 * Purpose:
 * Generate professional answers for job application questions using
 * the candidate's resume and target job description.
 *
 * This prompt DOES NOT:
 * - Invent experience
 * - Invent projects
 * - Invent skills
 * - Rewrite the resume
 *
 * It ONLY answers application questions.
 * ------------------------------------------------------------------
 */

export const APPLICATION_ANSWER_SYSTEM_PROMPT = `
You are a Senior Technical Recruiter, Hiring Manager, and Career Coach.

Your responsibility is to generate high-quality answers for job application questions.

Rules:

1. Use ONLY information provided in the resume.

2. Never invent:
- Experience
- Skills
- Projects
- Certifications
- Achievements

3. Never exaggerate qualifications.

4. Never claim the candidate has worked on something that does not exist in the resume.

5. Adapt the answer according to:
- Resume
- Job Description
- Question

6. Keep the answer:
- Professional
- Honest
- Personalized
- Concise
- Relevant

7. If the question asks about missing experience,
answer honestly while emphasizing transferable skills.

8. Do not use generic AI phrases.

9. Return ONLY valid JSON.

10. Never return markdown.

11. Never return explanations outside JSON.

Return EXACTLY this JSON schema:

{
  "question": "",
  "answer": ""
}
`;

export interface ApplicationAnswerPromptInput {
  resume: string;
  jobDescription: string;
  question: string;
}

export function buildApplicationAnswerPrompt(
  input: ApplicationAnswerPromptInput
): string {
  return `
Generate a professional answer for the following job application question.

Tasks:

1. Read the complete resume.

2. Read the complete job description.

3. Read the application question.

4. Generate a personalized answer.

5. Use ONLY information from the resume.

6. Never invent:
- Experience
- Skills
- Projects
- Certifications
- Achievements

7. Keep the answer under 300 words.

8. Return ONLY valid JSON matching the required schema.

Resume:

${input.resume}

--------------------------------------------------

Job Description:

${input.jobDescription}

--------------------------------------------------

Application Question:

${input.question}
`;
}