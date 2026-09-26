/**
 * Developer-job relevance classifier.
 *
 * The platform is developer-focused, so every ingested record must be proven to
 * be a software/development/technical-engineering role before it enters the job
 * dataset. This module is the single, provider-agnostic authority for that
 * decision: the same title is classified identically no matter which provider
 * supplied it, and the verdict is a pure function of the record's own text
 * (title, description, skills, requirements) so it can be applied at ingestion
 * time and recomputed for historical rows without side effects.
 *
 * Design rules (deliberate, because the naive alternatives misclassify badly):
 *
 *  1. A role word is always required. Words like "technology", "digital",
 *     "computer" or a bare "software" never qualify a job on their own; they
 *     only count when paired with an engineering role (see CORE_DEVELOPER_ROLES
 *     and ROLE_WORDS).
 *  2. Business functions veto first. A "Technical Program Manager" or a
 *     "Growth Engineer" is not a developer role, so an explicit exclusion runs
 *     before any matching.
 *  3. Unambiguous titles are accepted on the title alone; genuinely ambiguous
 *     ones ("Systems Engineer", "Quality Engineer") are only accepted with
 *     corroborating technical evidence from the structured skills or the
 *     description. This is what keeps manufacturing, logistics and clinical
 *     "engineer"/"technician" roles out.
 *  4. `analyst` is never a role word. Pairing it with a broad domain produced
 *     "Product Analyst"/"Web Analyst"/"Data Analyst" false positives; those
 *     are analytics roles, not development ones. Only explicit titles such as
 *     "Cybersecurity Analyst" are accepted.
 */
import { isDeveloperRoleEvidence } from "./developer-evidence.js";

export interface DeveloperJobCandidate {
  title?: unknown;
  description?: unknown;
  skills?: unknown;
  requirements?: unknown;
}

/**
 * Business, commercial, clinical and support functions. Checked before any
 * developer matching so that titles such as "Sales Engineer" or "Support
 * Engineer" are rejected even though they contain a role word.
 */
const NON_DEVELOPER_TITLE_PATTERNS: RegExp[] = [
  /\b(?:marketing|marketer|brand|branding|advertis\w*|promotion\w*|campaigns?)\b/,
  /\b(?:sales|selling|account executive|business development|bd|inside sales)\b/,
  /\b(?:human resources|human resource|hr|people operations|people ops|talent acquisition|recruit\w*|recruitment|personnel)\b/,
  /\b(?:accounting|accountant|accountants|finance|financial|fp ?& ?a|treasury|bookkeeping|payroll|tax)\b/,
  /\b(?:product manager|product owner|product management|project manager|project management|program manager|programme manager|program management|programme management|delivery lead)\b/,
  /\b(?:product designer|ux designer|ui designer|graphic designer|visual designer|web designer|industrial designer|design engineer)\b/,
  /\b(?:strateg\w*|advisor|adviser)\b/,
  // `consultant` is intentionally NOT vetoed: "Cloud Migration Consultant" and
  // "Cybersecurity Consultant" are genuine engineering roles. It is handled as a
  // weak role word, so it needs a technical domain or corroborating evidence.
  /\b(?:management|strategy|organisational|organizational) consulting\b/,
  /\b(?:growth|seo|sem|social media|content|communications|public relations|pr|communications?)\b/,
  /\b(?:customer|client|consumer|user success|call center|customer care|customer support|service desk|help desk)\b/,
  /\b(?:support|service|field|application) (?:engineer|technician|specialist|analyst|representative|advisor|agent)\b/,
  /\b(?:operations|operational|logistics|supply chain|procurement|purchasing|warehouse|inventory|manufacturing|production|process|maintenance|plant|facility|facilities)\b/,
  // `quality` on its own is left out: "Quality Engineer" is frequently a QA
  // automation role, so it is decided by the evidence path instead. Only the
  // unambiguously non-software quality functions are vetoed.
  /\bquality (?:control|inspector|inspection|assurance manager|assurance specialist|assurance director)\b/,
  /\b(?:mechanical|electrical|civil|structural|chemical|industrial|manufacturing|automotive|aviation|aerospace|marine|marine engineering|plumbing|hvac|construction|architectural)\b/,
  /\b(?:nurse|nursing|clinical|pharmac\w*|dental|medical|medicine|therap\w*|care|nursing home|oncolog\w*|immunolog\w*|veterinar\w*|paramedic)\b/,
  /\b(?:teacher|teaching|professor|lecturer|education|tutor|academic|faculty|school)\b/,
  /\b(?:legal|lawyer|paralegal|attorney|solicitor|compliance|regulatory)\b/,
  /\b(?:insurance|underwrit\w*|actuar\w*|claims adjuster|policyholder|mortgage|lending|loan|real estate|property|valuation)\b/,
  /\b(?:law enforcement|security officer|security guard|police|firefighter|fire fighter|paralegal officer)\b/,
  /\b(?:chef|cook|barista|waiter|waitress|server|catering|kitchen|housekeeping|cleaner|janitor)\b/,
  /\b(?:driver|delivery|dispatcher|warehouse associate|fulfil\w*|fulfill\w*|picker|packer|barber|beautician)\b/,
  /\b(?:retail|store manager|shop assistant|shop manager|merchandis\w*|buyer|buying)\b/,
  /\b(?:administrative|administrator|admin assistant|office manager|office assistant|receptionist|secretary|executive assistant|personal assistant)\b/,
  /\b(?:estimator|surveyor|quantity surveyor|planner|scheduler|coordinator|coordinator)\b/,
  /\b(?:translator|interpreter|proofreader|copywriter|editor|journalist|newsletter)\b/,
  /\b(?:sustainability|ehs|health safety|environment health)\b/,
  /\b(?:market|user|policy|clinical|competitive|social) research\b/,
  /\bvoice of (?:the )?customer\b/,
  /\b(?:trade[- ]?in|buy ?back|scrap|recycling|tyre|tire)\b/,
];

