import { Suspense } from "react";

import SettingsClient from "./settings-client";
import "./settings.css";

/**
 * `/setting` is the single Settings page: the left navigation picks a section
 * and the right panel renders it, so the section lives in the `?section=` query
 * parameter instead of a route of its own. That keeps one component (and one
 * copy of the loaded settings) mounted while the user moves between sections,
 * which is what stops an unsaved edit from being thrown away.
 *
 * `useSearchParams` needs a Suspense boundary, so the fallback below stands in
 * for the first render only. It reuses the shared loading state rather than
 * inventing a new one.
 */
export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="feature-page settings-page">
          <div className="feature-container">
            <div className="app-loading" role="status" aria-live="polite">
              <span className="app-loading-spinner" aria-hidden="true" />
              <p>Loading your settings…</p>
            </div>
          </div>
        </main>
      }
    >
      <SettingsClient />
    </Suspense>
  );
}
