// Quick diagnostic: what module format does zip-it-and-ship-it detect for
// server/functions/api.ts? Mirrors the deployed Netlify config.
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const zipIt = "C:/Users/HP/AppData/Local/pnpm/global/v11/3e28-19fe96a617a/node_modules/.pnpm/node_modules/@netlify/zip-it-and-ship-it/dist";

const { getClosestPackageJson } = await import(
  pathToFileURL(join(zipIt, "runtimes/node/utils/package_json.js")).href
);
const { MODULE_FORMAT } = await import(
  pathToFileURL(join(zipIt, "runtimes/node/utils/module_format.js")).href
);

const repoRoot = "C:/Users/HP/Desktop/ArcevoDev/stream-wise";
const mainFile = join(repoRoot, "server/functions/api.ts");

const pkg = await getClosestPackageJson(join(repoRoot, "server/functions"), repoRoot);
console.log("closest package.json:", pkg?.path ?? null);
console.log("type field:", pkg?.contents?.type ?? "N/A");
console.log("=> format:", pkg?.contents?.type === "module" ? MODULE_FORMAT.ESM : MODULE_FORMAT.COMMONJS);
