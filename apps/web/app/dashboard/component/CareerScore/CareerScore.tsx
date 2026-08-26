export default function CareerScore() {
  const score = 85;

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
            Excellent
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
            <strong>Your profile is looking strong.</strong>

            <p>
              Your skills, resume and career direction are
              well aligned with your current target role.
            </p>
          </div>
        </div>

        <div className="career-score-metrics">
          <div>
            <span>Skills</span>
            <strong>92</strong>
          </div>

          <div>
            <span>Resume</span>
            <strong>91</strong>
          </div>

          <div>
            <span>Market Fit</span>
            <strong>78</strong>
          </div>
        </div>
      </div>

      <div className="career-score-glow" />
    </section>
  );
}