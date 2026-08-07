const fs = require('fs');
const path = require('path');

const root = process.cwd();
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.prisma', '.md', '.txt', '.env', '.html', '.css'];
const IGNORE = new Set(['node_modules', '.git', '.pnpm', 'dist', 'generated', 'tsbuildinfo']);

let scanned = 0;
let zeroByte = [];
let nullByte = [];
let unreadable = [];
let huge = [];

function walk(d) {
  let entries;
  try {
    entries = fs.readdirSync(d, { withFileTypes: true });
  } catch (e) {
    unreadable.push(d + ' [UNREADABLE DIR]');
    return;
  }
  for (const e of entries) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (IGNORE.has(e.name)) continue;
      walk(p);
      continue;
    }
    const ext = path.extname(e.name).toLowerCase();
    if (!EXTS.includes(ext)) continue;
    scanned++;
    let st;
    try {
      st = fs.statSync(p);
    } catch (err) {
      unreadable.push(p + ' [BROKEN ENTRY]');
      continue;
    }
    if (st.size === 0) { zeroByte.push(p); continue; }
    if (st.size > 10 * 1024 * 1024) { huge.push(p + ' [' + st.size + 'b]'); continue; }
    let b;
    try {
      b = fs.readFileSync(p);
    } catch (err) {
      unreadable.push(p + ' [UNREADABLE]');
      continue;
    }
    if (b.includes(0)) nullByte.push(p + ' [' + st.size + 'b]');
  }
}

walk(root);

console.log('scanned: ' + scanned);
console.log('zero-byte: ' + zeroByte.length);
for (const z of zeroByte) console.log('  ZERO  ' + z);
console.log('null-byte: ' + nullByte.length);
for (const n of nullByte) console.log('  NULL  ' + n);
console.log('unreadable: ' + unreadable.length);
for (const u of unreadable.slice(0, 20)) console.log('  ' + u);
console.log('huge (>10MB): ' + huge.length);
for (const h of huge.slice(0, 20)) console.log('  ' + h);
