"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { formatDate, initials } from "@/lib/format";
import type {
  ApplicationStatus,
  JobApplicationList,
} from "@/lib/types";
import "./applicationsTracker.css";

const applicationStatuses = [
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;

interface TrackerRow {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  status: ApplicationStatus;
  appliedAt: string;
}

export default function ApplicationsTrackerPage() {
  const [applications, setApplications] = useState<TrackerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await apiRequest<JobApplicationList>(
          "/api/jobs/applications"
        );

        if (cancelled) return;

        setApplications(
          response.data.data.map((application) => ({
            id: application.id,
            jobTitle: application.job.title,
            company: application.job.company,
            location: application.job.location,
            status: application.status,
            appliedAt: formatDate(application.appliedAt),
          }))
        );
      } catch (caught) {
        if (cancelled) return;

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load your applications."
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

  const updateStatus = async (id: string, status: ApplicationStatus) => {
    const previous = applications;
    setUpdatingId(id);
    setError(null);
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? { ...application, status } : application
      )
    );

    try {
      await apiRequest(`/api/jobs/applications/${id}`, {
        method: "PATCH",
        body: { status },
      });
    } catch (caught) {
      setApplications(previous);
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update this application."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const statusCounts = applicationStatuses.reduce<Record<string, number>>(
    (counts, status) => {
      counts[status] = applications.filter(
        (application) => application.status === status
      ).length;

      return counts;
    },
    {}
  );

  return (
    <main className="feature-page applications-tracker-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">TRACK YOUR PIPELINE</p>

            <h1>Application Tracker</h1>

            <p className="feature-description">
              Every job you applied to, in one place. Update each
              application as it moves through your pipeline.
            </p>
          </div>

          <Link href="/jobs/find" className="secondary-button">
            Find More Jobs
          </Link>
        </header>

        {error ? <p className="inline-error">{error}</p> : null}

        <section className="tracker-overview">
          {applicationStatuses.map((status) => (
            <div className="tracker-stat" key={status}>
              <span>{status}</span>

              <strong>{statusCounts[status]}</strong>
            </div>
          ))}

          <div className="tracker-stat tracker-total">
            <span>Total</span>

            <strong>{applications.length}</strong>
          </div>
        </section>

        {loading ? (
          <p className="form-notice">Loading your applications…</p>
        ) : applications.length > 0 ? (
          <section className="tracker-list-section">
            <div className="section-header">
              <div>
                <p className="card-label">APPLICATIONS</p>

                <h2>
                  {applications.length} tracked
                </h2>
              </div>

              <span className="section-count">
                {applications.length} total
              </span>
            </div>

            <div className="tracker-list">
              {applications.map((application) => (
                <article className="tracker-card" key={application.id}>
                  <div className="tracker-mark">
                    {initials(application.company)}
                  </div>

                  <div className="tracker-info">
                    <h3>{application.jobTitle}</h3>

                    <p>
                      {application.company} · {application.location}
                    </p>

                    <span className="tracker-applied">
                      Applied {application.appliedAt}
                    </span>
                  </div>

                  <div className="tracker-status-control">
                    <select
                      aria-label={`Status for ${application.jobTitle}`}
                      className={`status-badge status-${application.status.toLowerCase()}`}
                      value={application.status}
                      disabled={updatingId === application.id}
                      onChange={(event) =>
                        void updateStatus(
                          application.id,
                          event.target.value as ApplicationStatus
                        )
                      }
                    >
                      {applicationStatuses.map((status) => (
                        <option value={status} key={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="tracker-empty-state">
            <div className="tracker-empty-icon">☷</div>

            <h2>No applications yet</h2>

            <p>
              Applications you create for jobs will show up here so you
              can track your pipeline.
            </p>

            <Link href="/jobs/find" className="primary-button">
              Explore Jobs
              <span>→</span>
            </Link>
          </section>
        )}

        <section className="tracker-tip">
          <div className="tracker-tip-icon">✦</div>

          <div>
            <p className="card-label">AGENT INSIGHT</p>

            <h2>Keep your statuses up to date</h2>

            <p>
              Updating each application as it moves between stages keeps
              your career dashboard accurate and your AI insights sharp.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
