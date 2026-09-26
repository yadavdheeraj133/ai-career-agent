/**
 * Canonical skill names.
 *
 * Providers disagree about casing and spelling for the same technology
 * ("javascript" / "JavaScript" / "JS", "ReactJS" / "React.js", "NodeJS" /
 * "Node.js"). Left alone, those variants fragment user skill profiles and stop
 * matching from working, so every skill passes through `canonicalSkill`.
 *
 * The dictionary is deliberately closed: a value that is not recognisable is
 * preserved as written rather than being title-cased into something that looks
 * authoritative but is not. Nothing is invented.
 */
import { cleanText, isBlank } from "./encoding.js";

/** Alternate spellings mapped to the one canonical form we display. */
const SKILL_ALIASES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  "java script": "JavaScript",
  ecma: "JavaScript",
  es6: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  node: "Node.js",
  nodejs: "Node.js",
  "node js": "Node.js",
  reactjs: "React",
  "react.js": "React",
  react: "React",
  vuejs: "Vue",
  "vue.js": "Vue",
  vue: "Vue",
  angularjs: "AngularJS",
  angular: "AngularJS",
  nextjs: "Next.js",
  "next.js": "Next.js",
  next: "Next.js",
  nuxtjs: "Nuxt",
  nuxt: "Nuxt",
  sveltekit: "Svelte",
  svelte: "Svelte",
  python3: "Python",
  py: "Python",
  python: "Python",
  golang: "Go",
  go: "Go",
  "go lang": "Go",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  psql: "PostgreSQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  gcloud: "Google Cloud",
  "google cloud": "Google Cloud",
  aws: "AWS",
  "amazon web services": "AWS",
  azure: "Azure",
  "c sharp": "C#",
  "c#": "C#",
  csharp: "C#",
  "c plus plus": "C++",
  "c++": "C++",
  cpp: "C++",
  objectivec: "Objective-C",
  "objective c": "Objective-C",
  "objective-c": "Objective-C",
  html5: "HTML",
  html: "HTML",
  css3: "CSS",
  css: "CSS",
  sass: "Sass",
  scss: "Sass",
  tailwindcss: "Tailwind CSS",
  "tailwind css": "Tailwind CSS",
  tailwind: "Tailwind CSS",
  rest: "REST",
  restful: "REST",
  graphql: "GraphQL",
  git: "Git",
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
  jenkins: "Jenkins",
  circleci: "Circle CI",
  "circle ci": "Circle CI",
  terraform: "Terraform",
  ansible: "Ansible",
  docker: "Docker",
  devops: "DevOps",
  "dev ops": "DevOps",
  ci: "CI/CD",
  "ci/cd": "CI/CD",
  cicd: "CI/CD",
  ml: "Machine Learning",
  "machine learning": "Machine Learning",
  dl: "Deep Learning",
  "deep learning": "Deep Learning",
  ai: "Artificial Intelligence",
  "artificial intelligence": "Artificial Intelligence",
  nlp: "NLP",
  llm: "LLM",
  llms: "LLM",
  ios: "iOS",
  "i os": "iOS",
  "iphone": "iOS",
  android: "Android",
  jquery: "jQuery",
  "apache kafka": "Kafka",
  kafka: "Kafka",
  rabbitmq: "RabbitMQ",
  "rabbit mq": "RabbitMQ",
  redis: "Redis",
  elasticsearch: "Elasticsearch",
  "elastic search": "Elasticsearch",
  snowflake: "Snowflake",
  dbt: "dbt",
  airflow: "Airflow",
  spark: "Spark",
  hadoop: "Hadoop",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  sklearn: "scikit-learn",
  "scikit learn": "scikit-learn",
  pandas: "Pandas",
  numpy: "NumPy",
  rstudio: "RStudio",
  excel: "Excel",
  "google sheets": "Google Sheets",
  figma: "Figma",
  "power bi": "Power BI",
  tableau: "Tableau",
  linux: "Linux",
  unix: "Unix",
  windows: "Windows",
  macos: "macOS",
  "amazon web services lambda": "AWS Lambda",
  lambda: "AWS Lambda",
  websockets: "WebSockets",
  graphqlql: "GraphQL",
};

