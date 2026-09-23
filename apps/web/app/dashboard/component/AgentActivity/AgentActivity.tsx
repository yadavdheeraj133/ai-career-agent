export interface Activity {
  time: string;
  title: string;
  description: string;
  icon: string;
  type: string;
}

interface AgentActivityProps {
  activities: Activity[];
}

export default function AgentActivity({ activities }: AgentActivityProps) {
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
