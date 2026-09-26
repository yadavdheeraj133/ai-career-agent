/**
 * Shared API types mirrored from the Express controllers/services.
 * Kept hand-written (no codegen) to avoid adding a dependency.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Profile extends AuthUser {
  createdAt: string;
  updatedAt: string;
}

export type WorkMode = "Remote" | "Hybrid" | "Onsite";
export type JobType = "Full-time" | "Part-time" | "Internship" | "Contract" | "Freelance";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  jobType: string;
  experience: string | null;
  salary: string | null;
  description: string | null;
  skills?: string[] | null;
  source: string;
  provider?: string | null;
  externalId?: string | null;
  url: string;
  postedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkEntry {
  jobId: string;
  bookmarked: boolean;
  bookmarkedAt: string;
  job: Job;
}

/** `GET /api/jobs/bookmarks` wraps its rows in an inner `{ count, data }`. */
export interface BookmarkList {
  count: number;
  data: BookmarkEntry[];
}

export type ApplicationStatus =
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Withdrawn";

export interface JobApplicationView {
  id: string;
  jobId: string;
  job: {
    title: string;
    company: string;
    location: string;
  };
  status: ApplicationStatus;
  appliedAt: string;
  notes: string;
}

export interface JobApplicationDetail {
  jobId: string;
  job: {
    title: string;
    company: string;
    location: string;
  };
  status: ApplicationStatus | null;
  appliedAt: string | null;
  notes: string | null;
}

/** `GET /api/jobs/applications` wraps its rows in an inner `{ count, data }`. */
export interface JobApplicationList {
  count: number;
  data: JobApplicationView[];
}