/**
 * Title phrases that identify a software/development role outright. Matching is
 * substring-with-word-boundaries, so "Senior Software Engineer" and "Software
 * Engineer II (Payments)" are recognised without enumerating every seniority,
 * department or location suffix.
 */
const CORE_DEVELOPER_ROLES: RegExp[] = [
  // Software engineering, the umbrella term.
  /\bsoftware (?:engineer|developer|development|engineering|architect|programmer|science|quality)\b/,
  /\bsoftware[- ]?defined\b/,
  // Web, front end, back end, full stack.
  /\bweb (?:developer|engineer|development)\b/,
  /\bfront[- ]?end (?:engineer|developer|development)\b/,
  /\bback[- ]?end (?:engineer|developer|development)\b/,
  /\bfull[- ]?stack (?:engineer|developer|development)\b/,
  /\bapi (?:engineer|developer|architect)\b/,
  // Applications, mobile.
  /\b(?:application|app) (?:engineer|developer)\b/,
  /\bmobile (?:engineer|developer|application engineer|application developer|app developer|development)\b/,
  /\b(?:ios|android) (?:engineer|developer)\b/,
  /\bflutter (?:engineer|developer)\b/,
  /\breact native (?:engineer|developer)\b/,
  // Infrastructure, cloud, platform.
  /\bdev[- ]?ops\b/,
  /\bsite reliability (?:engineer|specialist)\b/,
  /\b(?:infrastructure|platform) (?:engineer|developer|engineering)\b/,
  /\bcloud (?:engineer|developer|architect|engineering)\b/,
  /\bdatabase (?:engineer|developer|administrator|architect)\b/,
  /\bdistributed systems? engineer\b/,
  // Quality automation.
  /\b(?:qa|quality assurance) automation\b/,
  /\btest automation\b/,
  /\bautomation (?:engineer|tester|developer)\b/,
  /\bsoftware development engineer in test\b/,
  /\bsdet\b/,
  // Cybersecurity.
  /\bcyber ?security (?:engineer|analyst|architect|specialist)\b/,
  /\bapplication security (?:engineer|analyst|architect)\b/,
  /\bappsec (?:engineer|analyst)\b/,
  /\bsecurity (?:engineer|architect)\b/,
  /\binformation security (?:engineer|analyst)\b/,
  // Data engineering and AI/ML engineering.
  /\bdata (?:engineer|engineering|platform engineer|architect)\b/,
  /\banalytics engineer(?:ing)?\b/,
  /\betl (?:engineer|developer)\b/,
  /\b(?:machine learning|deep learning) (?:engineer|engineering|scientist|developer|architect)\b/,
  /\bml (?:engineer|ops)\b/,
  /\bai (?:engineer|developer|architect|researcher)\b/,
  /\bartificial intelligence (?:engineer|developer|architect|scientist)\b/,
  /\bnlp engineer\b/,
  /\bnatural language processing engineer\b/,
  /\bcomputer vision (?:engineer|scientist)\b/,
  // Games, embedded, and other engineering verticals.
  /\b(?:game|gameplay) (?:developer|engineer|programmer|designer)\b/,
  /\bgame development engineer\b/,
  /\bembedded (?:software )?(?:engineer|developer|programmer|systems)\b/,
  /\bfirmware (?:engineer|developer|programmer)\b/,
  /\bhardware (?:engineer|software engineer)\b/,
  /\bcompiler (?:engineer|researcher)\b/,
  /\bweb (?:performance|core) engineer\b/,
  // "Product Engineer" is a software role at most product-led companies; the
  // product-management titles that share the word are vetoed above.
  /\bproduct (?:engineer|developer)\b/,
  // German-language development titles. Arbeitnow is a German-first board, so
  // without these a large share of its genuine engineering postings are lost.
  /\bsoftware ?entwickler\w*\b/,
  /\bentwicklungs ?ingenieur\w*\b/,
  /\bsoftware ?ingenieur\w*\b/,
  /\bsoftware ?programmierer\w*\b/,
  /\bfull ?stack ?entwickler\w*\b/,
  /\b(?:frontend|front end|backend|back end) ?entwickler\w*\b/,
  /\bdevops ?(?:entwickler\w*|ingenieur\w*)\b/,
  /\bdata ?engineer\w*\b/,
  // Standalone acronyms that are unambiguous in a job title and need no
  // accompanying role noun.
  /\bsre\b/,
  /\bcto\b/,
  /\bqa engineer\b/,
  /\btest engineer\b/,
];

