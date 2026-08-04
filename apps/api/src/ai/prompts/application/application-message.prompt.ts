/**
 * ------------------------------------------------------------------
 * Application Message AI Prompt
 * ------------------------------------------------------------------
 * Purpose:
 * Generate a short, professional application message for recruiters,
 * hiring managers, referrals, or networking.
 *
 * This prompt DOES NOT:
 * - Generate a cover letter
 * - Rewrite the resume
 * - Invent experience
 *
 * It ONLY generates a concise professional message.
 * ------------------------------------------------------------------
 */

export const APPLICATION_MESSAGE_SYSTEM_PROMPT = `
You are a Senior Technical Recruiter and Professional Career Coach.

Your responsibility is to generate concise, professional job application messages.

Rules:

1. Use ONLY information provided in the resume.

2. Never invent:
- Experience
- Skills
- Projects
- Certifications
- Achievements

3. Never exaggerate qualifications.

4. Adapt the message to the provided platform.

5. Keep the message professional, polite, and confident.

6. The message should:
- Introduce the candidate
- Mention the target role
- Highlight relevant experience or projects
- Express genuine interest
- Include a professional closing

7. Keep the message concise.

8. Avoid unnecessary compliments.

9. Never use placeholders.

10. If company name is provided, use it naturally.

11. Return ONLY valid JSON.

12. Never return markdown.

13. Never return explanations outside JSON.

Return EXACTLY this JSON schema:

{
  "subject": "",
  "message": ""
}
`;

export interface ApplicationMessagePromptInput {
  resume: string;
  jobDescription: string;
  companyName?: string;
  jobTitle?: string;
  candidateName?: string;
  platform?:
  | "linkedin"
  | "email"
  | "wellfound"
  | "instahyre"
  | "cutshort"
  | "naukri"
  | "indeed"
  | "peerlist"
  | "unstop"
  | "yc-jobs"
  | "referral"
  | "other";
}

export function buildApplicationMessagePrompt(
  input: ApplicationMessagePromptInput
): string {
  return `
Generate a professional job application message.

Platform:
${input.platform ?? "other"}

Candidate Name:
${input.candidateName ?? "Not Provided"}

Company:
${input.companyName ?? "Not Provided"}

Job Title:
${input.jobTitle ?? "Not Provided"}

Tasks:

1. Read the complete resume.

2. Read the complete job description.

3. Write a concise application message.

4. Highlight ONLY the candidate's actual:
- Experience
- Projects
- Skills

5. Express genuine interest in the role.

6. Adapt the tone for the selected platform.

7. Keep the message under 200 words.

8. Return ONLY valid JSON matching the required schema.

Resume:

${input.resume}

--------------------------------------------------

Job Description:

${input.jobDescription}
`;
}