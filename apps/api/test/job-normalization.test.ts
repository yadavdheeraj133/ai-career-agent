/**
 * Job data normalization and cleanup.
 *
 * Covers the field-level contract that keeps every job on the platform
 * presentable: readable descriptions without markup, canonical skills, a
 * location that names a place, a work mode derived only from real evidence, a
 * real job type, a formatted salary, a clean title/company, and nulls for data
 * the provider never stated.
 *
 * These are pure unit tests - no database and no network - except the
 * idempotency test, which runs the same record through the pipeline twice and
 * asserts the second pass is a no-op.
 */
import { describe, expect, it } from "vitest";

import {
  normalizeRawJob,
  renormalizeJobRow,
  externalIdFromUrl,
  recoverExternalId,
  normalizeUrl,
} from "../src/automation/index.js";
import { normalizeDescription } from "../src/automation/text/index.js";

function normalize(raw: Record<string, unknown>) {
  const result = normalizeRawJob(raw);
  if (!result.ok) throw new Error(`rejected: ${result.reason}`);
  return result.job;
}

const BASE = {
  title: "Backend Engineer",
  company: "Acme",
  location: "Berlin, Germany",
  workMode: "Hybrid",
  jobType: "Full-time",
  description: "Build the payments pipeline.",
  url: "https://example.test/jobs/1",
  externalId: "ext-1",
  source: "Example",
};

describe("description cleanup", () => {
  it("strips HTML so markup is never rendered as literal text", () => {
    const job = normalize({
      ...BASE,
      description:
        "<h2>About the role</h2><p>We need a <strong>backend</strong> engineer.</p><ul><li>Node.js</li><li>Postgres</li></ul>",
    });
    expect(job.description).not.toContain("<");
    // "About the role" is a provider's own wording for the responsibilities
    // section, so it is relabelled onto the platform vocabulary.
    expect(job.description).toMatch(/Responsibilities/i);
    expect(job.description).toContain("backend");
    expect(job.description).toContain("Node.js");
  });

  it("removes script and style content entirely", () => {
    const job = normalize({
      ...BASE,
      description: "<p>Real text.</p><script>alert('x')</script><style>.a{color:red}</style>",
    });
    expect(job.description).toContain("Real text.");
    expect(job.description).not.toContain("alert");
    expect(job.description).not.toContain("color:red");
  });

  it("decodes HTML entities", () => {
    const job = normalize({
      ...BASE,
      description: "Use C++ &amp; Rust. Salary &gt; 100k &#39;great&#39;.",
    });
    expect(job.description).toContain("C++ & Rust");
    expect(job.description).toContain("> 100k");
    expect(job.description).not.toContain("&amp;");
  });

  it("repairs mojibake from the wrong source encoding", () => {
    const job = normalize({
      ...BASE,
      title: "Ingeniero MecÃ¡nico",
      description: "DiseÃ±amos software para el equipo.",
    });
    expect(job.title).toBe("Ingeniero Mecánico");
    expect(job.description).toContain("Diseñamos");
    expect(job.description).not.toContain("Ã");
  });

  it("strips a tag the provider left unterminated when truncating its advert", () => {
    // A salary table that stops mid-tag. Requiring a closing ">" to detect
    // markup would leave a literal "<td data-..." in the rendered description.
    const job = normalize({
      ...BASE,
      description: "Hourly Rate\n\n$27.50\n\n<td data-celllook=\"4369\"&",
    });
    expect(job.description).not.toContain("<td");
    expect(job.description).not.toContain("data-celllook");
    expect(job.description).toContain("$27.50");
  });

  it("repairs a lone lead byte that belongs to no language", () => {
    // "Â" is U+00C2, never a real letter, but leads every mis-decoded
    // two-byte sequence.
    const job = normalize({
      ...BASE,
      title: "Â¡Buscamos Bartender para el equipo de Chop Chop",
    });
    expect(job.title).toBe("¡Buscamos Bartender para el equipo de Chop Chop");
  });

  it("leaves genuinely lost characters alone rather than mangling them", () => {
    // U+FFFD means the byte was destroyed upstream; there is nothing to
    // recover, so the text is returned as it arrived.
    const job = normalize({
      ...BASE,
      description: "Charge Nurse is an additional responsibility� for the ward.",
    });
    expect(job.description).toContain("responsibility�");
  });

  it("keeps a null description null instead of storing an empty panel", () => {
    expect(normalize({ ...BASE, description: null }).description).toBeUndefined();
    expect(normalize({ ...BASE, description: "   " }).description).toBeUndefined();
    expect(normalize({ ...BASE, description: "<p> </p>" }).description).toBeUndefined();
  });

  it("collapses excessive blank lines but keeps paragraph structure", () => {
    const job = normalize({
      ...BASE,
      description: "First para.\n\n\n\n\nSecond para.\n\n\nThird para.",
    });
    expect(job.description).toBe("First para.\n\nSecond para.\n\nThird para.");
  });

  it("relabels provider headings onto the platform section names", () => {
    const job = normalize({
      ...BASE,
      description:
        "About the company\nWe are small.\n\nRequirements\nNode.js and SQL.\n\nWhat we offer\nRemote budget.",
    });
    // Source wording is mapped onto the platform's own section names so the UI
    // can rely on one vocabulary: About -> About the Company, Requirements ->
    // Requirements, What we offer -> Benefits.
    expect(job.description).toMatch(/About the Company/i);
    expect(job.description).toMatch(/Requirements/i);
    expect(job.description).toMatch(/Benefits/i);
    // Every body line survives the relabelling.
    expect(job.description).toContain("We are small.");
    expect(job.description).toContain("Node.js and SQL.");
    expect(job.description).toContain("Remote budget.");
  });

  it("preserves every sentence the provider published", () => {
    const description =
      "We are hiring. The team is small. You will own the API. Salary is negotiable.";
    const job = normalize({ ...BASE, description: `<div>${description}</div>` });
    for (const sentence of description.split(". ")) {
      expect(job.description).toContain(sentence.replace(/\.$/, ""));
    }
  });
});

