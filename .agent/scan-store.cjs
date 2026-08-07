// One-off integrity scan of the pnpm virtual store.
// Usage: node .agent/scan-store.js [--fix]
const fs = require('fs');
const path = require('path');

const store = 'node_modules/.pnpm';
let total = 0;
const corrupt = [];

function checkPkg(pj) {
  total++;
  try {
    const raw = fs.readFileSync(pj, 'utf8');
    if (raw.includes('\u0000')) {
      corrupt.push({ file: pj, reason: 'NULL BYTE' });
    } else {
      JSON.parse(raw);
    }
  } catch (e) {
    corrupt.push({ file: pj, reason: e.message.split('\n')[0] });
  }
}

if (!fs.existsSync(store)) {
  console.error('No store at ' + store);
  process.exit(1);
}

for (const d of fs.readdirSync(store)) {
  const nm = path.join(store, d, 'node_modules');
  if (!fs.existsSync(nm)) continue;
  let entries;
  try {
    entries = fs.readdirSync(nm);
  } catch (e) {
    corrupt.push({ file: nm, reason: 'UNREADABLE DIR: ' + e.message.split('\n')[0] });
    continue;
  }
  for (const e of entries) {
    const p = path.join(nm, e);
    let st;
    try { st = fs.statSync(p); } catch (err) {
      corrupt.push({ file: p, reason: 'BROKEN ENTRY: ' + err.message.split('\n')[0] });
      continue;
    }
    if (!st.isDirectory()) continue;
    if (e.startsWith('@')) {
      let scopeEntries;
      try { scopeEntries = fs.readdirSync(p); } catch (err) {
        corrupt.push({ file: p, reason: 'BROKEN SCOPE: ' + err.message.split('\n')[0] });
        continue;
      }
      for (const s of scopeEntries) {
        const sp = path.join(p, s);
        if (fs.statSync(sp).isDirectory()) checkPkg(path.join(sp, 'package.json'));
      }
    } else {
      checkPkg(path.join(p, 'package.json'));
    }
  }
}

console.log('checked: ' + total + ' packages');
console.log('corrupt: ' + corrupt.length);
for (const c of corrupt) console.log('  ' + c.file + ' → ' + c.reason);
