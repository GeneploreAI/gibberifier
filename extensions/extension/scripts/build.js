// Assembles dist/ from src/ plus the gibberify core shared with the website.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const core = path.resolve(root, '..', '..', 'site', 'js', 'gibberify-core.js');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

fs.cpSync(path.join(root, 'src'), dist, { recursive: true });
fs.copyFileSync(core, path.join(dist, 'gibberify-core.js'));

console.log(`built dist/ (${fs.readdirSync(dist).join(', ')})`);