describe("skills normalization", () => {
  it("filters generic filler that is not a skill", () => {
    const job = normalize({
      ...BASE,
      skills: ["Engineering", "Software Development", "Node.js", "Teamwork"],
    });
    expect(job.skills).toContain("Node.js");
    expect(job.skills).not.toContain("Engineering");
    expect(job.skills).not.toContain("Software Development");
  });

  it("canonicalizes aliases to one spelling", () => {
    const job = normalize({
      ...BASE,
      skills: ["nodejs", "Node.js", "NODEJS", "reactjs", "React", "js"],
    });
    const canonical = job.skills!.filter((s) => /node/i.test(s));
    expect(canonical).toEqual(["Node.js"]);
    expect(job.skills!.filter((s) => /react/i.test(s))).toEqual(["React"]);
  });

  it("removes duplicates left in the stored array", () => {
    const job = normalize({ ...BASE, skills: ["Node.js", "Node.js", "Docker", "Docker"] });
    expect(job.skills).toEqual(["Node.js", "Docker"]);
  });

  it("recovers skills from the description when the provider listed none", () => {
    const job = normalize({
      ...BASE,
      skills: [],
      description: "You will work with React, Docker and PostgreSQL every day.",
    });
    expect(job.skills).toContain("React");
    expect(job.skills).toContain("Docker");
    expect(job.skills).toContain("PostgreSQL");
  });

  it("leaves an unmatched explicit list as an empty array rather than guessing", () => {
    const job = normalize({ ...BASE, skills: ["Engineering"], description: "Generic." });
    expect(job.skills).toEqual([]);
  });

  it("keeps a genuine multi-word or non-English skill intact", () => {
    const job = normalize({
      ...BASE,
      skills: [
        "Data Science & AI",
        "Qualitätssicherung",
        "Künstliche Intelligenz",
        "Öffentliche Verwaltung",
        "Project Delivery - Utilities & Renewables",
      ],
    });
    expect(job.skills).toContain("Data Science & AI");
    expect(job.skills).toContain("Qualitätssicherung");
    expect(job.skills).toContain("Künstliche Intelligenz");
    expect(job.skills).toContain("Öffentliche Verwaltung");
  });

  it("drops a parenthetical the provider truncated mid-word", () => {
    const job = normalize({ ...BASE, skills: ["Machine Learning (ads", "Docker"] });
    expect(job.skills).toContain("Machine Learning");
    expect(job.skills.some((s) => s.includes("("))).toBe(false);
    expect(job.skills).toContain("Docker");
  });
});

