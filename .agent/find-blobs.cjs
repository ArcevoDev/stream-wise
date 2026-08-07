const fs = require('fs');
const { execSync } = require('child_process');

const targets = [
  'node_modules/.pnpm/fast-equals@5.4.1/node_modules/fast-equals/package.json',
  'node_modules/.pnpm/react-smooth@4.0.4_react-do_85fe15a51de9139abca1e86c7db4f89a/node_modules/fast-equals/package.json',
  'node_modules/.pnpm/react-smooth@4.0.4_react-do_85fe15a51de9139abca1e86c7db4f89a/node_modules/react-transition-group/package.json',
  'node_modules/.pnpm/react-transition-group@4.4._c8c71776d32028e3f61da5b0688040c1/node_modules/react-transition-group/package.json',
];

for (const t of targets) {
  console.log('=== ' + t);
  try {
    const out = execSync('fsutil hardlink list "' + t + '"', { encoding: 'utf8' });
    const lines = out.split(/\r?\n/).filter((l) => l.trim());
    for (const l of lines) {
      const full = l.startsWith('\\') ? l.replace(/^\\\\[^\\]+\\/, '') : l;
      console.log('  ' + full);
    }
  } catch (e) {
    console.log('  fsutil error: ' + e.message);
  }
}
