/**
 * Low-level text repair shared by every normalized job field.
 *
 * Everything in this module must be **idempotent**: re-running it on its own
 * output has to be a no-op, because the stored records are re-normalized by a
 * backfill that operators will run more than once, and progressive mangling
 * ("MÃ©" -> "MÃ©" -> garbage) is the failure mode that makes that unsafe.
 *
 * The pipeline for any provider string is always the same:
 *
 *   1. `repairEncoding`  - undo UTF-8-read-as-Latin-1 damage
 *   2. `decodeEntities`  - single-pass HTML entity decoding
 *   3. `stripMarkup`     - HTML -> readable plain text (when tagged)
 *   4. `tidyWhitespace`  - collapse runs of spaces/tabs
 *   5. `collapseBlankLines`
 */

/** Canonical placeholder for a field the provider did not supply. */
export const NOT_SPECIFIED = "Not specified";

/**
 * Sequences that only ever appear when UTF-8 bytes were decoded as Latin-1.
 *
 * Used purely as a heuristic signal: the repair is applied only when decoding
 * actually reduces this count, which is what keeps it idempotent and stops it
 * from touching text that is already correct.
 *
 * `Â` (U+00C2) is listed on its own because it belongs to no Latin-script
 * language, yet appears constantly as the lead byte of a mis-decoded two-byte
 * sequence ("Â¡", "Â£"). Its neighbours `Ã` and `â` are deliberately *not* listed
 * as standalone markers: they are legitimate letters in Portuguese and Romanian,
 * so only the specific broken combinations above count.
 */
const MOJIBAKE_MARKERS = [
  "Ã©", "Ã¨", "Ã¡", "Ã¼", "Ã¶", "Ã¤", "Ã±", "Ã§", "Ã³", "Ãº", "Ã­", "Ãª",
  "Ã\x80", "Ã\x9f", "Ã\x93", "Ã\x94", "Ã‰", "Ã‹", "Ã\x9d", "Ã„", "Ã\x87", "Ã\x8f",
  "Â ", "Â·", "Â°", "Â£", "Â¥", "Â©", "Â®", "Â«", "Â»", "Â\xa0", "â\x80\x9c", "â\x80\x9d",
  "â\x80\x99", "â\x80\x98", "â\x80\x93", "â\x80\x94", "â\x80\xa6", "â\x80\xa0",
  "â\x80¦", "â\x80\x93", "â\x80\x9f", "â\x82¬", "ð\x9f\x98\x80", "ï¿½", "Ã\x83Â",
  "Â",
];

/** How many known broken sequences the text contains. Lower is better. */
function mojibakeScore(text: string): number {
  let score = 0;
  for (const marker of MOJIBAKE_MARKERS) {
    if (text.includes(marker)) score++;
  }
  // U+FFFD is the replacement character: unambiguously already-lost data.
  score += (text.match(/\ufffd/g) ?? []).length;
  return score;
}

/**
 * Repairs text that was decoded with the wrong encoding.
 *
 * Providers occasionally serve UTF-8 bytes that were read as Latin-1, which
 * turns "Mecánico" into "MecÃ¡nico". Re-encoding as Latin-1 and decoding as
 * UTF-8 reverses that. The round trip is only accepted when it strictly lowers
 * the mojibake score and introduces no replacement characters, so correct text
 * (including non-Latin scripts, which never score) is returned untouched.
 */
export function repairEncoding(value: string): string {
  if (!value) return value;

  const before = mojibakeScore(value);
  if (before === 0) return value;

  let decoded: string;
  try {
    decoded = Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }

  // A candidate that is worse, or that lost data to U+FFFD, is not a repair.
  if (decoded.includes("\ufffd")) return value;
  if (mojibakeScore(decoded) >= before) return value;

  return decoded;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  shy: "",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  deg: "°",
  plusmn: "±",
  times: "×",
  divide: "÷",
  frac12: "½",
  frac14: "¼",
  sup2: "²",
  sup3: "³",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  sect: "§",
  para: "¶",
  dagger: "†",
  permil: "‰",
  prime: "′",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  ntilde: "ñ",
};

/**
 * Decodes HTML entities exactly once.
 *
 * Deliberately single-pass: `&amp;lt;` becomes `&lt;` and stays there rather
 * than collapsing to `<`. A second pass would make the function non-idempotent
 * and would silently rewrite text the provider actually published.
 */
export function decodeEntities(value: string): string {
  if (!value || !value.includes("&")) return value;

  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]{1,31});/gi,
    (match, body: string) => {
      const key = body.toLowerCase();

      if (key.startsWith("#x")) {
        const code = Number.parseInt(key.slice(2), 16);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }
      if (key.startsWith("#")) {
        const code = Number.parseInt(key.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }

      return NAMED_ENTITIES[key] ?? match;
    }
  );
}

/** Bullet glyphs providers use interchangeably at the start of a list item. */
const BULLET_CHARS = /^[•‣⁃●▪◦∙·*‧»▪·–—-]\s+/;

