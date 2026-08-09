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
}

main();