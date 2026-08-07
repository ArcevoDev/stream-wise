const fs = require('fs');
const path = require('path');

const store = 'node_modules/.pnpm';
let total = 0;
const corrupt = [];

function checkFile(p) {
  total++;
  let b;
  try {
    b = fs.readFileSync(p);
  } catch (e) {
    corrupt.push(p + ' [UNREADABLE]');
    return;
  }
  if (b.includes(0)) corrupt.push(p + ' [' + b.length + 'b]');
}

for (const d of fs.readdirSync(store)) {
  const nm = path.join(store, d, 'node_modules');
  if (!fs.existsSync(nm)) continue;
  let entries;
  try {
    entries = fs.readdirSync(nm);
  } catch (e) {
    corrupt.push(nm + ' [UNREADABLE DIR]');
    continue;
  }
  for (const e of entries) {
    const p = path.join(nm, e);
    let st;
    try {
      st = fs.statSync(p);
    } catch (err) {
      corrupt.push(p + ' [BROKEN ENTRY]');
      continue;
    }
    if (!st.isDirectory()) continue;
    if (e.startsWith('@')) {
      let scope;
      try {
        scope = fs.readdirSync(p);
      } catch (err) {
        corrupt.push(p + ' [BROKEN SCOPE]');
        continue;
      }
      for (const s of scope) {
        const sp = path.join(p, s);
        if (!fs.statSync(sp).isDirectory()) continue;
        checkFile(path.join(sp, 'package.json'));
        // entry points referenced by main/module/exports
        try {
          const pj = JSON.parse(fs.readFileSync(path.join(sp, 'package.json'), 'utf8'));
          for (const key of ['main', 'module', 'unpkg', 'jsdelivr', 'types']) {
            const v = pj[key];
            if (typeof v === 'string' && v.endsWith('.js') || (typeof v === 'string' && v.endsWith('.cjs'))) {
              const fp = path.join(sp, v);
              if (fs.existsSync(fp)) checkFile(fp);
            }
          }
        } catch (e) { /* package.json corrupt — already reported */ }
      }
    } else {
      checkFile(path.join(p, 'package.json'));
      try {
        const pj = JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8'));
        for (const key of ['main', 'module', 'unpkg', 'jsdelivr', 'types']) {
          const v = pj[key];
          if (typeof v === 'string' && (v.endsWith('.js') || v.endsWith('.cjs'))) {
            const fp = path.join(p, v);
            if (fs.existsSync(fp)) checkFile(fp);
          }
        }
      } catch (e) { /* already reported */ }
    }
  }
}

console.log('checked: ' + total + ' files');
console.log('corrupt: ' + corrupt.length);
for (const c of corrupt) console.log('  ' + c);
