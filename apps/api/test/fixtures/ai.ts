/**
 * Minimal payloads that satisfy each AI response schema in
 * `src/ai/schemas/**`.
 *
 * These stand in for what the language model would return. They are deliberately
 * minimal — just enough to pass the corresponding `Schema.parse()` — so that a
 * drift between a schema and its fixture shows up as a loud validation failure
 * rather than silently passing.
 */

/** src/ai/schemas/resume/resume-analysis.schema.ts */
export const resumeAnalysisFixture = {
  overallScore: 78,
  summary: "A solid mid-level engineering resume.",
  strengths: [{ title: "Clear impact", description: "Quantified results." }],
  weaknesses: [
    {
      title: "Thin skills section",
      description: "Fewer than ten skills listed.",
      improvement: "Group skills by category.",
    },
  ],
  sectionScores: {
    title: 90,
    summary: 80,
    experience: 75,
    projects: 70,
    skills: 65,
    education: 85,
    certifications: 60,
    achievements: 70,
    languages: 90,
    links: 88,
    formatting: 92,
  },
  recommendations: ["Add measurable outcomes to each role."],
};

/** src/ai/schemas/resume/ats.schema.ts */
export const atsFixture = {
  overallScore: 82,
  keywordMatch: 80,
  requiredSkillsMatch: 78,
  preferredSkillsMatch: 60,
  experienceMatch: 75,
  educationMatch: 85,
  matchedKeywords: ["typescript", "node"],
  missingKeywords: ["graphql"],
  criticalMissingKeywords: ["testing"],
  parsingIssues: [],
  sectionAnalysis: {
    title: "Clear",
    summary: "Concise",
    experience: "Reverse chronological",
    projects: "Two projects",
    skills: "Grouped",
    education: "Complete",
    certifications: "Present",
  },
  recommendations: ["Mirror the job description's vocabulary."],
};

/** src/ai/schemas/resume/skill-gap.schema.ts */
export const skillGapFixture = {
  overallSkillMatch: 64,
  existingSkills: [
    { skill: "TypeScript", priority: "High", reason: "Core to the role." },
  ],
  missingSkills: [
    { skill: "GraphQL", priority: "Medium", reason: "Used by the team." },
  ],
  criticalSkills: [
    { skill: "Testing", priority: "High", reason: "Required for quality." },
  ],
  niceToHaveSkills: [
    { skill: "Docker", priority: "Low", reason: "Helpful locally." },
  ],
  strengths: [{ strength: "Strong backend fundamentals", reason: "Five years." }],
  learningPriorities: [
    { skill: "Testing", priority: "High", reason: "Biggest gap." },
  ],
  recommendations: [
    { skill: "GraphQL", priority: "Medium", reason: "Close the gap." },
  ],
};

/** src/ai/schemas/resume/resume-tailor.schema.ts */
export const resumeTailorFixture = {
  title: "Senior Backend Engineer",
  summary: "Backend engineer focused on distributed systems.",
  experience: [
    {
      company: "Acme",
      position: "Backend Engineer",
      startDate: "2021-01",
      endDate: "Present",
      responsibilities: ["Built the billing pipeline."],
    },
  ],
  education: [
    {
      degree: "B.Sc. Computer Science",
      institution: "State University",
      graduationDate: "2020-06",
    },
  ],
  skills: ["TypeScript", "PostgreSQL"],
  projects: [{ name: "Ledger", description: "Double-entry ledger service." }],
  certifications: ["AWS SAA"],
  achievements: ["Cut p99 latency by 40%."],
  languages: ["English"],
  links: ["https://example.test/github"],
  improvementSummary: {
    atsImprovements: ["Added missing keywords."],
    remainingMissingKeywords: ["graphql"],
    notes: ["Keep to two pages."],
  },
};

/** src/ai/schemas/resume/resume-job-match.schema.ts */
export const resumeJobMatchFixture = {
  overallMatch: 81,
  matchedSkills: [{ skill: "TypeScript", reason: "Used daily." }],
  missingSkills: [{ skill: "Kubernetes", reason: "No production exposure." }],
  experienceMatch: 78,
  educationMatch: 85,
  strengths: [{ title: "Relevant domain", description: "Payments background." }],
  weaknesses: [{ title: "Ops exposure", description: "Limited on-call work." }],
  recommendations: ["Highlight the migration project."],
};

/** src/ai/schemas/resume/ai-verdict.schema.ts */
export const aiVerdictFixture = {
  verdict: "Good Match",
  score: 76,
  summary: "A credible candidate with one notable gap.",
  reasons: ["Strong TypeScript depth."],
  strengths: ["Systems design"],
  concerns: ["No Kubernetes experience"],
  recommendation: "Apply, and address the ops gap in the cover letter.",
};

