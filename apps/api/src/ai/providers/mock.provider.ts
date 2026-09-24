import { AIProvider, type AIRequest, type AIResponse } from "./ai.provider.js";

const createResumeAnalysis = () => ({
  overallScore: 88,
  summary: "This is a locally generated mock assessment for development and testing.",
  strengths: [
    {
      title: "Strong fundamentals",
      description: "The candidate demonstrates clear technical breadth and measurable project experience.",
    },
    {
      title: "Delivery focus",
      description: "Work samples and outcomes suggest good execution discipline.",
    },
  ],
  weaknesses: [
    {
      title: "Role specificity",
      description: "A few skills could be aligned more tightly to the target role.",
      improvement: "Add a few targeted examples and keywords from the job description.",
    },
  ],
  sectionScores: {
    title: 90,
    summary: 84,
    experience: 88,
    projects: 86,
    skills: 89,
    education: 80,
    certifications: 78,
    achievements: 87,
    languages: 82,
    links: 84,
    formatting: 90,
  },
  recommendations: [
    "Add role-specific keywords to the summary and skills section.",
    "Quantify achievements with measurable impact and dates.",
  ],
});

const createATS = () => ({
  overallScore: 84,
  keywordMatch: 82,
  requiredSkillsMatch: 80,
  preferredSkillsMatch: 74,
  experienceMatch: 85,
  educationMatch: 90,
  matchedKeywords: ["typescript", "react", "node", "sql"],
  missingKeywords: ["graphql", "kubernetes"],
  criticalMissingKeywords: ["graphql"],
  parsingIssues: [],
  sectionAnalysis: {
    title: "Clear and targeted",
    summary: "Strong, but can be tightened around role keywords.",
    experience: "Shows measurable project impact.",
    projects: "Good evidence of product work and ownership.",
    skills: "Relevant and complete.",
    education: "Appropriately presented.",
    certifications: "Useful but not critical.",
  },
  recommendations: [
    "Mirror important job keywords in the summary and skills section.",
    "Highlight the most relevant tools in the first section of the resume.",
  ],
});

const createSkillGap = () => ({
  overallSkillMatch: 86,
  existingSkills: [
    { skill: "TypeScript", priority: "High", reason: "Strong match for frontend engineering workloads." },
    { skill: "React", priority: "High", reason: "Core UI experience is present." },
  ],
  missingSkills: [
    { skill: "GraphQL", priority: "High", reason: "Would strengthen API integration capability." },
    { skill: "Testing", priority: "Medium", reason: "Useful for production reliability." },
  ],
  criticalSkills: [
    { skill: "GraphQL", priority: "High", reason: "Important for the target role." },
  ],
  niceToHaveSkills: [
    { skill: "AWS", priority: "Low", reason: "Helpful for deployment and cloud work." },
  ],
  strengths: [
    { strength: "Strong modern frontend skill set", reason: "Candidate is already aligned with core web tooling." },
  ],
  learningPriorities: [
    { skill: "GraphQL", priority: "High", reason: "Focus on API data modeling and querying." },
  ],
  recommendations: [
    { skill: "Testing", priority: "Medium", reason: "Practice unit and integration testing workflows." },
  ],
});

const createResumeTailor = () => ({
  title: "Tailored Resume",
  summary: "Frontend engineer with experience building modern product interfaces and shipping measurable improvements.",
  experience: [
    {
      company: "Example Studio",
      position: "Frontend Engineer",
      startDate: "2023-01",
      endDate: "2025-01",
      responsibilities: [
        "Built user-facing features using React and TypeScript.",
        "Improved product UX and reduced bottlenecks in dashboard flows.",
      ],
    },
  ],
  education: [
    {
      degree: "B.Tech in Computer Science",
      institution: "Example University",
      graduationDate: "2023",
    },
  ],
  skills: ["React", "TypeScript", "Node.js", "SQL", "Testing"],
  projects: [
    { name: "AI Career Agent", description: "Built a dashboard and job analysis experience for hiring workflows." },
  ],
  certifications: ["Professional Frontend Certificate"],
  achievements: ["Reduced time-to-task for core dashboard actions by 30%."],
  languages: ["English"],
  links: ["https://github.com/example"],
  improvementSummary: {
    atsImprovements: ["Added role-specific keywords in the summary."],
    remainingMissingKeywords: ["GraphQL"],
    notes: ["Keep the experience section concise and metric-driven."],
  },
});

