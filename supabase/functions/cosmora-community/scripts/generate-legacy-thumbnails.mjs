// Creates local previews only. It never changes the remote bucket or database.
// Run with: node --experimental-strip-types scripts/generate-legacy-thumbnails.mjs
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { sanitizePhotoBytes } from '../src/lib/photo-privacy.ts';

const base = resolve('outputs/community-photo-optimization');
const manifest = JSON.parse(await readFile(join(base, 'manifest-private.json'), 'utf8'));
const dest = join(base, 'thumbnails');
await mkdir(dest, { recursive: true, mode: 0o700 });
await chmod(dest, 0o700);
let total = 0;
for (const item of manifest) {
  if (!/^[a-f0-9]{64}\.jpg$/.test(item.candidate_file)) throw new Error('Invalid candidate filename');
  const input = join(base, item.candidate_file);
  const output = join(dest, item.candidate_file);
  const proc = spawnSync('sips', ['--resampleHeightWidthMax', '800', '-s', 'format', 'jpeg', '-s', 'formatOptions', '76', input, '--out', output], {encoding:'utf8'});
  if (proc.status !== 0) throw new Error('Could not create preview');
  const sanitized = sanitizePhotoBytes(new Uint8Array(await readFile(output)), 'image/jpeg');
  await writeFile(output, sanitized, { mode: 0o600 });
  await chmod(output, 0o600);
  item.thumbnail_file = item.candidate_file;
  item.thumbnail_bytes = sanitized.byteLength;
  total += sanitized.byteLength;
}
await writeFile(join(dest, 'manifest-private.json'), JSON.stringify(manifest, null, 2), {mode: 0o600});
console.log(`Prepared ${manifest.length} local previews: ${total} bytes total. No remote files changed.`);
