import Link from "next/link";

interface AIAgentProps {
  total: number;
  strong: number;
  average: number;
  hasSkills: boolean;
}

export default function AIAgent({
  total,
  strong,
  average,
  hasSkills,
}: AIAgentProps) {
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
          {hasSkills ? (
            <>
              <h3>
                I found <strong>{total} jobs</strong> that match
                your profile.
              </h3>

              <p>
                {strong} are strong matches based on your skills,
                experience and career preferences.
              </p>
            </>
          ) : (
            <>
              <h3>
                There are <strong>{total} jobs</strong> available to
                match.
              </h3>

              <p>
                Add skills to your profile so I can score how well
                each role fits you.
              </p>
            </>
          )}
        </div>

        <div className="ai-agent-stats">
          <div className="ai-agent-stat">
            <strong>{total}</strong>
            <span>Total matches</span>
          </div>

          <div className="ai-agent-stat strong">
            <strong>{strong}</strong>
            <span>Strong matches</span>
          </div>

          <div className="ai-agent-stat">
            <strong>{hasSkills ? `${average}%` : "—"}</strong>
            <span>Avg. match</span>
          </div>
        </div>

        <div className="ai-agent-footer">
          <span>
            {hasSkills ? "Scored just now" : "Waiting for your skills"}
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
