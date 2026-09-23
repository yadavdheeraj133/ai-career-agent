import assert from "node:assert/strict";
import test from "node:test";

import { asStringList, mergeSkills, normalizeResumeText } from "./profile-utils.ts";

test("mergeSkills combines user and resume skills without duplicate aliases", () => {
  const combined = mergeSkills(
    ["React", "Node.js", "PostgreSQL", "Docker"],
    ["React.js", "JavaScript", "Tailwind CSS", "Node", "Docker"],
  );

  assert.deepEqual(combined, [
    "React",
    "Node.js",
    "PostgreSQL",
    "Docker",
    "JavaScript",
    "Tailwind CSS",
  ]);
});

test("mergeSkills does not collapse unrelated Git skills", () => {
  const combined = mergeSkills(["Git"], ["GitHub"]);

  assert.deepEqual(combined, ["Git", "GitHub"]);
});

test("normalizeResumeText strips repeated bullet markers and page artifacts", () => {
  assert.equal(normalizeResumeText("• • Demonstrated strong debugging..."), "Demonstrated strong debugging...");
  assert.equal(normalizeResumeText("•• Demonstrated strong debugging..."), "Demonstrated strong debugging...");
  assert.equal(normalizeResumeText("▪ Demonstrated strong debugging..."), "Demonstrated strong debugging...");
  assert.equal(normalizeResumeText("• -- 1 of 1 --"), "");
  assert.equal(normalizeResumeText("Page 1 of 1"), "");
});

test("asStringList removes duplicate bullet noise and empty metadata entries", () => {
  const cleaned = asStringList([
    "• • Demonstrated strong debugging...",
    "• -- 1 of 1 --",
    "Demonstrated strong debugging...",
    "Page 1 of 1",
  ]);

  assert.deepEqual(cleaned, ["Demonstrated strong debugging..."]);
});
