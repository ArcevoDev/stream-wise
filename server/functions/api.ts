/**
 * Netlify Function wrapper for the Express app.
 *
 * Netlify cannot run a long-lived `app.listen()` process, so the Express
 * app is exposed as a serverless function. `serverless-http` adapts the
 * Lambda-style event Netlify provides into a Node http req/res pair that
 * Express understands.
 *
 * Imports the COMPILED app (`server/dist/src/app.js`, produced by
 * `pnpm --filter server build`). Netlify's esbuild bundler
 * (zip-it-and-ship-it) bundles this file plus the compiled Prisma client;
 * bare node_modules imports (express, cors, helmet, @prisma/*, pg, …) stay
 * external and are included in the function zip from the `server` workspace.
 */
import serverless from "serverless-http";
import type { Handler } from "@netlify/functions";

import app from "../dist/src/app.js";

export const handler: Handler = serverless(app) as Handler;
