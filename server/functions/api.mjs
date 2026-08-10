/**
 * Netlify Function wrapper for the Express app.
 *
 * Netlify cannot run a long-lived `app.listen()` process, so the Express
 * app is exposed as a serverless function. `serverless-http` adapts the
 * Lambda-style event Netlify provides into a Node http req/res pair that
 * Express understands.
 *
 * Imports the COMPILED app (`server/dist/src/app.js`, produced by
 * `pnpm --filter server build`).
 *
 * IMPORTANT: this entry is deliberately plain ESM (import/export, .mjs
 * extension). The server workspace is `"type": "module"` and the compiled
 * app (`dist/src/app.js`) is ESM, so a CommonJS wrapper (require) fails with
 * "Cannot require() ES Module ... in a cycle" — Node refuses to synchronously
 * require an ESM graph from a CJS file that Node itself loads as ESM.
 * The .mjs extension is unambiguous ESM regardless of any package.json
 * `type` field, so it loads identically in `netlify dev` (lambda-local) and
 * the deployed nft bundle.
 *
 * ENV: `netlify dev` runs functions with the CWD at the repo root, not
 * `server/`, so the app's `import "dotenv/config"` would look for `.env` in
 * the wrong directory and DATABASE_URL would be missing. Load `server/.env`
 * explicitly (absolute path from this file's location) BEFORE the app is
 * imported. Static imports hoist, so the app must be loaded with a dynamic
 * `import()` after the env file is in place.
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadEnv } from "dotenv";

const HERE = dirname(fileURLToPath(import.meta.url));
// Pre-seed process.env with the server's .env (repo-root CWD safety).
loadEnv({ path: resolve(HERE, "../.env") });

const serverless = (await import("serverless-http")).default;
const { default: app } = await import("../dist/src/app.js");

export const handler = serverless(app);
