import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createElement, type ComponentType } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { z } from 'zod';
import * as publicVisibility from '../lib/server/public-profile-visibility.ts';
import * as reviewVisibility from '../lib/server/review-fixture-visibility.ts';
import * as interactions from '../lib/server/community-post-interactions.ts';
import * as blockedContent from '../lib/server/blocked-content.ts';

const authorId = '10000000-0000-4000-8000-000000000001';
const viewerId = '10000000-0000-4000-8000-000000000002';
const hiddenPublicId = '39ed3f97-f290-41f2-9cb0-c0fb0ad6ac53';
const reviewId = '66b0c100-e397-4971-946a-a8e3416b5f5b';

function loadModule(file: string, modules: Record<string, unknown>) {
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(compiled, {
    exports, URL, Request, Response,
    require(name: string) {
      assert.ok(name in modules, 'Unexpected import: ' + name);
      return modules[name];
    },
  });
  return exports;
}

type AuthorProps = { authorId: string; author: string; profileUrl?: string | null; viewerId: string };
const { CommunityAuthorLink } = loadModule('components/community-author-link.tsx', {
  'react/jsx-runtime': jsxRuntime,
  '@/components/app-link': {
    default: ({ children, ...props }: { children: string; href: string; className: string }) => createElement('a', props, children),
  },
}) as { CommunityAuthorLink: ComponentType<AuthorProps> };

function renderAuthor(props: Partial<AuthorProps> = {}) {
  return renderToStaticMarkup(createElement(CommunityAuthorLink, {
    authorId, author: 'Nome pubblico', viewerId, ...props,
  }));
}

void test('an own post opens account management even when its public profile is absent', () => {
  for (const profileUrl of [undefined, null, '/profile/' + authorId]) {
    const html = renderAuthor({ viewerId: authorId, profileUrl });
    assert.match(html, /<a\s[^>]*href="\/profile\/me"/);
    assert.match(html, />Nome pubblico<\/a>/);
  }
});

void test('another author with no public profile renders a name without a dead link', () => {
  for (const profileUrl of [undefined, null]) {
    const html = renderAuthor({ author: 'Utente COSMORA', profileUrl });
    assert.match(html, /^<span\s[^>]*>Utente COSMORA<\/span>$/);
    assert.doesNotMatch(html, /href=/);
  }
});

void test('an explicitly available public author gets their exact profile link', () => {
  const html = renderAuthor({ profileUrl: '/profile/' + authorId });
  assert.ok(html.includes('href="/profile/' + authorId + '"'));
  assert.match(html, />Nome pubblico<\/a>/);
});

void test('author links reject another user, external addresses and unapproved legacy fallback URLs', () => {
  for (const profileUrl of ['/profile/' + viewerId, '/profile/me', 'https://example.invalid/profile', 'javascript:alert(1)', '//example.invalid', '/profile/' + authorId + '?redirect=1']) {
    assert.match(renderAuthor({ profileUrl }), /^<span\s/);
  }
  assert.match(renderAuthor({ authorId: '', viewerId: '', profileUrl: null }), /^<span\s/);
});

type Row = Record<string, unknown>;
type DbResult = { data: Row[] | null; error: { message: string } | null };
type FeedResponse = { posts: Row[]; hasMore: boolean; userId?: string };

async function readFeed(response: Response): Promise<FeedResponse> {
  const body = await response.json() as Partial<FeedResponse>;
  assert.ok(Array.isArray(body.posts), 'A successful feed contains a posts array');
  return body as FeedResponse;
}

