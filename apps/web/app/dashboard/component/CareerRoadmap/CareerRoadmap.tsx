const roadmapSteps = [
  {
    title: "Junior Developer",
    status: "completed",
    description: "Foundation established",
  },
  {
    title: "Mid-Level Developer",
    status: "current",
    description: "You are here",
  },
  {
    title: "Senior Developer",
    status: "upcoming",
    description: "Build advanced expertise",
  },
  {
    title: "Tech Lead",
    status: "upcoming",
    description: "Lead teams and systems",
  },
];

export default function CareerRoadmap() {
  return (
    <section className="career-roadmap">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">YOUR DIRECTION</p>

          <h2>Career Roadmap</h2>
        </div>

        <button type="button" className="roadmap-view-button">
          View full roadmap
          <span>→</span>
        </button>
      </div>

      <div className="roadmap-card">
        <div className="roadmap-header">
          <div>
            <span className="roadmap-label">CURRENT TARGET</span>

            <h3>Senior Full Stack Developer</h3>
          </div>

          <div className="roadmap-progress">
            <strong>62%</strong>
            <span>progress</span>
          </div>
        </div>

        <div className="roadmap-track">
          {roadmapSteps.map((step, index) => (
            <div
              className={`roadmap-step ${step.status}`}
              key={step.title}
            >
              <div className="roadmap-marker">
                {step.status === "completed"
                  ? "✓"
                  : step.status === "current"
                    ? "●"
                    : ""}
              </div>

              <div className="roadmap-step-content">
                <strong>{step.title}</strong>

                <span>{step.description}</span>
              </div>

              {index < roadmapSteps.length - 1 && (
                <div className="roadmap-connector" />
              )}
            </div>
          ))}
        </div>

        <div className="roadmap-next">
          <div className="roadmap-next-icon">✦</div>

          <div>
            <span>AI RECOMMENDATION</span>

            <p>
              Focus on system design and advanced backend
              architecture to move toward your next stage.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}