import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import * as interactions from '../src/lib/server/community-post-interactions.ts';
import * as publicVisibility from '../src/lib/server/public-profile-visibility.ts';
import * as reviewVisibility from '../src/lib/server/review-fixture-visibility.ts';
import * as blockedContent from '../src/lib/server/blocked-content.ts';
import * as thumbnails from '../src/lib/community-thumbnails.ts';

const viewer = '10000000-0000-4000-8000-000000000001';
const otherViewer = '10000000-0000-4000-8000-000000000002';
const author = '10000000-0000-4000-8000-000000000003';
const fixtureAuthor = '66b0c100-e397-4971-946a-a8e3416b5f5b';
const postId = '20000000-0000-4000-8000-000000000001';
type Row = Record<string, unknown>;
type FeedBody = {
  posts: Array<Row & { id: string; liked: boolean; saved: boolean }>;
  hasMore: boolean;
  userId?: string;
};
const json = async <T>(response: Response) => (await response.json()) as T;

function post(id = postId, overrides: Row = {}): Row {
  return {
    id,
    author_id: author,
    caption: 'Cosplay #lucca',
    status: 'ACTIVE',
    created_at: '2026-10-29T10:00:00Z',
    link_url: null,
    post_media: [],
    ...overrides,
  };
}

function fixture(
  options: {
    posts?: Row[];
    likes?: Row[];
    saves?: Row[];
    blocks?: Row[];
    thumbnails?: Row[];
    errorTable?: string;
    errorAtBlockOffset?: number;
    failMutation?: boolean;
    suspended?: boolean;
  } = {},
) {
  const rows: Record<string, Row[]> = {
    community_posts: options.posts ?? [post()],
    community_post_likes: options.likes ?? [],
    community_post_saves: options.saves ?? [],
    profiles: [],
    user_blocks: options.blocks ?? [],
    community_media_previews: options.thumbnails ?? [],
  };
  const calls: Array<{ table: string; operations: string[] }> = [];
  let signed = 0;
  let writes = 0;
  class Query {
    private predicates: Array<(row: Row) => boolean> = [];
    private bounds?: [number, number];
    private single = false;
    private selected = '';
    private mutation?: 'upsert' | 'delete';
    private payload?: Row;
    private entry: { table: string; operations: string[] };
    private table: string;
    constructor(table: string) {
      this.table = table;
      assert.ok(table in rows, 'Unexpected table ' + table);
      this.entry = { table, operations: [] };
      calls.push(this.entry);
    }
    select(fields: string) {
      this.selected = fields;
      this.entry.operations.push('select:' + fields);
      return this;
    }
    eq(column: string, value: unknown) {
      this.entry.operations.push('eq:' + column + ':' + String(value));
      if (column === 'saved_by.user_id') {
        assert.match(
          this.selected,
          /saved_by:community_post_saves!inner\(user_id\)/,
        );
        this.predicates.push((row) =>
          rows.community_post_saves.some(
            (save) => save.post_id === row.id && save.user_id === value,
          ),
        );
      } else this.predicates.push((row) => row[column] === value);
      return this;
    }
    in(column: string, values: unknown[]) {
      this.entry.operations.push('in:' + column);
      this.predicates.push((row) => values.includes(row[column]));
      return this;
    }
    not(column: string, op: string, value: string) {
      assert.equal(op, 'in');
      this.entry.operations.push('not:' + column);
      this.predicates.push(
        (row) => !value.slice(1, -1).split(',').includes(String(row[column])),
      );
      return this;
    }
    ilike(column: string, pattern: string) {
      this.entry.operations.push('ilike:' + column);
      this.predicates.push((row) =>
        String(row[column])
          .toLowerCase()
          .includes(pattern.slice(1, -1).toLowerCase()),
      );
      return this;
    }
    or(filter: string) {
      const conditions = filter.split(',').map((part) => part.split('.eq.'));
      this.predicates.push((row) =>
        conditions.some(([key, value]) => row[key] === value),
      );
      return this;
    }
    order() {
      return this;
    }
    range(start: number, end: number) {
      this.entry.operations.push('range');
      this.bounds = [start, end];
      return this;
    }
    maybeSingle() {
      this.single = true;
      return this;
    }
    upsert(
      payload: Row,
      options: { onConflict: string; ignoreDuplicates: boolean },
    ) {
      assert.equal(options.onConflict, 'user_id,post_id');
      assert.equal(options.ignoreDuplicates, true);
      this.mutation = 'upsert';
      this.payload = payload;
      return this;
    }
    delete() {
      this.mutation = 'delete';
      return this;
    }
    // Supabase builders are intentionally thenable.
    // oxlint-disable-next-line unicorn/no-thenable
    then(
      resolve: (result: { data: unknown; error: unknown }) => unknown,
      reject: (reason: unknown) => unknown,
    ) {
      if (
        options.errorTable === this.table ||
        (this.table === 'user_blocks' &&
          this.bounds?.[0] === options.errorAtBlockOffset &&
          options.errorAtBlockOffset !== undefined) ||
        (this.mutation && options.failMutation)
      )
        return Promise.resolve({
          data: null,
          error: { message: 'Synthetic database failure' },
        }).then(resolve, reject);
      const match = (row: Row) =>
        this.predicates.every((predicate) => predicate(row));
      if (this.mutation) {
        writes++;
        if (this.mutation === 'delete')
          rows[this.table] = rows[this.table].filter((row) => !match(row));
        else if (
          !rows[this.table].some(
            (row) =>
              row.user_id === this.payload!.user_id &&
              row.post_id === this.payload!.post_id,
          )
        )
          rows[this.table].push(this.payload!);
        return Promise.resolve({ data: null, error: null }).then(
          resolve,
          reject,
        );
      }
      let data = rows[this.table].filter(match);
      if (this.bounds) data = data.slice(this.bounds[0], this.bounds[1] + 1);
      // Model a Data API row cap, including when no explicit range was supplied.
      if (this.table === 'user_blocks') data = data.slice(0, 500);
      if (this.selected.includes('saved_by:'))
        data = data.map((row) => ({ ...row, saved_by: [{ user_id: viewer }] }));
      return Promise.resolve({
        data: this.single ? (data[0] ?? null) : data,
        error: null,
      }).then(resolve, reject);
    }
  }
  const admin = {
    from: (table: string) => new Query(table),
    storage: {
      from: () => ({
        createSignedUrls: async (paths: string[]) => {
          signed += paths.length;
          return {
            data: paths.map((path) => ({
              signedUrl: 'https://example.invalid/' + path,
            })),
          };
        },
      }),
    },
  };
  const modules: Record<string, unknown> = {
    'next/server': {
      NextResponse: {
        json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
      },
    },
    zod: { z },
    '../lib/supabase/server.ts': {
      getSupabaseAdmin: () => admin,
      requireAuthenticatedUser: async (request: Request) => {
        const token = request.headers.get('authorization');
        const id =
          token === 'Bearer viewer'
            ? viewer
            : token === 'Bearer other'
              ? otherViewer
              : null;
        return id && !options.suspended ? { admin, user: { id } } : null;
      },
    },
    '../lib/server/community-post-interactions.ts': interactions,
    '../lib/server/review-fixture-visibility.ts': reviewVisibility,
    '../lib/server/public-profile-visibility.ts': publicVisibility,
    '../lib/server/blocked-content.ts': blockedContent,
    '../lib/community-thumbnails.ts': thumbnails,
    '../lib/preview-token.ts': {previewSignature: async () => 'testsignature'},
    '@/lib/community-moderation': {},
    '@/lib/community-media': {},
    '@/lib/events-data': {},
    '@/lib/photo-privacy': {},
  };
  function load(file: string) {
    const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText;
    const exports: Record<string, unknown> = {};
    vm.runInNewContext(compiled, {
      exports,
      URL, URLSearchParams,
      Request,
      Response,
      require(name: string) {
        assert.ok(name in modules, 'Unexpected import: ' + name);
        return modules[name];
      },
    });
    return exports;
  }
  const { GET } = load('src/routes/feed.ts') as {
    GET: (r: Request, env: unknown) => Promise<Response>;
  };
  const { PUT } = load('src/routes/interaction.ts') as {
    PUT: (r: Request) => Promise<Response>;
  };
  return {
    rows,
    calls,
    writes: () => writes,
    signed: () => signed,
    get: (search = '', token = 'viewer') =>
      GET(
        new Request('https://example.invalid/api/community/posts' + search, {
          headers: token ? { Authorization: 'Bearer ' + token } : {},
        }),
        {SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'},
      ),
    put: (body: unknown, token = 'viewer') =>
      PUT(
        new Request('https://example.invalid/api/community/posts/interaction', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
          },
          body: JSON.stringify(body),
        }),
      ),
  };
}