export interface JobMatch {
  job: Job;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

/** Server-computed summary of a full matching query — the single source of
 *  truth for dashboard stats so the client never recomputes thresholds. */
export interface JobMatchSummary {
  totalMatches: number;
  strongMatches: number;
  averageMatchScore: number;
}

export interface UserPreferences {
  id: string;
  userId: string;
  jobRole: string | null;
  location: string | null;
  workMode: string | null;
  jobType: string | null;
  salary: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors `THEME_VALUES` in `@/lib/theme` and the `theme` API validator. */
export type ThemePreference = "light" | "dark" | "system";

export interface UserSettings {
  id: string;
  userId: string;
  /** Master switch for the whole notification channel. */
  emailNotifications: boolean;
  jobAlerts: boolean;
  applicationUpdates: boolean;
  interviewReminders: boolean;
  theme: ThemePreference;
  minMatchScore: number;
  autoMatch: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Resume {
  id: string;
  title: string;
  summary: string | null;
  experience: unknown;
  education: unknown;
  skills: string[] | null;
  projects: unknown;
  certifications: unknown;
  achievements: unknown;
  languages: string[] | null;
  links: unknown;
  template: string;
  isDefault: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  parsedProfile?: ParsedResumeProfile | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  uploadedAt?: string | null;
}

export interface ParsedResumeProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  skills: string[];
  education: string[];
  experience: string[];
  projects: string[];
  certifications: string[];
  achievements: string[];
  currentRole: string | null;
  targetRole: string | null;
  summary: string | null;
}

export interface DashboardSummary {
  profile: AuthUser;
  resume: {
    exists: boolean;
    title: string | null;
    skillsCount: number;
    updatedAt: string | null;
  };
  jobs: {
    total: number;
    saved: number;
  };
  applications: {
    total: number;
    byStatus: Record<string, number>;
  };
  preferences: {
    exists: boolean;
  };
  settings: {
    exists: boolean;
  };
}

/*
 * ------------------------------------------------------------------
 * AI response types (mirrors `apps/api/src/ai/schemas/**`).
 * ------------------------------------------------------------------
 */

export interface AiTitledText {
  title: string;
  description: string;
}

export interface AiSkillReason {
  skill: string;
  reason: string;
}

export interface AiSkillPriority {
  skill: string;
  priority: "High" | "Medium" | "Low";
  reason: string;
}

export interface ResumeAnalysis {
  overallScore: number;
  summary: string;
  strengths: AiTitledText[];
  weaknesses: {
    title: string;
    description: string;
    improvement: string;
  }[];
  sectionScores: {
    title: number;
    summary: number;
    experience: number;
    projects: number;
    skills: number;
    education: number;
    certifications: number;
    achievements: number;
    languages: number;
    links: number;
    formatting: number;
  };
  recommendations: string[];
}

export interface AtsGateStatus {
  hasResume: boolean;
  atsScore: number | null;
  atsCheckedAt: string | null;
  passed: boolean;
  threshold: number;
}

export interface AtsResult {
  overallScore: number;
  keywordMatch: number;
  requiredSkillsMatch: number;
  preferredSkillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  criticalMissingKeywords: string[];
  parsingIssues: string[];
  sectionAnalysis: {
    title: string;
    summary: string;
    experience: string;
    projects: string;
    skills: string;
    education: string;
    certifications: string;
  };
  recommendations: string[];
}

export interface SkillGapResult {
  overallSkillMatch: number;
  existingSkills: AiSkillPriority[];
  missingSkills: AiSkillPriority[];
  criticalSkills: AiSkillPriority[];
  niceToHaveSkills: AiSkillPriority[];
  strengths: {
    strength: string;
    reason?: string;
  }[];
  learningPriorities: AiSkillPriority[];
  recommendations: AiSkillPriority[];
}

export interface ResumeTailorResult {
  title: string;
  summary: string;
  experience: {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    responsibilities: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    graduationDate: string;
  }[];
  skills: string[];
  projects: {
    name: string;
    description: string;
  }[];
  certifications: string[];
  achievements: string[];
  languages: string[];
  links: string[];
  improvementSummary: {
    atsImprovements: string[];
    remainingMissingKeywords: string[];
    notes: string[];
  };
}

export interface ResumeJobMatchResult {
  overallMatch: number;
  matchedSkills: AiSkillReason[];
  missingSkills: AiSkillReason[];
  experienceMatch: number;
  educationMatch: number;
  strengths: AiTitledText[];
  weaknesses: AiTitledText[];
  recommendations: string[];
}

export type AiVerdictLabel =
  | "Strong Match"
  | "Good Match"
  | "Moderate Match"
  | "Weak Match";

export interface AIVerdictResult {
  verdict: AiVerdictLabel;
  score: number;
  summary: string;
  reasons: string[];
  strengths: string[];
  concerns: string[];
  recommendation: string;
}

export interface InterviewProbabilityResult {
  probability: number;
  confidence: "High" | "Medium" | "Low";
  assessment: string;
  positiveFactors: string[];
  riskFactors: string[];
  recommendations: string[];
}

export interface CoverLetterResult {
  greeting: string;
  introduction: string;
  body: string[];
  closing: string;
  signature: string;
}

export interface ApplicationMessageResult {
  subject: string;
  message: string;
}

export interface ApplicationAnswerResult {
  question: string;
  answer: string;
}

export interface InterviewQuestion {
  question: string;
  reason: string;
  sampleAnswer: string;
  followUpQuestions: string[];
}

export interface InterviewPreparationResult {
  overview: string;
  interviewDifficulty: string;
  keyFocusAreas: string[];
  technicalQuestions: InterviewQuestion[];
  behavioralQuestions: InterviewQuestion[];
  projectQuestions: InterviewQuestion[];
  resumeQuestions: InterviewQuestion[];
  weakAreas: string[];
  preparationTips: string[];
  finalAdvice: string;
}

export interface JobSummaryResult {
  jobTitle: string;
  company: string;
  employmentType: string;
  experienceLevel: string;
  location: string;
  summary: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  technologies: string[];
  qualifications: string[];
  benefits: string[];
  salary: string;
}

export interface CompanyInsightResult {
  companyName: string;
  industry: string;
  overview: string;
  mission: string;
  vision: string;
  products: string[];
  services: string[];
  technologies: string[];
  culture: string[];
  values: string[];
  benefits: string[];
  hiringFocus: string[];
  recentNews: string[];
  candidateTalkingPoints: string[];
  summary: string;
}

export interface CareerCoachResult {
  currentLevel: string;
  careerGoal: string;
  strengths: string[];
  weaknesses: string[];
  transferableSkills: string[];
  careerReadiness: string;
  recommendedNextSteps: string[];
  commonMistakesToAvoid: string[];
  motivation: string;
}

export interface CareerRoadmapStep {
  title: string;
  objective: string;
  skills: string[];
  projects: string[];
  certifications: string[];
  expectedOutcome: string;
}

export interface CareerRoadmapResult {
  currentLevel: string;
  targetRole: string;
  estimatedTimeline: string;
  roadmap: CareerRoadmapStep[];
  successTips: string[];
  finalAdvice: string;
}

export interface LearningStage {
  title: string;
  description: string;
  topics: string[];
  difficulty: string;
  estimatedTime: string;
  practice: string[];
  recommendedProjects: string[];
}

export interface LearningPathResult {
  careerGoal: string;
  estimatedDuration: string;
  learningPath: LearningStage[];
  recommendedResources: string[];
  studyTips: string[];
  finalAdvice: string;
}

export type NotificationType =
  | "NEW_JOB"
  | "JOB_UPDATED"
  | "JOB_EXPIRED"
  | "APPLICATION_UPDATE";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: { jobId?: string; jobIds?: string[]; status?: string } | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  unread: number;
}
