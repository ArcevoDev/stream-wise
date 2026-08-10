// Reproduce the esbuild bundler path (what Netlify's `esbuild` bundler does
// for our ESM entry). The deployed crash (Unexpected token 'export' in a CJS
// context) matches esbuild bundling ESM source into CJS without rewriting the
// entry's `export`. This script uses the same esbuild version + target the
// deployed bundler uses, and prints what the bundled entry looks like.
import { build } from "../../node_modules/.pnpm/esbuild@0.25.5/node_modules/esbuild/lib/main.js";

const target = "node22"; // approx of getBundlerTarget(NODE_VERSION=22)

const result = await build({
  entryPoints: ["server/functions/api.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: [target],
  logLevel: "silent",
  write: false,
  external: [],
});

const out = result.outputFiles[0].text;
console.log("=== esbuild CJS bundle of api.ts ===");
console.log("length:", out.length);
console.log("--- first 200 ---");
console.log(out.slice(0, 200));
console.log("--- last 200 ---");
console.log(out.slice(-200));
console.log("--- has 'export const handler':", /export\s+const\s+handler/.test(out));
