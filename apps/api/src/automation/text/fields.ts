/**
 * Per-field normalization for the canonical Job representation.
 *
 * Every field the platform stores passes through exactly one function here, so
 * a value looks the same regardless of which provider produced it. Each
 * function is idempotent and never invents information: when the provider did
 * not supply a value the result is either the shared `NOT_SPECIFIED` placeholder
 * or `null`, depending on which is appropriate for that column.
 */
import {
  NOT_SPECIFIED,
  cleanText,
  dedupeRepeatedPhrase,
  dedupeRepeatedSegments,
  isBlank,
  repairEncoding,
} from "./encoding.js";
import type { JobType, WorkMode } from "../types.js";

/* ------------------------------------------------------------------ title -- */

/**
 * Cleans a job title without rewriting it.
 *
 * Removes HTML, encoding damage, collapsed-whitespace artefacts and accidental
 * back-to-back duplication. Seniority, department and parenthetical detail are
 * all meaningful and are preserved verbatim: "Senior Full Stack Developer
 * (Payments)" keeps everything but the stray double spaces.
 */
export function normalizeTitle(value: string): string {
  let title = cleanText(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    // Bracketed prefixes used purely for posting priority, e.g. "[ VO2 FORCE ] - QA".
    .replace(/^\[\s*VOID?\s+\d+\s*\]\s*[-–—:]?\s*/i, "")
    .trim();

  title = dedupeRepeatedPhrase(title);
  // "m/f/d" style hiring tags carry no role information.
  title = title.replace(/\s*\((?:m\/?f\/?d|w\/?m\/?d|f\/?m\/?d|m\/w\/d|f\/m\/d)\)\s*$/i, " ");
  title = title.replace(/\s+/g, " ").trim();

  return title;
}

/* ---------------------------------------------------------------- company -- */

/**
 * Cleans a company name.
 *
 * Strips HTML, encoding damage and duplicated whitespace, and collapses a name
 * that was accidentally repeated. Returns `NOT_SPECIFIED` when the provider
 * gave nothing usable, and the caller stores that placeholder exactly once.
 */
export function normalizeCompany(value: string | null | undefined): string {
  if (isBlank(value)) return NOT_SPECIFIED;

  let company = cleanText(String(value))
    .replace(/^[\s\-–—:|]+/, "")
    .replace(/[\s\-–—:|]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  company = dedupeRepeatedPhrase(company);
  // A company listed twice with a separator: "Acme, Acme".
  if (company.includes(",")) {
    const parts = company.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length === 2 && parts[0]!.toLowerCase() === parts[1]!.toLowerCase()) {
      company = parts[0]!;
    }
  }

  return isBlank(company) ? NOT_SPECIFIED : company;
}

/* --------------------------------------------------------------- location -- */

/**
 * Phrases that state a working arrangement rather than a place.
 */
const WORK_MODE_ONLY_PHRASES = [
  "remote",
  "remoto",
  "remote work",
  "fully remote",
  "work from home",
  "wfh",
  "anywhere",
  "anywhere in the world",
  "worldwide",
  "world wide",
  "global",
  "international",
  "location independent",
  "home office",
  "homebased",
  "hybrid",
  "hybrid work",
  "flexible",
  "flexible remote",
  "flexible / remote",
  "on site",
  "on-site",
  "onsite",
  "in office",
  "in-office",
  "office based",
  "office-based",
  "not specified",
];

/**
 * Normalizes a location string.
 *
 * Handles the three real shapes providers emit for the same idea:
 * `"Remote - United States"`, `"Remote, US"` and `"US (Remote)"` all reduce to
 * the geographic part (`"United States"`, `"US"`, `"US"`) because the working
 * arrangement belongs to `workMode`, not to the location. When nothing
 * geographic remains, the field becomes `NOT_SPECIFIED` rather than repeating
 * a word the work-mode column already shows.
 *
 * Never invents a place: a value that names no location stays unspecified.
 */
export function normalizeLocation(value: string | null | undefined): string {
  if (isBlank(value)) return NOT_SPECIFIED;

  let location = repairEncoding(String(value));
  location = cleanText(location);
  location = dedupeRepeatedSegments(location, ",");
  location = location.replace(/\s+/g, " ").trim();

  if (isBlank(location)) return NOT_SPECIFIED;

  // Split into comma-separated parts so "Berlin (Hybrid)" yields "Berlin".
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const kept: string[] = [];

  for (const part of parts) {
    // Trailing arrangement marker: "Germany (Hybrid)", "US (Remote)".
    let candidate = part.replace(/[(\[]\s*([^)\]]*?)\s*[)\]]/g, " ").replace(/\s+/g, " ").trim();

    // Leading/trailing arrangement words, repeatedly: "Remote - UK", "Remoto".
    let previous: string;
    do {
      previous = candidate;
      candidate = candidate
        .replace(/^(?:[\s\-–—/|]+)?(?:fully\s+|flexible\s+|work\s+from\s+home\s+)?(?:remote|remoto|hybrid|onsite|on[-\s]site|anywhere|worldwide|global|international)\b[\s\-–—/|,()]*/i, "")
        .replace(/[\s\-–—/|]+$/, "")
        .trim();
    } while (candidate !== previous && candidate.length > 0);

    if (isBlank(candidate)) continue;

    const key = candidate.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
    // "Anywhere", "Worldwide" and friends are arrangements, not places.
    if (WORK_MODE_ONLY_PHRASES.includes(key)) continue;

    kept.push(candidate);
  }

  if (kept.length === 0) return NOT_SPECIFIED;

  // Re-dedupe after stripping: "Remote, Remote" and "UK, UK" both collapse.
  return dedupeRepeatedSegments(kept.join(", "), ",");
}