const createResumeJobMatch = () => ({
  overallMatch: 91,
  matchedSkills: [
    { skill: "React", reason: "Strong frontend delivery experience." },
    { skill: "TypeScript", reason: "Consistent use across product work." },
  ],
  missingSkills: [
    { skill: "GraphQL", reason: "Useful for API-heavy product work." },
  ],
  experienceMatch: 88,
  educationMatch: 90,
  strengths: [
    { title: "Good product sense", description: "Strong user-facing experience and clear business impact." },
  ],
  weaknesses: [
    { title: "ATS optimization", description: "Add role-matching keywords near the top of the resume." },
  ],
  recommendations: [
    "Tailor the summary to the target role.",
    "Highlight any direct API or testing experience.",
  ],
});

const createAIVerdict = () => ({
  verdict: "Strong Match",
  score: 89,
  summary: "The candidate aligns very well with the target role and needs minimal upskilling.",
  reasons: [
    "Strong frontend and TypeScript experience.",
    "Clear product impact and technical ownership.",
  ],
  strengths: ["Good React experience", "Strong communication", "Clear delivery history"],
  concerns: ["GraphQL familiarity", "Some gaps in deep testing experience"],
  recommendation: "Proceed with an interview and emphasize role-specific product examples.",
});

const createInterviewProbability = () => ({
  probability: 78,
  confidence: "Medium",
  assessment: "The candidate has a solid profile for this role, with strong fit in the core stack and moderate gap in the advanced tooling area.",
  positiveFactors: ["Relevant frontend experience", "Good product understanding"],
  riskFactors: ["Limited niche tooling exposure", "Need stronger evidence in testing"],
  recommendations: ["Highlight recent app delivery work.", "Prepare for a few technical deep-dive questions."],
});

const createCoverLetter = () => ({
  greeting: "Dear Hiring Manager,",
  introduction: "I am excited to apply for this role because my background in product engineering and frontend delivery closely matches the needs of your team.",
  body: [
    "In my previous work, I built user-facing experiences with React and TypeScript, focusing on clear product outcomes, measurable quality, and efficient collaboration.",
    "I enjoy translating product requirements into polished interfaces that feel intuitive while still maintaining technical depth and maintainability.",
  ],
  closing: "Thank you for your time and consideration. I would welcome the opportunity to share more about my experience and how I can contribute to your team.",
  signature: "Sincerely,\nYour Name",
});

const createApplicationMessage = () => ({
  subject: "Application for Frontend Engineer Role",
  message: "Hi [Hiring Manager],\n\nI am very interested in this opportunity and believe my product-focused engineering background aligns well with your team. I would welcome the chance to discuss how my experience can contribute to your goals.\n\nThank you for your consideration.",
});

const createApplicationAnswer = () => ({
  question: "Why do you want to work here?",
  answer: "I am excited by this opportunity because it combines product impact, strong engineering fundamentals, and a mission-driven team. I want to contribute in a role where I can build useful experiences while continuing to grow in a supportive environment.",
});

const createCareerCoach = () => ({
  currentLevel: "Mid-level engineer",
  careerGoal: "Grow toward a senior product-focused frontend engineer role.",
  strengths: ["Product thinking", "Frontend execution", "Collaboration"],
  weaknesses: ["Niche platform depth", "Deeper system design practice"],
  transferableSkills: ["Stakeholder communication", "Shipping user-facing features", "Technical ownership"],
  careerReadiness: "Strongly ready for the next step with focused skill development.",
  recommendedNextSteps: ["Upgrade system design practice", "Improve technical storytelling in interviews"],
  commonMistakesToAvoid: ["Over-indexing on tools without outcomes", "Skipping structured career planning"],
  motivation: "Keep building toward a role where your engineering work directly improves user experience and business outcomes.",
});