void test('anonymous feed returns false state without reading private interactions; saved and invalid-token feeds require auth', async () => {
  const f = fixture({ likes: [{ user_id: otherViewer, post_id: postId }] });
  const response = await f.get('', '');
  assert.equal(response.status, 200);
  const body = await json<FeedBody>(response);
  assert.equal(body.posts[0].liked, false);
  assert.equal(body.posts[0].saved, false);
  assert.ok(
    !f.calls.some((call) => /community_post_(likes|saves)/.test(call.table)),
  );
  assert.equal((await f.get('?saved=1', '')).status, 401);
  assert.equal((await f.get('', 'invalid')).status, 401);
});

void test('feed returns only the verified viewer state, without counts or other user identities', async () => {
  const f = fixture({
    likes: [{ user_id: viewer, post_id: postId }],
    saves: [{ user_id: otherViewer, post_id: postId }],
  });
  const body = await json<FeedBody>(await f.get());
  assert.equal(body.posts[0].liked, true);
  assert.equal(body.posts[0].saved, false);
  assert.equal('like_count' in body.posts[0], false);
  assert.equal(JSON.stringify(body).includes(otherViewer), false);
  const other = await json<FeedBody>(await f.get('', 'other'));
  assert.equal(other.posts[0].liked, false);
  assert.equal(other.posts[0].saved, true);
});

