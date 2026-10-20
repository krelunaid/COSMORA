import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import test from 'node:test';
import { matchRoutes } from 'react-router';
import { pageRoute } from '../mobile/route-path.ts';

const pageFiles = readdirSync(new URL('../app', import.meta.url), { recursive: true })
  .filter((file): file is string => typeof file === 'string' && file.endsWith('page.tsx'));
const routes = pageFiles.map((file) => ({ path: pageRoute('../app/' + file) }));

test('all current screens have local routes, including future records', () => {
  assert.ok(routes.length >= 30);
  for (const [url, path, params] of [
    ['/marketplace/new-listing-2027', '/marketplace/:slug', { slug: 'new-listing-2027' }],
    ['/profile/new-person', '/profile/:username', { username: 'new-person' }],
    ['/inbox/future-conversation', '/inbox/:conversationId', { conversationId: 'future-conversation' }],
    ['/squads/future-crew', '/squads/:slug', { slug: 'future-crew' }],
    ['/profile/me', '/profile/me', {}],
    ['/squads/create', '/squads/create', {}],
    ['/community/post/new', '/community/post/new', {}],
    ['/auth/recovery?code=callback', '/auth/recovery', {}],
    ['/', '/', {}],
  ] as const) {
    const matches = matchRoutes(routes, url);
    assert.equal(matches?.at(-1)?.route.path, path, url);
    assert.deepEqual(matches?.at(-1)?.params, params, url);
  }
  assert.equal(matchRoutes(routes, '/unknown/route'), null);
});