const createCareerRoadmap = () => ({
  currentLevel: "Mid-level frontend engineer",
  targetRole: "Senior Frontend Engineer",
  estimatedTimeline: "6-9 months",
  roadmap: [
    {
      title: "System design and architecture",
      objective: "Strengthen how you design product-scale frontend systems.",
      skills: ["Component design", "State management", "Performance tuning"],
      projects: ["Refactor a feature into a reusable architecture", "Build a dashboard with clear separation of concerns"],
      certifications: ["Frontend architecture short course"],
      expectedOutcome: "Better ability to design scalable interfaces and communicate trade-offs clearly.",
    },
  ],
  successTips: ["Ship small but high-impact projects", "Document architecture decisions and trade-offs"],
  finalAdvice: "Focus on practical product outcomes, technical quality, and strong communication of decisions.",
});

const createLearningPath = () => ({
  careerGoal: "Frontend engineer with product and architecture depth",
  estimatedDuration: "3 months",
  learningPath: [
    {
      title: "Core product engineering",
      description: "Improve your frontend architecture and resilience under realistic constraints.",
      topics: ["React patterns", "State design", "Performance optimization"],
      difficulty: "Intermediate",
      estimatedTime: "4 weeks",
      practice: ["Build a feature-driven project", "Review popular frontend architecture decisions"],
      recommendedProjects: ["Dashboard redesign", "Reusable component library"],
    },
  ],
  recommendedResources: ["Frontend Masters", "MDN Web Docs", "React docs"],
  studyTips: ["Learn by building and shipping small product improvements", "Review real codebases to understand patterns"],
  finalAdvice: "Stay consistent and focus on the intersection of user value, maintainability, and measurable outcomes.",
});

const createInterviewPreparation = () => ({
  overview: "This mock interview prep focuses on product-minded frontend engineering and execution quality.",
  interviewDifficulty: "Medium",
  keyFocusAreas: ["System design", "Frontend trade-offs", "Communication"],
  technicalQuestions: [
    {
      question: "How would you optimize a slow dashboard page?",
      reason: "Tests ability to identify performance bottlenecks and trade-offs.",
      sampleAnswer: "I would profile render costs, reduce expensive re-renders, and move data-fetching patterns toward a more efficient architecture.",
      followUpQuestions: ["How would you measure improvement?"],
    },
  ],
  behavioralQuestions: [
    {
      question: "Tell me about a time you improved a user-facing workflow.",
      reason: "Measures ownership and product awareness.",
      sampleAnswer: "I looked at where users were spending time, simplified the flow, and measured the reduction in friction.",
      followUpQuestions: ["What was the business impact?"],
    },
  ],
  projectQuestions: [
    {
      question: "Describe a project you are proud of.",
      reason: "Highlights technical depth and outcome orientation.",
      sampleAnswer: "I designed a reusable dashboard flow that improved task completion and made the experience easier to maintain.",
      followUpQuestions: ["What metrics did you track?"],
    },
  ],
  resumeQuestions: [
    {
      question: "Walk me through a project on your resume.",
      reason: "Assesses clarity and depth of explanation.",
      sampleAnswer: "I led the build of a product dashboard and focused on architecture, performance, and iteration with the product team.",
      followUpQuestions: ["What was your role?"],
    },
  ],
  weakAreas: ["Deep system design depth"],
  preparationTips: ["Practice structured answers with a clear beginning, action, and outcome."],
  finalAdvice: "Prepare examples that combine technical decisions with measurable user or business outcomes.",
});

