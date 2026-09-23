"use client";

import type { ReactNode } from "react";

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

/**
 * Reusable input + submit panel for the AI feature pages. The resume field is
 * prefilled from the saved profile by `useResumeText`, but stays editable so a
 * one-off resume can be pasted without saving it.
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

      <div className="ai-panel-fields">
        {fields.map((field) => (
          <label className="ai-field" key={field.id} htmlFor={field.id}>
            <span className="ai-field-label">{field.label}</span>

            {field.hint ? (
              <span className="ai-field-hint">{field.hint}</span>
            ) : null}

            {field.singleLine ? (
              <input
                id={field.id}
                className="ai-input"
                type="text"
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                placeholder={field.placeholder}
              />
            ) : (
              <textarea
                id={field.id}
                className="ai-textarea"
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                placeholder={field.placeholder}
                rows={field.rows ?? 6}
              />
            )}
          </label>
        ))}

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