describe("location normalization", () => {
  it("does not report the work mode as the location", () => {
    const job = normalize({ ...BASE, location: "Remote", workMode: "Remote" });
    expect(job.location).toBe("Not specified");
    expect(job.workMode).toBe("Remote");
  });

  it("strips a work-mode suffix but keeps the place", () => {
    const job = normalize({ ...BASE, location: "Germany  (Hybrid)", workMode: null });
    expect(job.location).toBe("Germany");
  });

  it("keeps a real multi-region list intact", () => {
    const job = normalize({ ...BASE, location: "Europe,  Norway", workMode: "Remote" });
    expect(job.location).toBe("Europe, Norway");
    expect(job.workMode).toBe("Remote");
  });

  it("removes consecutive duplicate segments", () => {
    const job = normalize({ ...BASE, location: "London, London, London, UK" });
    expect(job.location).toBe("London, UK");
  });

  it("falls back to a placeholder when no place was stated", () => {
    const job = normalize({ ...BASE, location: null });
    expect(job.location).toBe("Not specified");
  });
});

describe("work mode", () => {
  it("uses the provider's explicit field when it supplies one", () => {
    expect(normalize({ ...BASE, workMode: "remote" }).workMode).toBe("Remote");
    expect(normalize({ ...BASE, workMode: "ON-SITE" }).workMode).toBe("Onsite");
    expect(normalize({ ...BASE, workMode: "Hybrid" }).workMode).toBe("Hybrid");
  });

  it("derives the mode from the location only when no field was supplied", () => {
    expect(normalize({ ...BASE, workMode: null, location: "Remote - Germany" }).workMode).toBe(
      "Remote"
    );
    expect(normalize({ ...BASE, workMode: undefined, location: "Anywhere" }).workMode).toBe(
      "Remote"
    );
  });

  it("never infers remote from a remote-first provider name", () => {
    const job = normalize({
      ...BASE,
      source: "Remote OK",
      workMode: null,
      location: "London",
      remoteFlag: null,
    });
    expect(job.workMode).toBe("Not specified");
  });

  it("uses an explicit boolean remote flag", () => {
    expect(normalize({ ...BASE, workMode: null, remote: true }).workMode).toBe("Remote");
    expect(normalize({ ...BASE, workMode: null, remote: false }).workMode).toBe("Not specified");
  });

  it("falls back to a placeholder rather than inventing an arrangement", () => {
    expect(normalize({ ...BASE, workMode: null, location: "London" }).workMode).toBe(
      "Not specified"
    );
  });
});

describe("job type normalization", () => {
  it("maps provider spellings onto the platform enum", () => {
    expect(normalize({ ...BASE, jobType: "full_time" }).jobType).toBe("Full-time");
    expect(normalize({ ...BASE, jobType: "FULL TIME" }).jobType).toBe("Full-time");
    expect(normalize({ ...BASE, jobType: "Working student" }).jobType).toBe("Internship");
    expect(normalize({ ...BASE, jobType: "Contractor" }).jobType).toBe("Contract");
    expect(normalize({ ...BASE, jobType: "self employed" }).jobType).toBe("Freelance");
  });

  it("routes a seniority value to experience, not to the job type", () => {
    const job = normalize({ ...BASE, jobType: "Senior", experience: "Senior" });
    expect(job.jobType).toBe("Not specified");
    expect(job.experience).toBe("Senior Level");
  });

  it("reads the primary value from a provider array instead of joining it", () => {
    const job = normalize({ ...BASE, jobType: ["Full-time", "Contract"] });
    expect(job.jobType).toBe("Full-time");
  });

  it("falls back to a placeholder for an unknown type", () => {
    expect(normalize({ ...BASE, jobType: "Gig economy" }).jobType).toBe("Not specified");
    expect(normalize({ ...BASE, jobType: null }).jobType).toBe("Not specified");
  });
});

