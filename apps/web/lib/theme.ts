/**
 * ------------------------------------------------------------------
 * Theme
 * ------------------------------------------------------------------
 * The single owner of the light/dark/system preference.
 *
 * The mechanism is unchanged from what the app already had: a preference in
 * `localStorage` plus a `data-theme` attribute on `<html>`, which
 * `globals.css` keys its dark-mode tokens off. This module only lifts that
 * logic out of the header component so Settings and the header cannot drift
 * apart, and adds the "system" option the Settings page advertises.
 *
 * "light" stays the fallback for an unset value: that is what the app did
 * before this module existed, so no account changes appearance by upgrading.
 * ------------------------------------------------------------------
 */

export const THEME_VALUES = ["light", "dark", "system"] as const;

export type Theme = (typeof THEME_VALUES)[number];

/** The two values the CSS actually understands. */
export type ResolvedTheme = "light" | "dark";

/** Existing key, deliberately unchanged so current users keep their choice. */
export const THEME_STORAGE_KEY = "career-agent-theme";

export const DEFAULT_THEME: Theme = "light";

export function isTheme(value: unknown): value is Theme {
  return (
    typeof value === "string" &&
    (THEME_VALUES as readonly string[]).includes(value)
  );
}

/** Narrows anything to a Theme, falling back to the default for junk input. */
export function toTheme(value: unknown): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

function prefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Collapses "system" down to the theme the user is actually looking at. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return prefersDark() ? "dark" : "light";
  }

  return theme;
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  return toTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

function paint(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = resolveTheme(theme);
}

/**
 * Persists the preference and repaints. The stored value is the preference,
 * not the resolved one, so selecting "system" keeps following the OS.
 */
export function applyTheme(theme: Theme): void {
  paint(theme);

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Re-applies the stored theme and follows OS changes for as long as the
 * preference is "system". Returns a teardown function.
 *
 * `onChange` is called with the current preference whenever the OS flips while
 * "system" is selected, so a control that renders theme state (the header
 * toggle) stays in step with what is actually painted.
 *
 * The stored value is deliberately not re-written here: a user on a different
 * device has not made a choice, so syncing the local one up from the account
 * (Settings does that on load) stays the only thing that changes it.
 */
export function startThemeSync(onChange?: (theme: Theme) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  paint(getStoredTheme());

  if (!window.matchMedia) {
    return () => {};
  }

  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (getStoredTheme() === "system") {
      paint("system");
      onChange?.("system");
    }
  };

  query.addEventListener("change", onSystemChange);
  return () => query.removeEventListener("change", onSystemChange);
}

/**
 * Flips between the two concrete themes.
 *
 * A toggle has to land on a definite value, so pressing it while "system" is
 * selected switches to the opposite of what is currently rendered rather than
 * sticking on "system".
 */
export function nextTheme(current: Theme): Exclude<Theme, "system"> {
  return resolveTheme(current) === "dark" ? "light" : "dark";
}

/**
 * Inline script that runs before first paint.
 *
 * Duplicated into `app/layout.tsx` as a string because it has to execute
 * before React hydrates; keep the storage key and the fallback in sync with
 * this module.
 */
export const THEME_BOOT_SCRIPT = `(() => {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme = stored === "dark" || stored === "light" || stored === "system" ? stored : ${JSON.stringify(DEFAULT_THEME)};
    var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (error) {
    document.documentElement.dataset.theme = "light";
  }
})()`;
