"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { initials } from "@/lib/format";
import {
  applyTheme,
  getStoredTheme,
  nextTheme,
  resolveTheme,
  startThemeSync,
  type Theme,
} from "@/lib/theme";
import type { AppNotification } from "@/lib/types";

export default function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>("light");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const displayName = user?.name?.trim() || "there";
  const firstName = displayName.split(/\s+/)[0];

  useEffect(() => {
    setTheme(getStoredTheme());
    return startThemeSync((current) => setTheme(current));
  }, []);

  const darkMode = resolveTheme(theme) === "dark";

  const toggleTheme = () => {
    setTheme((previous) => {
      const target = nextTheme(previous);
      applyTheme(target);
      return target;
    });
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

  const deleteAll = async () => {
    setNotifications([]);
    setUnread(0);
    setNotificationsError(null);

    try {
      await apiRequest("/api/notifications", { method: "DELETE" });
    } catch (caught) {
      // The delete failed, so restore the real server state.
      setNotificationsError(
        caught instanceof Error
          ? caught.message
          : "Unable to delete notifications."
      );
      void loadNotifications();
    }
  };

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
       

        <h1>Good morning, {firstName} </h1>

        <p className="dashboard-subtitle">
          Your AI career agent is working for you.
        </p>
      </div>

      <div className="dashboard-header-right">
        <button
          type="button"
          className="header-search-button"
          aria-label="Search jobs"
          onClick={() => router.push("/jobs/find")}
        >
          <span>⌕</span>
          <span>Search jobs...</span>
        </button>

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
                <div className="header-notification-actions">
                  {unread > 0 && (
                    <button type="button" onClick={markAllRead}>
                      Mark all read
                    </button>
                  )}
                  <button type="button" onClick={deleteAll}>
                    Delete All
                  </button>
                </div>
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
          onClick={() => router.push("/profile")}
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
