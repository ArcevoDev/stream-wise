// Targeted load test for the fixed bundle's module-format chain.
// Copies the extracted entry + app into a temp dir and symlinks the server's
// real node_modules so the CJS require chain resolves. Proves the ESM deps
// were transpiled to CJS by the nft bundler (no "Unexpected token 'export'",
// no ERR_REQUIRE_ESM).
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { existsSync, rmSync, mkdirSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const cwd = process.cwd();
const dest = join(tmpdir(), "zisi-load-min");
const entry = join(dest, "api.js");

if (!existsSync(entry)) {
  console.error("Missing extracted entry — run the tar extraction first.");
  process.exit(1);
}

// Symlink node_modules into the extracted tree so require() resolves. On
// Windows, junction/ symlink creation needs privileges; copy instead.
const rootNm = join(dest, "node_modules");
const serverNm = join(dest, "server", "node_modules");
for (const [target, link] of [
  [join(cwd, "server", "node_modules"), serverNm],
  [join(cwd, "node_modules"), rootNm],
]) {
  if (existsSync(link)) continue;
  try {
    rmSync(link, { recursive: true, force: true });
  } catch {}
  console.log(`linking ${link} -> ${target}`);
  try {
    execSync(`cmd /c mklink /J "${link}" "${target}"`, { stdio: "pipe" });
  } catch (e) {
    // Fallback: plain copy (slow but reliable)
    console.log("junction failed, copying:", e.message);
    mkdirSync(dirname(link), { recursive: true });
    cpSync(target, link, { recursive: true });
  }
}

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
  process.exit(1);
}