function routeFixture(options: {
  posts?: Row[];
  profiles?: Row[];
  blocks?: Row[];
  profileError?: boolean;
  viewer?: string | null;
} = {}) {
  const rows: Record<string, Row[]> = {
    community_posts: options.posts ?? [post()],
    profiles: options.profiles ?? [],
    user_blocks: options.blocks ?? [],
    community_post_likes: [],
    community_post_saves: [],
  };
  let signedMedia = 0;
  let profileReads = 0;
  class Query implements PromiseLike<DbResult> {
    private values: Row[];
    private table: string;
    constructor(table: string) {
      this.table = table;
      assert.ok(table in rows, 'Unexpected table: ' + table);
      this.values = [...rows[table]];
      if (table === 'profiles') profileReads++;
    }
    select() { return this; }
    eq(column: string, value: unknown) { this.values = this.values.filter((row) => row[column] === value); return this; }
    in(column: string, values: unknown[]) { this.values = this.values.filter((row) => values.includes(row[column])); return this; }
    not(column: string, operator: string, filter: string) {
      assert.equal(operator, 'in');
      const excluded = filter.slice(1, -1).split(',');
      this.values = this.values.filter((row) => !excluded.includes(String(row[column])));
      return this;
    }
    or() { return this; }
    order() { return this; }
    range(start: number, end: number) { this.values = this.values.slice(start, end + 1); return this; }
    // Supabase query builders are deliberately awaitable.
    // oxlint-disable-next-line unicorn/no-thenable
    then<TResult1 = DbResult, TResult2 = never>(
      onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      const result = this.table === 'profiles' && options.profileError
        ? { data: null, error: { message: 'Synthetic profile database failure' } }
        : { data: this.values, error: null };
      return Promise.resolve(result).then(onfulfilled, onrejected);
    }
  }
  const admin = {
    from: (table: string) => new Query(table),
    storage: { from: () => ({ createSignedUrls: async (paths: string[]) => {
      signedMedia += paths.length;
      return { data: paths.map((path) => ({ signedUrl: 'https://example.invalid/' + path })) };
    } }) },
  };
  const viewer = options.viewer === undefined ? viewerId : options.viewer;
  const route = loadModule('app/api/community/posts/route.ts', {
    'next/server': { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    'zod': { z },
    '@/lib/supabase/server': {
      getSupabaseAdmin: () => admin,
      requireAuthenticatedUser: async () => viewer ? { admin, user: { id: viewer } } : null,
    },
    '@/lib/server/public-profile-visibility': publicVisibility,
    '@/lib/server/review-fixture-visibility': reviewVisibility,
    '@/lib/server/community-post-interactions': interactions,
    '@/lib/server/blocked-content': blockedContent,
    '@/lib/community-moderation': {},
    '@/lib/community-media': {},
    '@/lib/events-data': {},
    '@/lib/photo-privacy': {},
  }) as { GET: (request: Request) => Promise<Response> };
  return {
    get: () => route.GET(new Request('https://example.invalid/api/community/posts')),
    signedMedia: () => signedMedia,
    profileReads: () => profileReads,
  };
}

function post(author = authorId): Row {
  return {
    id: '20000000-0000-4000-8000-000000000001', author_id: author,
    status: 'ACTIVE', caption: 'Un vero post resta disponibile', created_at: '2026-10-28T12:00:00Z',
    link_url: null, post_categories: [], post_media: [],
  };
}

function profile(id = authorId, moderationHidden = false): Row {
  return { id, display_name: 'Nome scelto pubblicamente', moderation_hidden: moderationHidden };
}

void test('GET preserves a post whose author profile is absent and explicitly omits its profile link', async () => {
  const response = await routeFixture().get();
  assert.equal(response.status, 200);
  const body = await readFeed(response);
  assert.equal(body.posts.length, 1);
  assert.equal(body.posts[0].caption, 'Un vero post resta disponibile');
  assert.equal(body.posts[0].author_id, authorId);
  assert.equal(body.posts[0].author, 'Utente COSMORA');
  assert.equal(body.posts[0].author_profile_url, null);
  assert.equal(body.userId, viewerId);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

void test('GET supplies a link only for the actual accessible public author', async () => {
  const response = await routeFixture({ profiles: [profile(), profile(viewerId)] }).get();
  const body = await readFeed(response);
  assert.equal(response.status, 200);
  assert.equal(body.posts[0].author, 'Nome scelto pubblicamente');
  assert.equal(body.posts[0].author_profile_url, '/profile/' + authorId);
});

void test('GET preserves existing content from a discovery-hidden author without linking to their unavailable public page', async () => {
  const response = await routeFixture({ posts: [post(hiddenPublicId)], profiles: [profile(hiddenPublicId)] }).get();
  const body = await readFeed(response);
  assert.equal(response.status, 200);
  assert.equal(body.posts.length, 1);
  assert.equal(body.posts[0].author, 'Nome scelto pubblicamente');
  assert.equal(body.posts[0].author_profile_url, null);
});

void test('GET never links a moderation-hidden author or reveals their hidden display name', async () => {
  const response = await routeFixture({ profiles: [profile(authorId, true)] }).get();
  const body = await readFeed(response);
  assert.equal(body.posts[0].author, 'Utente COSMORA');
  assert.equal(body.posts[0].author_profile_url, null);
});

void test('GET retains review-fixture and bilateral block exclusions', async () => {
  const fixtures = routeFixture({ posts: [post(reviewId)], profiles: [profile(reviewId)] });
  assert.equal((await readFeed(await fixtures.get())).posts.length, 0);
  for (const [blocker, blocked] of [[viewerId, authorId], [authorId, viewerId]]) {
    const blockedFeed = routeFixture({ profiles: [profile()], blocks: [{ blocker_id: blocker, blocked_id: blocked }] });
    assert.equal((await readFeed(await blockedFeed.get())).posts.length, 0);
  }
});

void test('GET reports author-query failure as an error before signing media, never as a missing profile', async () => {
  const withMedia = { ...post(), post_media: [{ storage_path: 'photo.jpg', media_type: 'PHOTO', sort_order: 0 }] };
  const fixture = routeFixture({ posts: [withMedia], profileError: true });
  const response = await fixture.get();
  assert.equal(response.status, 503);
  const body = await response.json() as { error?: unknown; posts?: unknown };
  assert.equal(typeof body.error, 'string');
  assert.equal(body.posts, undefined);
  assert.equal(fixture.signedMedia(), 0);
});

void test('GET succeeds with an empty feed without querying authors', async () => {
  const fixture = routeFixture({ posts: [], profileError: true });
  const response = await fixture.get();
  assert.equal(response.status, 200);
  assert.deepEqual((await readFeed(response)).posts, []);
  assert.equal(fixture.profileReads(), 0);
});

void test('embedded profile links never expose hidden or blocked target names', async () => {
  for (const target of [hiddenPublicId, viewerId]) {
    const response = await routeFixture({
      posts: [{ ...post(), link_url: '/profile/' + target, link_label: 'Stale name' }],
      profiles: [profile(), profile(target)],
      blocks: target === viewerId ? [{ blocker_id: '10000000-0000-4000-8000-000000000005', blocked_id: target }] : [],
      viewer: target === viewerId ? '10000000-0000-4000-8000-000000000005' : viewerId,
    }).get();
    const body = await readFeed(response);
    assert.equal(body.posts[0].link_url, null);
    assert.equal(body.posts[0].link_label, null);
  }
});


void test('retired event, product, crew and profile associations never appear in the feed', async () => {
  for (const link_url of ['/profile/' + viewerId, '/marketplace/product', '/squads/crew', 'https://event.example']) {
    const response = await routeFixture({ posts: [{ ...post(), link_url, link_label: 'Legacy link' }], profiles: [profile()] }).get();
    const body = await readFeed(response);
    assert.equal(body.posts[0].link_url, null);
    assert.equal(body.posts[0].link_label, null);
    assert.equal(body.posts[0].author_profile_url, '/profile/' + authorId);
  }
});
