// Fast scan of the project's pnpm virtual store (node_modules/.pnpm) for
// zeroed/corrupt files. Reads only the first 2048 bytes of each .js/.cjs/.mjs/
// .json/.ts/.d.ts file. Corrupted files are entirely zero, so a nonzero byte in
// the head proves health.
// Usage: node .agent/scan-vstore.cjs
const fs = require('fs');
const path = require('path');

const root = 'node_modules/.pnpm';
const EXTS = new Set(['.js', '.cjs', '.mjs', '.json', '.ts', '.d.ts', '.mts', '.cts', '.map']);

let checked = 0;
let corrupt = 0;
const bad = [];

function walk(d) {
  let entries;
  try { entries = fs.readdirSync(d); } catch (e) { return; }
  for (const e of entries) {
    const p = path.join(d, e);
    let st;
    try { st = fs.statSync(p); } catch (err) { continue; }
    if (st.isDirectory()) { walk(p); continue; }
    if (!EXTS.has(path.extname(e).toLowerCase())) continue;
    if (st.size === 0) continue;
    checked++;
    let b;
    try {
      b = fs.readFileSync(p);
      b = b.subarray(0, 2048);
    } catch (err) {
      corrupt++;
      bad.push(p + ' [UNREADABLE]');
      continue;
    }
    let nz = 0;
    for (const x of b) if (x !== 0) nz++;
    if (nz === 0) {
      corrupt++;
      bad.push(p + ' [' + st.size + 'b]');
    }
  }
}

walk(root);
console.log('files checked: ' + checked);
console.log('corrupt: ' + corrupt);
for (const p of bad) console.log('  ' + p);