const createJobSummary = () => ({
  jobTitle: "Frontend Engineer",
  company: "Example Company",
  employmentType: "Full-time",
  experienceLevel: "Mid-level",
  location: "Remote",
  summary: "Responsible for building polished product experiences and collaborating closely with design and product teams.",
  responsibilities: ["Build and maintain user-facing features", "Collaborate with design and product stakeholders"],
  requiredSkills: ["React", "TypeScript", "CSS", "Testing"],
  preferredSkills: ["GraphQL", "Next.js"],
  technologies: ["React", "TypeScript", "Node.js", "SQL"],
  qualifications: ["Experience with modern frontend systems", "Clear communication"],
  benefits: ["Remote-first culture", "Learning budget", "Health coverage"],
  salary: "$120k - $160k",
});

const createCompanyInsight = () => ({
  companyName: "Example Company",
  industry: "Product Software",
  overview: "Builds product experiences and developer tooling for growing teams.",
  mission: "Ship useful products that improve productivity and user experience.",
  vision: "Create delightful tools that scale with customer needs.",
  products: ["Dashboard platform", "Workflow automation tools"],
  services: ["Product consulting", "Core software engineering"],
  technologies: ["React", "TypeScript", "PostgreSQL", "AWS"],
  culture: ["Collaborative", "Outcome-focused", "Customer-driven"],
  values: ["Ownership", "Learning", "User empathy"],
  benefits: ["Remote flexibility", "Learning budget", "Wellness support"],
  hiringFocus: ["Product execution", "Frontend depth", "Communication"],
  recentNews: ["Expanded the product team", "Launched a new AI workflow experience"],
  candidateTalkingPoints: ["Strong product mindset", "Ability to work cross-functionally"],
  summary: "A well-rounded product team with a modern engineering stack, emphasis on collaboration, and clear growth opportunities.",
});

export class MockAIProvider implements AIProvider {
  async generate(request: AIRequest): Promise<AIResponse> {
    const combinedPrompt = `${request.systemPrompt ?? ""}\n${request.userPrompt ?? ""}`.toLowerCase();

    let payload: unknown;

    if (combinedPrompt.includes("resume analysis") || combinedPrompt.includes("analysis of the resume")) {
      payload = createResumeAnalysis();
    } else if (combinedPrompt.includes("ats") && combinedPrompt.includes("resume")) {
      payload = createATS();
    } else if (combinedPrompt.includes("skill gap")) {
      payload = createSkillGap();
    } else if (combinedPrompt.includes("resume tailor") || combinedPrompt.includes("tailor")) {
      payload = createResumeTailor();
    } else if (combinedPrompt.includes("job match") || combinedPrompt.includes("match resume")) {
      payload = createResumeJobMatch();
    } else if (combinedPrompt.includes("ai verdict") || combinedPrompt.includes("verdict")) {
      payload = createAIVerdict();
    } else if (combinedPrompt.includes("interview probability") || combinedPrompt.includes("probability")) {
      payload = createInterviewProbability();
    } else if (combinedPrompt.includes("cover letter") || combinedPrompt.includes("cover-letter")) {
      payload = createCoverLetter();
    } else if (combinedPrompt.includes("application message") || combinedPrompt.includes("message")) {
      payload = createApplicationMessage();
    } else if (combinedPrompt.includes("application answer") || combinedPrompt.includes("answer")) {
      payload = createApplicationAnswer();
    } else if (combinedPrompt.includes("career coach") || combinedPrompt.includes("coach")) {
      payload = createCareerCoach();
    } else if (combinedPrompt.includes("career roadmap") || combinedPrompt.includes("roadmap")) {
      payload = createCareerRoadmap();
    } else if (combinedPrompt.includes("learning path") || combinedPrompt.includes("learning-path")) {
      payload = createLearningPath();
    } else if (combinedPrompt.includes("interview preparation") || combinedPrompt.includes("prepare interview")) {
      payload = createInterviewPreparation();
    } else if (combinedPrompt.includes("job summary") || combinedPrompt.includes("summarize this job")) {
      payload = createJobSummary();
    } else if (combinedPrompt.includes("company insight") || combinedPrompt.includes("company information")) {
      payload = createCompanyInsight();
    } else {
      payload = createResumeAnalysis();
    }

    return {
      content: JSON.stringify(payload, null, 2),
      model: "mock",
    };
  }
}
