import Sidebar from "./component/sidebar/Sidebar";
import Header from "./component/header/header";

import CareerScore from "./component/CareerScore/CareerScore";
import AIAgent from "./component/AIAgent/AIAgent";
import CareerInsights from "./component/CareerInsights/CareerInsights";
import CareerRoadmap from "./component/CareerRoadmap/CareerRoadmap";
import AgentActivity from "./component/AgentActivity/AgentActivity";

import "./dashboard.css";

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      <Sidebar />

      <div className="dashboard-main">
        <Header />

        <div className="dashboard-content">
          {/* ================================
              CAREER COMMAND CENTER
          ================================= */}

          <section className="dashboard-command-center">
            <div className="dashboard-command-grid">
              <CareerScore />

              <AIAgent />
            </div>
          </section>

          {/* ================================
              CAREER INSIGHTS
          ================================= */}

          <CareerInsights />

          {/* ================================
              CAREER ROADMAP
          ================================= */}

          <CareerRoadmap />

          {/* ================================
              AGENT ACTIVITY
          ================================= */}

          <AgentActivity />
        </div>
      </div>
    </main>
  );
}