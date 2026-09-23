"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { apiRequest, ApiError } from "@/lib/api";
import type { Resume } from "@/lib/types";

const suggestedSkills = [
  "JavaScript",
  "React",
  "Node.js",
  "Python",
  "Java",
  "SQL",
  "TypeScript",
];

const RESUME_TITLE = "My Resume";

function normalizeSkills(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((skill): skill is string => typeof skill === "string")
    : [];
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasResume = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSkills() {
      try {
        const response = await apiRequest<Resume>("/resume");

        if (cancelled) return;

        hasResume.current = true;
        setSkills(normalizeSkills(response.data.skills));
      } catch (caught) {
        if (cancelled) return;

        if (caught instanceof ApiError && caught.status === 404) {
          hasResume.current = false;
          setSkills([]);
        } else {
          setError(
            caught instanceof Error ? caught.message : "Unable to load your skills."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSkills();

    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(
    async (next: string[], previous: string[]) => {
      setSkills(next);
      setError(null);
      setSaving(true);

      try {
        if (hasResume.current) {
          await apiRequest<Resume>("/resume", {
            method: "PATCH",
            body: { skills: next },
          });
        } else {
          await apiRequest<Resume>("/resume", {
            method: "POST",
            body: { title: RESUME_TITLE, skills: next },
          });
          hasResume.current = true;
        }
      } catch (caught) {
        setSkills(previous);
        setError(
          caught instanceof Error ? caught.message : "Unable to save your skills."
        );
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim();

    if (!trimmedSkill || saving) return;

    const alreadyExists = skills.some(
      (item) => item.toLowerCase() === trimmedSkill.toLowerCase(),
    );

    if (alreadyExists) return;

    setSearch("");
    void commit([...skills, trimmedSkill], skills);
  };

  const removeSkill = (skill: string) => {
    if (saving) return;

    void commit(
      skills.filter((item) => item !== skill),
      skills
    );
  };

  const filteredSuggestions = suggestedSkills.filter(
    (skill) =>
      !skills.includes(skill) &&
      skill.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main className="auth-page">
      <section className="auth-card skills-card">
        <div className="brand">
          <div className="brand-mark">AI</div>
          <span>Career Agent</span>
        </div>

        <div className="auth-header">
          <p className="eyebrow">YOUR PROFILE</p>

          <h1>Your Current Skills</h1>

          <p>
            Tell us what technologies and skills you currently know.
          </p>
        </div>

        <div className="skill-search">
          <input
            type="text"
            value={search}
            placeholder="Search or add a skill..."
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addSkill(search);
              }
            }}
          />

          <button
            type="button"
            aria-label="Add skill"
            onClick={() => addSkill(search)}
          >
            +
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {loading ? (
          <p className="form-notice">Loading your skills…</p>
        ) : null}
        {saving ? <p className="form-notice">Saving…</p> : null}

        <div className="skill-section">
          <div className="skill-section-title">Suggested</div>

          <div className="skill-list">
            {filteredSuggestions.map((skill) => (
              <button
                key={skill}
                type="button"
                className="skill-suggestion"
                onClick={() => addSkill(skill)}
              >
                {skill}
              </button>
            ))}

            {filteredSuggestions.length === 0 && search.trim() && (
              <button
                type="button"
                className="skill-suggestion skill-add-suggestion"
                onClick={() => addSkill(search)}
              >
                Add &quot;{search.trim()}&quot;
              </button>
            )}
          </div>
        </div>

        <div className="skill-section">
          <div className="skill-section-title">Your Skills</div>

          <div className="selected-skills">
            {skills.map((skill) => (
              <span key={skill} className="selected-skill">
                {skill}

                <button
                  type="button"
                  aria-label={`Remove ${skill}`}
                  onClick={() => removeSkill(skill)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <Link
          href="/dashboard"
          className="primary-button skill-continue"
        >
          Continue
          <span>→</span>
        </Link>
      </section>
    </main>
  );
}
