// Loads environment variables before any API module (and therefore Prisma) is
// evaluated. Worker-local `.env` wins; the API's `.env` is used as a fallback.
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

loadEnv({ path: resolve(here, "../.env") });
loadEnv({ path: resolve(here, "../../api/.env") });