describe("salary normalization", () => {
  it("formats a range with one currency and one period", () => {
    const job = normalize({
      ...BASE,
      salary: { min: 128770, max: 178540, currency: "GBP", period: "yearly" },
    });
    expect(job.salary).toBe("128,770 - 178,540 GBP (yearly)");
  });

  it("keeps a single-sided range as the one amount that was stated", () => {
    const job = normalize({ ...BASE, salary: { min: 90000, currency: "USD", period: "monthly" } });
    expect(job.salary).toBe("90,000 USD (monthly)");
  });

  it("reparses an already-formatted provider string to the same shape", () => {
    const job = normalize({ ...BASE, salary: "£80,000-£90,000 per year" });
    expect(job.salary).toMatch(/80,000\s*-\s*90,000/);
    expect(job.salary).toContain("GBP");
    expect(job.salary).toContain("yearly");
  });

  it("does not invent a currency or a period", () => {
    // `NormalizedJob` models the optional columns as absent rather than empty,
    // so "no salary" is `undefined` on the ingestion output and `null` on a
    // stored row. Both mean the same thing and neither renders a blank tile.
    expect(normalize({ ...BASE, salary: "Competitive" }).salary).toBeUndefined();
    expect(normalize({ ...BASE, salary: null }).salary).toBeUndefined();
    expect(normalize({ ...BASE, salary: undefined }).salary).toBeUndefined();
  });

  it("keeps distinct values distinct without merging them into a range", () => {
    expect(normalize({ ...BASE, salary: "50,000 USD (yearly)" }).salary).not.toBe(
      normalize({ ...BASE, salary: "60,000 USD (yearly)" }).salary
    );
  });
});

describe("title and company cleanup", () => {
  it("collapses repeated whitespace and repairs entities", () => {
    const job = normalize({ ...BASE, title: "Senior   Software\n Engineer", company: "Acme &amp; Co." });
    expect(job.title).toBe("Senior Software Engineer");
    expect(job.company).toBe("Acme & Co.");
  });

  it("removes markup from a title", () => {
    expect(normalize({ ...BASE, title: "<b>Backend</b> Engineer" }).title).toBe(
      "Backend Engineer"
    );
  });

  it("collapses a title that repeats the same phrase back to back", () => {
    expect(normalize({ ...BASE, title: "Software Engineer Software Engineer" }).title).toBe(
      "Software Engineer"
    );
  });

  it("keeps a legitimate leading word that merely repeats", () => {
    expect(normalize({ ...BASE, title: "Developer Developer Experience Engineer" }).title).toBe(
      "Developer Developer Experience Engineer"
    );
  });
});

describe("experience normalization", () => {
  it("maps provider level labels onto a single vocabulary", () => {
    expect(normalize({ ...BASE, experience: "Mid Level" }).experience).toBe("Mid Level");
    expect(normalize({ ...BASE, experience: "senior_level" }).experience).toBe("Senior Level");
    expect(normalize({ ...BASE, experience: "Entry-Level, Junior" }).experience).toBe("Entry Level");
  });

  it("returns null when the provider stated no level", () => {
    expect(normalize({ ...BASE, experience: null }).experience).toBeUndefined();
    expect(normalize({ ...BASE, experience: "Any" }).experience).toBeUndefined();
  });
});

