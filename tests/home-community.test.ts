import assert from 'node:assert/strict';
import test from 'node:test';
import { homeCommunityPhotos } from '../lib/home-community.ts';
import type { CommunityPost } from '../lib/community-feed.ts';

const photo = (id: string, author = 'author'): CommunityPost => ({
  id,
  author_id: author,
  author: 'Nome reale',
  caption: 'Didascalia reale',
  created_at: '2026-10-29T00:00:00Z',
  link_label: null,
  link_url: null,
  media: [{ type: 'IMAGE', url: 'https://example.test/' + id + '.jpg' }],
});
const access = {
  ready: true,
  viewerId: 'viewer-a',
  loadedViewerId: 'viewer-a',
  blockedIds: new Set<string>(),
};

void test('home cannot expose previous account interactions while switching accounts or checking blocks', () => {
  const posts = [{ ...photo('private-flags'), liked: true, saved: true }];
  assert.deepEqual(
    homeCommunityPhotos(posts, { ...access, viewerId: 'viewer-b' }),
    [],
  );
  assert.deepEqual(homeCommunityPhotos(posts, { ...access, ready: false }), []);
  assert.deepEqual(
    homeCommunityPhotos(posts, { ...access, loadedViewerId: null }),
    [],
  );
  assert.deepEqual(
    homeCommunityPhotos(posts, {
      ...access,
      viewerId: '',
      loadedViewerId: 'viewer-a',
    }),
    [],
  );
});

void test('home hides blocked authors, video-only and text-only posts without manufacturing photographs', () => {
  const blocked = photo('blocked', 'blocked-author');
  const video = {
    ...photo('video'),
    media: [{ type: 'VIDEO', url: 'https://example.test/video.mp4' }],
  };
  const text = { ...photo('text'), media: [] };
  const empty = { ...photo('broken'), media: [{ type: 'IMAGE', url: '' }] };
  const mixed = {
    ...photo('mixed'),
    media: [...video.media, ...photo('mixed').media],
  };
  const visible = homeCommunityPhotos(
    [blocked, video, text, empty, mixed, photo('visible')],
    { ...access, blockedIds: new Set(['blocked-author']) },
  );
  assert.deepEqual(
    visible.map((post) => post.id),
    ['mixed', 'visible'],
  );
  assert.equal(visible[0], mixed);
});

void test('home preserves API ordering and exact server data, with a bounded carousel', () => {
  const posts = Array.from({ length: 20 }, (_, index) => photo(String(index)));
  const visible = homeCommunityPhotos(posts, access);
  assert.equal(visible.length, 8);
  assert.deepEqual(visible, posts.slice(0, 8));
  assert.equal(visible[3], posts[3]);
});

void test('anonymous home only renders an explicitly anonymous response', () => {
  const posts = [photo('public')];
  assert.deepEqual(
    homeCommunityPhotos(posts, { ...access, viewerId: '', loadedViewerId: '' }),
    posts,
  );
  assert.deepEqual(
    homeCommunityPhotos(posts, {
      ...access,
      viewerId: '',
      loadedViewerId: null,
    }),
    [],
  );
});
