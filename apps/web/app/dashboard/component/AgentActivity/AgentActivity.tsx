const activities = [
  {
    time: "18 min ago",
    title: "Analyzed new job opportunities",
    description: "42 jobs were evaluated against your profile.",
    icon: "✦",
    type: "ai",
  },
  {
    time: "1 hour ago",
    title: "Identified a skill gap",
    description: "Docker could improve your full-stack matches.",
    icon: "◇",
    type: "skill",
  },
  {
    time: "3 hours ago",
    title: "Updated your career profile",
    description: "Your profile match data was refreshed.",
    icon: "↗",
    type: "profile",
  },
  {
    time: "Yesterday",
    title: "Career roadmap updated",
    description: "Your next recommended career step was updated.",
    icon: "◎",
    type: "roadmap",
  },
];

export default function AgentActivity() {
  return (
    <section className="agent-activity">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">WHAT YOUR AGENT DID</p>

          <h2>Recent Activity</h2>
        </div>

        <span className="activity-status">
          <span />
          Agent active
        </span>
      </div>

      <div className="activity-card">
        {activities.map((activity, index) => (
          <div
            className="activity-item"
            key={`${activity.title}-${index}`}
          >
            <div className={`activity-icon ${activity.type}`}>
              {activity.icon}
            </div>

            <div className="activity-content">
              <div className="activity-title-row">
                <h3>{activity.title}</h3>

                <span>{activity.time}</span>
              </div>

              <p>{activity.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}