import {
  readFixtureJobs,
  type AutomationConfig,
} from "../config.js";
import { FixtureJobProvider } from "./fixture.provider.js";
import { HttpJsonJobProvider } from "./http-json.provider.js";
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
export {
  createProvidersFromConfig,
  registerProvider,
  getProviderRegistration,
  listProviderRegistrations,
  createRegisteredProvider,
  type ProviderRegistration,
  type ProviderFactoryOptions,
};

/** Builds the provider list from configuration; no network call happens here. */
export function createProviders(config: AutomationConfig): JobProvider[] {
  const providers: JobProvider[] = config.providers.map(
    (provider) =>
      new HttpJsonJobProvider({
        name: provider.name,
        url: provider.url,
        jobsPath: provider.jobsPath,
        headers: provider.headers,
      })
  );

  if (config.fixtureFile) {
    providers.push(
      new FixtureJobProvider("fixture", readFixtureJobs(config.fixtureFile))
    );
  }

  return providers;
}
