"use client";

import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import type {
  DashboardSummary,
  JobMatch,
  Resume,
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

const STRONG_MATCH_THRESHOLD = 70;

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
  const [resume, setResume] = useState<Resume | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [summaryData, resumeData, preferencesData] = await Promise.all([
          apiRequest<DashboardSummary>("/api/dashboard"),
          loadOptional<Resume>("/resume"),
          loadOptional<UserPreferences>("/api/preferences"),
        ]);

        if (cancelled) return;

        setSummary(summaryData.data);
        setResume(resumeData);
        setPreferences(preferencesData);

        const skills = Array.isArray(resumeData?.skills)
          ? resumeData.skills.filter(
              (skill): skill is string => typeof skill === "string"
            )
          : [];

        if (skills.length > 0) {
          const matchResponse = await apiRequest<JobMatch[]>("/api/jobs/match", {
            method: "POST",
            body: { skills },
          });

          if (cancelled) return;

          setMatches(matchResponse.data);
        }
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
            <p className="form-notice">Loading your command center…</p>
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

  const skillsCount = Array.isArray(resume?.skills)
    ? resume.skills.length
    : summary.resume.skillsCount;

  const totalJobs = summary.jobs.total;
  const strongMatches = matches.filter(
    (match) => match.matchScore >= STRONG_MATCH_THRESHOLD
  ).length;
  const averageMatch =
    matches.length > 0
      ? Math.round(
          matches.reduce((total, match) => total + match.matchScore, 0) /
            matches.length
        )
      : 0;

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

  const topMissingSkill =
    [...missingSkillCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null;

  const insights: Insight[] = [];

  if (skillsCount === 0) {
    insights.push({
      type: "Profile insight",
      title: "Add your skills to unlock matching",
      description:
        "Your skills power job match scores, skill gaps and tailored recommendations.",
      action: "Add skills",
      href: "/skill",
      icon: "✦",
    });
  }

  if (!summary.resume.exists) {
    insights.push({
      type: "Profile insight",
      title: "Create your resume",
      description:
        "A resume lets the AI tailor applications and analyse how you compare to each role.",
      action: "Open resume",
      href: "/dashboard/resume",
      icon: "◇",
    });
  }

  if (topMissingSkill) {
    insights.push({
      type: "Skill gap",
      title: `${topMissingSkill} could improve your matches`,
      description: `${topMissingSkill} appears often in the jobs you are being matched with but is not on your profile yet.`,
      action: "Explore skill gap",
      href: "/features/resume/skill-gap",
      icon: "◇",
    });
  }

  if (!preferences && insights.length < 3) {
    insights.push({
      type: "Profile insight",
      title: "Set your job preferences",
      description:
        "Tell your agent your target role, location and work mode for sharper matches.",
      action: "Open preferences",
      href: "/dashboard/career",
      icon: "↗",
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "Market insight",
      title: `${totalJobs} jobs are available to match`,
      description:
        "Your agent keeps evaluating available roles against your skills and preferences.",
      action: "Find jobs",
      href: "/jobs/find",
      icon: "↗",
    });
  }

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
      matches.length > 0
        ? `${matches.length} jobs were evaluated against your profile.`
        : `${totalJobs} jobs are available to evaluate once you add skills.`,
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

          <CareerInsights insights={insights} />

          <CareerRoadmap targetRole={preferences?.jobRole ?? null} />

          <AgentActivity activities={activities} />
        </div>
      </div>
    </main>
  );
}
