"use client";

import Link from "next/link";
import "../section/dashboardSection.css";

const items = [
  {
    href: "/features/interview",
    icon: "◇",
    title: "Interview Preparation",
    description:
      "Generate technical, behavioural and company questions to practise before the real thing.",
  },
  {
    href: "/features/ai-tools/interview-probability",
    icon: "◆",
    title: "Interview Probability",
    description:
      "An estimate of your odds of reaching an interview for a role.",
  },
  {
    href: "/features/ai-tools/verdict",
    icon: "✦",
    title: "AI Verdict",
    description:
      "The overall suitability verdict that guides your interview decisions.",
  },
];

export default function InterviewSectionPage() {
  return (
    <main className="feature-page dashboard-section-page">
      <div className="section-container">
        <header className="section-header">
          <p className="section-eyebrow">WORKSPACE</p>

          <h1>Interview</h1>

          <p className="section-description">
            Prepare for interviews with practice content generated from
            your resume and the job you are targeting.
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