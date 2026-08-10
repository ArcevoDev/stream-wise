// ============================================================================
// fix-prisma-imports.js
// ----------------------------------------------------------------------------
// PROBLEM
// Prisma 7's TypeScript generator emits relative imports with explicit ".ts"
// extensions inside prisma/generated/*.ts, e.g.:
//
//   import * as $Class from "./internal/class.ts"
//   import * as $Enums from "./enums.ts"
//
// This is valid TypeScript-source-to-source (bundlers / tsx resolve it fine),
// but when compiled by `tsc` to plain ESM JavaScript, tsc does NOT rewrite
// the ".ts" extension to ".js" inside string literals: it only compiles the
// containing file. `tsc-alias` also does not touch these because they are
// genuine relative paths, not `@/` path-alias imports; tsc-alias's whole job
// is alias rewriting, not extension rewriting.
//
// The result: Node's native ESM loader tries to resolve the literal path
// "dist/prisma/generated/internal/class.ts" at runtime, which does not
// exist (the compiled artifact is class.js), and throws ERR_MODULE_NOT_FOUND.
//
// FIX
// After tsc + tsc-alias have run, walk the compiled `dist/prisma/generated`
// directory and rewrite any `from "./xxx.ts"` (or `from "../xxx.ts"`) import/
// export specifiers to `from "./xxx.js"` so Node's ESM resolver finds the
// real compiled files.
//
// This only touches the generated Prisma output folder: it intentionally
// does not touch dist/src, since tsc-alias already handles `@/` aliases
// correctly there and source files don't use raw ".ts" relative imports.
// ============================================================================

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const TARGET_DIR = "dist/prisma/generated";

// Matches: from "./something.ts"  /  from '../something.ts'
// Also matches export-from forms: export * from "./enums.ts"
// Captures the leading quote char and the path up to (but excluding) ".ts"
// so the trailing ".ts" can be swapped for ".js" while preserving everything else.
const TS_IMPORT_RE = /((?:from|import)\s+['"])(\.\.?\/[^'"]+)\.ts(['"])/g;

// ============================================================================
// FIX (Bug): Netlify nft bundler inlines prisma/generated/client.js into a
// CJS bundle where the ESM-only `import.meta.url` becomes `undefined`, and
// the function crashes at load time ("path argument must be of type string").
// Rewrite the top-level `__dirname` derivation to fall back to the Node CJS
// `__dirname` when `import.meta.url` is unavailable. Idempotent: skips files
// that no longer contain the problematic expression.
// ============================================================================
const META_URL_IMPORT_RE = /import \* as path from 'node:path';\nimport \{ fileURLToPath \} from 'node:url';\n/;
const META_URL_LINE_RE = /globalThis\['__dirname'\] = path\.dirname\(fileURLToPath\(import\.meta\.url\)\);\n?/;

function rewriteClientDirname(filePath) {
  const original = readFileSync(filePath, "utf8");
  if (!META_URL_LINE_RE.test(original)) {
    return false; // already patched (or not a generated client entry)
  }

  let rewritten = original;
  if (META_URL_IMPORT_RE.test(rewritten)) {
    rewritten = rewritten.replace(
      META_URL_IMPORT_RE,
      "import * as path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nimport * as nodeProcess from 'node:process';\n"
    );
  }
  rewritten = rewritten.replace(
    META_URL_LINE_RE,
    "// FIX (Bug): Netlify's nft bundler inlines this client into a CJS bundle,\n" +
      "// where the ESM-only import.meta.url becomes undefined and the function\n" +
      "// crashes at load time. Use the CJS __dirname when available, else derive\n" +
      "// the client dir from import.meta.url (real ESM runtime).\n" +
      "globalThis['__dirname'] = typeof nodeProcess['env'] !== 'undefined' && typeof __dirname !== 'undefined'\n" +
      "  ? __dirname\n" +
      "  : path.dirname(fileURLToPath(import.meta.url));\n"
  );

  if (rewritten !== original) {
    writeFileSync(filePath, rewritten, "utf8");
    return true;
  }
  return false;
}

function rewriteFile(filePath) {
  const original = readFileSync(filePath, "utf8");
  const rewritten = original.replace(TS_IMPORT_RE, (_match, prefix, importPath, suffix) => {
    return `${prefix}${importPath}.js${suffix}`;
  });

  if (rewritten !== original) {
    writeFileSync(filePath, rewritten, "utf8");
    return true;
  }
  return false;
}

function walk(dir, stats) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, stats);
    } else if (fullPath.endsWith(".js")) {
      stats.scanned += 1;
      if (fullPath.endsWith("client.js") && rewriteClientDirname(fullPath)) {
        stats.rewritten += 1;
        stats.files.push(fullPath);
      }
      if (rewriteFile(fullPath)) {
        stats.rewritten += 1;
        stats.files.push(fullPath);
      }
    }
  }
}

function main() {
  if (!existsSync(TARGET_DIR)) {
    console.error(
      `[fix-prisma-imports] ERROR: "${TARGET_DIR}" does not exist. ` +
        `Did "tsc -p tsconfig.json" run successfully before this script? Aborting.`
    );
    process.exit(1);
  }

  const stats = { scanned: 0, rewritten: 0, files: [] };
  walk(TARGET_DIR, stats);

  console.log(
    `[fix-prisma-imports] Scanned ${stats.scanned} compiled file(s) in ${TARGET_DIR}, ` +
      `rewrote .ts → .js import specifiers in ${stats.rewritten} file(s).`
  );

  if (stats.rewritten > 0) {
    for (const f of stats.files) {
      console.log(`  ✔ ${f}`);
    }
  } else {
    console.warn(
      `[fix-prisma-imports] WARNING: No files were rewritten. ` +
        `This is unexpected if the Prisma generator still emits ".ts" relative ` +
        `imports: verify prisma/generated/client.ts in source still contains ` +
        `lines like: import * as $Class from "./internal/class.ts"`
    );
  }

  // FIX (Bug): confirm the client __dirname patch is in place after any
  // rewrite, so the Netlify nft bundle never ships an undefined import.meta.url.
  const patched = readFileSync(join(TARGET_DIR, "client.js"), "utf8");
  if (!patched.includes("typeof __dirname !== 'undefined'")) {
    console.error(
      `[fix-prisma-imports] FATAL: ${TARGET_DIR}/client.js was not patched for the ` +
        `import.meta.url crash. The Netlify function will fail to load.`
    );
    process.exit(1);
  }
  console.log(`[fix-prisma-imports] client.js __dirname patch verified ✓`);
}

main();