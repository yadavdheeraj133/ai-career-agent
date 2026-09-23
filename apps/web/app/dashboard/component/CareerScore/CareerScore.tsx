interface CareerScoreProps {
  score: number;
  skills: number;
  resume: number;
  marketFit: number;
}

function badgeFor(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Getting started";
}

function summaryFor(score: number): string {
  if (score >= 80) {
    return "Your profile is looking strong. Your skills, resume and career direction are well aligned with your target role.";
  }

  if (score >= 60) {
    return "You have a solid base. Filling a few gaps will push your matches higher.";
  }

  if (score >= 40) {
    return "Your profile is taking shape. Add skills and preferences to improve your matches.";
  }

  return "Complete your profile to start measuring your career health.";
}

export default function CareerScore({
  score,
  skills,
  resume,
  marketFit,
}: CareerScoreProps) {
  return (
    <section className="career-score-card">
      <div className="career-score-content">
        <div className="career-score-header">
          <div>
            <p className="career-score-eyebrow">
              CAREER HEALTH
            </p>

            <h2>Career Score</h2>
          </div>

          <span className="career-score-badge">
            {badgeFor(score)}
          </span>
        </div>

        <div className="career-score-main">
          <div
            className="career-score-ring"
            style={
              {
                "--score": `${score * 3.6}deg`,
              } as React.CSSProperties
            }
          >
            <div className="career-score-ring-inner">
              <strong>{score}</strong>
              <span>/ 100</span>
            </div>
          </div>

          <div className="career-score-summary">
            <strong>{summaryFor(score).split(".")[0]}.</strong>

            <p>{summaryFor(score)}</p>
          </div>
        </div>

        <div className="career-score-metrics">
          <div>
            <span>Skills</span>
            <strong>{skills}</strong>
          </div>

          <div>
            <span>Resume</span>
            <strong>{resume}</strong>
          </div>

          <div>
            <span>Market Fit</span>
            <strong>{marketFit}</strong>
          </div>
        </div>
      </div>

      <div className="career-score-glow" />
    </section>
  );
}