/**
 * Technical leadership. An engineering manager runs a developer team, so these
 * are developer-relevant even without a hands-on title.
 */
const ENGINEERING_LEADERSHIP_PATTERNS: RegExp[] = [
  /\b(?:head|chief|vp|vice president|director|global head) of (?:engineering|software|technology|technical|it|information technology|data|data engineering|data science|product engineering|platform|platform engineering|devops|cyber ?security)\b/,
  /\b(?:chief technology officer|chief information officer|chief engineer|chief software)\b/,
  // `data`, `platform` and `technical` are deliberately absent as bare domains:
  // "Data Manager" and "Platform Manager" are usually governance or programme
  // roles. Their engineering forms ("Data Engineering Manager") still match,
  // either here or through the `software development`/`data engineering` rules.
  /\b(?:engineering|software|devops|data engineering|platform engineering|site reliability) (?:manager|director|lead|head)\b/,
  /\b(?:vp|vice president) (?:of )?engineering\b/,
  /\blead(?:ing)? (?:software|frontend|front end|backend|back end|full[- ]?stack|devops|mobile|qa|test|data|machine learning|platform|cloud) engineer\b/,
  /\bstaff (?:software|frontend|front end|backend|back end|full[- ]?stack|devops|data|platform|cloud|security|machine learning) engineer\b/,
  /\bprincipal (?:software|frontend|front end|backend|back end|full[- ]?stack|devops|data|platform|cloud|security|machine learning|site reliability) engineer\b/,
  /\b(?:software|engineering) manager\b/,
  /\btechnical (?:director|lead)\b/,
  /\bengineering (?:manager|director|leadership)\b/,
];

