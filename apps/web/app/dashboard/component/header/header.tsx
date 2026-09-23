"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { initials } from "@/lib/format";
import type { AppNotification, Job } from "@/lib/types";

export default function Header() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { user } = useAuth();

  const displayName = user?.name?.trim() || "there";
  const firstName = displayName.split(/\s+/)[0];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("career-agent-theme");
    const isDark = savedTheme === "dark";
    setDarkMode(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, []);

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.dataset.theme = next ? "dark" : "light";
      window.localStorage.setItem("career-agent-theme", next ? "dark" : "light");
      return next;
    });
  };

  const runSearch = async () => {
    const keyword = search.trim();
    if (!keyword) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await apiRequest<Job[] | { data: Job[] }>(
        `/api/jobs/search?keyword=${encodeURIComponent(keyword)}`
      );
      setSearchResults(
        Array.isArray(response.data) ? response.data : response.data.data
      );
    } catch (caught) {
      setSearchError(
        caught instanceof Error ? caught.message : "Unable to search jobs."
      );
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const response = await apiRequest<AppNotification[]>(
        "/api/notifications?limit=8"
      );
      setNotifications(response.data ?? []);
      setUnread((response as { unread?: number }).unread ?? 0);
    } catch (caught) {
      setNotificationsError(
        caught instanceof Error
          ? caught.message
          : "Unable to load notifications."
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, 60_000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  const toggleNotifications = () => {
    setNotificationsOpen((prev) => {
      const next = !prev;
      if (next) void loadNotifications();
      return next;
    });
  };

  const markRead = async (id: string) => {
    const target = notifications.find((item) => item.id === id);
    if (target && !target.read) {
      setUnread((value) => Math.max(0, value - 1));
    }
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );

    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      // Optimistic update only; a later poll reconciles.
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnread(0);

    try {
      await apiRequest("/api/notifications/read-all", { method: "POST" });
    } catch {
      // Optimistic update only.
    }
  };

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        <p className="dashboard-eyebrow">
          CAREER COMMAND CENTER
        </p>

        <h1>Good morning, {firstName} </h1>

        <p className="dashboard-subtitle">
          Your AI career agent is working for you.
        </p>
      </div>

      <div className="dashboard-header-right">
        <button
          type="button"
          className="header-icon-button"
          aria-label="Search"
          aria-expanded={searchOpen}
          onClick={() => setSearchOpen((prev) => !prev)}
        >
          <span>⌕</span>
        </button>

        {searchOpen && (
          <div className="header-search-panel">
            <form
              className="header-search-form"
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch();
              }}
            >
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search jobs..."
                aria-label="Search jobs"
              />
              <button type="submit" aria-label="Run search">⌕</button>
            </form>

            <div className="header-search-results">
              {searchLoading ? (
                <p className="header-notification-empty">Searching…</p>
              ) : searchError ? (
                <p className="header-search-error">{searchError}</p>
              ) : search.trim() && searchResults.length === 0 ? (
                <p className="header-notification-empty">No jobs found.</p>
              ) : (
                searchResults.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="header-search-result"
                    onClick={() => setSearchOpen(false)}
                  >
                    <strong>{job.title}</strong>
                    <span>{job.company} · {job.location}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        <div className="header-notification">
          <button
            type="button"
            className="header-icon-button"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={toggleNotifications}
          >
            <span>♢</span>
            {unread > 0 && <i />}
          </button>

          {notificationsOpen && (
            <div className="header-notification-panel">
              <div className="header-notification-head">
                <strong>Notifications</strong>
                {unread > 0 && (
                  <button type="button" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>

              <div className="header-notification-list">
                {notificationsError ? (
                  <p className="header-search-error">{notificationsError}</p>
                ) : notifications.length === 0 ? (
                  <p className="header-notification-empty">
                    {notificationsLoading
                      ? "Loading notifications…"
                      : "No notifications yet."}
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={`header-notification-item${
                        notification.read ? "" : " unread"
                      }`}
                      onClick={() => markRead(notification.id)}
                    >
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="header-profile-button"
          aria-label="Open profile"
        >
          <span className="header-avatar">{initials(displayName)}</span>

          <span className="header-profile-info">
            <strong>{displayName}</strong>
            <small>Career Profile</small>
          </span>

          <span className="header-profile-arrow">
            ⌄
          </span>
        </button>

        <button
          type="button"
          className="header-icon-button theme-toggle-button"
          onClick={toggleTheme}
          aria-label={
            darkMode
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          aria-pressed={darkMode}
        >
          <span>{darkMode ? "☾" : "☀"}</span>
        </button>
      </div>
    </header>
  );
}
