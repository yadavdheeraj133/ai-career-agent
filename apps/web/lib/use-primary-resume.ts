"use client";

/**
 * Loads the authenticated user's canonical resume.
 *
 * Every resume-aware surface uses this so there is one fetch, one shape and one
 * definition of "does this user have a resume". The AI features no longer need
 * a pasted copy: the server loads the stored resume itself, so `text` is only
 * needed where it is displayed or overridden explicitly.
 *
 * The result is cached at module scope and shared between subscribers, so a
 * page and a component that both need the resume still make a single request.
 */

import { useCallback, useEffect, useState } from "react";

import { describeAiError } from "./ai-error";
import { ApiError, apiRequest, getToken } from "./api";
import type { PrimaryResume } from "./resume-document";

let cached: PrimaryResume | null = null;
let cachedToken: string | null = null;
let loaded = false;
let inflight: Promise<PrimaryResume | null> | null = null;

function loadPrimaryResume(): Promise<PrimaryResume | null> {
  if (inflight) return inflight;

  // Signing out and back in is a client-side transition with no page reload, so
  // the cache is keyed to the token that fetched it. Otherwise a second user
  // signing in on the same tab could be shown the first user's resume.
  const token = getToken();

  if (token !== cachedToken) {
    cached = null;
    loaded = false;
    cachedToken = token;
  }

  if (loaded) return Promise.resolve(cached);

  inflight = apiRequest<PrimaryResume>("/resume/document")
    .then((envelope) => {
      cached = envelope.data;
      return cached;
    })
    .catch((caught) => {
      // A user with no resume yet is an expected state, not a failure.
      if (caught instanceof ApiError && caught.status === 404) {
        cached = null;
        return null;
      }

      throw caught;
    })
    .finally(() => {
      loaded = true;
      inflight = null;
    });

  return inflight;
}

/** Drops the cache so the next read reflects a newly uploaded resume. */
export function invalidatePrimaryResume(): void {
  cached = null;
  loaded = false;
  cachedToken = getToken();
}

/**
 * The cached resume, but only when it was fetched for the current session.
 * Used to seed state so a first render cannot show another user's resume for a
 * frame before the effect refetches.
 */
function cachedForCurrentSession(): PrimaryResume | null {
  if (cachedToken !== getToken()) return null;
  return cached;
}

export interface PrimaryResumeState {
  document: PrimaryResume["document"] | null;
  /** AI-ready text rendered from `document` by the server. */
  text: string;
  meta: PrimaryResume["meta"];
  hasResume: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function usePrimaryResume(): PrimaryResumeState {
  const [resume, setResume] = useState<PrimaryResume | null>(cachedForCurrentSession);
  const [loading, setLoading] = useState(
    () => !(loaded && cachedToken === getToken())
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const result = await loadPrimaryResume();

        if (active) {
          setResume(result);
          setError(null);
        }
      } catch (caught) {
        if (active) setError(describeAiError(caught));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    invalidatePrimaryResume();
    setLoading(true);
    setAttempt((value) => value + 1);
  }, []);

  return {
    document: resume?.document ?? null,
    text: resume?.plainText ?? "",
    meta: resume?.meta ?? null,
    hasResume: Boolean(resume),
    loading,
    error,
    reload,
  };
}