/**
 * Role nouns that a technical domain or technology can attach to. `analyst` is
 * deliberately absent (see the module comment).
 */
const ROLE_WORDS: RegExp[] = [
  /\bengineer\b/,
  /\bdeveloper\b/,
  /\bprogrammer\b/,
  /\bdev\b/,
  /\bcoder\b/,
  /\barchitect\b/,
];

/** Broader role nouns accepted only with corroborating technical evidence. */
const WEAK_ROLE_WORDS: RegExp[] = [
  /\btechnician\b/,
  /\bspecialist\b/,
  /\bconsultant\b/,
  /\badvisor\b/,
  /\badviser\b/,
  /\btechnologist\b/,
  /\banalyst\b/,
];

/**
 * Unambiguously technical domains. Generic business words that caused the
 * previous "Product Analyst"/"Web Analyst" false positives (`product`,
 * `technical`, `web`, `data`, `analytics` on their own) are intentionally not
 * listed here.
 */
const TECHNICAL_DOMAINS: RegExp[] = [
  /\bfull[- ]?stack\b/,
  /\bfullstack\b/,
  /\bfront[- ]?end\b/,
  /\bback[- ]?end\b/,
  /\bfrontend\b/,
  /\bbackend\b/,
  /\bdev[- ]?ops\b/,
  /\bsite reliability\b/,
  // Bare `ai` is safe here because these patterns are only ever tested against a
  // title that already contains a role noun, and "ai" is not an English word.
  /\bai\b/,
  /\bartificial intelligence\b/,
  /\bmachine learning\b/,
  /\bcloud\b/,
  /\bkubernetes\b/,
  /\bdocker\b/,
  /\bcontainerization\b/,
  /\bterraform\b/,
  /\bansible\b/,
  /\bci ?cd\b/,
  /\bcontinuous (?:integration|delivery|deployment)\b/,
  /\bmicroservices?\b/,
  /\bdistributed systems?\b/,
  /\bsystem design\b/,
  /\bsoftware (?:engineering|development|architecture)\b/,
  /\bapplication (?:development|programming|architecture)\b/,
  /\bmobile development\b/,
  /\bweb development\b/,
  /\bgame development\b/,
  /\bdata engineering\b/,
  /\banalytics engineering\b/,
  /\bmachine learning\b/,
  /\bdeep learning\b/,
  /\bartificial intelligence\b/,
  /\bcyber ?security\b/,
  /\bapplication security\b/,
  /\bnetwork security\b/,
  /\bpenetration testing\b/,
  /\bquality assurance automation\b/,
  /\btest automation\b/,
  /\bunit test\w*\b/,
  /\bintegration test\w*\b/,
  /\bfirmware\b/,
  /\bembedded systems?\b/,
  /\boperating systems?\b/,
  /\bcompilers?\b/,
  /\bdatabases?\b/,
  /\bsql\b/,
  /\bpostgresql\b/,
  /\bmysql\b/,
  /\bmongodb\b/,
  /\bgraphql\b/,
  /\brest ?api\b/,
  /\bapi (?:design|integration|development)\b/,
  /\bversion control\b/,
  /\bgit\b/,
  /\bgithub actions\b/,
  /\bjenkins\b/,
  /\bci ?cd pipelines?\b/,
  /\btech stack\b/,
  /\btechnical debt\b/,
  /\bcodebase\b/,
  /\bweb performance\b/,
  /\bqa automation\b/,
  /\bsdet\b/,
];

/**
 * Concrete technologies and platforms. A technology in the title combined with
 * a role word ("React Developer", "Python Engineer") is a strong signal, so it
 * is checked before the generic domain list. Bare `go` is excluded on purpose:
 * it is an English verb and would accept "Go To Market Engineer".
 */
