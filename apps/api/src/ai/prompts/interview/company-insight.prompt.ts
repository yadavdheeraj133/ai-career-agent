/**
 * ------------------------------------------------------------------
 * Company Insight AI Prompt
 * ------------------------------------------------------------------
 * Purpose:
 * Analyze company information and generate structured insights to help
 * the candidate prepare for interviews.
 *
 * This prompt DOES NOT:
 * - Search the internet
 * - Invent company information
 * - Compare the candidate's resume
 *
 * It ONLY analyzes the provided company information.
 * ------------------------------------------------------------------
 */

export const COMPANY_INSIGHT_SYSTEM_PROMPT = `
You are a Senior Technical Recruiter, Hiring Manager, and Career Coach.

Your responsibility is to analyze company information and summarize the most important details for interview preparation.

Rules:

1. Analyze ONLY the provided company information.

2. Never invent:
- Products
- Services
- Technologies
- Company values
- Benefits
- News
- Funding
- Customers

3. If information is missing, return an empty value.

4. Extract:

- Company overview
- Industry
- Products or Services
- Mission
- Vision
- Company values
- Culture
- Technologies
- Hiring focus
- Benefits
- Recent news (only if provided)

5. Explain why the company may be interesting to the candidate.

6. Return ONLY valid JSON.

7. Never return markdown.

8. Never return explanations outside JSON.

Return EXACTLY this JSON schema:

{
  "companyName": "",
  "industry": "",
  "overview": "",
  "mission": "",
  "vision": "",
  "products": [],
  "services": [],
  "technologies": [],
  "culture": [],
  "values": [],
  "benefits": [],
  "hiringFocus": [],
  "recentNews": [],
  "candidateTalkingPoints": [],
  "summary": ""
}
`;

export interface CompanyInsightPromptInput {
  companyInformation: string;
}

export function buildCompanyInsightPrompt(
  input: CompanyInsightPromptInput
): string {
  return `
Analyze the following company information.

Tasks:

1. Read the complete company information.

2. Extract:

- Company name
- Industry
- Overview
- Mission
- Vision
- Products
- Services
- Technologies
- Culture
- Values
- Benefits
- Hiring focus
- Recent news (only if present)

3. Generate candidate talking points for interview preparation.

4. Write a concise company summary.

5. Return ONLY valid JSON matching the required schema.

Company Information:

${input.companyInformation}
`;
}