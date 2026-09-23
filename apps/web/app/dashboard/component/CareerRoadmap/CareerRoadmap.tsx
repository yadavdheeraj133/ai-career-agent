import Link from "next/link";

interface CareerRoadmapProps {
  targetRole: string | null;
}

export default function CareerRoadmap({ targetRole }: CareerRoadmapProps) {
  return (
    <section className="career-roadmap">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">YOUR DIRECTION</p>

          <h2>Career Roadmap</h2>
        </div>

        <Link href="/features/career/roadmap" className="roadmap-view-button">
          View full roadmap
          <span>→</span>
        </Link>
      </div>

      <div className="roadmap-card">
        <div className="roadmap-header">
          <div>
            <span className="roadmap-label">CURRENT TARGET</span>

            <h3>{targetRole ?? "Set your target role"}</h3>
          </div>
        </div>

        <p className="form-notice">
          {targetRole
            ? "Generate an AI roadmap to map the steps between where you are and your target role."
            : "Add a target role in your preferences to generate a personalised roadmap."}
        </p>

        <div className="roadmap-next">
          <div className="roadmap-next-icon">✦</div>

          <div>
            <span>AI RECOMMENDATION</span>

            <p>
              Your AI agent can outline the skills and experience to
              focus on next. Generate a roadmap to get started.
            </p>
          </div>
        </div>

        <div className="tab-panel-actions">
          {!targetRole ? (
            <Link href="/dashboard/career" className="secondary-button">
              Set preferences
            </Link>
          ) : null}

          <Link href="/features/career/roadmap" className="primary-button">
            Generate roadmap
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