/* -------------------------------------------------------------- work mode -- */

const WORK_MODE_MAP: Record<string, WorkMode> = {
  remote: "Remote",
  "fully remote": "Remote",
  "remote work": "Remote",
  "work from home": "Remote",
  wfh: "Remote",
  remotely: "Remote",
  remoto: "Remote",
  "anywhere": "Remote",
  worldwide: "Remote",
  "location independent": "Remote",
  "distributed team": "Remote",
  hybrid: "Hybrid",
  "hybrid work": "Hybrid",
  onsite: "Onsite",
  "on-site": "Onsite",
  "on site": "Onsite",
  "in office": "Onsite",
  "in-office": "Onsite",
  "office based": "Onsite",
  "office-based": "Onsite",
};

/**
 * Derives the working arrangement.
 *
 * Precedence: an explicit field the provider set, then an explicit boolean
 * `remote` flag, then the wording of the location. A provider is never
 * consulted for the answer, and a value that states no arrangement stays
 * `NOT_SPECIFIED` rather than defaulting to on-site.
 */
export function normalizeWorkMode(input: {
  explicit?: string | null;
  remoteFlag?: boolean | null;
  location?: string | null;
}): WorkMode {
  if (!isBlank(input.explicit)) {
    const key = String(input.explicit).toLowerCase().replace(/\s+/g, " ").trim();
    const mapped = WORK_MODE_MAP[key];
    if (mapped) return mapped;
  }

  if (input.remoteFlag === true) return "Remote";

  // Only consult the location when it positively states an arrangement.
  if (!isBlank(input.location)) {
    const location = String(input.location).toLowerCase();
    if (/\bhybrid\b/.test(location)) return "Hybrid";
    if (/\b(?:fully\s+remote|remote|remoto|work\s+from\s+home|wfh|anywhere|worldwide)\b/.test(location)) {
      return "Remote";
    }
  }

  return NOT_SPECIFIED as WorkMode;
}

/* --------------------------------------------------------------- job type -- */

const JOB_TYPE_MAP: Record<string, JobType> = {
  "full-time": "Full-time",
  "full time": "Full-time",
  fulltime: "Full-time",
  full: "Full-time",
  permanent: "Full-time",
  "regular": "Full-time",
  "part-time": "Part-time",
  "part time": "Part-time",
  parttime: "Part-time",
  internship: "Internship",
  intern: "Internship",
  "working student": "Internship",
  "working student internship": "Internship",
  student: "Internship",
  "student position": "Internship",
  "student internship": "Internship",
  praktikum: "Internship",
  contract: "Contract",
  contractor: "Contract",
  "fixed term": "Contract",
  "fixed-term": "Contract",
  freelance: "Freelance",
  freelancer: "Freelance",
  "self employed": "Freelance",
  "self-employed": "Freelance",
};

/**
 * Values that describe seniority rather than an employment type.
 *
 * Arbeitnow mixes both vocabularies in one `job_types` array, so these are
 * routed to `experience` instead of being discarded.
 */
