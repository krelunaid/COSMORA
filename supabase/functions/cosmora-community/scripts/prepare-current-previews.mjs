import { readFile, writeFile, mkdir, chmod, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { sanitizePhotoBytes } from '../src/lib/photo-privacy.ts';

const base = resolve('outputs/community-photo-optimization/current');
await mkdir(base, { recursive: true, mode: 0o700 });
await chmod(base, 0o700);
const feedUrl = 'https://pwdpwgonvnuwmgfiidut.supabase.co/functions/v1/cosmora-community/api/community/posts';
const feed = await fetch(feedUrl);
if (!feed.ok) throw new Error('Feed unavailable');
const { posts, hasMore } = await feed.json();
if (hasMore) throw new Error('Feed pagination needed before processing');
const manifest = [];
for (const post of posts) for (const media of post.media ?? []) {
  if (media.type !== 'IMAGE') continue;
  const url = new URL(media.url);
  if (url.hostname !== 'pwdpwgonvnuwmgfiidut.supabase.co') throw new Error('Unexpected image host');
  const marker = '/community-media/';
  if (!url.pathname.includes(marker)) throw new Error('Unexpected image path');
  const originalPath = decodeURIComponent(url.pathname.split(marker)[1]);
  if (originalPath.split('/').length !== 3) throw new Error('Unexpected storage path');
  const filename = createHash('sha256').update(originalPath).digest('hex');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not fetch image');
  const original = new Uint8Array(await response.arrayBuffer());
  if (original.length > 25_000_000) throw new Error('Image exceeds processing limit');
  const input = join(base, filename + '.original');
  const out = join(base, filename + '.jpg');
  await writeFile(input, original, { mode: 0o600 });
  const proc = spawnSync('sips', ['--resampleHeightWidthMax','800','-s','format','jpeg','-s','formatOptions','76',input,'--out',out], { encoding:'utf8' });
  if (proc.status !== 0) throw new Error('Could not resize image');
  const clean = sanitizePhotoBytes(new Uint8Array(await readFile(out)), 'image/jpeg');
  await writeFile(out, clean, { mode: 0o600 });
  manifest.push({post_id:post.id, original_path:originalPath, original_sha256:createHash('sha256').update(original).digest('hex'), original_bytes:original.length, thumbnail_file:filename+'.jpg', thumbnail_bytes:(await stat(out)).size});
}
await writeFile(join(base,'manifest-private.json'),JSON.stringify(manifest,null,2),{mode:0o600});
console.log(JSON.stringify({images:manifest.length,original_bytes:manifest.reduce((a,x)=>a+x.original_bytes,0),thumbnail_bytes:manifest.reduce((a,x)=>a+x.thumbnail_bytes,0)}));
