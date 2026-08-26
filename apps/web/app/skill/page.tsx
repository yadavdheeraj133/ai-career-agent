"use client";

import { useState } from "react";
import Link from "next/link";

const suggestedSkills = [
  "JavaScript",
  "React",
  "Node.js",
  "Python",
  "Java",
  "SQL",
  "TypeScript",
];

export default function SkillsPage() {
  const [skills, setSkills] = useState<string[]>([
    "JavaScript",
    "React",
    "Node.js",
    "TypeScript",
    "PostgreSQL",
  ]);

  const [search, setSearch] = useState("");

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim();

    if (!trimmedSkill) return;

    const alreadyExists = skills.some(
      (item) => item.toLowerCase() === trimmedSkill.toLowerCase(),
    );

    if (alreadyExists) return;

    setSkills((current) => [...current, trimmedSkill]);
    setSearch("");
  };

  const removeSkill = (skill: string) => {
    setSkills((current) => current.filter((item) => item !== skill));
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