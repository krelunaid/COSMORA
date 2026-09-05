import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
const values = { ...process.env };
for (const path of [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
]) {
  if (existsSync(path))
    Object.assign(values, parseEnv(readFileSync(path, 'utf8')));
}
const forbidden = Object.entries(values).filter(
  ([key, value]) =>
    key.startsWith('NEXT_PUBLIC_') &&
    /^(sb_secret_|sk_test_|sk_live_|rk_live_|whsec_)/.test(value ?? ''),
);
if (forbidden.length) {
  console.error(
    'Build blocked: private credentials in public variables:',
    forbidden.map(([key]) => key).join(', '),
  );
  process.exit(1);
}
console.log('Public environment guard passed.');
