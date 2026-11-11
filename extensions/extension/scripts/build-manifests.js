// Derives manifest.firefox.json from manifest.json (the Chrome manifest).
// Chrome MV3 requires background.service_worker; Firefox MV3 requires background.scripts.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const base = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

const firefox = {
  ...base,
  background: { scripts: [base.background.service_worker] },
  browser_specific_settings: {
    gecko: {
      id: 'support@geneplore.com',
      data_collection_permissions: { required: ['none'] },
    },
  },
};

fs.writeFileSync(
  path.join(root, 'manifest.firefox.json'),
  JSON.stringify(firefox, null, 2) + '\n'
);
console.log('wrote manifest.firefox.json');
