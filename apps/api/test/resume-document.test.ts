import { describe, expect, it } from "vitest";

import {
  EMPTY_RESUME_DOCUMENT,
  hasResumeContent,
  toResumeDocument,
  toResumeText,
  type ResumeDocument,
} from "../src/services/resume-document.service.js";
import { renderResumePdf } from "../src/services/resume-pdf.service.js";
import { extractResumeDocument } from "../src/services/resume-extraction.service.js";

const SAMPLE = `Jordan Rivera
Senior Backend Engineer
jordan.rivera@example.com | +1 (555) 010-2233 | Austin, TX
https://github.com/jordanrivera

Page 1 of 2

SUMMARY
Backend engineer with eight years building payment systems in Node.js and Go.

TECHNICAL SKILLS
Languages: Python, Go, TypeScript
Tools: Docker, Kubernetes, PostgreSQL

EXPERIENCE
Northwind Payments | Senior Backend Engineer | Mar 2021 - Present
- Rebuilt the settlement pipeline, cutting p99 latency from 2.4s to 180ms
• Owned the on-call rotation for three payment services

Blue Harbor Labs | Backend Engineer | Jun 2018 - Feb 2021
Designed event ingestion handling 40k requests per second

EDUCATION
University of Texas at Austin | B.S. Computer Science | 2018

CERTIFICATIONS
AWS Certified Solutions Architect - Amazon Web Services, 2022

PROJECTS
Ledger Core - Double-entry ledger service | Go, Postgres
https://github.com/jordanrivera/ledger-core

ACHIEVEMENTS
Speaker, PyData Austin 2023

LANGUAGES
English (native), Spanish (fluent)
`;

describe("toResumeDocument", () => {
  it("returns an empty document for a missing resume", () => {
    expect(toResumeDocument(null)).toEqual(EMPTY_RESUME_DOCUMENT);
    expect(hasResumeContent(toResumeDocument(null))).toBe(false);
  });

  it("reads the CRUD object shape keyed by role and title", () => {
    const document = toResumeDocument({
      title: "Engineer Resume",
      summary: "Summary",
      skills: ["Go", "Postgres"],
      experience: [
        { company: "Acme", role: "Engineer", startDate: "2020", endDate: "Present" },
      ],
      education: [{ institution: "State U", degree: "BS", endDate: "2019" }],
      projects: [{ title: "Tool", description: "A tool", technologies: ["Go"] }],
      certifications: [{ name: "Cert", issuer: "Org" }],
      achievements: [{ title: "Award", description: "Won" }],
      languages: ["English"],
      links: { github: "https://github.com/a" },
    });

    expect(document.experience[0]?.position).toBe("Engineer");
    expect(document.experience[0]?.currentlyWorking).toBe(true);
    expect(document.projects[0]?.name).toBe("Tool");
    expect(document.projects[0]?.technologies).toEqual(["Go"]);
    expect(document.links).toEqual(["https://github.com/a"]);
  });

  it("reads the tailor object shape keyed by position and name", () => {
    const document = toResumeDocument({
      experience: [{ company: "Acme", position: "Lead", responsibilities: ["Did a thing"] }],
      projects: [{ name: "Thing", description: "Built it" }],
      certifications: [{ name: "Cert", issuer: "Org" }],
    });

    expect(document.experience[0]?.position).toBe("Lead");
    expect(document.experience[0]?.responsibilities).toEqual(["Did a thing"]);
    expect(document.projects[0]?.name).toBe("Thing");
  });

  it("reads legacy uploaded string arrays", () => {
    const document = toResumeDocument({
      skills: ["React", "react", "Node"],
      experience: ["Acme Corp | Engineer | 2020 - Present"],
      education: ["State University, BS Computer Science, 2019"],
      projects: ["Ledger Core - A ledger service | https://github.com/j/ledger"],
      achievements: ["Won an award"],
    });

    expect(document.skills).toEqual(["React", "Node"]);
    expect(document.experience[0]?.company).toBe("Acme Corp");
    expect(document.experience[0]?.position).toBe("Engineer");
    expect(document.experience[0]?.currentlyWorking).toBe(true);
    expect(document.education[0]?.institution).toBe("State University");
    expect(document.projects[0]?.links).toEqual(["https://github.com/j/ledger"]);
  });

  it("treats a leading responsibility as content rather than a company", () => {
    const document = toResumeDocument({
      experience: ["Managed a team of six engineers across three squads"],
    });

    expect(document.experience[0]?.company).toBe("");
    expect(document.experience[0]?.position).toBe("Managed a team of six engineers across three squads");
  });

  it("keeps only http(s) links and strips trailing punctuation", () => {
    const document = toResumeDocument({
      links: { github: "javascript:alert(1)", website: "https://example.com/page." },
    });

    expect(document.links).toEqual(["https://example.com/page"]);
  });

  it("does not invent content for absent sections", () => {
    const document = toResumeDocument({ title: "Empty" });

    expect(document.summary).toBe("");
    expect(document.skills).toEqual([]);
    expect(document.experience).toEqual([]);
    expect(document.name).toBeNull();
  });
});

