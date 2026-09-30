"use client";

import { useEffect, useState } from "react";

import { ResumePreviewCard } from "@/components/resume-preview-card";
import { apiRequest, type ApiEnvelope, ApiError } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { usePrimaryResume } from "@/lib/use-primary-resume";
import type {
  DashboardSummary,
  JobMatch,
  JobMatchSummary,
  UserPreferences,
} from "@/lib/types";

import Sidebar from "./component/sidebar/Sidebar";
import Header from "./component/header/header";
import CareerScore from "./component/CareerScore/CareerScore";
import AIAgent from "./component/AIAgent/AIAgent";
import CareerInsights, {
  type Insight,
} from "./component/CareerInsights/CareerInsights";
import CareerRoadmap from "./component/CareerRoadmap/CareerRoadmap";
import AgentActivity, {
  type Activity,
} from "./component/AgentActivity/AgentActivity";

import "./dashboard.css";

const EMPTY_MATCH_SUMMARY: JobMatchSummary = {
  totalMatches: 0,
  strongMatches: 0,
  averageMatchScore: 0,
};

async function loadOptional<T>(path: string): Promise<T | null> {
  try {
    const response = await apiRequest<T>(path);
    return response.data;
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      return null;
    }

    throw caught;
  }
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [matchSummary, setMatchSummary] =
    useState<JobMatchSummary>(EMPTY_MATCH_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resume = usePrimaryResume();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [summaryData, preferencesData] = await Promise.all([
          apiRequest<DashboardSummary>("/api/dashboard"),
          loadOptional<UserPreferences>("/api/preferences"),
        ]);

        if (cancelled) return;

        setSummary(summaryData.data);
        setPreferences(preferencesData);

        // Matching requires a profile signal; without one the API correctly
        // rejects an empty match body, so only query when it can mean something.
        // The server summary already knows whether a resume exists, so this does
        // not need to wait on the resume document itself.
        const canMatch =
          summaryData.data.resume.exists || preferencesData !== null;

        let matchResponse: ApiEnvelope<JobMatch[]> | null = null;

        if (canMatch) {
          matchResponse = await apiRequest<JobMatch[]>("/api/jobs/match", {
            method: "POST",
            // Explicit pagination keeps this bounded: stats come from the
            // server summary (computed over the full query) while the client
            // only holds a preview page for the skill-gap insight.
            body: { page: 1, pageSize: 100 },
          });
        }

        if (cancelled) return;

        // The server computes total/strong/average over the full matching
        // query; the client only reads the (page-1) preview for the skill-gap
        // insight and never re-derives the threshold.
        setMatchSummary(matchResponse?.summary ?? EMPTY_MATCH_SUMMARY);
        setMatches(matchResponse?.data ?? []);
      } catch (caught) {
        if (cancelled) return;

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load your dashboard."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !summary) {
    return (
      <main className="dashboard-page">
        <Sidebar />

        <div className="dashboard-main">
          <Header />

          <div className="dashboard-content">
            <p className="form-notice">Finding jobs that match your profile...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="dashboard-page">
        <Sidebar />

        <div className="dashboard-main">
          <Header />

          <div className="dashboard-content">
            {error ? <p className="inline-error">{error}</p> : null}

            <p className="form-notice">
              Your dashboard could not be loaded. Refresh the page to try
              again.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const skillsCount = Array.isArray(resume.document?.skills)
    ? resume.document.skills.length
    : summary.resume.skillsCount;

  const totalJobs = matchSummary.totalMatches;
  const strongMatches = matchSummary.strongMatches;
  const averageMatch = matchSummary.averageMatchScore;

  const skillsScore =
    skillsCount > 0 ? Math.min(100, 40 + skillsCount * 6) : 0;
  const resumeScore = summary.resume.exists ? 100 : 0;
  const marketFit = averageMatch;
  const overallScore = Math.round((skillsScore + resumeScore + marketFit) / 3);

  const missingSkillCounts = new Map<string, number>();
  for (const match of matches) {
    for (const skill of match.missingSkills) {
      missingSkillCounts.set(skill, (missingSkillCounts.get(skill) ?? 0) + 1);
    }
  }

  const topMissingSkills = [...missingSkillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([skill]) => skill);

  const [firstMissingSkill] = topMissingSkills;

  let skillGapTitle = "Compare your skills with the market";
  let skillGapDescription =
    "Run a skill gap analysis to see how your profile measures up against the jobs you are matched with.";

  if (skillsCount === 0) {
    skillGapTitle = "Add skills to unlock your skill gap";
    skillGapDescription =
      "Add the skills you have so your agent can compare your profile against real job requirements.";
  } else if (firstMissingSkill) {
    skillGapTitle = `${firstMissingSkill} could improve your matches`;
    skillGapDescription = `${firstMissingSkill} appears often in the jobs you are being matched with but is not on your profile yet.`;
  }

  let addSkillTitle = "Add your skills to your profile";
  let addSkillDescription =
    "Keeping your skills current helps your agent compare you with open roles and sharpen every job match.";

  if (skillsCount === 0) {
    addSkillTitle = "Start with the skills you have";
    addSkillDescription =
      "Your profile has no skills yet. Adding the skills you actually have powers match scores, skill gaps and tailored recommendations.";
  } else if (firstMissingSkill) {
    addSkillTitle = `Add ${firstMissingSkill} to your profile`;
    addSkillDescription = `${topMissingSkills.join(", ")} ${
      topMissingSkills.length === 1 ? "shows" : "show"
    } up often in the jobs you match with but ${
      topMissingSkills.length === 1 ? "is" : "are"
    } missing from your profile. Adding relevant skills improves your match scores and the recommendations your agent makes.`;
  }

  const insights: Insight[] = [
    {
      type: "Skill gap",
      title: skillGapTitle,
      description: skillGapDescription,
      action: "Explore skill gap",
      href: "/features/resume/skill-gap",
      icon: "◇",
    },
    {
      type: "Add Skill",
      title: addSkillTitle,
      description: addSkillDescription,
      action: "Add Skill",
      href: "/skill",
      icon: "✦",
    },
  ];

  const activities: Activity[] = [];

  if (summary.resume.updatedAt) {
    activities.push({
      time: formatRelativeTime(summary.resume.updatedAt),
      title: "Updated your resume",
      description: `Your resume has ${skillsCount} skill${
        skillsCount === 1 ? "" : "s"
      } on file.`,
      icon: "↗",
      type: "profile",
    });
  }

  activities.push({
    time: "just now",
    title: "Refreshed your job matches",
    description:
      totalJobs > 0
        ? `${totalJobs} jobs were evaluated against your profile.`
        : `${summary.jobs.total} jobs are available to evaluate once you add skills.`,
    icon: "✦",
    type: "ai",
  });

  if (summary.applications.total > 0) {
    activities.push({
      time: "recently",
      title: "Applications in progress",
      description: `${summary.applications.total} application${
        summary.applications.total === 1 ? "" : "s"
      } being tracked.`,
      icon: "◎",
      type: "roadmap",
    });
  }

  if (summary.jobs.saved > 0) {
    activities.push({
      time: "recently",
      title: "Saved jobs to review",
      description: `${summary.jobs.saved} job${
        summary.jobs.saved === 1 ? "" : "s"
      } bookmarked for later.`,
      icon: "◇",
      type: "skill",
    });
  }

  return (
    <main className="dashboard-page">
      <Sidebar />

      <div className="dashboard-main">
        <Header />

        <div className="dashboard-content">
          <section className="dashboard-command-center">
            <div className="dashboard-command-grid">
              <CareerScore
                score={overallScore}
                skills={skillsScore}
                resume={resumeScore}
                marketFit={marketFit}
              />

              <AIAgent
                total={totalJobs}
                strong={strongMatches}
                average={averageMatch}
                hasSkills={skillsCount > 0}
              />
            </div>
          </section>

          <div className="dashboard-insights-row">
            <CareerInsights insights={insights} />

            {resume.document ? (
              <ResumePreviewCard resume={resume.document} />
            ) : null}
          </div>

          <CareerRoadmap targetRole={preferences?.jobRole ?? null} />

          <AgentActivity activities={activities} />
        </div>
      </div>
    </main>
  );
}
