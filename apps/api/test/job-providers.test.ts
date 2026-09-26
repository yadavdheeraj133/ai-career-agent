/**
 * Task 8 — job provider system.
 *
 * Verifies the deployment-configured provider architecture end to end:
 * fixture + generic HTTP JSON providers, normalization, deduplication
 * (including the UNIQUE(provider, externalId) constraint), bounded retries,
 * per-provider failure isolation, malformed-response safety, expiration, and
 * that provider secrets never appear in errors or logs.
 *
 * No real external provider is contacted: everything runs against the
 * isolated `_test` database with stubbed fetch boundaries.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  AutomationAggregationService,
  ExpirationService,
  FixtureJobProvider,
  HttpJsonJobProvider,
  ArbeitnowJobProvider,
  AdzunaJobProvider,
  TheMuseJobProvider,
  RemoteOkJobProvider,
  JobicyJobProvider,
  HttpError,
  IngestionService,
  PermanentError,
  TransientError,
  createProviders,
  loadAutomationConfig,
  normalizeRawJob,
  parseProviderUrls,
  createProvidersFromConfig,
  getProviderRegistration,
  listProviderRegistrations,
  createRegisteredProvider,
  isDeveloperJob,
} from "../src/automation/index.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";

let unique = 0;

function rawJob(overrides: Record<string, unknown> = {}) {
  unique += 1;
  return {
    title: "Backend Engineer",
    company: "Acme",
    location: "Remote",
    workMode: "remote",
    jobType: "full-time",
    description: "Build the payments pipeline.",
    url: `https://example.test/provider-jobs/${unique}`,
    externalId: `ext-${unique}`,
    ...overrides,
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(
    typeof payload === "string" ? payload : JSON.stringify(payload),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

function ingestionService(onRetry?: (info: { provider: string; attempt: number }) => void) {
  const aggregation = new AutomationAggregationService();
  return new IngestionService(aggregation, {
    maxAttempts: 3,
    baseBackoffMs: 1,
    maxBackoffMs: 5,
    maxJobsPerProvider: 500,
    sleep: async () => {},
    ...(onRetry ? { onRetry } : {}),
  });
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("provider configuration", () => {
  it("builds deployment-configured HTTP providers and an optional fixture", () => {
    const config = loadAutomationConfig({
      JOB_PROVIDER_URLS: "acme|https://jobs.acme.example/api/jobs|data.jobs",
      JOB_PROVIDER_HEADERS: JSON.stringify({
        acme: { Authorization: "Bearer secret-123" },
      }),
    } as Record<string, string>);

    const providers = createProviders(config);
    expect(providers).toHaveLength(1);
    expect(providers[0]?.name).toBe("acme");
  });

  it("builds no providers when nothing is configured", () => {
    const config = loadAutomationConfig({} as Record<string, string>);
    expect(config.providers).toEqual([]);
    expect(createProviders(config)).toEqual([]);
  });

  it("routes configured names to their dedicated adapters", () => {
    const config = loadAutomationConfig({
      JOB_PROVIDER_URLS:
        "arbeitnow|https://arbeitnow.com/api/job-board-api|data," +
        "themuse|https://www.themuse.com/api/public/jobs?page=1," +
        "remoteok|https://remoteok.com/api," +
        "jobicy|https://jobicy.com/api/v2/remote-jobs?count=100," +
        "adzuna|https://api.adzuna.com/v1/api/jobs/gb/search/1",
    } as Record<string, string>);

    const providers = createProviders(config);
    const byName = new Map(providers.map((p) => [p.name, p]));
    expect(byName.get("arbeitnow")).toBeInstanceOf(ArbeitnowJobProvider);
    expect(byName.get("adzuna")).toBeInstanceOf(AdzunaJobProvider);
    expect(byName.get("themuse")).toBeInstanceOf(TheMuseJobProvider);
    expect(byName.get("remoteok")).toBeInstanceOf(RemoteOkJobProvider);
    expect(byName.get("jobicy")).toBeInstanceOf(JobicyJobProvider);
  });

  it("skips malformed provider entries without breaking valid ones", () => {
    const entries = parseProviderUrls("good|https://good.example/jobs, ,,bad|");
    expect(entries.map((entry) => entry.name)).toEqual(["good"]);
  });
});

describe("HttpJsonJobProvider", () => {
  it("accepts a top-level array, a jobs key, and a configured jobsPath", async () => {
    const jobs = [rawJob(), rawJob()];

    const fromArray = new HttpJsonJobProvider({
      name: "arr",
      url: "https://example.test/a",
      fetchImpl: (async () => jsonResponse(jobs)) as typeof fetch,
    });
    expect((await fromArray.fetchJobs()).jobs).toHaveLength(2);

    const fromKey = new HttpJsonJobProvider({
      name: "key",
      url: "https://example.test/b",
      fetchImpl: (async () => jsonResponse({ jobs })) as typeof fetch,
    });
    expect((await fromKey.fetchJobs()).jobs).toHaveLength(2);

    const fromPath = new HttpJsonJobProvider({
      name: "path",
      url: "https://example.test/c",
      jobsPath: "data.jobs",
      fetchImpl: (async () => jsonResponse({ data: { jobs } })) as typeof fetch,
    });
    expect((await fromPath.fetchJobs()).jobs).toHaveLength(2);
  });

  it("treats invalid JSON and missing jobs arrays as transient failures", async () => {
    const badJson = new HttpJsonJobProvider({
      name: "bad-json",
      url: "https://example.test/bad",
      fetchImpl: (async () => jsonResponse("this is not json")) as typeof fetch,
    });
    await expect(badJson.fetchJobs()).rejects.toBeInstanceOf(TransientError);

    const noArray = new HttpJsonJobProvider({
      name: "no-array",
      url: "https://example.test/empty",
      fetchImpl: (async () => jsonResponse({ ok: true })) as typeof fetch,
    });
    await expect(noArray.fetchJobs()).rejects.toBeInstanceOf(TransientError);
  });

  it("maps HTTP 5xx to retryable errors and 4xx to permanent ones", async () => {
    const serverError = new HttpJsonJobProvider({
      name: "srv",
      url: "https://example.test/500",
      fetchImpl: (async () => jsonResponse({ error: "boom" }, 500)) as typeof fetch,
    });
    await expect(serverError.fetchJobs()).rejects.toMatchObject({
      name: "HttpError",
      status: 500,
    } satisfies Partial<HttpError>);

    const notFound = new HttpJsonJobProvider({
      name: "nf",
      url: "https://example.test/404",
      fetchImpl: (async () => jsonResponse({ error: "nope" }, 404)) as typeof fetch,
    });
    await expect(notFound.fetchJobs()).rejects.toMatchObject({ status: 404 });
  });

  it("never includes provider secrets in error messages", async () => {
    const secret = "super-secret-header-value";
    const provider = new HttpJsonJobProvider({
      name: "sec",
      url: "https://example.test/sec",
      headers: { Authorization: `Bearer ${secret}` },
      fetchImpl: (async () => jsonResponse({ error: "x" }, 500)) as typeof fetch,
    });

    const error = await provider.fetchJobs().catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(secret);
    expect((error as Error).message).toContain("sec");
  });
});

describe("ArbeitnowJobProvider", () => {
  it("maps public feed records to normalized provider input", async () => {
    let calledUrl = "";
    const provider = new ArbeitnowJobProvider({
      url: "https://arbeitnow.com/api/job-board-api",
      fetchImpl: (async (input: RequestInfo | URL) => {
        calledUrl = String(input);
        return jsonResponse({
          data: [
            {
              slug: "frontend-engineer-1",
              title: "Frontend Engineer",
              company_name: "Example Labs",
              location: "Remote",
              remote: true,
              job_types: ["Full-time"],
              tags: ["React", "TypeScript"],
              description: "Build product interfaces.",
              url: "https://www.arbeitnow.com/jobs/frontend-engineer-1",
              created_at: 1790000000,
            },
          ],
        });
      }) as typeof fetch,
    });

    const result = await provider.fetchJobs();
    // The public board API has no keyword/category filter, so the request must
    // stay unfiltered and rely on server-side classification instead.
    expect(new URL(calledUrl).searchParams.has("search")).toBe(false);
    expect(new URL(calledUrl).searchParams.has("tag")).toBe(false);
    expect(result.jobs[0]).toMatchObject({
      title: "Frontend Engineer",
      company: "Example Labs",
      workMode: "Remote",
      skills: ["React", "TypeScript"],
      provider: "arbeitnow",
      externalId: "frontend-engineer-1",
      source: "Arbeitnow",
    });
  });
});

describe("AdzunaJobProvider", () => {
  it("maps API records to normalized provider input and appends auth params", async () => {
    let calledUrl = "";
    const provider = new AdzunaJobProvider({
      url: "https://api.adzuna.com/v1/api/jobs/gb/search/1",
      appId: "test-id",
      appKey: "test-key",
      fetchImpl: (async (input: RequestInfo | URL) => {
        calledUrl = String(input);
        return jsonResponse({
          results: [
            {
              id: 1001,
              title: "Backend Engineer",
              company: { display_name: "Acme Ltd" },
              location: { display_name: "London" },
              description: "Build APIs.",
              redirect_url: "https://www.adzuna.com/land?id=1001",
              created: "2026-09-01T00:00:00Z",
              contract_time: "full_time",
            },
          ],
        });
      }) as typeof fetch,
    });

    const result = await provider.fetchJobs();
    expect(calledUrl).toContain("app_id=test-id");
    expect(calledUrl).toContain("app_key=test-key");
    expect(calledUrl).toContain("results_per_page=50");
    expect(new URL(calledUrl).searchParams.get("what_or")).toContain(
      "software developer"
    );
    expect(result.jobs[0]).toMatchObject({
      title: "Backend Engineer",
      company: "Acme Ltd",
      location: "London",
      jobType: "full_time",
      provider: "adzuna",
      externalId: "1001",
      source: "Adzuna",
      postedAt: "2026-09-01T00:00:00Z",
    });
  });

  it("preserves an explicit search query", async () => {
    let calledUrl = "";
    const provider = new AdzunaJobProvider({
      url: "https://api.adzuna.com/v1/api/jobs/gb/search/1?title_only=rust",
      appId: "test-id",
      appKey: "test-key",
      fetchImpl: (async (input: RequestInfo | URL) => {
        calledUrl = String(input);
        return jsonResponse({ results: [] });
      }) as typeof fetch,
    });

    await provider.fetchJobs();
    const url = new URL(calledUrl);
    expect(url.searchParams.get("title_only")).toBe("rust");
    expect(url.searchParams.has("what_or")).toBe(false);
  });

  it("fails fast with a permanent error when credentials are missing", async () => {
    const provider = new AdzunaJobProvider({
      url: "https://api.adzuna.com/v1/api/jobs/gb/search/1",
      appId: "",
      appKey: "",
    });
    await expect(provider.fetchJobs()).rejects.toBeInstanceOf(PermanentError);
  });

  it("maps HTTP 401 to an HttpError (non-retryable)", async () => {
    const provider = new AdzunaJobProvider({
      url: "https://api.adzuna.com/v1/api/jobs/gb/search/1",
      appId: "bad",
      appKey: "bad",
      fetchImpl: (async () => jsonResponse({ error: "unauthorized" }, 401)) as typeof fetch,
    });
    await expect(provider.fetchJobs()).rejects.toMatchObject({
      name: "HttpError",
      status: 401,
    } satisfies Partial<HttpError>);
  });

  it("treats missing results arrays as transient failures", async () => {
    const provider = new AdzunaJobProvider({
      url: "https://api.adzuna.com/v1/api/jobs/gb/search/1",
      appId: "test-id",
      appKey: "test-key",
      fetchImpl: (async () => jsonResponse({ ok: true })) as typeof fetch,
    });
    await expect(provider.fetchJobs()).rejects.toBeInstanceOf(TransientError);
  });
});

describe("TheMuseJobProvider", () => {
  it("maps public API results to normalized provider input", async () => {
    const provider = new TheMuseJobProvider({
      url: "https://www.themuse.com/api/public/jobs?page=1",
      fetchImpl: (async () =>
        jsonResponse({
          page: 1,
          page_count: 1,
          total: 1,
          results: [
            {
              id: 19225596,
              name: "Registered Nurse",
              publication_date: "2025-06-10T09:59:33Z",
              locations: [{ name: "Dearborn, MI" }],
              levels: [{ name: "Mid Level" }],
              tags: ["Nursing"],
              contents: "<p>Provide care.</p>",
              refs: {
                landing_page: "https://www.themuse.com/jobs/dmc/registered-nurse",
              },
              company: { name: "DMC Sinai-Grace Hospital" },
            },
          ],
        })) as typeof fetch,
    });

    const result = await provider.fetchJobs();
    expect(result.jobs[0]).toMatchObject({
      title: "Registered Nurse",
      company: "DMC Sinai-Grace Hospital",
      location: "Dearborn, MI",
      experience: "Mid Level",
      skills: ["Nursing"],
      provider: "themuse",
      externalId: "19225596",
      source: "The Muse",
      postedAt: "2025-06-10T09:59:33Z",
    });
  });

  it("defaults to the Software Engineer category and preserves an explicit category", async () => {
    const calledUrls: string[] = [];
    const createProvider = (url: string) =>
      new TheMuseJobProvider({
        url,
        fetchImpl: (async (input: RequestInfo | URL) => {
          calledUrls.push(String(input));
          return jsonResponse({ results: [] });
        }) as typeof fetch,
      });

    await createProvider("https://www.themuse.com/api/public/jobs?page=1").fetchJobs();
    await createProvider(
      "https://www.themuse.com/api/public/jobs?page=1&category=Data%20Science"
    ).fetchJobs();

    expect(new URL(calledUrls[0]!).searchParams.get("category")).toBe(
      "Software Engineer"
    );
    expect(new URL(calledUrls[0]!).searchParams.get("page")).toBe("0");
    expect(new URL(calledUrls[1]!).searchParams.get("category")).toBe(
      "Data Science"
    );
    expect(new URL(calledUrls[1]!).searchParams.get("page")).toBe("1");
  });

  it("appends the registered-app api_key when configured", async () => {
    let calledUrl = "";
    const provider = new TheMuseJobProvider({
      url: "https://www.themuse.com/api/public/jobs?page=1",
      apiKey: "muse-key",
      fetchImpl: (async (input: RequestInfo | URL) => {
        calledUrl = String(input);
        return jsonResponse({ results: [] });
      }) as typeof fetch,
    });
    await provider.fetchJobs();
    expect(calledUrl).toContain("api_key=muse-key");
  });

  it("treats the documented 403 rate-limit response as retryable", async () => {
    const provider = new TheMuseJobProvider({
      url: "https://www.themuse.com/api/public/jobs?page=1",
      fetchImpl: (async () => jsonResponse({ error: "rate limited" }, 403)) as typeof fetch,
    });
    await expect(provider.fetchJobs()).rejects.toBeInstanceOf(TransientError);
  });

  it("treats missing results arrays as transient failures", async () => {
    const provider = new TheMuseJobProvider({
      url: "https://www.themuse.com/api/public/jobs?page=1",
      fetchImpl: (async () => jsonResponse({ ok: true })) as typeof fetch,
    });
    await expect(provider.fetchJobs()).rejects.toBeInstanceOf(TransientError);
  });
});

describe("RemoteOkJobProvider", () => {
  it("fetches job records and skips the leading legal notice", async () => {
    const provider = new RemoteOkJobProvider({
      url: "https://remoteok.com/api",
      fetchImpl: (async () =>
        jsonResponse([
          { last_updated: 1790265606, legal: "API terms of service..." },
          {
            id: "1137429",
            company: "Workana",
            position: "Automotive Technician",
            location: "Spain",
            tags: ["Cars"],
            description: "<p>Repair vehicles.</p>",
            url: "https://remoteOK.com/remote-jobs/remote-technician",
            date: "2026-09-24T00:00:07+00:00",
          },
        ])) as typeof fetch,
    });

    const result = await provider.fetchJobs();
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      title: "Automotive Technician",
      company: "Workana",
      location: "Spain",
      workMode: "Remote",
      provider: "remoteok",
      externalId: "1137429",
      source: "Remote OK",
      postedAt: "2026-09-24T00:00:07+00:00",
    });
    expect(result.jobs[0]).not.toHaveProperty("skills");
  });

  it("defaults to the dev tag and preserves explicit tags", async () => {
    const calledUrls: string[] = [];
    const createProvider = (url: string) =>
      new RemoteOkJobProvider({
        url,
        fetchImpl: (async (input: RequestInfo | URL) => {
          calledUrls.push(String(input));
          return jsonResponse([]);
        }) as typeof fetch,
      });

    await createProvider("https://remoteok.com/api").fetchJobs();
    await createProvider("https://remoteok.com/api?tag=rust").fetchJobs();
    await createProvider("https://remoteok.com/api?tags=rust,golang").fetchJobs();

    expect(new URL(calledUrls[0]!).searchParams.get("tag")).toBe("dev");
    expect(new URL(calledUrls[1]!).searchParams.get("tag")).toBe("rust");
    expect(new URL(calledUrls[2]!).searchParams.get("tags")).toBe(
      "rust,golang"
    );
  });

  it("rejects non-array responses as transient failures", async () => {
    const provider = new RemoteOkJobProvider({
      url: "https://remoteok.com/api",
      fetchImpl: (async () => jsonResponse({ error: "not an array" })) as typeof fetch,
    });
    await expect(provider.fetchJobs()).rejects.toBeInstanceOf(TransientError);
  });
});

describe("JobicyJobProvider", () => {
  it("maps remote job records to normalized provider input", async () => {
    const provider = new JobicyJobProvider({
      url: "https://jobicy.com/api/v2/remote-jobs?count=10",
      fetchImpl: (async () =>
        jsonResponse({
          success: true,
          jobs: [
            {
              id: 154057,
              url: "https://jobicy.com/jobs/154057-technical-accountant",
              jobTitle: "Technical Accountant",
              companyName: "Kalshi",
              jobType: ["Full-Time"],
              jobGeo: "USA",
              jobLevel: "Senior",
              jobDescription: "<p>Accounting work.</p>",
              pubDate: "2026-09-24T18:46:47+00:00",
              salaryMin: 100000,
              salaryMax: 180000,
              salaryCurrency: "USD",
              salaryPeriod: "yearly",
            },
          ],
        })) as typeof fetch,
    });

    const result = await provider.fetchJobs();
    expect(result.jobs[0]).toMatchObject({
      title: "Technical Accountant",
      company: "Kalshi",
      location: "USA",
      workMode: "Remote",
      jobType: "Full-Time",
      experience: "Senior",
      salary: "100,000 - 180,000 USD (yearly)",
      provider: "jobicy",
      externalId: "154057",
      source: "Jobicy",
      postedAt: "2026-09-24T18:46:47+00:00",
    });
  });

  it("defaults to the engineering industry and preserves an explicit industry", async () => {
    const calledUrls: string[] = [];
    const createProvider = (url: string) =>
      new JobicyJobProvider({
        url,
        fetchImpl: (async (input: RequestInfo | URL) => {
          calledUrls.push(String(input));
          return jsonResponse({ success: true, jobs: [] });
        }) as typeof fetch,
      });

    await createProvider("https://jobicy.com/api/v2/remote-jobs").fetchJobs();
    await createProvider(
      "https://jobicy.com/api/v2/remote-jobs?industry=design"
    ).fetchJobs();

    expect(new URL(calledUrls[0]!).searchParams.get("industry")).toBe(
      "engineering"
    );
    expect(new URL(calledUrls[1]!).searchParams.get("industry")).toBe("design");
  });
});

describe("developer job classification", () => {
  it("accepts development roles and rejects unrelated roles", () => {
    for (const title of [
      "Frontend Engineer",
      "Backend Engineer",
      "Full Stack Developer",
      "Mobile Developer",
      "Software Engineer",
      "DevOps Engineer",
      "Cloud Architect",
      "QA Automation Specialist",
      "Cybersecurity Engineer",
      "Data Engineer",
      "Machine Learning Engineer",
      "AI Engineer",
      "Java Developer",
      "React Developer",
      "Node.js Engineer",
    ]) {
      expect(isDeveloperJob({ title })).toBe(true);
    }

    for (const title of [
      "Product Designer",
      "Product Manager",
      "Marketing Manager",
      "Sales Manager",
      "HR Manager",
      "Technology Intern",
      "Graphic Designer",
      "Automotive Technician",
      "Strategy Manager",
      "Paid Social Manager",
      "VP Pricing & Packaging",
      "Growth Strategist",
      "Online Bidder",
      "Market Research Analyst",
      "Customer Support Specialist",
      "Operations Engineer",
      "Senior Clinical Scientist Immunology",
      "Lead Support Engineer",
      "Trade-in Buybulk Intern",
      "Quality Control Specialist",
      "Care Navigator",
      "BMS Service Technician",
      "Supply Chain Technician",
      "Technical Program Manager",
      "Registered Nurse",
    ]) {
      expect(isDeveloperJob({ title })).toBe(false);
    }
  });

  it("uses structured skills and development context", () => {
    expect(
      isDeveloperJob({
        title: "Engineer",
        description: "Coordinate company activities and prepare reports.",
        skills: ["TypeScript"],
      })
    ).toBe(false);
    expect(
      isDeveloperJob({
        title: "Engineer",
        description: "Build production services with TypeScript and Node.js.",
        skills: ["TypeScript", "Node.js"],
      })
    ).toBe(true);
    expect(
      isDeveloperJob({
        title: "Engineer",
        description: "Deliver internal services.",
        skills: ["TypeScript", "Node.js"],
      })
    ).toBe(true);
  });

  it("is provider-agnostic: identical jobs classify identically on every source", () => {
    // Regression guard for the previous Remote OK special case, which keyed the
    // verdict off the provider name and therefore let site-wide `dev` tags pull
    // in unrelated roles while rejecting real ones. Relevance must come from
    // the job itself, never from which API delivered it.
    const candidates = [
      {
        title: "Market Research Analyst",
        description: "Software engineers support our market research team.",
        skills: ["golang", "react", "typescript", "python", "cloud", "dev"],
        expected: false,
      },
      {
        title: "Operations Engineer II",
        description: "Build production services with TypeScript and Node.js.",
        skills: ["golang", "react", "typescript"],
        expected: false,
      },
      {
        title: "Senior Software Engineer",
        description: "Own TypeScript services end to end.",
        skills: ["typescript", "node"],
        expected: true,
      },
    ];
    const providers = [
      "arbeitnow",
      "themuse",
      "remoteok",
      "jobicy",
      "adzuna",
      undefined,
    ];

    for (const candidate of candidates) {
      const baseline = isDeveloperJob(candidate);

      for (const provider of providers) {
        const record = provider ? { provider, ...candidate } : candidate;
        expect(isDeveloperJob(record), `provider=${provider}`).toBe(baseline);
      }

      expect(baseline, candidate.title).toBe(candidate.expected);
    }
  });

  it("lets a business veto outrank otherwise convincing development text", () => {
    // "Operations Engineer" is far more often process/manufacturing operations
    // than software, so it stays rejected even when the description and skills
    // look technical. This is exactly the class of job the old Remote OK
    // site-wide `dev` tag was pulling into the dataset.
    expect(
      isDeveloperJob({
        title: "Operations Engineer",
        description:
          "Build production services with TypeScript and Node.js on Kubernetes.",
        skills: ["typescript", "node", "kubernetes"],
      })
    ).toBe(false);
  });

  it("does not treat a company blurb about software as development work", () => {
    // Real advert: a data-annotation role whose "About us" paragraph lists the
    // fields the company works in. Naming a discipline is not the same as doing
    // engineering work, so the tools named in the body must not admit it.
    expect(
      isDeveloperJob({
        title: "Junior Data Analyst",
        description:
          "We focus on high-quality data annotation, RLHF and model evaluation " +
          "across various domains, ranging from STEM and software engineering " +
          "to linguistics and data science. In this role you will monitor " +
          "dataset quality and analyse annotator performance using SQL and " +
          "Python, and work at the intersection of data, machine learning and " +
          "AI operations. Passionate about AI/ML concepts.",
      })
    ).toBe(false);

    // The same discipline vocabulary alongside genuine engineering work and
    // tagged technologies is still accepted.
    expect(
      isDeveloperJob({
        title: "Machine Learning Engineer",
        description:
          "You will build and deploy machine learning services with Python.",
        skills: ["python", "pytorch"],
      })
    ).toBe(true);
  });
});

describe("fixture provider ingestion", () => {
  it("filters non-developer jobs before persistence and reports counts", async () => {
    const service = ingestionService();
    const result = await service.runProvider(
      new FixtureJobProvider("developer-fixture", [
        rawJob(),
        rawJob({
          title: "Marketing Manager",
          skills: ["Salesforce"],
          description: "Manage marketing campaigns and market research.",
        }),
      ])
    );

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      fetched: 2,
      accepted: 1,
      rejected: 1,
      created: 1,
    });
    expect(await prisma.job.count()).toBe(1);
  });

  it("ingests valid jobs and reports counts", async () => {
    const service = ingestionService();
    const result = await service.runProvider(
      new FixtureJobProvider("fixture", [rawJob(), rawJob()])
    );

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({ fetched: 2, created: 2 });
    expect(await prisma.job.count()).toBe(2);
  });

  it("skips malformed records without aborting the batch", async () => {
    const service = ingestionService();
    const result = await service.runProvider(
      new FixtureJobProvider("fixture", [
        rawJob(),
        { company: "No title here", url: "https://example.test/bad" },
        "not-an-object",
        rawJob(),
      ])
    );

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({ fetched: 4, created: 2, invalid: 2 });
    expect(await prisma.job.count()).toBe(2);
  });

  it("does not create duplicates for the same provider/externalId", async () => {
    const service = ingestionService();
    const job = rawJob({ externalId: "dup-1" });

    const first = await service.runProvider(new FixtureJobProvider("p", [job]));
    expect(first.summary).toMatchObject({ created: 1 });

    const second = await service.runProvider(
      new FixtureJobProvider("p", [{ ...job }])
    );
    expect(second.summary).toMatchObject({ created: 0 });
    expect(await prisma.job.count()).toBe(1);
  });

  it("treats different externalIds as different jobs", async () => {
    const service = ingestionService();
    const result = await service.runProvider(
      new FixtureJobProvider("p", [
        rawJob({ externalId: "a-1" }),
        rawJob({ externalId: "a-2" }),
      ])
    );

    expect(result.summary).toMatchObject({ created: 2 });
    expect(await prisma.job.count()).toBe(2);
  });

  it("updates the stored row when provider content changes", async () => {
    const service = ingestionService();
    const base = rawJob({ externalId: "chg-1", description: "v1" });

    await service.runProvider(new FixtureJobProvider("p", [base]));

    const updated = await service.runProvider(
      new FixtureJobProvider("p", [{ ...base, description: "v2 improved" }])
    );
    expect(updated.summary).toMatchObject({ created: 0, updated: 1 });

    const stored = await prisma.job.findFirst({
      where: { provider: "p", externalId: "chg-1" },
    });
    expect(stored?.description).toBe("v2 improved");
    expect(await prisma.job.count()).toBe(1);
  });
});

describe("database uniqueness", () => {
  it("rejects a direct duplicate (provider, externalId) insert", async () => {
    const data = {
      title: "Backend Engineer",
      company: "Acme",
      location: "Remote",
      workMode: "Remote",
      jobType: "Full-time",
      source: "fixture",
      provider: "p",
      externalId: "uniq-1",
      url: "https://example.test/uniq/1",
    };

    await prisma.job.create({ data });
    await expect(prisma.job.create({ data: { ...data, url: "https://example.test/uniq/2" } })).rejects.toMatchObject({
      code: "P2002",
    });
    expect(await prisma.job.count()).toBe(1);
  });

  it("allows the same externalId from different providers", async () => {
    const base = {
      title: "Backend Engineer",
      company: "Acme",
      location: "Remote",
      workMode: "Remote",
      jobType: "Full-time",
      source: "fixture",
      externalId: "shared-1",
    };

    await prisma.job.create({
      data: { ...base, provider: "p1", url: "https://example.test/s/1" },
    });
    await prisma.job.create({
      data: { ...base, provider: "p2", url: "https://example.test/s/2" },
    });
    expect(await prisma.job.count()).toBe(2);
  });

  it("allows multiple provider-less rows", async () => {
    const base = {
      title: "Backend Engineer",
      company: "Acme",
      location: "Remote",
      workMode: "Remote",
      jobType: "Full-time",
      source: "manual",
    };

    await prisma.job.create({ data: { ...base, url: "https://example.test/m/1" } });
    await prisma.job.create({ data: { ...base, url: "https://example.test/m/2" } });
    expect(await prisma.job.count()).toBe(2);
  });
});

describe("normalization", () => {
  it("maps provider-specific aliases and preserves posted dates", () => {
    const result = normalizeRawJob(
      {
        jobTitle: "Data Scientist",
        companyName: "Globex",
        work_mode: "hybrid",
        job_type: "intern",
        link: "https://example.test/n1",
        external_id: "n-1",
        datePosted: "2026-09-01T00:00:00.000Z",
        details: "Analyze data.",
      },
      "partner"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job).toMatchObject({
      title: "Data Scientist",
      company: "Globex",
      workMode: "Hybrid",
      jobType: "Internship",
      provider: "partner",
      externalId: "n-1",
    });
    expect(result.job.postedAt).toBeInstanceOf(Date);
    expect(result.job.postedAt?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("keeps valid records when the posted date is garbage", () => {
    const result = normalizeRawJob(
      {
        title: "QA Engineer",
        company: "Acme",
        url: "https://example.test/n2",
        postedAt: "not-a-date",
      },
      "p"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.postedAt).toBeUndefined();
  });

  it("persists the posted date through ingestion", async () => {
    const service = ingestionService();
    await service.runProvider(
      new FixtureJobProvider("p", [
        rawJob({ externalId: "pd-1", publishedAt: "2026-08-15T00:00:00.000Z" }),
      ])
    );

    const stored = await prisma.job.findFirst({
      where: { provider: "p", externalId: "pd-1" },
    });
    expect(stored?.postedAt?.toISOString()).toBe("2026-08-15T00:00:00.000Z");
  });
});

describe("retry and failure isolation", () => {
  it("retries transient fetch failures then succeeds", async () => {
    let calls = 0;
    const flaky = {
      name: "flaky",
      fetchJobs: async () => {
        calls += 1;
        if (calls < 3) throw new TransientError("blip");
        return { jobs: [rawJob()] };
      },
    };

    const service = ingestionService();
    const result = await service.runProvider(flaky);

    expect(calls).toBe(3);
    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({ created: 1 });
  });

  it("does not retry permanent failures", async () => {
    let calls = 0;
    const broken = {
      name: "broken",
      fetchJobs: async () => {
        calls += 1;
        throw new HttpError(404, "gone");
      },
    };

    const attempts: number[] = [];
    const service = ingestionService((info) => {
      attempts.push(info.attempt);
    });
    const result = await service.runProvider(broken);

    expect(calls).toBe(1);
    expect(attempts).toEqual([]);
    expect(result.ok).toBe(false);
  });

  it("isolates a failing provider from healthy ones", async () => {
    const failing = {
      name: "failing",
      fetchJobs: async (): Promise<{ jobs: unknown[] }> => {
        throw new TransientError("down");
      },
    };

    const service = ingestionService();
    const results = await service.runAll([
      failing,
      new FixtureJobProvider("healthy", [rawJob()]),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ provider: "failing", ok: false });
    expect(results[1]).toMatchObject({ provider: "healthy", ok: true });
    expect(await prisma.job.count()).toBe(1);
  });
});

describe("expiration handling", () => {
  it("expires stale active jobs and keeps fresh ones", async () => {
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    await prisma.job.create({
      data: {
        title: "Stale Role",
        company: "Acme",
        location: "Remote",
        workMode: "Remote",
        jobType: "Full-time",
        source: "fixture",
        url: "https://example.test/stale/1",
        status: "ACTIVE",
        lastSeenAt: old,
      },
    });
    await prisma.job.create({
      data: {
        title: "Fresh Role",
        company: "Acme",
        location: "Remote",
        workMode: "Remote",
        jobType: "Full-time",
        source: "fixture",
        url: "https://example.test/fresh/1",
        status: "ACTIVE",
        lastSeenAt: new Date(),
      },
    });

    const service = new ExpirationService();
    const result = await service.expireStale(30 * 24 * 60 * 60 * 1000);

    expect(result).toMatchObject({ candidates: 1, expired: 1 });

    const stale = await prisma.job.findFirst({
      where: { url: "https://example.test/stale/1" },
    });
    const fresh = await prisma.job.findFirst({
      where: { url: "https://example.test/fresh/1" },
    });
    expect(stale?.status).toBe("EXPIRED");
    expect(fresh?.status).toBe("ACTIVE");
    // Expired rows are retained, never deleted.
    expect(await prisma.job.count()).toBe(2);
  });
});

describe("provider registry", () => {
  it("registers built-in provider types", () => {
    const registrations = listProviderRegistrations();
    const names = registrations.map((r) => r.name);
    expect(names).toContain("http-json");
    expect(names).toContain("arbeitnow");
    expect(names).toContain("adzuna");
    expect(names).toContain("themuse");
    expect(names).toContain("remoteok");
    expect(names).toContain("jobicy");
    expect(names).toContain("linkedin");
    expect(names).toContain("wellfound");
    expect(names).toContain("naukri");
    expect(names).toContain("greenhouse");
    expect(names).toContain("lever");
    expect(names).toContain("ashby");
  });

  it("provides metadata for each registered provider", () => {
    const linkedin = getProviderRegistration("linkedin");
    expect(linkedin).toBeDefined();
    expect(linkedin?.displayName).toBe("LinkedIn Jobs");
    expect(linkedin?.requiresAuth).toBe(true);
    expect(linkedin?.authHeaderName).toBe("Authorization");
    expect(linkedin?.envExample).toBeDefined();
  });

  it("creates registered provider instances", () => {
    const provider = createRegisteredProvider("greenhouse", {
      name: "my-greenhouse",
      url: "https://boards-api.greenhouse.io/v1/boards/test/jobs",
    });
    // Registered provider factories use the provider type name
    expect(provider.name).toBe("greenhouse");
    expect(provider).toBeInstanceOf(HttpJsonJobProvider);
  });

  it("throws for unknown provider types", () => {
    expect(() => createRegisteredProvider("unknown", { name: "x", url: "https://x" })).toThrow(
      'Unknown provider type: "unknown"'
    );
  });

  it("createProvidersFromConfig builds providers from deployment config", () => {
    const providers = createProvidersFromConfig({
      providerUrls: "greenhouse|https://api.greenhouse.io/jobs|jobs,lever|https://api.lever.co/jobs",
      providerHeaders: {
        greenhouse: { Authorization: "Bearer gh-token" },
      },
    });

    expect(providers).toHaveLength(2);
    expect(providers[0]?.name).toBe("greenhouse");
    expect(providers[1]?.name).toBe("lever");
  });

  it("falls back to generic provider for unknown names in config", () => {
    const providers = createProvidersFromConfig({
      providerUrls: "custom-provider|https://custom.example/jobs",
      providerHeaders: {},
    });

    expect(providers).toHaveLength(1);
    expect(providers[0]).toBeInstanceOf(HttpJsonJobProvider);
  });

  it("skips malformed entries in config", () => {
    const providers = createProvidersFromConfig({
      providerUrls: "good|https://good.example/jobs,,bad|,|https://missing-name.example/jobs",
      providerHeaders: {},
    });

    expect(providers).toHaveLength(1);
    expect(providers[0]?.name).toBe("good");
  });
});
