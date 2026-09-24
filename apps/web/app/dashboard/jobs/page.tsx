"use client";

import Link from "next/link";
import "../section/dashboardSection.css";

const items = [
  {
    href: "/jobs/find",
    icon: "⌕",
    title: "Find Jobs",
    description:
      "Search jobs by role, location, work mode, job type and experience, then review match scores.",
  },
  {
    href: "/jobs/saved",
    icon: "◫",
    title: "Saved Jobs",
    description:
      "Review the jobs you have bookmarked and decide which ones to apply for.",
  },
  {
    href: "/jobs/find",
    icon: "▤",
    title: "Job Workspace",
    description:
      "Browse verified roles and open any job to run ATS, resume match, skill gap, verdict and interview analysis.",
  },
];

export default function JobsSectionPage() {
  return (
    <main className="feature-page dashboard-section-page">
      <div className="section-container">
        <header className="section-header">
          <p className="section-eyebrow">WORKSPACE</p>

          <h1>Jobs</h1>

          <p className="section-description">
            Discover roles that match your profile and move them through
            the job workspace, from first look to application.
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