/** src/ai/schemas/resume/interview-probability.schema.ts */
export const interviewProbabilityFixture = {
  probability: 68,
  confidence: "Medium",
  assessment: "Likely to clear a screening call.",
  positiveFactors: ["Directly relevant experience"],
  riskFactors: ["Competitive pool"],
  recommendations: ["Prepare a systems design story."],
};

/** src/ai/schemas/application/cover-letter.schema.ts */
export const coverLetterFixture = {
  greeting: "Dear Hiring Manager,",
  introduction: "I am writing to apply for the backend role.",
  body: ["I have five years of TypeScript experience."],
  closing: "Thank you for your consideration.",
  signature: "Sincerely, Test User",
};

/** src/ai/schemas/application/application-message.schema.ts */
export const applicationMessageFixture = {
  subject: "Application for Backend Engineer",
  message: "Hi — I would like to be considered for this role.",
};

/** src/ai/schemas/application/application-answer.schema.ts */
export const applicationAnswerFixture = {
  question: "Why do you want to work here?",
  answer: "Because the platform problems match my experience.",
};

/** src/ai/schemas/interview/company-insight.schema.ts */
export const companyInsightFixture = {
  companyName: "Acme",
  industry: "Fintech",
  overview: "A payments platform.",
  mission: "Make payments simple.",
  vision: "Borderless commerce.",
  products: ["Payments API"],
  services: ["Merchant onboarding"],
  technologies: ["TypeScript", "PostgreSQL"],
  culture: ["Written-first"],
  values: ["Ownership"],
  benefits: ["Remote-first"],
  hiringFocus: ["Backend depth"],
  recentNews: ["Raised Series B"],
  candidateTalkingPoints: ["Ask about the ledger migration"],
  summary: "A strong fit for backend engineers.",
};

/** src/ai/schemas/interview/interview-preparation.schema.ts */
const interviewQuestionFixture = {
  question: "Describe a hard migration.",
  reason: "Tests systems thinking.",
  sampleAnswer: "I led a zero-downtime schema change.",
  followUpQuestions: ["How did you verify correctness?"],
};

export const interviewPreparationFixture = {
  overview: "A backend-focused loop.",
  interviewDifficulty: "Medium",
  keyFocusAreas: ["Systems design"],
  technicalQuestions: [interviewQuestionFixture],
  behavioralQuestions: [interviewQuestionFixture],
  projectQuestions: [interviewQuestionFixture],
  resumeQuestions: [interviewQuestionFixture],
  weakAreas: ["Operational ownership"],
  preparationTips: ["Rehearse the ledger story."],
  finalAdvice: "Lead with measurable impact.",
};

/** src/ai/schemas/interview/job-summary.schema.ts */
export const jobSummaryFixture = {
  jobTitle: "Backend Engineer",
  company: "Acme",
  employmentType: "Full-time",
  experienceLevel: "Mid-Senior",
  location: "Remote",
  summary: "Own the payments pipeline.",
  responsibilities: ["Design services"],
  requiredSkills: ["TypeScript"],
  preferredSkills: ["GraphQL"],
  technologies: ["PostgreSQL"],
  qualifications: ["5+ years"],
  benefits: ["Equity"],
  salary: "$140k-$180k",
};

/** src/ai/schemas/career/career-coach.schema.ts */
export const careerCoachFixture = {
  currentLevel: "Mid-level",
  careerGoal: "Senior backend engineer",
  strengths: ["Systems design"],
  weaknesses: ["Public speaking"],
  transferableSkills: ["Mentoring"],
  careerReadiness: "Six to twelve months away.",
  recommendedNextSteps: ["Lead a cross-team project"],
  commonMistakesToAvoid: ["Chasing titles over scope"],
  motivation: "You are closer than you think.",
};

/** src/ai/schemas/career/career-roadmap.schema.ts */
export const careerRoadmapFixture = {
  currentLevel: "Mid-level",
  targetRole: "Senior backend engineer",
  estimatedTimeline: "12 months",
  roadmap: [
    {
      title: "Deepen systems design",
      objective: "Lead a service rewrite.",
      skills: ["Distributed systems"],
      projects: ["Ledger migration"],
      certifications: ["AWS SAA"],
      expectedOutcome: "Ready for senior scope.",
    },
  ],
  successTips: ["Document your impact"],
  finalAdvice: "Scope grows before titles do.",
};

/** src/ai/schemas/career/learning-path.schema.ts */
export const learningPathFixture = {
  careerGoal: "Senior backend engineer",
  estimatedDuration: "6 months",
  learningPath: [
    {
      title: "Distributed systems",
      description: "Consistency and partition tolerance.",
      topics: ["Consensus"],
      difficulty: "Advanced",
      estimatedTime: "8 weeks",
      practice: ["Implement Raft"],
      recommendedProjects: ["Key-value store"],
    },
  ],
  recommendedResources: ["Designing Data-Intensive Applications"],
  studyTips: ["Build, do not just read"],
  finalAdvice: "Ship something every month.",
};