const SENIORITY_VALUES = new Set([
  "entry",
  "entry level",
  "junior",
  "associate",
  "mid",
  "mid level",
  "midlevel",
  "senior",
  "senior level",
  "lead",
  "principal",
  "executive",
  "director",
  "head",
  "not specified",
]);

/** Returns true when a `job_types` value is really a seniority level. */
export function isSeniorityValue(value: string | null | undefined): boolean {
  if (isBlank(value)) return false;
  return SENIORITY_VALUES.has(
    String(value).toLowerCase().replace(/\s+/g, " ").trim()
  );
}

/** Maps a provider employment-type value to the platform enum. */
export function normalizeJobType(value: string | null | undefined): JobType {
  if (isBlank(value)) return NOT_SPECIFIED as JobType;

  const key = String(value)
    .toLowerCase()
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Adzuna uses `full_time`/`part_time`; Arbeitnow uses "Full Time".
  const mapped = JOB_TYPE_MAP[key] ?? JOB_TYPE_MAP[key.replace(/_/g, " ")];
  if (mapped) return mapped;

  // "Full-time position", "Contract (12 months)" and similar.
  for (const [candidate, type] of Object.entries(JOB_TYPE_MAP)) {
    if (key.includes(candidate)) return type;
  }

  return NOT_SPECIFIED as JobType;
}

/* ------------------------------------------------------------- experience -- */

/** Canonical seniority labels, used to unify provider vocabularies. */
const EXPERIENCE_LEVEL_MAP: Record<string, string> = {
  entry: "Entry Level",
  "entry level": "Entry Level",
  junior: "Entry Level",
  associate: "Entry Level",
  internship: "Entry Level",
  student: "Entry Level",
  trainee: "Entry Level",
  graduate: "Entry Level",
  mid: "Mid Level",
  "mid level": "Mid Level",
  midlevel: "Mid Level",
  midweight: "Mid Level",
  intermediate: "Mid Level",
  senior: "Senior Level",
  "senior level": "Senior Level",
  lead: "Lead",
  "team lead": "Lead",
  principal: "Principal",
  staff: "Staff",
  director: "Director",
  executive: "Executive",
  vp: "Executive",
  "vice president": "Executive",
  head: "Head",
  "head of": "Head",
};

/** Experience values that carry no information. */
const EXPERIENCE_NOISE = new Set([
  "any",
  "any experience",
  "no experience",
  "none",
  "n a",
  "na",
  "not applicable",
  "not specified",
  "unknown",
  "full time",
  "experienced",
]);

/**
 * Lookup key for a level label.
 *
 * Providers spell the same band as "Mid Level", "mid_level" and "Mid-Level";
 * all three must resolve to one canonical band, so separators are flattened
 * before the map is consulted.
 */
function levelKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes an experience value.
 *
 * Keeps whatever the provider actually stated: a year range stays a year range
 * ("2-4 years"), a named band is mapped to the platform's band vocabulary, and
 * "Senior" stays a level. A bare seniority word is never turned into a number
 * of years, because that number would be invented. Values that state nothing
 * ("Any") return null so the column stays null rather than showing noise.
 */
export function normalizeExperience(value: string | null | undefined): string | null {
  if (isBlank(value)) return null;

  const cleaned = cleanText(String(value)).replace(/\s+/g, " ").trim();
  if (isBlank(cleaned)) return null;

  const key = levelKey(cleaned);
  if (EXPERIENCE_NOISE.has(key)) return null;

  // "Any", "Not Specified" and similar when padded with extra words.
  if (EXPERIENCE_NOISE.has(key.replace(/[.,;]+$/, ""))) return null;

  // Jobicy sends a comma-joined list such as "Entry-Level, Junior".
  if (cleaned.includes(",")) {
    const parts = dedupeRepeatedSegments(cleaned, ",")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const mapped: string[] = [];
    for (const part of parts) {
      const level = EXPERIENCE_LEVEL_MAP[levelKey(part)];
      if (level && !mapped.includes(level)) mapped.push(level);
    }
    if (mapped.length > 0) return mapped.join(", ");
    return null;
  }

  // Year ranges and thresholds are meaningful exactly as written.
  if (/\d/.test(cleaned)) {
    return cleaned
      .replace(/\s*[-–—]\s*/g, "-")
      .replace(/\byears?\b/gi, (m) => (m.toLowerCase() === "year" ? "year" : "years"))
      .replace(/\s*(\d)\s*-\s*(\d)/g, "$1-$2")
      .trim();
  }

  const level = EXPERIENCE_LEVEL_MAP[key];
  if (level) return level;

  return cleaned;
}

