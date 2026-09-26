/**
 * Corroborating-evidence helpers for the developer-job classifier.
 *
 * Split out from `developer-classifier.ts` so the "is this role genuinely
 * technical?" evidence vocabulary is defined once and can be reused by callers
 * that need to explain a classification decision.
 *
 * Evidence has to come from the record body — the description and the
 * structured skills/requirements lists — because provider titles are frequently
 * bare ("Engineer", "Systems Engineer"). Generic prose never qualifies: the
 * patterns below all require concrete development work or a real technology.
 */

/** Technologies and platforms that only appear in genuine technical roles. */
const EVIDENCE_TECHNOLOGIES: RegExp[] = [
  /\bjava ?script\b/,
  /\btypescript\b/,
  /\bpython\b/,
  /\bjava\b/,
  /\bc ?sharp\b/,
  /\bc#/,
  /\bc ?plus ?plus\b/,
  /\bc\+\+/,
  /\bgolang\b/,
  /\brust\b/,
  /\bruby\b/,
  /\bphp\b/,
  /\bswift\b/,
  /\bkotlin\b/,
  /\bscala\b/,
  /\breact(?: ?js)?\b/,
  /\bnext ?js\b/,
  /\bnode ?js\b/,
  /\bvue(?: ?js)?\b/,
  /\bangular(?: ?js)?\b/,
  /\bsvelte(?: ?js)?\b/,
  /\bdotnet\b/,
  /\bnet core\b/,
  /\bspring boot\b/,
  /\bdjango\b/,
  /\bflask\b/,
  /\bfastapi\b/,
  /\brails\b/,
  /\blaravel\b/,
  /\bexpress(?: ?js)?\b/,
  /\bgraphql\b/,
  /\bpostgres(?: ?ql)?\b/,
  /\bmysql\b/,
  /\bmongodb\b/,
  /\bredis\b/,
  /\bkafka\b/,
  /\brabbit ?mq\b/,
  /\baws\b/,
  /\bamazon web services\b/,
  /\bazure\b/,
  /\bgoogle cloud\b/,
  /\bgcp\b/,
  /\bdocker\b/,
  /\bkubernetes\b/,
  /\bterraform\b/,
  /\bansible\b/,
  /\bjenkins\b/,
  /\bgithub actions\b/,
  /\bgitlab\b/,
  /\blinux\b/,
  /\bunix\b/,
  /\bgit\b/,
  /\bnosql\b/,
  /\bsql\b/,
  /\btensorflow\b/,
  /\bpytorch\b/,
  /\bscikit learn\b/,
  /\bspark\b/,
  /\bhadoop\b/,
  /\bselenium\b/,
  /\bcypress\b/,
  /\bplaywright\b/,
  /\bjest\b/,
  /\bpytest\b/,
  /\bjunit\b/,
  /\bappium\b/,
  /\bpostman\b/,
  /\btailwind\b/,
  /\bhtml5?\b/,
  /\bbootstrap\b/,
  /\bwebpack\b/,
  /\bvite\b/,
  /\bflutter\b/,
  /\breact native\b/,
  /\bandroid\b/,
  /\bios\b/,
  /\bunity\b/,
  /\bunreal\b/,
  /\bci ?cd\b/,
  /\bcontinuous (?:integration|delivery|deployment)\b/,
  /\bunit test\w*\b/,
  /\bintegration test\w*\b/,
  /\bend[- ]to[- ]end test\w*\b/,
  /\bmicroservices?\b/,
  /\brest(?: ?ful)? api\b/,
  /\bapi\b/,
  /\bsdk\b/,
  /\bgit(?: hub| lab)?\b/,
  /\bmachine learning\b/,
  /\bdeep learning\b/,
  /\bartificial intelligence\b/,
  /\bnlp\b/,
  /\bllm\b/,
  /\bdata engineering\b/,
  /\bdata pipelines?\b/,
  /\betl\b/,
];

/**
 * Phrases that describe building or shipping software. Each one pairs a
 * development verb with a software artefact, or names a concrete engineering
 * practice, so "we use cutting edge technology" or "manage digital products"
 * cannot match.
 */
const DEVELOPMENT_CONTEXT_PATTERNS: RegExp[] = [
  /\b(?:write|build|develop|create|maintain|ship|deploy|debug|refactor|implement|integrate|extend|contribute to)\s+(?:\w+\s+){0,2}?(?:software|applications?|web apps?|mobile apps?|backends?|frontends?|apis?|services?|microservices?|automated tests?|infrastructure|platforms?|features?|codebases?|components?|modules?|libraries?|servers?|databases?|data pipelines?|release pipelines?|distributed systems?)\b/,
  /\bci ?cd\b/,
  /\bcontinuous (?:integration|delivery|deployment)\b/,
  /\bautomated deployment\b/,
  /\bautomated testing\b/,
  /\btest automation\b/,
  /\bunit test\w*\b/,
  /\bintegration test\w*\b/,
  /\bend[- ]to[- ]end test\w*\b/,
  /\bmicroservices?\b/,
  /\brest(?: ?ful)? api\b/,
  /\bgraphql api\b/,
  /\bapi (?:design|integration|development|endpoints?)\b/,
  /\bcloud (?:infrastructure|native|platform|architecture)\b/,
  /\binfrastructure as code\b/,
  /\bcontainerization\b/,
  /\bcontainer orchestration\b/,
  /\bversion control\b/,
  /\bpull requests?\b/,
  /\bcode reviews?\b/,
  /\bcodebase\b/,
  /\btechnical debt\b/,
  /\bservice oriented\b/,
  /\bdomain driven\b/,
  /\bevent driven\b/,
  /\bdesign patterns\b/,
  /\bsystem design\b/,
];

