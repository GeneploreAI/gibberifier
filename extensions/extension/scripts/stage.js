// Assembles build/<target>/ as a loadable unpacked extension.
// Usage: node scripts/stage.js [chrome|firefox]
const fs = require('fs');
const path = require('path');

const target = process.argv[2] ?? 'chrome';
if (target !== 'chrome' && target !== 'firefox') {
  console.error(`unknown target "${target}" (expected chrome or firefox)`);
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const manifestSrc = target === 'firefox' ? 'manifest.firefox.json' : 'manifest.json';

if (!fs.existsSync(path.join(root, 'dist'))) {
  console.error('dist/ not found — run `npm run build` first');
  process.exit(1);
}
if (!fs.existsSync(path.join(root, manifestSrc))) {
  console.error(`${manifestSrc} not found — run \`npm run manifests\` first`);
  process.exit(1);
}

const outDir = path.join(root, 'build', target);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

fs.cpSync(path.join(root, 'dist'), path.join(outDir, 'dist'), { recursive: true });
fs.cpSync(path.join(root, 'icons'), path.join(outDir, 'icons'), { recursive: true });
fs.copyFileSync(path.join(root, manifestSrc), path.join(outDir, 'manifest.json'));

console.log(`staged build/${target}/ — load this folder as an unpacked extension`);
