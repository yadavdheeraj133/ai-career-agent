"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiRequest } from "@/lib/api";
import type { AtsGateStatus } from "@/lib/types";

const suggestedSkills = [
  "JavaScript",
  "React",
  "Node.js",
  "Python",
  "Java",
  "SQL",
  "TypeScript",
];

interface Skill {
  id: string;
  name: string;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [gate, setGate] = useState<AtsGateStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSkills() {
      try {
        const [skillsResponse, gateResponse] = await Promise.all([
          apiRequest<Skill[]>("/api/skills"),
          apiRequest<AtsGateStatus>("/resume/ats-status"),
        ]);

        if (cancelled) return;

        setSkills(skillsResponse.data);
        setGate(gateResponse.data);
      } catch (caught) {
        if (cancelled) return;

        setError(
          caught instanceof Error ? caught.message : "Unable to load your skills."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSkills();

    return () => {
      cancelled = true;
    };
  }, []);

  const addSkill = async (skill: string) => {
    const trimmedSkill = skill.trim();

    if (!trimmedSkill || saving) return;

    const alreadyExists = skills.some(
      (item) => item.name.toLowerCase() === trimmedSkill.toLowerCase(),
    );

    if (alreadyExists) return;

    setSearch("");
    setSuccess(null);
    setError(null);
    setSaving(true);

    try {
      const response = await apiRequest<Skill>("/api/skills", {
        method: "POST",
        body: { name: trimmedSkill },
      });
      setSkills((current) => [...current, response.data]);
      setSuccess("Skill saved.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save your skill."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeSkill = async (skill: Skill) => {
    if (saving) return;

    setSuccess(null);
    setError(null);
    setSaving(true);

    try {
      await apiRequest(`/api/skills/${skill.id}`, { method: "DELETE" });
      setSkills((current) => current.filter((item) => item.id !== skill.id));
      setSuccess("Skill removed.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to remove your skill."
      );
    } finally {
      setSaving(false);
    }
  };

  const hasSkills = skills.length > 0;

  const gateChecked = gate !== null;
  const gatePassed = gate?.passed === true;

  const filteredSuggestions = suggestedSkills.filter(
    (skill) =>
      !skills.some((item) => item.name.toLowerCase() === skill.toLowerCase()) &&
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

        {gateChecked && !gatePassed ? (
          <>
            <p className="form-error">
              {!gate?.hasResume
                ? "Upload your resume first — the ATS check is required before adding skills."
                : gate?.atsScore === null
                  ? "Run the ATS check on your resume first — a passing score is required before adding skills."
                  : `Your ATS score is ${gate?.atsScore}/100. Reach ${gate?.threshold}% to continue.`}
            </p>

            <Link
              href="/dashboard/resume/upload"
              className="primary-button skill-continue"
            >
              {!gate?.hasResume ? "Upload Resume" : "Complete ATS Check"}
              <span>→</span>
            </Link>
          </>
        ) : (
          <>
        <div className="skill-search">
          <input
            type="text"
            value={search}
            placeholder="Search or add a skill..."
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addSkill(search);
              }
            }}
          />

          <button
            type="button"
            aria-label="Add skill"
            onClick={() => void addSkill(search)}
          >
            +
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-notice">{success}</p> : null}
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
                onClick={() => void addSkill(skill)}
              >
                {skill}
              </button>
            ))}

            {filteredSuggestions.length === 0 && search.trim() && (
              <button
                type="button"
                className="skill-suggestion skill-add-suggestion"
                onClick={() => void addSkill(search)}
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
              <span key={skill.id} className="selected-skill">
                {skill.name}

                <button
                  type="button"
                  aria-label={`Remove ${skill.name}`}
                  onClick={() => void removeSkill(skill)}
                >
                  ×
                </button>
              </span>
            ))}
            {!loading && !hasSkills ? (
              <span className="form-notice">No skills added yet.</span>
            ) : null}
          </div>
        </div>

        <Link
          href="/dashboard"
          className="primary-button skill-continue"
        >
          Continue
          <span>→</span>
        </Link>
          </>
        )}
      </section>
    </main>
  );
}