/**
 * Development words used as bare topic nouns rather than as work performed.
 *
 * "We work across STEM and software engineering to linguistics" is a company
 * blurb, not a job description, and the same vocabulary appears verbatim in
 * adverts for data annotation, research and analyst roles that perform no
 * engineering work at all. Naming a discipline is not the same as doing
 * engineering, so these phrases only corroborate a role that already has
 * independent evidence; on their own they admit nothing.
 */
const NOMINAL_DEVELOPMENT_PATTERNS: RegExp[] = [
  /\bsoftware development\b/,
  /\bsoftware engineering\b/,
  /\bapplication development\b/,
  /\bweb development\b/,
  /\bmobile development\b/,
  /\bgame development\b/,
  /\bmachine learning\b/,
  /\bmodel (?:training|deployment)\b/,
  /\bdata engineering\b/,
  /\bdistributed systems?\b/,
  /\boperating systems?\b/,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectText(value: unknown): string[] {
  if (typeof value === "string") return value.trim().length > 0 ? [value] : [];
  if (typeof value === "number") return [String(value)];
  if (!Array.isArray(value)) return [];

  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim().length > 0) {
      out.push(entry);
    } else if (typeof entry === "number") {
      out.push(String(entry));
    } else if (isRecord(entry)) {
      // Some providers nest requirements as `{ text, mustHave }` objects.
      for (const nested of Object.values(entry)) {
        out.push(...collectText(nested));
      }
    }
  }
  return out;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distinct technologies named in the text. */
export function matchedEvidenceTechnologies(text: string): Set<string> {
  const found = new Set<string>();
  for (const pattern of EVIDENCE_TECHNOLOGIES) {
    const match = text.match(pattern);
    if (match) found.add(match[0].trim());
  }
  return found;
}

/** Whether the text describes real development work. */
export function hasDevelopmentContext(text: string): boolean {
  return (
    DEVELOPMENT_CONTEXT_PATTERNS.some((pattern) => pattern.test(text)) ||
    NOMINAL_DEVELOPMENT_PATTERNS.some((pattern) => pattern.test(text))
  );
}

/** Whether the text describes concrete development work, not just the topic. */
export function hasConcreteDevelopmentContext(text: string): boolean {
  return DEVELOPMENT_CONTEXT_PATTERNS.some((pattern) => pattern.test(text));
}

/** Whether development words appear only as bare topic nouns. */
export function hasNominalDevelopmentContext(text: string): boolean {
  return NOMINAL_DEVELOPMENT_PATTERNS.some((pattern) => pattern.test(text));
}

export interface DeveloperRoleEvidenceInput {
  description?: unknown;
  skills?: unknown;
  requirements?: unknown;
}

export interface DeveloperRoleEvidence {
  /** Technologies found in the structured skills/requirements lists. */
  structuredTechnologies: Set<string>;
  /** Technologies found anywhere, including the description prose. */
  technologies: Set<string>;
  /** Whether the description describes building or shipping software. */
  developmentContext: boolean;
  /** Whether that context is concrete work rather than a bare topic noun. */
  concreteDevelopmentContext: boolean;
  /** The normalized description text that was analysed. */
  description: string;
}

/**
 * Gathers developer evidence for a record body.
 *
 * Structured lists (skills/requirements) are weighted more heavily than
 * description prose: a provider tagging a role with two concrete technologies
 * is a strong signal, whereas the same technologies named in passing inside a
 * long advert is weaker.
 */
export function collectDeveloperEvidence(
  input: DeveloperRoleEvidenceInput
): DeveloperRoleEvidence {
  const description = normalize(collectText(input.description).join(" "));
  const structured = normalize(
    [...collectText(input.skills), ...collectText(input.requirements)].join(" ")
  );

  const combined = [description, structured].filter(Boolean).join(" ");

  return {
    structuredTechnologies: matchedEvidenceTechnologies(structured),
    technologies: matchedEvidenceTechnologies(combined),
    developmentContext: hasDevelopmentContext(description),
    concreteDevelopmentContext: hasConcreteDevelopmentContext(description),
    description,
  };
}

/**
 * Decides whether a record body corroborates a developer role.
 *
 * Two technologies in the structured lists are enough on their own, because a
 * provider tagging "TypeScript" and "Node.js" is describing engineering work.
 * Otherwise a single technology must be accompanied by concrete development
 * context, which keeps roles that merely mention tooling in passing out.
 *
 * A bare "software engineering"/"web development" mention never admits a record
 * by itself. Those phrases are the standard company-blurb vocabulary and appear
 * in adverts for annotation, research and analyst roles, so they only count
 * alongside technologies the provider actually tagged.
 */
export function isDeveloperRoleEvidence(
  input: DeveloperRoleEvidenceInput
): boolean {
  const evidence = collectDeveloperEvidence(input);

  if (evidence.structuredTechnologies.size >= 2) return true;
  if (evidence.concreteDevelopmentContext && evidence.technologies.size >= 1) {
    return true;
  }
  if (evidence.structuredTechnologies.size >= 1 && evidence.developmentContext) {
    return true;
  }

  return false;
}
