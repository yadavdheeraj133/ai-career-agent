import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Without an explicit `turbopack.root`, Next infers the workspace root by
 * looking for a lockfile. A stray `package-lock.json` outside the repo makes it
 * pick a directory above this app, and the RSC bundler then writes its client
 * manifest under a root that does not match the one it reads back from. The
 * symptom is a dev server that resolves routes against a stale tree and fails
 * requests with "Could not find the module ... in the React Client Manifest",
 * which shows up as routes 404ing or 500ing after route files are added,
 * moved or deleted. Pinning the root to the repository keeps route resolution
 * and the manifest consistent.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  turbopack: {
    root: path.resolve(appDir, "..", ".."),
  },
};

export default nextConfig;
