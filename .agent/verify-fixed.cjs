const fs = require('fs');

const targets = [
  'node_modules/.pnpm/fast-equals@5.4.1/node_modules/fast-equals/package.json',
  'node_modules/.pnpm/react-smooth@4.0.4_react-do_85fe15a51de9139abca1e86c7db4f89a/node_modules/fast-equals/package.json',
  'node_modules/.pnpm/react-smooth@4.0.4_react-do_85fe15a51de9139abca1e86c7db4f89a/node_modules/react-transition-group/package.json',
  'node_modules/.pnpm/react-transition-group@4.4._c8c71776d32028e3f61da5b0688040c1/node_modules/react-transition-group/package.json',
];

for (const p of targets) {
  try {
    const b = fs.readFileSync(p);
    const hasNull = b.includes(0);
    let validJson = false;
    if (!hasNull) {
      try { JSON.parse(b.toString()); validJson = true; } catch (e) {}
    }
    console.log(
      (hasNull ? 'NULLBYTES' : validJson ? 'CLEAN' : 'BADJSON') +
      '  ' + p + '  (' + b.length + 'b)'
    );
  } catch (e) {
    console.log('MISSING  ' + p + '  ' + e.code);
  }
}
