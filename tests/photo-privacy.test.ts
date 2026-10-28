import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import * as privacy from '../lib/photo-privacy.ts';
import * as media from '../lib/community-media.ts';

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/photo-privacy/${name}`, import.meta.url)));
const types = [['metadata.jpg', 'image/jpeg'], ['metadata.png', 'image/png'], ['metadata.webp', 'image/webp'], ['animated.webp', 'image/webp']];

for (const [name, type] of types) {
  void test(`${name}: removes private metadata and is idempotent`, () => {
    const original = fixture(name), clean = privacy.sanitizePhotoBytes(original, type);
    assert.ok(Buffer.from(original).includes(Buffer.from('PRIVATE_')));
    assert.ok(!Buffer.from(clean).includes(Buffer.from('PRIVATE_')));
    assert.ok(clean.length < original.length);
    assert.deepEqual(privacy.sanitizePhotoBytes(clean, type), clean);
    // Retain the exact ICC profile bytes, not merely its chunk name.
    if (type === 'image/png') {
      const chunkType = Buffer.from(original).indexOf('iCCP');
      const size = new DataView(original.buffer).getUint32(chunkType - 4);
      assert.ok(Buffer.from(clean).includes(Buffer.from(original.subarray(chunkType, chunkType + 4 + size))));
    } else {
      const acsp = Buffer.from(original).indexOf('acsp');
      assert.ok(acsp > 36);
      const profileStart = acsp - 36;
      const size = new DataView(original.buffer).getUint32(profileStart);
      assert.ok(Buffer.from(clean).includes(Buffer.from(original.subarray(profileStart, profileStart + size))));
    }
  });

  void test(`${name}: rejects every truncated suffix and appended data`, () => {
    const original = fixture(name);
    for (let length = 0; length < original.length; length++) {
      assert.throws(() => privacy.sanitizePhotoBytes(original.subarray(0, length), type), `accepted truncation ${length}`);
    }
    assert.throws(() => privacy.sanitizePhotoBytes(Uint8Array.from([...original, 0]), type));
  });
}

void test('JPEG scans survive and metadata after the final scan is removed', () => {
  const original = fixture('metadata.jpg'), clean = privacy.sanitizePhotoBytes(original, 'image/jpeg');
  const scanCount = (data: Uint8Array) => data.reduce((n, b, i) => n + Number(b === 0xff && data[i + 1] === 0xda), 0);
  assert.ok(scanCount(original) > 1);
  assert.equal(scanCount(clean), scanCount(original));
  assert.ok(!Buffer.from(clean).includes(Buffer.from('PRIVATE_COMMENT_AFTER_SCAN')));
});

void test('PNG rejects invalid CRC even on a removed metadata chunk', () => {
  const broken = fixture('metadata.png');
  const where = Buffer.from(broken).indexOf('PRIVATE_PNG_AUTHOR');
  broken[where] ^= 1;
  assert.throws(() => privacy.sanitizePhotoBytes(broken, 'image/png'));
});

void test('WebP corrects EXIF/XMP flags without changing animation/ICC flags', () => {
  const original = fixture('animated.webp'), clean = privacy.sanitizePhotoBytes(original, 'image/webp');
  assert.equal(String.fromCharCode(...original.subarray(12, 16)), 'VP8X');
  assert.equal(clean[20] & 0x04, 0);
  assert.equal(clean[20] & 0x08, 0x08); // Orientation only EXIF remains.
  assert.equal(clean[20] & 0x22, original[20] & 0x22);
  assert.equal(new DataView(clean.buffer).getUint32(4, true), clean.length - 8);
});

void test('upload batch rejects malformed photos and disguised photo payloads', async () => {
  const valid = new File([fixture('metadata.jpg')], 'personal-name.jpg', { type: 'image/jpeg' });
  const bad = new File([fixture('metadata.jpg').subarray(0, 100)], 'broken.jpg', { type: 'image/jpeg' });
  await assert.rejects(privacy.sanitizePhotoUploads([valid, bad]));
  await assert.rejects(privacy.sanitizePhotoUploads([new File([fixture('metadata.jpg')], 'photo.mov', { type: 'video/quicktime' })]));
  const [result] = await privacy.sanitizePhotoUploads([valid]);
  assert.equal(result.name, 'photo.jpg');
  assert.ok(!Buffer.from(await result.arrayBuffer()).includes(Buffer.from('PRIVATE_')));
});

void test('HEIC and video are explicitly unchanged, never claimed sanitized', async () => {
  const files = [new File(['HEIC_PRIVATE_METADATA'], 'a.heic', { type: 'image/heic' }), new File(['VIDEO_PRIVATE_METADATA'], 'a.mov', { type: 'video/quicktime' })];
  const cleaned = await privacy.sanitizePhotoUploads(files);
  assert.equal(cleaned[0], files[0]);
  assert.equal(cleaned[1], files[1]);
});

function loadRoute(path: string, onDatabase: (...args: unknown[]) => unknown, storage?: unknown) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: { POST?: (request?: Request) => Promise<Response> } = {};
  const modules: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    'zod': { z },
    '@/lib/photo-privacy': privacy,
    '@/lib/community-media': media,
    '@/lib/supabase/server': { requireAuthenticatedUser: async () => ({ admin: { from: onDatabase, storage }, user: { id: 'synthetic-test-user' } }) },
    '@/lib/community-moderation': { moderateText: () => ({ status: 'ACTIVE' }) }, '@/lib/events-data': {}, '@/lib/release-features': { rentalsEnabled: false },
    '@/lib/shipping': { parseShipping: () => ({}) }, '@/lib/server/blocked-content': {},
    '@/lib/server/review-fixture-visibility': {}, '@/lib/server/public-profile-visibility': {},
  };
  vm.runInNewContext(compiled, {
    exports, require: (name: string) => {
      assert.ok(name in modules, `Unexpected import ${name}`); return modules[name];
    }, Request, Response, File, FormData, URL, Uint8Array, crypto,
  });
  return exports.POST!;
}

for (const route of ['app/api/community/posts/route.ts', 'app/api/listings/route.ts']) {
  void test(`${route}: malformed metadata is rejected before DB writes or upload`, async () => {
    let dbCalls = 0;
    const post = loadRoute(route, (table) => {
      dbCalls++;
      assert.ok(route.includes('community') && table === 'community_posts' && dbCalls === 1, 'Only one rate-limit read is allowed');
      return { select: () => ({ eq: () => ({ gte: () => ({ error: null, count: 0 }) }) }) };
    });
    const form = new FormData();
    form.set('caption', 'A synthetic community post'); form.set('category', 'Cosplay');
    form.set('title', 'Synthetic listing'); form.set('description', 'A synthetic listing description');
    form.set('condition', 'new'); form.set('saleMode', 'buy'); form.set('salePrice', '10');
    form.set(route.includes('community') ? 'media' : 'photos', new File([fixture('metadata.jpg').subarray(0, 100)], 'broken.jpg', { type: 'image/jpeg' }));
    const response = await post(new Request('https://example.invalid/upload', { method: 'POST', body: form }));
    assert.equal(response.status, 400);
    assert.equal(dbCalls, route.includes('community') ? 1 : 0);
    const error = await response.json() as { error: string };
    assert.match(error.error, /foto non è valida/);
  });
}

void test('retired remove.bg route cannot read body, credentials or contact provider', async () => {
  const post = loadRoute('app/api/images/remove-background/route.ts', () => { throw new Error('Unexpected database access'); });
  const response = await post(); // No Request, process or fetch exposed to the route.
  assert.equal(response.status, 410);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

void test('JPEG rejects invalid EXIF offsets and orientation rather than publishing raw input', () => {
  const original = fixture('metadata.jpg');
  const start = Buffer.from(original).indexOf('Exif\0\0') + 6;
  assert.ok(start > 6);
  const broken = original.slice();
  const v = new DataView(broken.buffer);
  const little = String.fromCharCode(...broken.subarray(start, start + 2)) === 'II';
  v.setUint32(start + 4, 0xffffffff, little);
  assert.throws(() => privacy.sanitizePhotoBytes(broken, 'image/jpeg'));
  const orientationBroken = original.slice();
  const ov = new DataView(orientationBroken.buffer);
  const ifd = start + ov.getUint32(start + 4, little);
  let changed = false;
  for (let i = 0; i < ov.getUint16(ifd, little); i++) {
    const at = ifd + 2 + i * 12;
    if (ov.getUint16(at, little) === 0x112) { ov.setUint16(at + 8, 9, little); changed = true; }
  }
  assert.ok(changed);
  assert.throws(() => privacy.sanitizePhotoBytes(orientationBroken, 'image/jpeg'));
});

for (const route of ['app/api/community/posts/route.ts', 'app/api/listings/route.ts']) {
  void test(`${route}: storage receives cleaned pixels, never the original private metadata`, async () => {
    const result = { data: { id: 'synthetic-test', slug: 'synthetic-test', status: 'DRAFT' }, error: null, count: 0 };
    const chain: Record<string, unknown> = { ...result };
    for (const method of ['select', 'eq', 'gte', 'upsert', 'insert', 'update', 'single', 'maybeSingle']) chain[method] = () => chain;
    const uploaded: File[] = [];
    const post = loadRoute(route, () => chain, { from: () => ({ upload: (_path: string, file: File) => { uploaded.push(file); return { error: null }; } }) });
    const form = new FormData();
    form.set('caption', 'A synthetic community post'); form.set('category', 'Cosplay');
    form.set('title', 'Synthetic listing'); form.set('description', 'A synthetic listing description');
    form.set('condition', 'new'); form.set('saleMode', 'buy'); form.set('salePrice', '10');
    const original = fixture('metadata.jpg');
    form.set(route.includes('community') ? 'media' : 'photos', new File([original], 'personal.jpg', { type: 'image/jpeg' }));
    const response = await post(new Request('https://example.invalid/upload', { method: 'POST', body: form }));
    assert.equal(response.status, 201);
    assert.equal(uploaded.length, 1);
    assert.deepEqual(new Uint8Array(await uploaded[0].arrayBuffer()), privacy.sanitizePhotoBytes(original, 'image/jpeg'));
  });
}

function manyChunks(name: string, count: number) {
  const original = fixture(name);
  let chunk: Uint8Array;
  let offset: number;
  if (name.endsWith('.jpg')) {
    chunk = new Uint8Array([0xff, 0xfe, 0, 2]); offset = 2;
  } else if (name.endsWith('.png')) {
    const type = new TextEncoder().encode('tEXt');
    let crc = 0xffffffff;
    for (const value of type) {
      crc ^= value;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    chunk = new Uint8Array(12); chunk.set(type, 4);
    new DataView(chunk.buffer).setUint32(8, (crc ^ 0xffffffff) >>> 0);
    offset = original.length - 12; // before IEND
  } else {
    chunk = new Uint8Array([74, 85, 78, 75, 0, 0, 0, 0]); offset = original.length;
  }
  const result = new Uint8Array(original.length + chunk.length * count);
  result.set(original.subarray(0, offset));
  for (let i = 0; i < count; i++) result.set(chunk, offset + i * chunk.length);
  result.set(original.subarray(offset), offset + count * chunk.length);
  if (name.endsWith('.webp')) new DataView(result.buffer).setUint32(4, result.length - 8, true);
  return result;
}

for (const [name, type] of types.slice(0, 3)) {
  void test(`${name}: excessive discarded structures stop at a bounded budget`, () => {
    const hostile = manyChunks(name, 100_000);
    assert.ok(hostile.length < 2 * 1024 * 1024);
    assert.throws(() => privacy.sanitizePhotoBytes(hostile, type), /struttura troppo complessa/);
    const normal = manyChunks(name, 10);
    assert.deepEqual(privacy.sanitizePhotoBytes(normal, type), privacy.sanitizePhotoBytes(fixture(name), type));
  });
}

void test('structure budget is shared across every photo in one upload', async () => {
  const data = manyChunks('metadata.webp', 2_000);
  assert.doesNotThrow(() => privacy.sanitizePhotoBytes(data, 'image/webp'));
  const files = Array.from({ length: 3 }, () => new File([data], 'a.webp', { type: 'image/webp' }));
  await assert.rejects(privacy.sanitizePhotoUploads(files), /struttura troppo complessa/);
});

void test('nested WebP frame chunks share the same allocation budget', () => {
  const original = fixture('animated.webp');
  const anmf = Buffer.from(original).indexOf('ANMF');
  assert.ok(anmf > 12);
  const size = new DataView(original.buffer).getUint32(anmf + 4, true);
  const at = anmf + 8 + size;
  const count = 100_000;
  const result = new Uint8Array(original.length + count * 8);
  result.set(original.subarray(0, at));
  const junk = new Uint8Array([74, 85, 78, 75, 0, 0, 0, 0]);
  for (let i = 0; i < count; i++) result.set(junk, at + 8 * i);
  result.set(original.subarray(at), at + count * 8);
  const v = new DataView(result.buffer);
  v.setUint32(4, result.length - 8, true); v.setUint32(anmf + 4, size + count * 8, true);
  assert.throws(() => privacy.sanitizePhotoBytes(result, 'image/webp'), /struttura troppo complessa/);
});

void test('oversized photo batches are refused before reading or copying file bytes', async () => {
  let read = false;
  const large = { type: 'image/jpeg', size: privacy.MAX_SANITIZED_PHOTO_BATCH_BYTES, arrayBuffer: () => { read = true; throw Error('Unexpected read'); } } as unknown as File;
  await assert.rejects(privacy.sanitizePhotoUploads([large, large]), /32 MB/);
  assert.equal(read, false);
});

void test('community rate-limit rejects before attempting metadata parsing', async () => {
  const post = loadRoute('app/api/community/posts/route.ts', () => ({ select: () => ({ eq: () => ({ gte: () => ({ error: null, count: 20 }) }) }) }));
  const form = new FormData();
  form.set('caption', 'A synthetic community post'); form.set('category', 'Cosplay');
  form.set('media', new File(['not a JPEG'], 'broken.jpg', { type: 'image/jpeg' }));
  const response = await post(new Request('https://example.invalid/upload', { method: 'POST', body: form }));
  assert.equal(response.status, 429);
});

void test('ICC profile descriptions remain intentionally preserved, not promised private-data-free', () => {
  const original = fixture('metadata.jpg');
  const pattern = Buffer.from('sRGB built-in', 'utf16le').swap16();
  const at = Buffer.from(original).indexOf(pattern);
  assert.ok(at > 0);
  const description = Buffer.from('PRIVATE_ICC  ', 'utf16le').swap16();
  assert.equal(description.length, pattern.length);
  original.set(description, at);
  const clean = privacy.sanitizePhotoBytes(original, 'image/jpeg');
  assert.ok(Buffer.from(clean).includes(description));
});
