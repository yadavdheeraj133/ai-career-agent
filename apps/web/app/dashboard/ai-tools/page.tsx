"use client";

import Link from "next/link";
import "../section/dashboardSection.css";

const items = [
  {
    href: "/features/ai-tools/verdict",
    icon: "✦",
    title: "AI Verdict",
    description:
      "A final suitability recommendation between your profile and a job.",
  },
  {
    href: "/features/ai-tools/interview-probability",
    icon: "◇",
    title: "Interview Probability",
    description:
      "An estimate of how likely you are to reach an interview for a role.",
  },
  {
    href: "/features/ai-tools/job-summary",
    icon: "▤",
    title: "Job Summary",
    description:
      "Compress a long job description into a clear, structured summary.",
  },
  {
    href: "/features/ai-tools/missing-skills",
    icon: "◈",
    title: "Missing Skills",
    description:
      "Identify the skills you should learn to qualify for target roles.",
  },
  {
    href: "/features/ai-tools/company-insights",
    icon: "▣",
    title: "Company Insights",
    description:
      "Research a company, its products, culture and fit from provided information.",
  },
  {
    href: "/features/applications/cover-letter",
    icon: "▌",
    title: "Cover Letter",
    description:
      "Generate a tailored cover letter for a specific job and company.",
  },
  {
    href: "/features/applications/answers",
    icon: "▮",
    title: "Application Answers",
    description:
      "Draft strong answers to application screening questions.",
  },
  {
    href: "/features/applications/message",
    icon: "✉",
    title: "Recruiter Message",
    description:
      "Write a professional outreach message when applying or following up.",
  },
];

export default function AIToolsSectionPage() {
  return (
    <main className="feature-page dashboard-section-page">
      <div className="section-container">
        <header className="section-header">
          <p className="section-eyebrow">WORKSPACE</p>

          <h1>AI Tools</h1>

          <p className="section-description">
            A library of AI-powered assistants that analyse, tailor and
            prepare every part of your job search.
          </p>
        </header>

        <div className="section-card-grid">
          {items.map((item) => (
            <Link href={item.href} className="section-link-card" key={item.title}>
              <span className="section-link-icon">{item.icon}</span>

              <span className="section-link-content">
                <h2>{item.title}</h2>

                <p>{item.description}</p>
              </span>

              <span className="section-link-arrow">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}