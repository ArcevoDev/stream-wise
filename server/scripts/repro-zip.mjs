// Local repro: bundle server/functions/api.ts with zip-it-and-ship-it using
// the same nft bundler + config the Netlify deploy uses, then print the
// module format, main file path, and whether the bundled entry still has
// ESM `export` syntax.
//
// NOTE: @netlify/zip-it-and-ship-it is imported directly from the pnpm store
// (node_modules/.pnpm/...) because the earlier `pnpm add` timed out and
// rolled back, leaving the package unlinked but present in the store.
import { zipFunction } from "../../node_modules/.pnpm/@netlify+zip-it-and-ship-it@12.2.1_rollup@4.62.4/node_modules/@netlify/zip-it-and-ship-it/dist/main.js";

const result = await zipFunction("server/functions/api.ts", ".netlify/functions-repro", {
  basePath: process.cwd(),
  config: { nodeBundler: "nft" },
  debug: true,
});

console.log("\n--- FUNCTION RESULT ---");
console.log(JSON.stringify(
  {
    name: result?.name,
    mainFile: result?.mainFile,
    moduleFormat: result?.moduleFormat,
    runtime: result?.runtime,
    extension: result?.extension,
  },
  null,
  2
));
