/**
 * Canonicalization of job fields.
 *
 * A single import surface for the normalization layer, so callers never reach
 * into individual helpers and every field is normalized the same way.
 */
export {
  NOT_SPECIFIED,
  cleanText,
  clampText,
  collapseBlankLines,
  decodeEntities,
  dedupeRepeatedPhrase,
  dedupeRepeatedSegments,
  hasMarkup,
  isBlank,
  repairEncoding,
  stripMarkup,
  tidyWhitespace,
} from "./encoding.js";

export { SECTIONS, sectionizeDescription, splitRunOnHeadings } from "./sections.js";
export type { SectionName, SectionedDescription } from "./sections.js";

export { MAX_DESCRIPTION_LENGTH, normalizeDescription } from "./description.js";

export {
  canonicalSkill,
  extractSkillsFromText,
  normalizeSkills,
  resolveSkills,
} from "./skills.js";

export {
  isSeniorityValue,
  normalizeCompany,
  normalizeExperience,
  normalizeJobType,
  normalizeLocation,
  normalizeSalary,
  normalizeSource,
  normalizeTitle,
  normalizeWorkMode,
} from "./fields.js";