/* ----------------------------------------------------------------- salary -- */

/** Periods normalised to a single spelling. */
const SALARY_PERIODS: Record<string, string> = {
  year: "yearly",
  yearly: "yearly",
  annually: "yearly",
  annual: "yearly",
  pa: "yearly",
  "per year": "yearly",
  "per annum": "yearly",
  month: "monthly",
  monthly: "monthly",
  "per month": "monthly",
  pm: "monthly",
  week: "weekly",
  weekly: "weekly",
  "per week": "weekly",
  day: "daily",
  daily: "daily",
  "per day": "daily",
  hour: "hourly",
  hourly: "hourly",
  "per hour": "hourly",
  ph: "hourly",
};

/** Currency codes and symbols normalised to their code. */
const CURRENCY_CODES = new Set([
  "USD", "EUR", "GBP", "CAD", "AUD", "NZD", "CHF", "SEK", "NOK", "DKK", "PLN",
  "CZK", "HUF", "RON", "BGN", "TRY", "ZAR", "INR", "JPY", "CNY", "SGD", "HKD",
  "KRW", "BRL", "MXN", "ARS", "CLP", "COP", "PEN", "ILS", "AED", "SAR", "NGN",
  "KES", "UAH", "RUB", "ISK", "IDR", "MYR", "PHP", "THB", "VND", "EGP", "MAD",
]);

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₩": "KRW",
  "₽": "RUB",
  "₺": "TRY",
  "R$": "BRL",
  "kr": "SEK",
  zł: "PLN",
};

const SALARY_NOISE = new Set([
  "",
  "not specified",
  "not provided",
  "not available",
  "n a",
  "na",
  "none",
  "null",
  "undefined",
  "competitive",
  "negotiable",
  "depending on experience",
  "undisclosed",
  "salary not disclosed",
]);

/** Expands "100k" / "1.2M" into a full number. */
function expandAmount(raw: string): string | null {
  const match = raw
    .replace(/[\s,]/g, "")
    .match(/^(\d+(?:\.\d+)?)([km])?$/i);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;

  const suffix = match[2]?.toLowerCase();
  const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1;
  const scaled = value * multiplier;

  if (!Number.isFinite(scaled) || scaled <= 0) return null;
  return Math.round(scaled).toLocaleString("en-US");
}

/**
 * Normalizes a salary string into one consistent shape:
 *
 *   `{min} - {max} {CUR} ({period})`   e.g. "100,000 - 120,000 USD (yearly)"
 *   `{amount} {CUR} ({period})`        e.g. "120,000 USD (yearly)"
 *
 * The minimum, maximum, currency and period are all preserved; only their
 * formatting is unified. No currency conversion and no estimation happens: a
 * value with no amount returns null, and a period that was not stated is not
 * invented.
 */