void test('saved feed filters by owner, search and visibility before pagination and does not expose the join', async () => {
  const posts = Array.from({ length: 35 }, (_, n) =>
    post('20000000-0000-4000-8000-' + String(n + 1).padStart(12, '0'), {
      caption: n % 2 === 0 ? '#cosplay' : '#gaming',
    }),
  );
  const saves = posts
    .slice(10)
    .map((item) => ({ user_id: viewer, post_id: item.id }));
  saves.push({ user_id: otherViewer, post_id: posts[0].id });
  const f = fixture({ posts, saves });
  const body = await json<FeedBody>(
    await f.get('?saved=1&q=%23cosplay&offset=2'),
  );
  assert.deepEqual(
    body.posts.map((item) => item.id),
    posts
      .slice(14)
      .filter((item) => item.caption === '#cosplay')
      .map((item) => item.id),
  );
  assert.ok(body.posts.every((item) => item.saved && !('saved_by' in item)));
  const ops = f.calls.find(
    (call) => call.table === 'community_posts',
  )!.operations;
  assert.ok(
    ops.indexOf('eq:saved_by.user_id:' + viewer) < ops.indexOf('range'),
  );
  assert.ok(ops.indexOf('ilike:caption') < ops.indexOf('range'));
});

void test('feed signs trusted matching thumbnails only for visible posts and retains originals', async () => {
  const visible = '20000000-0000-4000-8000-000000000002';
  const blocked = '90000000-0000-4000-8000-000000000001';
  const original = author + '/post/photo.jpg';
  const thumb = original + '.thumbnail.jpg';
  const f = fixture({
    blocks: [{ blocker_id: viewer, blocked_id: blocked }],
    posts: [post(visible, { post_media: [{ id: 'm1', storage_path: original, media_type: 'IMAGE', sort_order: 0 }] }),
      post(postId, { author_id: blocked, post_media: [{ id: 'm2', storage_path: blocked + '/post/hidden.jpg', media_type: 'IMAGE', sort_order: 0 }] })],
    thumbnails: [
      { media_id: 'm1', original_path: original, thumbnail_path: thumb },
      { media_id: 'm2', original_path: blocked + '/post/hidden.jpg', thumbnail_path: blocked + '/post/hidden.jpg.thumbnail.jpg' },
    ],
  });
  const result = await json<FeedBody>(await f.get());
  assert.equal(result.posts.length, 1);
  const media = result.posts[0].media as Array<{url:string; thumbnail_url:string}>;
  assert.equal(media[0].url, 'https://example.invalid/' + original);
  assert.ok(media[0].thumbnail_url.includes('/api/community/thumbnail?id=m1&'));
  assert.ok(media[0].thumbnail_url.endsWith('signature=testsignature'));
  assert.equal(f.signed(), 1);
});

