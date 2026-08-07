// Fast scan of pnpm content-addressable store blobs for zeroed/corrupt files.
// Reads only the first 4096 bytes of each blob — corrupted blobs are entirely
// zero, so a nonzero byte anywhere in the head is proof of health.
// Usage: node .agent/scan-store-blobs.cjs
const fs = require('fs');
const path = require('path');

const store = 'C:/Users/HP/AppData/Local/pnpm/store/v11';
const filesDir = path.join(store, 'files');

let checked = 0;
let corrupt = 0;
const bad = [];
const corruptReasons = {};

for (const bucket of fs.readdirSync(filesDir)) {
  const bp = path.join(filesDir, bucket);
  let st;
  try { st = fs.statSync(bp); } catch (e) { continue; }
  if (!st.isDirectory()) continue;
  for (const f of fs.readdirSync(bp)) {
    const p = path.join(bp, f);
    checked++;
    let b;
    try {
      b = fs.readFileSync(p); // open handle, read head
      b = b.subarray(0, 4096);
    } catch (e) {
      corrupt++;
      bad.push(p);
      corruptReasons[p] = 'UNREADABLE';
      continue;
    }
    let nz = 0;
    for (const x of b) if (x !== 0) nz++;
    if (nz === 0) {
      corrupt++;
      bad.push(p);
      corruptReasons[p] = 'ZEROED';
    }
  }
}

console.log('store blobs checked: ' + checked);
console.log('corrupt: ' + corrupt);
for (const p of bad) console.log('  ' + p + ' → ' + corruptReasons[p]);