describe("toResumeText", () => {
  it("renders the same content the viewer shows", () => {
    const document = extractResumeDocument(SAMPLE);
    const text = toResumeText(document);

    expect(text).toContain("EXPERIENCE");
    expect(text).toContain("Senior Backend Engineer at Northwind Payments");
    expect(text).toContain("Mar 2021 - Present");
    expect(text).toContain("Kubernetes");
    expect(text).toContain("Spanish (fluent)");
  });

  it("omits sections with no content", () => {
    const text = toResumeText(toResumeDocument({ title: "Empty" }));

    expect(text).not.toContain("EXPERIENCE");
    expect(text).not.toContain("SKILLS");
  });
});

describe("extractResumeDocument", () => {
  const document = extractResumeDocument(SAMPLE);

  it("captures contact details", () => {
    expect(document.name).toBe("Jordan Rivera");
    expect(document.email).toBe("jordan.rivera@example.com");
    expect(document.phone).toContain("555");
    expect(document.links).toContain("https://github.com/jordanrivera");
  });

  it("splits grouped skill lines into individual skills", () => {
    expect(document.skills).toEqual([
      "Python", "Go", "TypeScript", "Docker", "Kubernetes", "PostgreSQL",
    ]);
  });

  it("drops page number artifacts", () => {
    expect(JSON.stringify(document)).not.toContain("Page 1 of 2");
  });

  it("structures experience into roles with responsibilities", () => {
    expect(document.experience).toHaveLength(2);
    expect(document.experience[0]).toMatchObject({
      company: "Northwind Payments",
      position: "Senior Backend Engineer",
      startDate: "Mar 2021",
      endDate: "Present",
      currentlyWorking: true,
    });
    expect(document.experience[0]?.responsibilities).toHaveLength(2);
  });

  it("structures education, projects, certifications, achievements and languages", () => {
    expect(document.education[0]?.institution).toContain("University of Texas");
    expect(document.projects[0]?.name).toBe("Ledger Core");
    expect(document.certifications[0]?.name).toContain("AWS Certified");
    expect(document.achievements).toHaveLength(1);
    expect(document.languages).toEqual(["English (native), Spanish (fluent)"]);
  });
});

describe("renderResumePdf", () => {
  const document = extractResumeDocument(SAMPLE);

  function pdfFor(value: ResumeDocument): Buffer {
    return renderResumePdf(value, "resume");
  }

  it("produces a real PDF file", () => {
    const pdf = pdfFor(document);

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.subarray(-6).toString("latin1")).toContain("%%EOF");
  });

  it("declares a cross-reference table whose offsets are accurate", () => {
    const pdf = pdfFor(document).toString("latin1");
    const startxref = Number(pdf.slice(pdf.lastIndexOf("startxref") + 9).trim().split(/\s/)[0]);
    const table = pdf.slice(startxref);

    expect(table.startsWith("xref")).toBe(true);

    const offsets = [...table.matchAll(/^(\d{10}) 00000 n /gm)].map((match) => Number(match[1]));
    expect(offsets.length).toBeGreaterThan(4);

    for (const offset of offsets) {
      expect(pdf.slice(offset)).toMatch(/^\d+ 0 obj/);
    }
  });

  it("embeds the resume content as escaped text", () => {
    const pdf = pdfFor(document).toString("latin1");

    expect(pdf).toContain("Jordan Rivera");
    expect(pdf).toContain("Northwind Payments");
    expect(pdf).toContain("EXPERIENCE");
    expect(pdf).toContain("/BaseFont /Helvetica");
    expect(pdf).toContain("/BaseFont /Helvetica-Bold");
  });

  it("escapes parentheses so the content stream stays valid", () => {
    const pdf = pdfFor({
      ...EMPTY_RESUME_DOCUMENT,
      summary: "Shipped (and measured) a payment pipeline \\ end to end",
    }).toString("latin1");

    expect(pdf).toContain("\\(and measured\\)");
    expect(pdf).toContain("\\\\ end to end");
  });

  it("breaks across pages and keeps every line inside the page", () => {
    const many: ResumeDocument = {
      ...EMPTY_RESUME_DOCUMENT,
      name: "Long Resume",
      experience: Array.from({ length: 60 }, (_, index) => ({
        company: `Company ${index}`,
        position: `Engineer ${index}`,
        location: "",
        startDate: "2020",
        endDate: "2021",
        currentlyWorking: false,
        responsibilities: ["Did a substantial amount of measurable work on this team."],
      })),
    };

    const pdf = pdfFor(many).toString("latin1");
    const pageCount = Number(pdf.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/)?.[1]);

    expect(pageCount).toBeGreaterThan(1);
    // Every page object must be reachable from the page tree.
    expect(pdf.match(/\/Type \/Page \/Parent/g)).toHaveLength(pageCount);

    for (const match of pdf.matchAll(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/g)) {
      const x = Number(match[1]);
      const y = Number(match[2]);

      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(842);
    }
  });

  it("stays a single page for a short resume", () => {
    const pdf = pdfFor({ ...EMPTY_RESUME_DOCUMENT, name: "Jane Doe" }).toString("latin1");

    expect(pdf).toContain("/Count 1");
  });
});
