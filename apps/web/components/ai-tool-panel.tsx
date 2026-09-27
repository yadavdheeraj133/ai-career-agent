"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { usePrimaryResume } from "@/lib/use-primary-resume";

export interface AiField {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  singleLine?: boolean;
}

interface AiToolPanelProps {
  eyebrow?: string;
  title: string;
  description?: string;
  fields: AiField[];
  submitLabel: string;
  onSubmit: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  notice?: string | null;
  children?: ReactNode;
}

/** The field id every page uses for the resume input. */
const RESUME_FIELD_ID = "resume";

/**
 * Reusable input + submit panel for the AI feature pages.
 *
 * The resume field is linked to the user's saved resume rather than requiring a
 * paste: the linked resume is shown as the input, with a way to open the full
 * view or to supply a one-off resume instead. Supplying a one-off resume is
 * never written back to the stored one.
 */
export function AiToolPanel({
  eyebrow = "YOUR INPUTS",
  title,
  description,
  fields,
  submitLabel,
  onSubmit,
  loading = false,
  disabled = false,
  error = null,
  notice = null,
  children,
}: AiToolPanelProps) {
  const resume = usePrimaryResume();
  const [usingOverride, setUsingOverride] = useState(false);

  const resumeField = fields.find((field) => field.id === RESUME_FIELD_ID);
  const isLinked = Boolean(
    resume.hasResume && resumeField && !usingOverride && resumeField.value === resume.text
  );

  return (
    <section className="ai-panel">
      <div className="ai-panel-head">
        <div>
          <p className="card-label">{eyebrow}</p>

          <h2>{title}</h2>

          {description ? <p>{description}</p> : null}
        </div>

        <span className="ai-panel-icon">✦</span>
      </div>

      {isLinked && resumeField ? (
        <div className="ai-resume-linked">
          <div className="ai-resume-linked-head">
            <span className="ai-resume-linked-label">Linked resume</span>

            <Link href="/dashboard/resume/view" className="ai-resume-linked-link">
              View full resume
            </Link>
          </div>

          <p className="ai-resume-linked-name">
            {resume.document?.name || resume.document?.title}
            {resume.document?.currentRole ? ` — ${resume.document.currentRole}` : ""}
          </p>

          <p className="ai-resume-linked-meta">
            {resume.document?.experience.length || 0} roles ·{" "}
            {resume.document?.skills.length || 0} skills
            {resume.meta?.originalFileName ? ` · ${resume.meta.originalFileName}` : ""}
          </p>

          <button
            type="button"
            className="ai-resume-linked-toggle"
            onClick={() => {
              setUsingOverride(true);
              resumeField.onChange("");
            }}
          >
            Use a different resume instead
          </button>
        </div>
      ) : null}

      {/* The override is a one-off input for this run only; the stored resume is
          untouched, so returning to it is always offered. */}
      {resumeField && usingOverride && resume.hasResume ? (
        <p className="ai-resume-override-notice">
          Using a one-off resume.{" "}
          <button
            type="button"
            className="ai-resume-linked-toggle"
            onClick={() => {
              setUsingOverride(false);
              resumeField.onChange(resume.text);
            }}
          >
            Go back to my saved resume
          </button>
        </p>
      ) : null}

      <div className="ai-panel-fields">
        {fields.map((field) => {
          const hidden = field.id === RESUME_FIELD_ID && isLinked;

          return (
            <label
              className="ai-field"
              data-hidden={hidden ? "true" : undefined}
              key={field.id}
              htmlFor={field.id}
            >
              <span className="ai-field-label">{field.label}</span>

              {field.hint ? <span className="ai-field-hint">{field.hint}</span> : null}

              {field.singleLine ? (
                <input
                  id={field.id}
                  className="ai-input"
                  type="text"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder={field.placeholder}
                  tabIndex={hidden ? -1 : undefined}
                />
              ) : (
                <textarea
                  id={field.id}
                  className="ai-textarea"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  placeholder={field.placeholder}
                  rows={field.rows ?? 6}
                  tabIndex={hidden ? -1 : undefined}
                />
              )}
            </label>
          );
        })}

        {children}
      </div>

      {error ? (
        <p className="form-error ai-panel-message">{error}</p>
      ) : null}

      {notice ? (
        <p className="form-notice ai-panel-message">{notice}</p>
      ) : null}

      <button
        type="button"
        className="primary-button ai-submit"
        onClick={onSubmit}
        disabled={loading || disabled}
      >
        {loading ? "Generating…" : submitLabel}

        {loading ? null : <span>→</span>}
      </button>
    </section>
  );
}

interface AiEmptyStateProps {
  title: string;
  description: string;
}

export function AiEmptyState({
  title,
  description,
}: AiEmptyStateProps) {
  return (
    <div className="ai-empty">
      <span className="ai-empty-icon">✦</span>

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}

interface AiLoadingStateProps {
  label?: string;
}

export function AiLoadingState({
  label = "Analyzing…",
}: AiLoadingStateProps) {
  return (
    <div className="ai-loading">
      <span className="ai-loading-spinner" />

      <p>{label}</p>
    </div>
  );
}
