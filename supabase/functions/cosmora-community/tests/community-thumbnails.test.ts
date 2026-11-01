import assert from 'node:assert/strict';
import test from 'node:test';
import { safeThumbnailPath } from '../src/lib/community-thumbnails.ts';

test('only the exact sibling thumbnail is accepted; originals and other users remain isolated', () => {
 const original = 'author/post/photo.jpg';
 assert.equal(safeThumbnailPath(original, 'author/post/photo.jpg.thumbnail.jpg'), 'author/post/photo.jpg.thumbnail.jpg');
 for (const candidate of [undefined, null, '', original, 'other/post/photo.jpg.thumbnail.jpg', 'author/other/photo.jpg.thumbnail.jpg', 'author/post/other.jpg.thumbnail.jpg', 'author/post/../photo.jpg.thumbnail.jpg']) {
  assert.equal(safeThumbnailPath(original, candidate), null);
 }
});
