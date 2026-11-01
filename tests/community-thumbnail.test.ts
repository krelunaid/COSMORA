import assert from 'node:assert/strict';
import test from 'node:test';
import { communityThumbnail } from '../lib/community-feed.ts';

test('gallery prefers the thumbnail but older posts retain the original', () => {
  assert.equal(communityThumbnail({url:'original', thumbnail_url:'thumbnail'}), 'thumbnail');
  assert.equal(communityThumbnail({url:'original', thumbnail_url:null}), 'original');
  assert.equal(communityThumbnail({url:'original'}), 'original');
});