describe("identity and metadata", () => {
  it("strips per-click tracking parameters from the canonical url", () => {
    const job = normalize({
      ...BASE,
      url: "https://www.adzuna.co.uk/jobs/land/ad/5895599733?se=xyz&v=abc",
    });
    expect(job.url).toBe("https://www.adzuna.co.uk/jobs/land/ad/5895599733");
  });

  it("recovers a stored provider advert id from the url, and only for a known provider", () => {
    // Ingestion never does this: a raw record without an id is rejected rather
    // than given a guessed one. The repair exists for rows already stored
    // without an id, where the provider name is on the row itself.
    const raw = normalize({
      ...BASE,
      externalId: undefined,
      url: "https://www.adzuna.co.uk/jobs/details/5886607450",
    });
    expect(raw.externalId).toBeNull();

    expect(
      recoverExternalId({
        provider: "adzuna",
        externalId: null,
        url: "https://www.adzuna.co.uk/jobs/details/5886607450",
      })
    ).toBe("5886607450");

    // An id already on the row is never overwritten.
    expect(
      recoverExternalId({
        provider: "adzuna",
        externalId: "ext-1",
        url: "https://www.adzuna.co.uk/jobs/details/5886607450",
      })
    ).toBe("ext-1");

    // No provider on the row, or no id-shaped path segment: nothing to recover.
    expect(
      recoverExternalId({ provider: null, externalId: null, url: "https://example.test/jobs/1" })
    ).toBeNull();
  });

  it("reads the advert id out of provider urls", () => {
    expect(externalIdFromUrl("https://www.adzuna.co.uk/jobs/details/5886607450")).toBe(
      "5886607450"
    );
    expect(externalIdFromUrl("https://example.test/jobs/abc")).toBeNull();
    expect(externalIdFromUrl(undefined)).toBeNull();
  });

  it("canonicalizes urls for dedup without changing the path", () => {
    expect(normalizeUrl("HTTPS://Example.test/Jobs/1/?utm_source=x#top")).toBe(
      "https://example.test/Jobs/1"
    );
    expect(normalizeUrl("not a url")).toBeNull();
  });

  it("keeps a valid posted date and drops an unparseable one", () => {
    expect(normalize({ ...BASE, postedAt: "2024-03-01" }).postedAt).toBeInstanceOf(Date);
    expect(normalize({ ...BASE, postedAt: "sometime soon" }).postedAt).toBeUndefined();
  });

  it("keeps the provider and source distinct", () => {
    const job = normalize({ ...BASE, source: "Adzuna" });
    expect(job.source).toBe("Adzuna");
    expect(job.provider).toBeNull();
  });

  it("rejects a record with no usable title", () => {
    const result = normalizeRawJob({ ...BASE, title: "   " });
    expect(result.ok).toBe(false);
  });
});