void test('stale or unavailable thumbnail metadata falls back to the original', async () => {
  const original = author + '/post/photo.jpg';
  for (const errorTable of [undefined, 'community_media_previews']) {
    const f = fixture({ errorTable,
      posts: [post(postId, { post_media: [{ id: 'm1', storage_path: original, media_type: 'IMAGE', sort_order: 0 }] })],
      thumbnails: [{ media_id: 'm1', original_path: 'old', thumbnail_path: original + '.thumbnail.jpg' }],
    });
    const response = await f.get();
    assert.equal(response.status, 200);
    const result = await json<FeedBody>(response);
    const media = result.posts[0].media as Array<{url:string; thumbnail_url:string|null}>;
    assert.equal(media[0].url, 'https://example.invalid/' + original);
    assert.equal(media[0].thumbnail_url, null);
    assert.equal(f.signed(), 1);
  }
});

void test('a private-state lookup error fails closed before signing media', async () => {
  for (const errorTable of ['community_post_likes', 'community_post_saves']) {
    const f = fixture({
      errorTable,
      posts: [
        post(postId, {
          post_media: [
            { storage_path: 'image.jpg', media_type: 'IMAGE', sort_order: 0 },
          ],
        }),
      ],
    });
    assert.equal((await f.get()).status, 503);
    assert.equal(f.signed(), 0);
  }
});

void test('discovery and saved feeds exclude bilateral blocks beyond the Data API row limit', async () => {
  const lateAuthor = '90000000-0000-4000-8000-000000000001';
  const visiblePostId = '20000000-0000-4000-8000-000000000002';
  const precedingBlocks = Array.from({ length: 1000 }, (_, index) => ({
    blocker_id: viewer,
    blocked_id:
      '30000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
  }));
  for (const lastBlock of [
    { blocker_id: viewer, blocked_id: lateAuthor },
    { blocker_id: lateAuthor, blocked_id: viewer },
  ]) {
    for (const search of ['', '?saved=1']) {
      const f = fixture({
        blocks: [...precedingBlocks, lastBlock],
        posts: [
          post(postId, {
            author_id: lateAuthor,
            post_media: [
              {
                storage_path: 'blocked.jpg',
                media_type: 'IMAGE',
                sort_order: 0,
              },
            ],
          }),
          post(visiblePostId),
        ],
        saves: [postId, visiblePostId].map((id) => ({
          user_id: viewer,
          post_id: id,
        })),
      });
      const response = await f.get(search);
      assert.equal(response.status, 200);
      assert.deepEqual(
        (await json<FeedBody>(response)).posts.map((item) => item.id),
        [visiblePostId],
      );
      const blockReads = f.calls.filter((call) => call.table === 'user_blocks');
      assert.equal(blockReads.length, 3);
      assert.ok(blockReads.every((call) => call.operations.includes('range')));
      assert.equal(
        f.signed(),
        0,
        'Blocked media must not receive a signed URL',
      );
    }
  }
});

