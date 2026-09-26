/**
 * Provider registry for named, pre-configured job providers.
 *
 * This module makes the deployment-configured architecture explicit and
 * provides a clean extension point for adding legitimate provider adapters
 * (LinkedIn, Wellfound, company career APIs, etc.) without scraping.
 *
 * All providers use the generic HttpJsonJobProvider under the hood with
 * provider-specific configuration. Real integrations require valid API
 * credentials configured via environment variables at deployment time.
 */
import { HttpJsonJobProvider } from "./http-json.provider.js";
import { ArbeitnowJobProvider } from "./arbeitnow.provider.js";
import { adzunaProviderFromEnv } from "./adzuna.provider.js";
import { themuseProviderFromEnv } from "./themuse.provider.js";
import { RemoteOkJobProvider } from "./remoteok.provider.js";
import { JobicyJobProvider } from "./jobicy.provider.js";
import type { JobProvider } from "./job-provider.js";

export interface ProviderFactoryOptions {
  name: string;
  url: string;
  jobsPath?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface ProviderRegistration {
  name: string;
  displayName: string;
  description: string;
  requiresAuth: boolean;
  authHeaderName?: string;
  factory: (options: ProviderFactoryOptions) => JobProvider;
  /** Example environment variable names for documentation. */
  envExample?: {
    url?: string;
    headers?: string;
  };
}

const registry = new Map<string, ProviderRegistration>();

/** Register a named provider type. */
export function registerProvider(registration: ProviderRegistration): void {
  if (registry.has(registration.name)) {
    throw new Error(`Provider "${registration.name}" is already registered`);
  }
  registry.set(registration.name, registration);
}

/** Get a registered provider definition. */
export function getProviderRegistration(name: string): ProviderRegistration | undefined {
  return registry.get(name);
}

/** List all registered provider types. */
export function listProviderRegistrations(): ProviderRegistration[] {
  return Array.from(registry.values());
}

/** Create a provider instance from a registered type. */
export function createRegisteredProvider(
  name: string,
  options: ProviderFactoryOptions
): JobProvider {
  const registration = registry.get(name);
  if (!registration) {
    throw new Error(`Unknown provider type: "${name}". Available: ${Array.from(registry.keys()).join(", ")}`);
  }
  return registration.factory(options);
}

/** Built-in generic HTTP JSON provider (always available). */
registerProvider({
  name: "http-json",
  displayName: "Generic HTTP JSON",
  description: "Fetches jobs from any JSON HTTP endpoint. Configure URL, headers, and jobs path via environment.",
  requiresAuth: false,
  factory: (options) => new HttpJsonJobProvider(options),
  envExample: {
    url: "JOB_PROVIDER_URLS=<name>|https://api.example.com/jobs|data.jobs",
    headers: "JOB_PROVIDER_HEADERS={\"<name>\":{\"Authorization\":\"Bearer <token>\"}}",
  },
});

registerProvider({
  name: "arbeitnow",
  displayName: "Arbeitnow",
  description: "Public Arbeitnow job-board API. No login or scraping is required.",
  requiresAuth: false,
  factory: (options) =>
    new ArbeitnowJobProvider({
      url: options.url,
      headers: options.headers,
    }),
  envExample: {
    url: "JOB_PROVIDER_URLS=arbeitnow|https://arbeitnow.com/api/job-board-api|data",
    headers: "",
  },
});

registerProvider({
  name: "adzuna",
  displayName: "Adzuna",
  description:
    "Adzuna Jobs API. Requires a free App ID + App Key registered at developer.adzuna.com, supplied as ADZUNA_APP_ID / ADZUNA_APP_KEY.",
  requiresAuth: true,
  authHeaderName: "app_id",
  factory: (options) => adzunaProviderFromEnv(options),
  envExample: {
    url: "JOB_PROVIDER_URLS=adzuna|https://api.adzuna.com/v1/api/jobs/gb/search/1",
    headers: 'ADZUNA_APP_ID=<app-id> and ADZUNA_APP_KEY=<app-key>',
  },
});

registerProvider({
  name: "themuse",
  displayName: "The Muse",
  description:
    "The Muse public jobs API. Works anonymously within rate limits; optional THE_MUSE_API_KEY (registered app) raises the limit.",
  requiresAuth: false,
  factory: (options) => themuseProviderFromEnv(options),
  envExample: {
    url: "JOB_PROVIDER_URLS=themuse|https://www.themuse.com/api/public/jobs?page=0",
    headers: "THE_MUSE_API_KEY=<optional-registered-app-key>",
  },
});

registerProvider({
  name: "remoteok",
  displayName: "Remote OK",
  description:
    "Remote OK public jobs feed (https://remoteok.com/api). Remote-only listings; no authentication required.",
  requiresAuth: false,
  factory: (options) => new RemoteOkJobProvider(options),
  envExample: {
    url: "JOB_PROVIDER_URLS=remoteok|https://remoteok.com/api",
    headers: "",
  },
});

registerProvider({
  name: "jobicy",
  displayName: "Jobicy",
  description:
    "Jobicy public remote-jobs API (https://jobicy.com/api/v2/remote-jobs). No authentication required.",
  requiresAuth: false,
  factory: (options) => new JobicyJobProvider(options),
  envExample: {
    url: "JOB_PROVIDER_URLS=jobicy|https://jobicy.com/api/v2/remote-jobs?count=100",
    headers: "",
  },
});

/**
 * Example: LinkedIn Jobs API provider pattern.
 *
 * NOTE: This is a template showing the integration pattern. LinkedIn's
 * official Jobs API requires partnership approval. At deployment time,
 * configure via JOB_PROVIDER_URLS with the appropriate endpoint and auth.
 */
registerProvider({
  name: "linkedin",
  displayName: "LinkedIn Jobs",
  description: "LinkedIn Jobs API (requires partnership). Use generic http-json provider with configured endpoint.",
  requiresAuth: true,
  authHeaderName: "Authorization",
  factory: (options) => new HttpJsonJobProvider({
    ...options,
    name: "linkedin",
    headers: {
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  }),
  envExample: {
    url: "JOB_PROVIDER_URLS=linkedin|https://api.linkedin.com/v2/jobs|elements",
    headers: "JOB_PROVIDER_HEADERS={\"linkedin\":{\"Authorization\":\"Bearer <linkedin-access-token>\"}}",
  },
});

/**
 * Example: Wellfound (AngelList) Jobs API provider pattern.
 *
 * NOTE: Wellfound API access requires approval. Configure via generic
 * http-json provider at deployment time.
 */
registerProvider({
  name: "wellfound",
  displayName: "Wellfound (AngelList)",
  description: "Wellfound Jobs API. Use generic http-json provider with configured endpoint.",
  requiresAuth: true,
  authHeaderName: "Authorization",
  factory: (options) => new HttpJsonJobProvider({
    ...options,
    name: "wellfound",
    headers: {
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  }),
  envExample: {
    url: "JOB_PROVIDER_URLS=wellfound|https://api.wellfound.com/v1/jobs|jobs",
    headers: "JOB_PROVIDER_HEADERS={\"wellfound\":{\"Authorization\":\"Bearer <wellfound-token>\"}}",
  },
});

/**
 * Example: Naukri Jobs API provider pattern.
 *
 * NOTE: Naukri API access requires partnership. Configure via generic
 * http-json provider at deployment time.
 */
registerProvider({
  name: "naukri",
  displayName: "Naukri",
  description: "Naukri Jobs API. Use generic http-json provider with configured endpoint.",
  requiresAuth: true,
  authHeaderName: "Authorization",
  factory: (options) => new HttpJsonJobProvider({
    ...options,
    name: "naukri",
    headers: {
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  }),
  envExample: {
    url: "JOB_PROVIDER_URLS=naukri|https://api.naukri.com/v1/jobs|data",
    headers: "JOB_PROVIDER_HEADERS={\"naukri\":{\"Authorization\":\"Bearer <naukri-token>\"}}",
  },
});

/**
 * Example: Company Career Pages (Greenhouse, Lever, etc.) provider pattern.
 *
 * Many companies use ATS platforms with public job APIs (Greenhouse, Lever,
 * Workable, Ashby, etc.). These can be configured individually.
 */
registerProvider({
  name: "greenhouse",
  displayName: "Greenhouse ATS",
  description: "Greenhouse job board API. Public endpoint, no auth typically required.",
  requiresAuth: false,
  factory: (options) => new HttpJsonJobProvider({
    ...options,
    name: "greenhouse",
    jobsPath: options.jobsPath ?? "jobs",
  }),
  envExample: {
    url: "JOB_PROVIDER_URLS=greenhouse|https://boards-api.greenhouse.io/v1/boards/<board-name>/jobs|jobs",
    headers: "",
  },
});

registerProvider({
  name: "lever",
  displayName: "Lever ATS",
  description: "Lever job board API. Public endpoint, no auth typically required.",
  requiresAuth: false,
  factory: (options) => new HttpJsonJobProvider({
    ...options,
    name: "lever",
    jobsPath: options.jobsPath ?? "",
  }),
  envExample: {
    url: "JOB_PROVIDER_URLS=lever|https://api.lever.co/v0/postings/<company-name>|",
    headers: "",
  },
});

registerProvider({
  name: "ashby",
  displayName: "Ashby ATS",
  description: "Ashby job board API. Public endpoint, no auth typically required.",
  requiresAuth: false,
  factory: (options) => new HttpJsonJobProvider({
    ...options,
    name: "ashby",
    jobsPath: options.jobsPath ?? "jobs",
  }),
  envExample: {
    url: "JOB_PROVIDER_URLS=ashby|https://api.ashbyhq.com/postings-api/<organization-id>/jobs|jobs",
    headers: "",
  },
});

/**
 * Create providers from deployment configuration.
 *
 * This function reads JOB_PROVIDER_URLS and JOB_PROVIDER_HEADERS environment
 * variables and creates the appropriate provider instances. It uses the
 * registry to validate known provider types but falls back to the generic
 * http-json provider for any unrecognized names (for forward compatibility).
 */
export function createProvidersFromConfig(config: {
  providerUrls: string;
  providerHeaders?: Record<string, Record<string, string>>;
}): JobProvider[] {
  const headers = config.providerHeaders ?? {};
  const providers: JobProvider[] = [];

  for (const entry of config.providerUrls.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const [name, url, jobsPath] = trimmed.split("|").map((part) => part.trim());
    if (!name || !url) continue;

    const providerHeaders = headers[name] ?? {};
    const factoryOptions: ProviderFactoryOptions = {
      name,
      url,
      jobsPath: jobsPath || undefined,
      headers: providerHeaders,
    };

    try {
      const provider = createRegisteredProvider(name, factoryOptions);
      providers.push(provider);
    } catch {
      // Fall back to generic provider for unknown names (forward compatibility)
      providers.push(new HttpJsonJobProvider(factoryOptions));
    }
  }

  return providers;
}