describe("real provider records", () => {
  /**
   * Each case below is the record shape the matching adapter emits, carrying the
   * defects the database audit found in real rows: HTML descriptions, entity
   * escapes, repeated whitespace, a location that is really a work mode, tags
   * that are not skills, and per-click tracking on the URL.
   */

  it("cleans an Arbeitnow record whose job_types mixes a seniority value", () => {
    const job = normalize({
      title: "Software  Engineer",
      company: "Acme  GmbH",
      location: "Aachen",
      workMode: undefined,
      jobType: "Experienced",
      skills: ["Engineering", "JavaScript", "IT"],
      description: "<p>About us</p><p>We build <b>things</b>.</p><script>x()</script>",
      source: "Arbeitnow",
      externalId: "acme-backend-aachen",
      url: "https://www.arbeitnow.com/view/acme-backend-aachen",
      postedAt: "2024-05-02",
    });

    expect(job.title).toBe("Software Engineer");
    expect(job.company).toBe("Acme GmbH");
    expect(job.location).toBe("Aachen");
    // "Experienced" is a seniority, not an employment type.
    expect(job.jobType).toBe("Not specified");
    expect(job.workMode).toBe("Not specified");
    expect(job.skills).toEqual(["JavaScript"]);
    expect(job.description).not.toContain("<");
    expect(job.description).not.toContain("x()");
    expect(job.postedAt).toBeInstanceOf(Date);
  });

  it("cleans a The Muse record with no job type and a remote-ish location", () => {
    const job = normalize({
      title: "Senior Data Analyst",
      company: "Globex",
      location: "Flexible / Remote",
      experience: "Mid Level",
      skills: [],
      description: "<h3>About the role</h3><p>Build dashboards &amp; reports.</p>",
      source: "The Muse",
      externalId: "8123456",
      url: "https://www.themuse.com/jobs/8123456/senior-data-analyst",
      postedAt: "2024-04-18T09:00:00Z",
    });

    // "Flexible / Remote" states an arrangement and no place, so it must not
    // survive as a location.
    expect(job.location).toBe("Not specified");
    expect(job.workMode).toBe("Remote");
    expect(job.jobType).toBe("Not specified");
    expect(job.experience).toBe("Mid Level");
    expect(job.description).toContain("dashboards & reports");
    expect(job.company).toBe("Globex");
  });

  it("cleans a Remote OK record and does not invent a location", () => {
    const job = normalize({
      title: "DevOps Engineer",
      company: "Initech",
      workMode: "Remote",
      location: undefined,
      description: "<p>Run our <em>Kubernetes</em> platform.</p>",
      source: "Remote OK",
      externalId: "1234567",
      url: "https://remoteok.com/remote-devops-jobs-1234567",
      postedAt: "2024-06-01T12:00:00Z",
    });

    expect(job.workMode).toBe("Remote");
    expect(job.location).toBe("Not specified");
    expect(job.jobType).toBe("Not specified");
    expect(job.description).toContain("Kubernetes");
  });

  it("keeps a Jobicy multi-region remote eligibility list as the location", () => {
    const job = normalize({
      title: "Frontend Developer",
      company: "Umbrella",
      location: "LATAM, Canada, USA",
      workMode: "Remote",
      jobType: "Full-Time",
      experience: "Any",
      description: "<p>Build the <b>dashboard</b> in React.</p>",
      salary: {
        min: 128770,
        max: 178540,
        currency: "GBP",
        period: "yearly",
      },
      source: "Jobicy",
      externalId: "98765",
      url: "https://jobicy.com/j/98765",
      postedAt: "2024-07-11",
    });

    // The eligibility list is a real set of places and is kept intact.
    expect(job.location).toBe("LATAM, Canada, USA");
    expect(job.workMode).toBe("Remote");
    expect(job.jobType).toBe("Full-time");
    expect(job.experience).toBeUndefined();
    expect(job.salary).toBe("128,770 - 178,540 GBP (yearly)");
    expect(job.skills).toContain("React");
  });

  it("cleans an Adzuna record and strips the per-click url parameters", () => {
    const job = normalize({
      title: "Data Engineer",
      company: "Soylent",
      location: "London",
      jobType: "full_time",
      description:
        "<p>You will build &amp; own our pipelines.</p><h2>Requirements</h2><ul><li>Python</li><li>Airflow</li></ul>",
      source: "Adzuna",
      externalId: "5886607450",
      url: "https://www.adzuna.co.uk/jobs/land/ad/5886607450?se=abc123&v=def456",
      postedAt: "2024-08-09",
    });

    // Adzuna supplies no arrangement, so none is asserted.
    expect(job.workMode).toBe("Not specified");
    expect(job.location).toBe("London");
    expect(job.jobType).toBe("Full-time");
    expect(job.url).toBe("https://www.adzuna.co.uk/jobs/land/ad/5886607450");
    expect(job.description).toMatch(/Requirements/);
    expect(job.description).toContain("pipelines");
    expect(job.skills).toContain("Python");
    expect(job.skills).toContain("Airflow");
  });

  it("handles a record with almost nothing stated without inventing values", () => {
    const job = normalize({
      title: "Data Engineer",
      company: "Soylent",
      location: null,
      workMode: null,
      jobType: null,
      experience: null,
      salary: null,
      description: null,
      skills: null,
      source: "Adzuna",
      externalId: "1",
      url: "https://example.test/jobs/1",
    });

    expect(job.location).toBe("Not specified");
    expect(job.workMode).toBe("Not specified");
    expect(job.jobType).toBe("Not specified");
    expect(job.experience).toBeUndefined();
    expect(job.salary).toBeUndefined();
    expect(job.description).toBeUndefined();
    expect(job.skills).toEqual([]);
  });
});

