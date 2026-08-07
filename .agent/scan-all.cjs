const fs = require('fs');
const path = require('path');

const store = 'node_modules/.pnpm';
const EXTS = ['.js', '.cjs', '.mjs', '.json', '.ts', '.d.ts', '.map', '.mts', '.cts'];

let files = 0;
let corrupt = [];
let brokenEntries = [];

function walk(d) {
  let entries;
  try {
    entries = fs.readdirSync(d);
  } catch (e) {
    brokenEntries.push(d);
    return;
  }
  for (const e of entries) {
    const p = path.join(d, e);
    let st;
    try {
      st = fs.statSync(p);
    } catch (err) {
      brokenEntries.push(p);
      continue;
    }
    if (st.isDirectory()) {
      walk(p);
      continue;
    }
    const ext = path.extname(e).toLowerCase();
    if (!EXTS.includes(ext)) continue;
    if (st.size === 0) continue;
    files++;
    let b;
    try {
      b = fs.readFileSync(p);
    } catch (err) {
      corrupt.push(p + ' [UNREADABLE]');
      continue;
    }
    if (b.includes(0)) corrupt.push(p + ' [' + b.length + 'b]');
  }
}

walk(store);

console.log('files scanned: ' + files);
console.log('corrupt: ' + corrupt.length);
for (const c of corrupt) console.log('  ' + c);
console.log('unreadable dirs/entries: ' + brokenEntries.length);
for (const b of brokenEntries.slice(0, 20)) console.log('  ' + b);