/** True when the string looks like it carries HTML markup. */
export function hasMarkup(value: string): boolean {
  if (/<\/?[a-z][^>]*>/i.test(value)) return true;
  // A tag the provider left unterminated by truncating its own advert, e.g. a
  // salary table that stops mid-tag. Requiring the closing ">" would miss these
  // and leave a literal `<td data-...` in the rendered description.
  if (/<[a-z][^>]*$/i.test(value)) return true;
  return /&(?:amp|lt|gt|quot|nbsp|#\d+);/i.test(value);
}

/**
 * Converts HTML into readable plain text.
 *
 * The job detail page renders the description as a text node, never as HTML, so
 * storing markup would show users literal `<p>` tags. Block-level elements
 * become line breaks, list items become "- " bullets, and headings are kept as
 * their own line so the section splitter can recognise them.
 *
 * Also repairs the malformed bullet characters that providers emit mid-list.
 */
export function stripMarkup(value: string): string {
  if (!value) return value;

  let text = value;

  // Non-content elements are dropped whole, contents included.
  text = text.replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  // Unclosed script/style at the end of a truncated advert.
  text = text.replace(/<(script|style)\b[^>]*>[\s\S]*$/gi, " ");

  // A tag the provider left unterminated by truncating its own advert. Without
  // this the tail of a cut-off salary table would render as literal "<td ...".
  text = text.replace(/<[a-z][^>]*$/gi, "");

  // Headings get their own line so they survive as section markers.
  text = text.replace(/<h[1-6]\b[^>]*>/gi, "\n\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n");

  // List items become explicit bullets.
  text = text.replace(/<li\b[^>]*>/gi, "\n- ");
  text = text.replace(/<\/li>/gi, "\n");

  // Every other block boundary becomes a line break.
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/?(p|div|section|article|tr|ul|ol|table|thead|tbody|tfoot|blockquote|pre|figure|figcaption|address|main|header|footer|aside|nav|form|fieldset|dl|dt|dd)\b[^>]*>/gi, "\n");

  // Inline tags and comments disappear, but keep a space so words do not merge.
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  text = text.replace(/<\/?[a-z][^>]*>/gi, " ");

  text = decodeEntities(text);
  text = repairEncoding(text);

  text = text.replace(/\r\n?/g, "\n");

  // Repair inconsistent bullet glyphs, then normalize them all to "- ".
  text = text.replace(new RegExp(BULLET_CHARS.source, "gm"), "- ");

  return text;
}

/** Collapses spaces and tabs, and trims each line. Never touches blank lines. */
export function tidyWhitespace(value: string): string {
  return value
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v ]+/g, " ").trim())
    .join("\n");
}

/** Collapses runs of blank lines to a single separator. */
export function collapseBlankLines(value: string): string {
  return value.replace(/\n{3,}/g, "\n\n");
}

/** Full text pipeline shared by every string field. */
export function cleanText(value: string): string {
  return collapseBlankLines(tidyWhitespace(stripMarkup(value)));
}

/**
 * Removes immediately repeated components from a delimited list.
 *
 * Providers routinely emit "New York, New York, New York, United States" and
 * duplicate job titles. Only *consecutive* repeats are removed, so a genuinely
 * repeated but meaningful pair ("London, UK, London, UK") is left alone and
 * real multi-region lists such as "UK, USA" survive intact.
 */
export function dedupeRepeatedSegments(value: string, separator = ","): string {
  if (!value || !value.includes(separator)) return value;

  const parts = value.split(separator);
  const out: string[] = [];

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (part.length === 0) continue;

    const key = part.toLowerCase();
    const previousKey = out.length > 0 ? out[out.length - 1]!.trim().toLowerCase() : null;
    if (key === previousKey) continue;

    out.push(part);
  }

  return out.join(`${separator} `);
}

/**
 * Collapses a title or company name that repeats the same phrase back-to-back.
 *
 * Deliberately conservative: a collapse only happens when the **whole** value
 * is an exact number of copies of one phrase, so "Software Engineer Software
 * Engineer" becomes "Software Engineer" while "Developer Developer Experience
 * Engineer" is left alone. A looser rule that removed a matching prefix would
 * silently delete a real leading word, and a two-word phrase is the shortest
 * unit considered so single repeated words ("AI AI Engineer") are untouched.
 */
export function dedupeRepeatedPhrase(value: string): string {
  if (!value) return value;

  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 4) return value;

  for (let size = Math.floor(words.length / 2); size >= 2; size--) {
    if (words.length % size !== 0) continue;
    const phrase = words.slice(0, size);
    const repeated = words.every((word, index) => {
      if (index < size) return true;
      return word.toLowerCase() === phrase[index % size]!.toLowerCase();
    });
    if (repeated) return phrase.join(" ");
  }

  return value;
}

/** Truncates on a word boundary and appends an ellipsis when it had to cut. */
export function clampText(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** True when the value carries no usable information. */
export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}
