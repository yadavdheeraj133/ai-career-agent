"use client";

import Link from "next/link";

const navigationItems = [
  {
    label: "Overview",
    icon: "⌂",
    href: "/dashboard",
  },
  {
    label: "Jobs",
    icon: "◫",
    href: "/dashboard/jobs",
  },
  {
    label: "Resume",
    icon: "▤",
    href: "/dashboard/resume",
  },
  {
    label: "AI Tools",
    icon: "✦",
    href: "/dashboard/ai-tools",
  },
  {
    label: "Applications",
    icon: "☷",
    href: "/dashboard/applications",
  },
  {
    label: "Interview",
    icon: "◇",
    href: "/dashboard/interview",
  },
  {
    label: "Career",
    icon: "↗",
    href: "/dashboard/career",
  },
  {
    label: "Settings",
    icon: "⚙",
    href: "/setting",
  },
];

export default function Sidebar() {
  return (
    <aside className="dashboard-sidebar">
      <Link href="/dashboard" className="sidebar-brand">
        <span className="sidebar-brand-mark">AI</span>

        <span className="sidebar-brand-text">
          Career Agent
        </span>
      </Link>

      <nav className="sidebar-navigation">
        <p className="sidebar-label">WORKSPACE</p>

        <div className="sidebar-menu">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-item ${
                item.label === "Overview"
                  ? "sidebar-item-active"
                  : ""
              }`}
            >
              <span className="sidebar-icon">
                {item.icon}
              </span>

              <span className="sidebar-item-text">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="sidebar-bottom">
       
        <div className="sidebar-agent-status">
          <span className="agent-status-dot" />

          <div>
            <strong>AI Agent</strong>
            <span>Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}