describe("convergence", () => {
  /**
   * Splitting a run-on heading can expose a further heading boundary, so the
   * description pipeline has to settle before its output is a fixed point.
   * These cases each needed more than a single pass during development; the
   * contract is that one call returns settled text, so a second call is a
   * no-op and a re-run backfill reports zero changes.
   */
  const cases: Record<string, string> = {
    "run-on headings welded to prose":
      "About the role: You will own the API. Requirements: Node.js and SQL. Benefits: Equity.",
    "heading revealed by an earlier split":
      "Responsibilities: Ship code. Requirements: 5+ years Python. What we offer: Remote budget.",
    "html heading followed by an inline label":
      "<h2>Requirements</h2><p>Node.js. About the team: we are small.</p>",
    "advert longer than the stored limit":
      `${"Long body sentence about the role. ".repeat(600)}Requirements: Python`,
    "truncated advert with an unterminated tag":
      `${"Salary table follows. ".repeat(600)}<td data-celllook="4369"&`,
  };

  for (const [name, input] of Object.entries(cases)) {
    it(`settles in one call: ${name}`, () => {
      const first = normalizeDescription(input);
      expect(first).not.toBeNull();
      expect(normalizeDescription(first!)).toBe(first);
      expect(normalizeDescription(normalizeDescription(first!)!)).toBe(first);
    });
  }

  it("clamps an oversized description and stays clamped", () => {
    const first = normalizeDescription("Sentence. ".repeat(2000))!;
    expect(first.length).toBeLessThanOrEqual(10_100);
    expect(first).toContain("truncated");
    expect(normalizeDescription(first)).toBe(first);
  });
});

describe("idempotency", () => {
  const messy = {
    ...BASE,
    title: "  Senior   Backend   Engineer ",
    company: "Acme &amp; Holdings",
    location: "Remote",
    workMode: "remote",
    jobType: "FULL TIME",
    experience: "senior_level",
    skills: ["nodejs", "Node.js", "Engineering", "reactjs"],
    description:
      "<h2>About the role</h2><p>We need a backend engineer.</p><h2>Requirements</h2><ul><li>React</li><li>Docker</li></ul><script>bad()</script>",
  };

  it("produces the same job when the same record is normalized again", () => {
    const once = normalize(messy);
    const twice = normalize(messy);
    expect(twice).toEqual(once);
  });

  it("is a fixed point: normalizing the canonical output changes nothing", () => {
    const once = normalize(messy);
    const again = normalize({ ...messy, ...once });
    expect(again).toEqual(once);
  });

  it("reports no changed fields when a stored row is already canonical", () => {
    const once = normalize(messy);
    const result = renormalizeJobRow({
      title: once.title,
      company: once.company,
      location: once.location,
      workMode: once.workMode,
      jobType: once.jobType,
      experience: once.experience ?? null,
      salary: once.salary ?? null,
      description: once.description ?? null,
      skills: once.skills,
      source: once.source,
    });
    expect(result.changed).toBe(false);
    expect(result.changedFields).toEqual([]);
  });

  it("detects exactly the fields a messy stored row still needs", () => {    const result = renormalizeJobRow({
      title: "Senior   Backend   Engineer",
      company: "Acme &amp; Holdings",
      location: "Remote",
      workMode: "remote",
      jobType: "FULL TIME",
      experience: "senior_level",
      salary: null,
      description: "<p>We need a <b>backend</b> engineer.</p>",
      skills: ["nodejs", "Node.js", "Engineering"],
      source: "Adzuna",
    });
    expect(result.changed).toBe(true);
    for (const field of ["title", "company", "location", "workMode", "jobType", "experience", "description", "skills"]) {
      expect(result.changedFields).toContain(field);
    }
    expect(result.fields.location).toBe("Not specified");
  });
});
