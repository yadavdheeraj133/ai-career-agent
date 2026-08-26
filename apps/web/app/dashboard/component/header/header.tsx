"use client";

export default function Header() {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        <p className="dashboard-eyebrow">
          CAREER COMMAND CENTER
        </p>

        <h1>Good morning, Dheeraj </h1>

        <p className="dashboard-subtitle">
          Your AI career agent is working for you.
        </p>
      </div>

      <div className="dashboard-header-right">
        <button
          type="button"
          className="header-icon-button"
          aria-label="Search"
        >
          <span>⌕</span>
        </button>

        <button
          type="button"
          className="header-icon-button"
          aria-label="Notifications"
        >
          <span>♢</span>

          <i />
        </button>

        <button
          type="button"
          className="header-profile-button"
          aria-label="Open profile"
        >
          <span className="header-avatar">S</span>

          <span className="header-profile-info">
            <strong>Dheeraj</strong>
            <small>Career Profile</small>
          </span>

          <span className="header-profile-arrow">
            ⌄
          </span>
        </button>
      </div>
    </header>
  );
}