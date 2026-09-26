"use client";

/**
 * Client hooks shared by every AI feature page.
 *
 * `useAiAction` wraps a single authenticated POST and exposes
 * loading/data/error so each page can render gracefully. AI boundary failures
 * come back classified (502/503/504 with an `AI_*` code and a message written for
 * users), so `describeAiError` prefers that message over guessing at the cause.
 */

import { useCallback, useEffect, useState } from "react";

import { ApiError, apiRequest } from "./api";
import { resumeToText } from "./resume-text";
import type { Resume } from "./types";

/** Statuses the API uses for AI provider/boundary failures. */
const AI_FAILURE_STATUSES = [500, 502, 503, 504];

export function describeAiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Your session has expired. Please sign in again.";
    }

    if (AI_FAILURE_STATUSES.includes(error.status)) {
      // The server already distinguishes a misconfigured provider, a rejected
      // credential, a rate limit, a timeout and a truncated answer, and it
      // sends a message safe to show. Only fall back when there is none.
      return (
        error.message ||
        "The AI service is unavailable right now. Please try again later."
      );
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while contacting the AI service.";
}

export interface AiAction<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  run: (
    path: string,
    body: Record<string, unknown>
  ) => Promise<T | null>;
  reset: () => void;
}

export function useAiAction<T>(): AiAction<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      setLoading(true);
      setError(null);

      try {
        const envelope = await apiRequest<T>(path, {
          method: "POST",
          body,
        });

        setData(envelope.data);
        return envelope.data;
      } catch (caught) {
        setError(describeAiError(caught));
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, run, reset };
}

export interface ResumeTextState {
  text: string;
  setText: (value: string) => void;
  hasResume: boolean;
  loading: boolean;
  error: string | null;
}

export function useResumeText(): ResumeTextState {
  const [text, setText] = useState("");
  const [hasResume, setHasResume] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const envelope = await apiRequest<Resume>("/resume");

        if (!active) {
          return;
        }

        setText(resumeToText(envelope.data));
        setHasResume(true);
      } catch (caught) {
        if (!active) {
          return;
        }

        if (caught instanceof ApiError && caught.status === 404) {
          setHasResume(false);
        } else {
          setError(describeAiError(caught));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { text, setText, hasResume, loading, error };
}
