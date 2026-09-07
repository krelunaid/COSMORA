import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const sell = readFileSync(new URL('../app/sell/page.tsx', import.meta.url), 'utf8');
const media = readFileSync(new URL('../lib/community-media-client.ts', import.meta.url), 'utf8');
const community = readFileSync(new URL('../components/community-media-picker.tsx', import.meta.url), 'utf8');

test('listing captures form before asynchronous session lookup', () => {
  assert.ok(sell.indexOf('const form = event.currentTarget') < sell.indexOf('const session = await supabase.auth.getSession()'));
  assert.match(sell, /new FormData\(form\)/);
  assert.doesNotMatch(sell, /new FormData\(event.currentTarget\)/);
});

test('both listing inputs accept iPhone images and reset repeat selections', () => {
  assert.equal((sell.match(/accept="image\/\*,\.heic,\.heif"/g) ?? []).length, 2);
  assert.equal((sell.match(/event.target.value = ''/g) ?? []).length, 2);
  assert.match(sell, /await renderFileAsJpeg\(file\)/);
  assert.match(sell, /disabled=\{publishing \|\| preparingPhotos\}/);
});

test('native picker does not automatically reopen after an error', () => {
  assert.equal((media.match(/return await choose\(/g) ?? []).length, 1);
  assert.match(media, /photosOnly \? MediaTypeSelection.Photo : MediaTypeSelection.All/);
  const catchBlock = community.slice(community.indexOf('} catch (error) {'), community.indexOf('} finally {', community.indexOf('} catch (error) {')));
  assert.doesNotMatch(catchBlock, /openHtmlFileInput\(/);
});

test('image conversion bounds output dimensions for iPhone photos', () => {
  assert.match(media, /2048 \/ Math.max\(width, height\)/);
  assert.match(media, /canvas.width, canvas.height/);
});

test('forms receive files directly without intercepting the iOS system picker', () => {
  assert.doesNotMatch(community, /onClick=\{onInputClick\}|pickNativeCommunityPhotos/);
  assert.doesNotMatch(sell, /pickNativeCommunityPhotos/);
  assert.match(community, /Array.from\(event.target.files \?\? \[\]\)/);
});