void test('a later block-page failure fails the whole feed closed', async () => {
  const blocks = Array.from({ length: 501 }, (_, index) => ({
    blocker_id: viewer,
    blocked_id:
      '30000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
  }));
  for (const search of ['', '?saved=1']) {
    const f = fixture({
      blocks,
      errorAtBlockOffset: 500,
      saves: [{ user_id: viewer, post_id: postId }],
    });
    const response = await f.get(search);
    assert.equal(response.status, 503);
    assert.equal('posts' in (await json<Row>(response)), false);
    assert.equal(
      f.calls.filter((call) => call.table === 'user_blocks').length,
      2,
    );
    assert.equal(
      f.calls.some((call) => /community_post_(likes|saves)/.test(call.table)),
      false,
    );
    assert.equal(f.signed(), 0);
  }
});

void test('interaction mutations require verified auth and strict validated desired-state input', async () => {
  const f = fixture();
  const input = { postId, action: 'like', active: true };
  assert.equal((await f.put(input, '')).status, 401);
  assert.equal((await f.put(input, 'invalid')).status, 401);
  assert.equal((await fixture({ suspended: true }).put(input)).status, 401);
  for (const invalid of [
    { ...input, userId: otherViewer },
    { ...input, active: 'true' },
    { ...input, action: 'toggle' },
    { ...input, postId: 'wrong' },
  ])
    assert.equal((await f.put(invalid)).status, 400);
  assert.equal(f.writes(), 0);
});

void test('repeated active/inactive PUTs are idempotent and cannot modify another viewer state', async () => {
  for (const [action, table] of Object.entries(
    interactions.communityInteractionTables,
  )) {
    const original = { user_id: otherViewer, post_id: postId };
    const f = fixture(
      action === 'like' ? { likes: [original] } : { saves: [original] },
    );
    for (const active of [true, true, false, false]) {
      const response = await f.put({ postId, action, active });
      assert.equal(response.status, 200);
      assert.deepEqual(await json(response), { postId, action, active });
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(
        f.rows[table].filter((row) => row.user_id === viewer).length,
        active ? 1 : 0,
      );
      assert.equal(
        f.rows[table].filter((row) => row.user_id === otherViewer).length,
        1,
      );
    }
  }
});

void test('inactive, missing, review-only and bilaterally blocked posts reject interactions without writes', async () => {
  const cases = [
    fixture({ posts: [] }),
    fixture({ posts: [post(postId, { status: 'PENDING_REVIEW' })] }),
    fixture({ posts: [post(postId, { author_id: fixtureAuthor })] }),
    fixture({ blocks: [{ blocker_id: viewer, blocked_id: author }] }),
    fixture({ blocks: [{ blocker_id: author, blocked_id: viewer }] }),
  ];
  for (const f of cases) {
    for (const active of [true, false])
      assert.equal(
        (await f.put({ postId, action: 'save', active })).status,
        404,
      );
    assert.equal(f.writes(), 0);
  }
});

void test('block, post and mutation database failures never acknowledge a successful action', async () => {
  for (const options of [
    { errorTable: 'user_blocks' },
    { errorTable: 'community_posts' },
    { failMutation: true },
  ]) {
    const f = fixture(options);
    const response = await f.put({ postId, action: 'like', active: true });
    assert.equal(response.status, 503);
    assert.equal('active' in (await json<Row>(response)), false);
    assert.equal(f.writes(), 0);
    assert.equal(f.rows.community_post_likes.length, 0);
  }
});
