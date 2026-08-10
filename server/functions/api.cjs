/**
 * Netlify Function wrapper for the Express app (CommonJS entry).
 *
 * Netlify cannot run a long-lived `app.listen()` process, so the Express
 * app is exposed as a serverless function. `serverless-http` adapts the
 * Lambda-style event Netlify provides into a Node http req/res pair that
 * Express understands.
 *
 * WHY .cjs: Netlify's nft bundler emits CommonJS output, and top-level
 * `await import()` is illegal in CJS. This entry is therefore explicitly
 * CommonJS (.cjs), and the ESM app (dist/src/app.js) is loaded with a
 * dynamic `import()` INSIDE the handler, where await is legal.
 * The server workspace is `"type": "module"` and the compiled app is ESM,
 * so a synchronous `require()` would crash with "Cannot require() ES
 * Module in a cycle" — dynamic import is the correct bridge.
 *
 * ENV: `netlify dev` runs functions with the CWD at the repo root, not
 * `server/`, so the app's `import "dotenv/config"` would look for `.env` in
 * the wrong directory and DATABASE_URL would be missing. Load `server/.env`
 * explicitly (absolute path from this file's location) BEFORE the app is
 * imported. The app is loaded lazily on first invocation, after the env
 * file is in place.
 */
const { resolve } = require("node:path");
const { config: loadEnv } = require("dotenv");

// `.cjs` is CommonJS, so __dirname is a plain filesystem path (no
// fileURLToPath needed, unlike the old ESM .mjs wrapper).
const HERE = __dirname;
// Pre-seed process.env with the server's .env (repo-root CWD safety).
loadEnv({ path: resolve(HERE, "../.env") });

let handlerPromise;

exports.handler = async function handler(event, context) {
  if (!handlerPromise) {
    const serverless = (await import("serverless-http")).default;
    const { default: app } = await import("../dist/src/app.js");
    handlerPromise = serverless(app);
  }
  return handlerPromise(event, context);
};
