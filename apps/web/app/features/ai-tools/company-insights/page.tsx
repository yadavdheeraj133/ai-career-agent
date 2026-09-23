"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction } from "@/lib/use-ai";
import type { CompanyInsightResult } from "@/lib/types";

import "./companyInsights.css";

export default function CompanyInsightsPage() {
  const [companyInformation, setCompanyInformation] = useState("");
  const action = useAiAction<CompanyInsightResult>();

  const result = action.data;
  const canRun =
    companyInformation.trim().length > 0 && !action.loading;

  const stats = result
    ? [
        {
          label: "Industry",
          value: result.industry,
          description: "Company industry",
        },
        {
          label: "Products",
          value: String(result.products.length),
          description: "Product lines",
        },
        {
          label: "Services",
          value: String(result.services.length),
          description: "Service areas",
        },
        {
          label: "Values",
          value: String(result.values.length),
          description: "Stated values",
        },
      ]
    : [];

  return (
    <main className="feature-page company-insights-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI JOB INTELLIGENCE</p>

            <h1>Company Insights</h1>

            <p className="feature-description">
              Understand the company behind the job and get useful context
              before deciding whether to apply.
            </p>
          </div>

          <Link
            href="/features/ai-tools/job-summary"
            className="secondary-button"
          >
            View Job Summary
          </Link>
        </header>

        <AiToolPanel
          eyebrow="COMPANY INFORMATION"
          title="Research a company"
          description="Paste anything you know about the company — its website, about page, or job context — and AI will build an insight profile."
          fields={[
            {
              id: "companyInformation",
              label: "Company Information",
              value: companyInformation,
              onChange: setCompanyInformation,
              rows: 10,
              placeholder:
                "Paste the company description, website copy, or any notes you have…",
            },
          ]}
          submitLabel="Generate Company Insight"
          onSubmit={() =>
            action.run("/api/interview/company-insight", {
              companyInformation,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Researching the company…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No company insight yet"
            description="Paste company information and generate an insight profile with mission, culture, and talking points."
          />
        ) : null}

        {result ? (
          <>
            <section className="company-overview-card">
              <div className="company-logo">
                {(result.companyName || "CO").slice(0, 2).toUpperCase()}
              </div>

              <div className="company-overview-main">
                <p className="card-label">COMPANY</p>

                <h2>{result.companyName}</h2>

                <p className="company-description">{result.overview}</p>

                <div className="company-links">
                  <span>{result.industry}</span>
                  <span>·</span>
                  <span>{result.values.length} core values</span>
                </div>
              </div>

              <span className="company-status">
                <span />
                {result.hiringFocus.length > 0
                  ? "Active Hiring"
                  : "Company Profile"}
              </span>
            </section>

            <section className="company-stats-grid">
              {stats.map((stat) => (
                <article className="company-stat-card" key={stat.label}>
                  <p>{stat.label}</p>

                  <strong>{stat.value}</strong>

                  <span>{stat.description}</span>
                </article>
              ))}
            </section>

            <section className="company-ai-card">
              <div className="ai-heading">
                <div className="ai-icon">✦</div>

                <div>
                  <p className="card-label">AI COMPANY INSIGHT</p>

                  <h2>{result.mission || "Company mission"}</h2>
                </div>
              </div>

              <p className="ai-overview">{result.summary}</p>
            </section>

            <section className="company-insight-grid">
              <div className="company-insight-card">
                <div className="insight-heading">
                  <span className="insight-dot positive" />

                  <div>
                    <p className="card-label">CULTURE & VALUES</p>

                    <h2>What the company stands for</h2>
                  </div>
                </div>

                <ul>
                  {[...result.values, ...result.culture].map((item) => (
                    <li key={item}>
                      <span>✓</span>
                      {item}
                    </li>
                  ))}

                  {result.values.length === 0 &&
                  result.culture.length === 0 ? (
                    <li>
                      <span>✓</span>
                      No culture details were returned.
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="company-insight-card">
                <div className="insight-heading">
                  <span className="insight-dot warning" />

                  <div>
                    <p className="card-label">TALKING POINTS</p>

                    <h2>Use these in your interview</h2>
                  </div>
                </div>

                <ul>
                  {result.candidateTalkingPoints.map((item) => (
                    <li key={item}>
                      <span>!</span>
                      {item}
                    </li>
                  ))}

                  {result.candidateTalkingPoints.length === 0 ? (
                    <li>
                      <span>!</span>
                      No talking points were returned.
                    </li>
                  ) : null}
                </ul>
              </div>
            </section>

            {result.technologies.length > 0 ? (
              <section className="company-tech-card">
                <div className="section-header">
                  <div>
                    <p className="card-label">ENGINEERING STACK</p>

                    <h2>Technologies associated with the company</h2>
                  </div>

                  <span className="section-count">
                    {result.technologies.length} technologies
                  </span>
                </div>

                <div className="technology-tags">
                  {result.technologies.map((technology) => (
                    <span key={technology}>{technology}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {result.recentNews.length > 0 ? (
              <section className="company-tech-card">
                <div className="section-header">
                  <div>
                    <p className="card-label">RECENT NEWS</p>

                    <h2>What&apos;s happening at the company</h2>
                  </div>
                </div>

                <ul className="ai-list">
                  {result.recentNews.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="company-action-card">
          <div className="company-action-icon">✦</div>

          <div className="company-action-content">
            <p className="card-label">AI RECOMMENDATION</p>

            <h2>Worth exploring further</h2>

            <p>
              Review the job requirements and tailor your resume before
              applying to this company.
            </p>
          </div>

          <div className="company-action-buttons">
            <Link href="/features/resume/job-match" className="primary-button">
              Check Job Match
              <span>→</span>
            </Link>

            <Link href="/features/resume/tailor" className="secondary-button">
              Tailor Resume
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
