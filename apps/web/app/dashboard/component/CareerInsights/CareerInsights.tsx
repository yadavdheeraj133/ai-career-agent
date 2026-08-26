const insights = [
  {
    type: "Skill gap",
    title: "Docker could improve your matches",
    description:
      "Adding Docker to your skill set could improve your match with backend and full-stack roles.",
    action: "Explore skill gap",
    icon: "◇",
  },
  {
    type: "Market insight",
    title: "React is highly relevant",
    description:
      "React continues to appear frequently across the roles matching your career profile.",
    action: "View market trends",
    icon: "↗",
  },
  {
    type: "Profile insight",
    title: "Your profile is well positioned",
    description:
      "Your current skills and target role have strong alignment.",
    action: "View profile",
    icon: "✦",
  },
];

export default function CareerInsights() {
  return (
    <section className="career-insights">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">AI ANALYSIS</p>

          <h2>Career Insights</h2>
        </div>

        <span className="insights-powered">
          Powered by AI
        </span>
      </div>

      <div className="insights-grid">
        {insights.map((insight) => (
          <article
            className="insight-card"
            key={insight.title}
          >
            <div className="insight-top">
              <span className="insight-icon">
                {insight.icon}
              </span>

              <span className="insight-type">
                {insight.type}
              </span>
            </div>

            <h3>{insight.title}</h3>

            <p>{insight.description}</p>

            <button type="button" className="insight-action">
              {insight.action}
              <span>→</span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}