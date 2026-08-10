// Load the nft-bundled function the way the Netlify runtime does:
// require the zip's root entry and see what Node actually complains about.
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const zipPath = join(process.cwd(), ".netlify/functions-repro/api.zip");
const dest = join(tmpdir(), "zisi-load-test");
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
execSync(`tar -xf "${zipPath}" -C "${dest}"`, { stdio: "pipe" });

const entry = join(dest, "api.js");
console.log("entry exists:", existsSync(entry));
console.log("--- attempting require(entry) ---");
try {
  const fn = require(entry);
  console.log("LOADED OK. exports keys:", Object.keys(fn));
  if (typeof fn.handler === "function") {
    console.log("handler is a function ✓");
  } else {
    console.log("NO handler property on exports:", fn);
  }
} catch (err) {
  console.log("LOAD FAILED:");
  console.log(err && err.stack ? err.stack : String(err));
}
