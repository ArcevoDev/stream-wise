// Sync every file in node_modules date-fns from the clean tarball extract,
// then verify no null bytes remain. Run with: node .agent/sync-date-fns.cjs
const fs = require('fs');
const path = require('path');

const SCRATCH = process.env.COMMANDCODE_SCRATCHPAD || 'C:/Users/HP/AppData/Local/Temp/commandcode/C--Users-HP-Desktop-ArcevoDev-stream-wise/e271612c-941b-435e-8d9b-bbe503a1e28f/scratchpad';
const SRC = path.join(SCRATCH, 'date-fns-full', 'package');
const DST = path.resolve('node_modules/.pnpm/date-fns@2.30.0/node_modules/date-fns');

let synced = 0;
let missing = 0;
const missingList = [];

function walk(srcDir, rel) {
  for (const e of fs.readdirSync(srcDir)) {
    const sp = path.join(srcDir, e);
    const rp = rel ? rel + '/' + e : e;
    const dp = path.join(DST, rp);
    const st = fs.statSync(sp);
    if (st.isDirectory()) {
      walk(sp, rp);
    } else {
      // Only overwrite .js/.json/.flow/.map/.ts files that exist in dest.
      // Don't create new files (dest may intentionally differ).
      if (fs.existsSync(dp)) {
        const b = fs.readFileSync(sp);
        fs.writeFileSync(dp, b);
        synced++;
      } else {
        missing++;
        if (missingList.length < 10) missingList.push(rp);
      }
    }
  }
}

walk(SRC, '');

console.log('synced ' + synced + ' files from clean extract');
console.log('dest-only files (not in tarball): ' + missing);
for (const m of missingList) console.log('  missing-src: ' + m);

// Verify: scan dest for null bytes.
let checked = 0;
const bad = [];
function check(d) {
  for (const e of fs.readdirSync(d)) {
    const p = path.join(d, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) { check(p); continue; }
    if (st.size === 0) { bad.push(p + ' [EMPTY]'); continue; }
    checked++;
    const b = fs.readFileSync(p);
    if (b.includes(0)) bad.push(p + ' [' + b.length + 'b]');
  }
}
check(DST);
console.log('verify checked ' + checked + ' files');
console.log('verify corrupt: ' + bad.length);
for (const b of bad.slice(0, 50)) console.log('  ' + b);
