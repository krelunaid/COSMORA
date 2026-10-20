import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const directory = resolve('dist/mobile');
const html = readFileSync(resolve(directory, 'index.html'), 'utf8');
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
if (!assets.some((asset) => asset.endsWith('.js'))) throw new Error('Missing mobile JavaScript entry.');
for (const asset of assets) {
  if (/^(?:https?:)?\/\//.test(asset) || !existsSync(resolve(directory, '.' + asset)))
    throw new Error('Mobile entry depends on a missing or remote asset: ' + asset);
}
let files = 0;
function inspect(path) {
  for (const item of readdirSync(path, { withFileTypes: true })) {
    const file = resolve(path, item.name);
    if (item.isDirectory()) { inspect(file); continue; }
    files++;
    if (!/\.(js|json|html|map)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    // Legacy Supabase service credentials may be JWTs rather than sb_secret_.
    for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
      let payload;
      try { payload = JSON.parse(Buffer.from(match[1], 'base64url').toString()); } catch { continue; }
      if (payload.role === 'service_role') throw new Error('Private Supabase credential in mobile build.');
    }
  }
}
inspect(directory);
console.log(`Mobile bundle verified: local index.html, ${assets.length} entry assets, ${files} bundled files; no private Supabase JWT.`);
