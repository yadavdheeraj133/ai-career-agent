import Link from "next/link";

export default function AIAgent() {
  return (
    <section className="ai-agent-card">
      <div className="ai-agent-glow" />

      <div className="ai-agent-content">
        <div className="ai-agent-header">
          <div className="ai-agent-title">
            <span className="ai-agent-symbol">✦</span>

            <div>
              <p className="ai-agent-eyebrow">YOUR AI AGENT</p>
              <h2>Job Intelligence</h2>
            </div>
          </div>

          <div className="ai-agent-status">
            <span />
            Active
          </div>
        </div>

        <div className="ai-agent-message">
          <h3>
            I found <strong>18 jobs</strong> that match
            your profile.
          </h3>

          <p>
            4 are strong matches based on your skills,
            experience and career preferences.
          </p>
        </div>

        <div className="ai-agent-stats">
          <div className="ai-agent-stat">
            <strong>18</strong>
            <span>Total matches</span>
          </div>

          <div className="ai-agent-stat strong">
            <strong>4</strong>
            <span>Strong matches</span>
          </div>

          <div className="ai-agent-stat">
            <strong>87%</strong>
            <span>Avg. match</span>
          </div>
        </div>

        <div className="ai-agent-footer">
          <span>
            Last analyzed 18 min ago
          </span>

          <Link href="/dashboard/jobs">
            Explore matches
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}