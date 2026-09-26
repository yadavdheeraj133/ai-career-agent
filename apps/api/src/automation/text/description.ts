/**
 * Description normalization.
 *
 * The job detail page renders the description as a plain text node, so markup
 * stored in this column is shown to the user literally. This module turns a raw
 * provider advert into clean, readable, sectioned plain text.
 *
 * Nothing is written or paraphrased: HTML is converted to its text content,
 * headings are relabelled to the platform vocabulary, and every sentence the
 * provider published is preserved in order.
 */
import { cleanText, collapseBlankLines, isBlank } from "./encoding.js";
import { SECTIONS, sectionizeDescription, splitRunOnHeadings } from "./sections.js";

/** Longest description we store, matching the existing column contract. */
export const MAX_DESCRIPTION_LENGTH = 10_000;

/**
 * Upper bound on the internal settle loop.
 *
 * Splitting run-on headings and relabelling them interact: a rewrite can expose
 * a new heading boundary, which the next pass splits, and so on. Rather than
 * assume one pass is enough - it is not, for adverts that arrive as a single
 * run-on blob - the loop runs until the text stops changing. The bound only
 * exists so a pathological input cannot loop forever; in practice the text
 * settles in two or three passes, and settling is guaranteed to be reachable
 * because every step is a pure function of its input.
 */
const MAX_SETTLE_PASSES = 6;

/**
 * Cleans a provider description.
 *
 * Pipeline: repair encoding, strip markup, decode entities, split run-on
 * headings, detect and relabel sections, collapse blank lines, clamp length.
 * Returns `null` when the source had no description, so the column stays null
 * instead of storing an empty string the UI would render as a blank panel.
 */
export function normalizeDescription(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  if (isBlank(value)) return null;

  let text = cleanText(value);
  if (isBlank(text)) return null;

  for (let pass = 0; pass < MAX_SETTLE_PASSES; pass++) {
    // Adverts that arrive with every block element already stripped.
    const next = collapseBlankLines(
      sectionizeDescription(splitRunOnHeadings(text)).text
    ).trim();

    if (next === text) return clampDescription(text);
    text = next;
  }

  return clampDescription(text);
}

/** Truncates on a paragraph boundary so a section is never cut in half. */
function clampDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;

  const cut = text.slice(0, MAX_DESCRIPTION_LENGTH);
  const lastBreak = cut.lastIndexOf("\n\n");
  const body = lastBreak > MAX_DESCRIPTION_LENGTH * 0.5 ? cut.slice(0, lastBreak) : cut;
  return `${body.trimEnd()}\n\n[Description truncated by the source limit]`;
}

export { SECTIONS, sectionizeDescription };
