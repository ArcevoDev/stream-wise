// Reproduce Netlify's `esbuild` bundler with external_node_modules (the
// config from commit a497515 that the nft switch replaced). Verifies whether
// keeping @prisma/client external ships the ESM Prisma client unmodified so
// import.meta.url resolves at runtime.
import { build } from "../../node_modules/.pnpm/esbuild@0.25.5/node_modules/esbuild/lib/main.js";

const result = await build({
  entryPoints: ["server/functions/api.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: ["node22"],
  logLevel: "silent",
  write: false,
  external: ["@prisma/client", "@prisma/client-runtime-utils", "@prisma/adapter-pg"],
});

const out = result.outputFiles[0].text;
console.log("=== esbuild CJS bundle, @prisma/* external ===");
console.log("length:", out.length);
console.log("--- has import.meta.url:", /import\.meta\.url/.test(out));
console.log("--- has require('@prisma/client'):", /require\(["']@prisma\/client["']\)/.test(out));
console.log("--- has export const handler:", /export\s+const\s+handler/.test(out));
console.log("--- tail 300 ---");
console.log(out.slice(-300));
