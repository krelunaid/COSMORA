import { readFileSync, readdirSync } from 'node:fs';
const hits = [];
function scan(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = directory + '/' + item.name;
    if (item.isDirectory()) scan(path);
    else if (
      /\.(js|json|html|map)$/.test(path) &&
      /(?:sb_secret_|sk_test_|sk_live_|rk_live_|whsec_)[A-Za-z0-9_-]{20,}/.test(
        readFileSync(path, 'utf8'),
      )
    )
      hits.push(path);
  }
}
scan('dist/client');
if (hits.length) {
  console.error(
    'Build blocked: secret-like credentials detected in client files:',
    hits,
  );
  process.exit(1);
}
console.log('Client credential scan passed.');
