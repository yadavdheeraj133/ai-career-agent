import Link from "next/link";

export interface Insight {
  type: string;
  title: string;
  description: string;
  action: string;
  href: string;
  icon: string;
}

interface CareerInsightsProps {
  insights: Insight[];
}

export default function CareerInsights({ insights }: CareerInsightsProps) {
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

            <Link href={insight.href} className="insight-action">
              {insight.action}
              <span>→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
