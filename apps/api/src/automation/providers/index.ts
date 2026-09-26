import {
  readFixtureJobs,
  type AutomationConfig,
  type ProviderEnvConfig,
} from "../config.js";
import { FixtureJobProvider } from "./fixture.provider.js";
import { HttpJsonJobProvider } from "./http-json.provider.js";
import { ArbeitnowJobProvider } from "./arbeitnow.provider.js";
import {
  AdzunaJobProvider,
  adzunaProviderFromEnv,
} from "./adzuna.provider.js";
import {
  TheMuseJobProvider,
  themuseProviderFromEnv,
} from "./themuse.provider.js";
import { RemoteOkJobProvider } from "./remoteok.provider.js";
import { JobicyJobProvider } from "./jobicy.provider.js";
import type { JobProvider } from "./job-provider.js";
import {
  createProvidersFromConfig,
  registerProvider,
  getProviderRegistration,
  listProviderRegistrations,
  createRegisteredProvider,
  type ProviderRegistration,
  type ProviderFactoryOptions,
} from "./registry.js";

export * from "./job-provider.js";
export { FixtureJobProvider } from "./fixture.provider.js";
export { HttpJsonJobProvider } from "./http-json.provider.js";
export { ArbeitnowJobProvider } from "./arbeitnow.provider.js";
export { AdzunaJobProvider, adzunaProviderFromEnv } from "./adzuna.provider.js";
export { TheMuseJobProvider, themuseProviderFromEnv } from "./themuse.provider.js";
export { RemoteOkJobProvider } from "./remoteok.provider.js";
export { JobicyJobProvider } from "./jobicy.provider.js";
export {
  createProvidersFromConfig,
  registerProvider,
  getProviderRegistration,
  listProviderRegistrations,
  createRegisteredProvider,
  type ProviderRegistration,
  type ProviderFactoryOptions,
};

function createConfiguredProvider(provider: ProviderEnvConfig): JobProvider {
  switch (provider.name.toLowerCase()) {
    case "arbeitnow":
      return new ArbeitnowJobProvider({
        url: provider.url,
        headers: provider.headers,
      });
    case "adzuna":
      return adzunaProviderFromEnv({
        url: provider.url,
        headers: provider.headers,
      });
    case "themuse":
      return themuseProviderFromEnv({
        url: provider.url,
        headers: provider.headers,
      });
    case "remoteok":
      return new RemoteOkJobProvider({
        url: provider.url,
        headers: provider.headers,
      });
    case "jobicy":
      return new JobicyJobProvider({
        url: provider.url,
        headers: provider.headers,
      });
    default:
      return new HttpJsonJobProvider({
        name: provider.name,
        url: provider.url,
        jobsPath: provider.jobsPath,
        headers: provider.headers,
      });
  }
}

/** Builds the provider list from configuration; no network call happens here. */
export function createProviders(config: AutomationConfig): JobProvider[] {
  const providers: JobProvider[] = config.providers.map(createConfiguredProvider);

  if (config.fixtureFile) {
    providers.push(
      new FixtureJobProvider("fixture", readFixtureJobs(config.fixtureFile))
    );
  }

  return providers;
}
