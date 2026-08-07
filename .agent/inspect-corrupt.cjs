const fs = require('fs');

const targets = [
  'node_modules/.pnpm/zod@4.4.3/node_modules/zod/package.json',
  'node_modules/.pnpm/date-fns@2.30.0/node_modules/date-fns/package.json',
  'node_modules/.pnpm/fast-check@3.23.2/node_modules/fast-check/package.json',
];

for (const p of targets) {
  console.log('=== ' + p);
  try {
    const b = fs.readFileSync(p);
    console.log('  read OK, size=' + b.length + ', nullbyte=' + b.includes(0));
    console.log('  head: ' + JSON.stringify(b.slice(0, 80).toString().replace(/\u0000/g, '<NUL>')));
  } catch (e) {
    console.log('  read FAILED: ' + e.message);
    try {
      const st = fs.statSync(p);
      console.log('  stat OK: ' + st.size + ' bytes, mode=' + st.mode);
    } catch (e2) {
      console.log('  stat FAILED: ' + e2.message);
    }
  }
}