const TITLE_TECHNOLOGIES: RegExp[] = [
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
  /\belixir\b/,
  /\berlang\b/,
  /\bhaskell\b/,
  /\bclojure\b/,
  /\bdart\b/,
  /\bobjective c\b/,
  /\bperl\b/,
  /\breact(?: ?js)?\b/,
  /\bnext ?js\b/,
  /\bnode ?js\b/,
  /\bvue(?: ?js)?\b/,
  /\bangular(?: ?js)?\b/,
  /\bsvelte(?: ?js)?\b/,
  /\bnuxt\b/,
  /\bdotnet\b/,
  /\bnet core\b/,
  /\bspring boot\b/,
  /\bdjango\b/,
  /\bflask\b/,
  /\bfastapi\b/,
  /\brails\b/,
  /\blaravel\b/,
  /\bsymfony\b/,
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
  /\bbitbucket\b/,
  /\blinux\b/,
  /\bunix\b/,
  /\bgit\b/,
  /\bnosql\b/,
  /\btensorflow\b/,
  /\bpytorch\b/,
  /\bscikit learn\b/,
  /\bspark\b/,
  /\bhadoop\b/,
  /\bkafka streams\b/,
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
  /\bblender\b/,
];

/** Titles that are developer roles on their own, with no qualifier. */
const EXACT_DEVELOPER_TITLES = new Set([
  "developer",
  "developers",
  "programmer",
  "software",
  "dev",
  "devops",
  "web developer",
  "software developer",
  "software engineer",
]);

/** Lowercases, strips punctuation noise and collapses whitespace. */
export function normalizeDeveloperText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Accepts a string, or an array of strings, and flattens both to text. */
function collectText(value: unknown): string[] {
  if (typeof value === "string") return value.length > 0 ? [value] : [];
  if (typeof value === "number") return [String(value)];
  if (!Array.isArray(value)) return [];

  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim().length > 0) {
      out.push(entry);
    } else if (typeof entry === "number") {
      out.push(String(entry));
    } else if (Array.isArray(entry)) {
      out.push(...collectText(entry));
    }
  }
  return out;
}

function matchesAny(patterns: RegExp[], text: string): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Classifies a raw provider record or a stored job row as developer-relevant.
 *
 * @returns true when the role is software/development/technical engineering.
 */
export function isDeveloperJob(candidate: unknown): boolean {
  if (typeof candidate !== "object" || candidate === null) return false;
  const input = candidate as DeveloperJobCandidate;

  const title = normalizeDeveloperText(collectText(input.title).join(" "));
  // A job without a usable title cannot be proven relevant.
  if (!title) return false;

  if (matchesAny(NON_DEVELOPER_TITLE_PATTERNS, title)) return false;

  if (EXACT_DEVELOPER_TITLES.has(title)) return true;
  if (matchesAny(CORE_DEVELOPER_ROLES, title)) return true;
  if (matchesAny(ENGINEERING_LEADERSHIP_PATTERNS, title)) return true;

  // Bare acronyms that only make sense in a software context.
  if (/\bsre\b/.test(title) && matchesAny(ROLE_WORDS, title)) return true;
  if (/\bqa\b/.test(title) && matchesAny(ROLE_WORDS, title)) return true;

  const hasRoleWord = matchesAny(ROLE_WORDS, title);
  const hasWeakRoleWord = matchesAny(WEAK_ROLE_WORDS, title);

  if (hasRoleWord && matchesAny(TITLE_TECHNOLOGIES, title)) return true;
  if (hasRoleWord && matchesAny(TECHNICAL_DOMAINS, title)) return true;

  if (hasWeakRoleWord && matchesAny(TECHNICAL_DOMAINS, title)) {
    // A named technical discipline plus a role noun ("Cloud Technician") is
    // developer-relevant; the broad domains such as `databases` are included.
    return true;
  }

  // Ambiguous titles need corroboration from the record body. This is the
  // fallback that admits real "Systems Engineer"/"Quality Engineer" postings
  // while keeping manufacturing, logistics and clinical roles out.
  if (!hasRoleWord && !hasWeakRoleWord) return false;

  return isDeveloperRoleEvidence({
    description: input.description,
    skills: input.skills,
    requirements: input.requirements,
  });
}
