"use client";

/**
 * Client hooks shared by every AI feature page.
 *
 * `useAiAction` wraps a single authenticated POST and exposes
 * loading/data/error so each page can render gracefully. AI boundary failures
 * come back classified (502/503/504 with an `AI_*` code and a message written for
 * users), so `describeAiError` prefers that message over guessing at the cause.
 */

import { useCallback, useState } from "react";

import { describeAiError } from "./ai-error";
import { apiRequest } from "./api";
import { usePrimaryResume } from "./use-primary-resume";

export { describeAiError };

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

/**
 * The resume text an AI feature page works with.
 *
 * It is the canonical text from the stored resume, so pages no longer ask the
 * user to paste a copy. `setText` is kept because a one-off override is still a
 * legitimate thing to do: the pages that expose it let the user supply a
 * different resume without saving it over their primary one.
 */
export function useResumeText(): ResumeTextState {
  const resume = usePrimaryResume();
  const [override, setOverride] = useState<string | null>(null);

  return {
    text: override ?? resume.text,
    setText: setOverride,
    hasResume: resume.hasResume,
    loading: resume.loading,
    error: resume.error,
  };
}
