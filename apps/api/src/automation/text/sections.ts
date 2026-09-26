/**
 * Section detection for cleaned job descriptions.
 *
 * Providers publish adverts with recognisable headings ("What you'll do",
 * "Requirements", "Benefits", "About us"). The platform has a fixed vocabulary
 * for those, so this module maps source headings onto it.
 *
 * Two rules govern the whole file:
 *
 *   1. A section is only emitted when the source actually has content for it.
 *      No heading is ever invented for missing information.
 *   2. Text is only ever moved and re-labelled, never written. The wording of
 *      every sentence is preserved exactly as the provider published it.
 */
import { dedupeRepeatedSegments, isBlank, tidyWhitespace } from "./encoding.js";

/** The only headings this platform emits. */
export const SECTIONS = [
  "About the Role",
  "Responsibilities",
  "Requirements",
  "Skills",
  "Experience",
  "Benefits",
  "About the Company",
] as const;

export type SectionName = (typeof SECTIONS)[number];

/** Anything longer than this is prose, not a heading. */
const MAX_HEADING_LENGTH = 60;

/**
 * Source heading patterns mapped to the canonical name.
 *
 * Ordered from most specific to least: the first match wins, so "about the
 * company" is not swallowed by the generic "about" pattern.
 */
const HEADING_PATTERNS: Array<[SectionName, RegExp]> = [
  ["About the Company", /^(?:about\s+(?:the\s+)?(?:company|us|who\s+we\s+are|our\s+company|org(?:anisation|anization)?)|who\s+we\s+are|company\s+overview|the\s+company)$/i],
  ["About the Company", /^(?:equal\s+opportunity|why\s+work\s+(?:with|for)\s+us|why\s+join\s+us)$/i],
  ["Responsibilities", /^(?:responsibilit(?:y|ies)|what\s+you(?:'|’)?ll\s+do|what\s+you\s+will\s+do|the\s+role|your\s+role|key\s+responsibilit(?:y|ies)|duties|job\s+duties|main\s+duties|what\s+we(?:'|’)?re\s+looking\s+for|what\s+we\s+are\s+looking\s+for|day[-\s]to[-\s]day|about\s+the\s+role|role)$/i],
  ["Requirements", /^(?:requirements?|qualifications?|what\s+you\s+need|who\s+you\s+are|minimum\s+qualifications?|must[-\s]haves?|your\s+profile|we\s+are\s+looking\s+for|skills?\s+(?:and|&)\s+(?:experience|qualifications)|who\s+we(?:'|’)?re\s+looking\s+for)$/i],
  ["Skills", /^(?:skills?|technical\s+skills|tech\s+stack|tools\s*(?:&|and)\s*technologies|technologies|key\s+skills|core\s+skills|competenc(?:y|ies))$/i],
  ["Experience", /^(?:experience|experience\s+(?:required|level|qualifications?)|years\s+of\s+experience|education|academic\s+requirements?|your\s+experience)$/i],
  ["Benefits", /^(?:benefits?|perks?|what\s+we\s+offer|what\s+we(?:'|’)?re\s+offering|why\s+(?:join|work\s+with\s+us)|compensation(?:\s*&\s*benefits)?|offer)$/i],
  ["About the Role", /^(?:about|overview|summary|introduction|about\s+the\s+(?:job|position|opportunity)|the\s+(?:job|role|position|opportunity)|job\s+description|position\s+description|about\s+this\s+(?:job|role|position))$/i],
];

/** A line the source itself formatted as a heading marker. */
const HEADING_DECORATION = /^[\s\-=_*•#~]+|[\s\-=_*•#~]+$/g;

/** True when a cleaned line is a heading rather than a sentence. */
function isHeadingLine(line: string): boolean {
  if (isBlank(line)) return false;
  const trimmed = line.replace(HEADING_DECORATION, "").trim();
  if (trimmed.length === 0 || trimmed.length > MAX_HEADING_LENGTH) return false;
  // A heading is not a sentence: real prose ends in punctuation or is long.
  if (/[.!?;:,]$/.test(trimmed)) return false;
  return HEADING_PATTERNS.some(([, pattern]) => pattern.test(trimmed));
}

/** Resolves a source heading to its canonical name. */
function canonicalSection(line: string): SectionName | null {
  const trimmed = line.replace(HEADING_DECORATION, "").trim();
  for (const [name, pattern] of HEADING_PATTERNS) {
    if (pattern.test(trimmed)) return name;
  }
  return null;
}

export interface SectionedDescription {
  /** Headings found, in the order they appear. */
  sections: SectionName[];
  /**
   * The description as plain text, with canonical headings on their own line.
   * Text before the first heading is left as-is rather than being forced under
   * an invented "About the Role" heading.
   */
  text: string;
}

/**
 * Detects headings in an already-cleaned description and rewrites them to the
 * platform vocabulary.
 *
 * Idempotent: canonical headings map to themselves, so running this over an
 * already-sectioned description reproduces it byte for byte.
 */
export function sectionizeDescription(input: string): SectionedDescription {
  if (isBlank(input)) return { sections: [], text: input };

  const lines = input.split("\n");
  const found: SectionName[] = [];
  let changed = false;

  const rewritten = lines.map((line) => {
    if (!isHeadingLine(line)) return line;

    const name = canonicalSection(line);
    if (!name) return line;

    if (!found.includes(name)) found.push(name);
    if (name === line.trim()) return line;

    changed = true;
    return name;
  });

  const text = changed
    ? tidyWhitespace(rewritten.join("\n")).replace(/\n{3,}/g, "\n\n").trim()
    : input;

  return { sections: found, text };
}

/**
 * Repairs a description whose *entire* body is a single run-on blob.
 *
 * Adverts occasionally arrive with every block element stripped, leaving
 * headings welded to the text after them ("Requirements: 5+ years Python
 * excellent communication"). Splitting on the heading label keeps the content
 * intact and makes the sections readable again.
 */
export function splitRunOnHeadings(input: string): string {
  if (!input.includes("\n") && !/[.!?]/.test(input)) return input;

  const labels = [
    "About the Role",
    "Responsibilities",
    "Requirements",
    "Skills",
    "Experience",
    "Benefits",
    "About the Company",
  ];

  // Only a label written inline as "Label: ..." or "Label - ..." qualifies.
  const inline = new RegExp(`\\s*\\b(${labels.join("|")})\\s*[:\\-\\u2013]\\s+`, "g");
  if (!inline.test(input)) return input;

  inline.lastIndex = 0;
  const result = input.replace(inline, "\n\n$1\n");
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

/** Normalizes a comma-separated list inside a description or location field. */
export function tidyDelimitedList(value: string): string {
  return dedupeRepeatedSegments(value, ",");
}
