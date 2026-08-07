const fs = require('fs');

const targets = [
  'node_modules/.pnpm/fast-equals@5.4.1/node_modules/fast-equals',
  'node_modules/.pnpm/react-smooth@4.0.4_react-do_85fe15a51de9139abca1e86c7db4f89a/node_modules/fast-equals',
  'node_modules/.pnpm/react-smooth@4.0.4_react-do_85fe15a51de9139abca1e86c7db4f89a/node_modules/react-transition-group',
  'node_modules/.pnpm/react-transition-group@4.4._c8c71776d32028e3f61da5b0688040c1/node_modules/react-transition-group',
];

for (const base of targets) {
  console.log('=== ' + base);
  if (!fs.existsSync(base)) {
    console.log(' MISSING');
    continue;
  }
  const walk = (d) => {
    for (const e of fs.readdirSync(d)) {
      const p = d + '/' + e;
      let st;
      try { st = fs.statSync(p); } catch (err) { console.log(' BROKEN ' + p); continue; }
      if (st.isDirectory()) walk(p);
      else {
        const b = fs.readFileSync(p);
        if (b.includes(0)) console.log(' NULLBYTES ' + p + ' (' + b.length + 'b)');
      }
    }
  };
  walk(base);
}
console.log('DONE');