/**
 * Words that are not skills.
 *
 * §19 of the brief is explicit that generic nouns must never become skills: a
 * listing tagged "technology", "computer" or "software" tells a user nothing.
 */
const GENERIC_SKILL_WORDS = new Set([
  "technology",
  "technologies",
  "tech",
  "computer",
  "computers",
  "software",
  "hardware",
  "programming",
  "development",
  "engineering",
  "it",
  "tools",
  "tool",
  "misc",
  "miscellaneous",
  "other",
  "others",
  "various",
  "multiple",
  "n/a",
  "na",
  "none",
  "unknown",
  "not specified",
  "full time",
  "part time",
  "remote",
  "hybrid",
  "onsite",
  "internship",
  "contract",
  "freelance",
  "benefits",
  "salary",
  "experience",
  "skills",
  "skill",
  "team",
  "teams",
  "company",
  "industry",
  "customer",
  "customers",
  "business",
  "sales",
  "marketing",
  "finance",
  "accounting",
  "legal",
  "hr",
  "recruiting",
  "product",
  "design",
  "ux",
  "ui",
  "quality",
  "assurance",
  "testing",
  "test",
  "management",
  "leadership",
  "communication",
  "problem solving",
  "teamwork",
]);

/** Longest value we accept as a skill before treating it as malformed. */
const MAX_SKILL_LENGTH = 60;

/** Splits a skills field that arrived as one delimited string. */
function splitSkillString(value: string): string[] {
  return value.split(/[,;|•·]/).map((part) => part.trim());
}

/**
 * Resolves one raw skill to its canonical form.
 *
 * Returns null when the value cannot be represented as a skill: blank, longer
 * than a skill name reasonably is, punctuation-only, or a generic noun.
 */