export function normalizeSalary(
  value: string | number | Record<string, unknown> | null | undefined
): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    const amount = expandAmount(String(value));
    return amount ? `${amount} USD` : null;
  }
  if (typeof value === "object") {
    return normalizeSalaryObject(value);
  }

  const raw = String(value);
  if (isBlank(raw)) return null;

  let text = cleanText(raw).replace(/\s+/g, " ").trim();
  if (SALARY_NOISE.has(text.toLowerCase())) return null;

  // Currency: a code token, or a symbol.
  let currency: string | null = null;
  const codeMatch = text.match(/\b([A-Z]{3})\b/);
  if (codeMatch && CURRENCY_CODES.has(codeMatch[1]!)) {
    currency = codeMatch[1]!;
    text = text.replace(codeMatch[0], " ");
  } else {
    for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
      if (text.includes(symbol)) {
        currency = code;
        text = text.split(symbol).join(" ");
        break;
      }
    }
  }

  // Period: "per year", "/hour", "(yearly)".
  let period: string | null = null;
  const periodMatch = text.match(
    /\(?\b(?:per\s+|a\s+|an\s+|\/)?\s*(yearly|annually|annual|year|monthly|month|weekly|week|daily|day|hourly|hour|pa|pm|ph)\b\)?/i
  );
  if (periodMatch) {
    const key = periodMatch[1]!.toLowerCase();
    period = SALARY_PERIODS[key] ?? null;
    text = text.replace(periodMatch[0], " ");
  }

  // Amounts. Allow "k"/"M", thousands separators and decimals.
  const amountMatches = text.match(
    /(?:^|[\s\-–—()/,])(\d{1,3}(?:[,\s]\d{3})+(?:\.\d+)?[km]?|\d+(?:\.\d+)?[km]?)(?=$|[\s\-–—()/,])/gi
  );

  const amounts: string[] = [];
  if (amountMatches) {
    for (const match of amountMatches) {
      const cleaned = match.replace(/[\s\-–—()/,]/g, "").trim();
      if (!/\d/.test(cleaned)) continue;
      const expanded = expandAmount(cleaned);
      if (expanded && !amounts.includes(expanded)) amounts.push(expanded);
    }
  }

  if (amounts.length === 0) {
    // Nothing that parses as money: "Competitive", "Not disclosed", or noise.
    return null;
  }

  const range = amounts.slice(0, 2).join(" - ");
  const parts = [range];
  if (currency) parts.push(currency);
  const tail = parts.join(" ");
  return period ? `${tail} (${period})` : tail;
}

/** Formats the structured salary fields some providers return. */
function normalizeSalaryObject(value: Record<string, unknown>): string | null {
  const min = value.min ?? value.minimum ?? value.from ?? value.salaryMin;
  const max = value.max ?? value.maximum ?? value.to ?? value.salaryMax;
  const currency = value.currency ?? value.salaryCurrency;
  const period = value.period ?? value.salaryPeriod ?? value.frequency;

  const read = (input: unknown): string | null => {
    if (typeof input === "number" && Number.isFinite(input) && input > 0) {
      return Math.round(input).toLocaleString("en-US");
    }
    if (typeof input === "string") {
      return expandAmount(input.replace(/[\s,]/g, ""));
    }
    return null;
  };

  const low = read(min);
  const high = read(max);
  if (!low && !high) return null;

  const range = low && high && low !== high ? `${low} - ${high}` : (low ?? high)!;
  const code =
    typeof currency === "string" && CURRENCY_CODES.has(currency.trim().toUpperCase())
      ? currency.trim().toUpperCase()
      : null;
  const tail = code ? `${range} ${code}` : range;

  if (typeof period === "string" && period.trim()) {
    const key = period.trim().toLowerCase();
    return `${tail} (${SALARY_PERIODS[key] ?? period.trim()})`;
  }
  return tail;
}

/* ----------------------------------------------------------------- source -- */

/** Provider key to the display name shown in the UI. */
const SOURCE_LABELS: Record<string, string> = {
  arbeitnow: "Arbeitnow",
  themuse: "The Muse",
  "the muse": "The Muse",
  muse: "The Muse",
  remoteok: "Remote OK",
  "remote ok": "Remote OK",
  "remote-ok": "Remote OK",
  remoteokapi: "Remote OK",
  jobicy: "Jobicy",
  adzuna: "Adzuna",
};

/**
 * Resolves the display name for a source/provider pair.
 *
 * The provider is authoritative, because that is what the record was actually
 * fetched from: a Remote OK record is always labelled "Remote OK" regardless of
 * what any other field claims. A job posted through the generic
 * `/api/jobs/aggregate` endpoint has no provider, so its own `source` value is
 * kept as supplied.
 */
export function normalizeSource(provider: string | null | undefined, source?: string | null): string {
  const providerKey = isBlank(provider) ? "" : String(provider).toLowerCase().replace(/[^a-z]/g, "");
  const sourceKey = isBlank(source) ? "" : String(source).toLowerCase().trim();

  if (providerKey) {
    const known = SOURCE_LABELS[sourceKey] ?? SOURCE_LABELS[providerKey];
    if (known) return known;
    return isBlank(source) ? titleCaseSource(String(provider!)) : cleanText(String(source));
  }

  if (!isBlank(source)) {
    const known = SOURCE_LABELS[sourceKey];
    if (known) return known;
    return cleanText(String(source));
  }

  return NOT_SPECIFIED;
}

/** "adzuna" -> "Adzuna"; only used when no explicit source exists. */
function titleCaseSource(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