export function canonicalSkill(value: unknown): string | null {
  if (typeof value !== "string") return null;

  let skill = cleanText(value).trim();
  if (isBlank(skill)) return null;

  // Strip wrapping quotes and brackets that some providers add.
  skill = skill.replace(/^[\s"'([{<]+/, "").replace(/[\s"')\]}>]+$/, "").trim();
  if (isBlank(skill)) return null;

  // Providers truncate a tag mid-parenthetical, leaving "Machine Learning (ads".
  // Drop the orphan rather than storing a broken name.
  const opens = (skill.match(/\(/g) ?? []).length;
  const closes = (skill.match(/\)/g) ?? []).length;
  if (opens > closes) skill = skill.replace(/\s*\(+\s*[^()]*$/, "").trim();
  if (isBlank(skill)) return null;

  if (skill.length > MAX_SKILL_LENGTH) return null;
  // Punctuation-only values are malformed, not skills.
  if (!/[\p{L}\p{N}]/u.test(skill)) return null;

  const key = skill.toLowerCase().replace(/\s+/g, " ").trim();
  const alias = SKILL_ALIASES[key];
  if (alias) return alias;

  if (GENERIC_SKILL_WORDS.has(key)) return null;
  // Generic nouns with qualifiers ("software engineering") are still not skills.
  if (GENERIC_SKILL_WORDS.has(key.split(" ")[0] ?? "")) return null;

  // An acronym keeps its provider casing; a spelled-out word is title-cased so
  // "PYTHON" and "python" cannot both survive in one profile.
  if (/^[a-z][a-z0-9+#.]*$/.test(skill) && skill.length <= 5) {
    return skill.toUpperCase();
  }
  if (/^[A-Z0-9+#.\-]{2,6}$/.test(skill)) return skill.toUpperCase();

  return skill
    .split(/\s+/)
    .map((word) =>
      word.length > 0 && word[0] === word[0]!.toUpperCase() && word[0] !== word[0]!.toLowerCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

/**
 * Normalizes a provider skills field.
 *
 * Accepts an array or a delimited string. Duplicates are removed
 * case-insensitively after canonicalization, so `["golang","golang"]` and
 * `["Go","golang"]` both collapse to a single `Go`.
 */
export function normalizeSkills(value: unknown): string[] {
  if (value === null || value === undefined) return [];

  const raw: unknown[] = Array.isArray(value) ? value : [value];
  const parts: unknown[] = [];

  for (const entry of raw) {
    if (typeof entry === "string") parts.push(...splitSkillString(entry));
    else if (typeof entry === "number") parts.push(entry);
    else if (Array.isArray(entry)) parts.push(...entry);
    else if (entry && typeof entry === "object") {
      // `{ name: "React" }` style objects appear in some provider payloads.
      const named = (entry as { name?: unknown; value?: unknown; skill?: unknown });
      const value2 = named.name ?? named.value ?? named.skill;
      if (typeof value2 === "string") parts.push(...splitSkillString(value2));
    }
  }

  const seen = new Set<string>();
  const skills: string[] = [];

  for (const part of parts) {
    const skill = canonicalSkill(part);
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push(skill);
  }

  return skills;
}

/**
 * Technologies that may be recovered from description prose.
 *
 * Extraction is only ever allowed to produce one of these exact names, matched
 * on word boundaries. A word that is not in this list is never guessed at, which
 * is what keeps this from manufacturing skills out of prose.
 */
const EXTRACTABLE_TECHNOLOGIES: Array<[RegExp, string]> = [
  [/\bjava ?script\b/i, "JavaScript"],
  [/\btypescript\b/i, "TypeScript"],
  [/\bnode\.? ?js\b/i, "Node.js"],
  [/\bpython\b/i, "Python"],
  [/\bjava\b(?! ?script)/i, "Java"],
  [/\bc\s*#|\bc ?sharp\b/i, "C#"],
  [/\bc\s*\+\+/i, "C++"],
  [/\bgolang\b/i, "Go"],
  [/\bphp\b/i, "PHP"],
  [/\bruby\b/i, "Ruby"],
  [/\bswift\b/i, "Swift"],
  [/\bkotlin\b/i, "Kotlin"],
  [/\bscala\b/i, "Scala"],
  [/\belixir\b/i, "Elixir"],
  [/\breact\.? ?js\b|\breact\b/i, "React"],
  [/\bnext\.? ?js\b/i, "Next.js"],
  [/\bvue\.? ?js\b/i, "Vue"],
  [/\bangular\.? ?js\b/i, "AngularJS"],
  [/\bsvelte\b/i, "Svelte"],
  [/\bnuxt\b/i, "Nuxt"],
  [/\bnextcloud\b/i, "Nextcloud"],
  [/\baws\b|amazon web services/i, "AWS"],
  [/\bazure\b/i, "Azure"],
  [/\bgoogle cloud\b|\bgcp\b/i, "Google Cloud"],
  [/\bpostgres(?:ql)?\b/i, "PostgreSQL"],
  [/\bmysql\b/i, "MySQL"],
  [/\bmongo ?db\b/i, "MongoDB"],
  [/\bredis\b/i, "Redis"],
  [/\bkafka\b/i, "Kafka"],
  [/\brabbit ?mq\b/i, "RabbitMQ"],
  [/\belastic ?search\b/i, "Elasticsearch"],
  [/\bsnowflake\b/i, "Snowflake"],
  [/\bdocker\b/i, "Docker"],
  [/\bkubernetes\b|\bk8s\b/i, "Kubernetes"],
  [/\bterraform\b/i, "Terraform"],
  [/\bansible\b/i, "Ansible"],
  [/\bjenkins\b/i, "Jenkins"],
  [/\bgithub actions\b/i, "GitHub Actions"],
  [/\bci ?\/ ?cd\b|continuous (?:integration|delivery|deployment)/i, "CI/CD"],
  [/\bgit\b/i, "Git"],
  [/\blinux\b/i, "Linux"],
  [/\bunit ?test(?:ing|s)?\b/i, "Unit Testing"],
  [/\bintegration test(?:ing|s)?\b/i, "Integration Testing"],
  [/\btest automation\b|\bautomated test(?:ing|s)?\b/i, "Test Automation"],
  [/\bpytest\b/i, "Pytest"],
  [/\bjest\b/i, "Jest"],
  [/\bcypress\b/i, "Cypress"],
  [/\bplaywright\b/i, "Playwright"],
  [/\bselenium\b/i, "Selenium"],
  [/\btailwind(?:\.?css| css)?\b/i, "Tailwind CSS"],
  [/\bbootstrap\b/i, "Bootstrap"],
  [/\bhtml5?\b/i, "HTML"],
  [/\bcss3?\b/i, "CSS"],
  [/\bsass\b|\bscss\b/i, "Sass"],
  [/\bwebpack\b/i, "Webpack"],
  [/\bvite\b/i, "Vite"],
  [/\bflutter\b/i, "Flutter"],
  [/\breact native\b/i, "React Native"],
  [/\bandroid\b/i, "Android"],
  [/\bios\b|\biphone\b/i, "iOS"],
  [/\bgraph ?ql\b/i, "GraphQL"],
  [/\brest ?(?:ful)?\b/i, "REST"],
  [/\bapi\b/i, "API"],
  [/\bgrpc\b/i, "gRPC"],
  [/\bmicroservices?\b/i, "Microservices"],
  [/\btensorflow\b/i, "TensorFlow"],
  [/\bpytorch\b/i, "PyTorch"],
  [/\bscikit learn\b/i, "scikit-learn"],
  [/\bpandas\b/i, "Pandas"],
  [/\bnumpy\b/i, "NumPy"],
  [/\bspark\b/i, "Spark"],
  [/\bhadoop\b/i, "Hadoop"],
  [/\bairflow\b/i, "Airflow"],
  [/\bsql\b/i, "SQL"],
  [/\bfigma\b/i, "Figma"],
  [/\bsketch\b/i, "Sketch"],
];

/** Never extract more than this many skills from prose. */
const MAX_EXTRACTED_SKILLS = 12;

/**
 * Recovers skills from description prose.
 *
 * Only names present in `EXTRACTABLE_TECHNOLOGIES` can be produced, and only
 * when they appear in a sentence that is actually about the work: an ad's
 * boilerplate ("we are a leading technology company") must not contribute
 * skills. Generic nouns are not in the list at all, so they cannot be produced.
 */
export function extractSkillsFromText(text: string | null | undefined): string[] {
  if (isBlank(text)) return [];

  const found: string[] = [];
  const seen = new Set<string>();

  for (const sentence of String(text).split(/[\n.;•|]+/)) {
    const trimmed = sentence.trim();
    if (trimmed.length === 0) continue;

    // Boilerplate tells you about the company, not about the work.
    if (
      /\b(?:we|our|us)\s+(?:are|is|was|were|have|has)\b/i.test(trimmed) &&
      !/\b(?:you|your)\b/i.test(trimmed)
    ) {
      continue;
    }

    for (const [pattern, name] of EXTRACTABLE_TECHNOLOGIES) {
      if (found.length >= MAX_EXTRACTED_SKILLS) break;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      if (pattern.test(trimmed)) {
        seen.add(key);
        found.push(name);
      }
    }

    if (found.length >= MAX_EXTRACTED_SKILLS) break;
  }

  return found;
}

/**
 * Final skills pass for a job: canonicalize what the provider supplied, then
 * top up from the description only when the provider supplied nothing usable.
 *
 * Explicit skills are never mixed with inferred ones, so a provider tag list
 * always wins and the resulting array is exactly what the source asserted.
 */
export function resolveSkills(
  explicit: unknown,
  description: string | null | undefined
): string[] {
  const provided = normalizeSkills(explicit);
  if (provided.length > 0) return provided;
  return normalizeSkills(extractSkillsFromText(description));
}
