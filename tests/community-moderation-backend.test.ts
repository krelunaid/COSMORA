import test from 'node:test';
import assert from 'node:assert/strict';
import { createModerationBackend } from '../supabase/functions/community-moderation/backend.ts';

type Query = {
  table: string;
  fields?: string;
  filters: Array<[string, unknown]>;
  range?: [number, number];
  limit?: number;
};
type Result = { data: unknown; error: null | { message: string } };
function fakeAdmin(
  resolve: (query: Query) => Result,
  sign: (bucket: string, paths: string[], expiry: number) => Result,
) {
  const queries: Query[] = [];
  const rpcCalls: unknown[][] = [];
  const admin = {
    from(table: string) {
      const query: Query = { table, filters: [] };
      const builder = {
        select(fields: string) {
          query.fields = fields;
          return builder;
        },
        in(field: string, values: unknown) {
          query.filters.push([field, values]);
          return builder;
        },
        eq(field: string, value: unknown) {
          query.filters.push([field, value]);
          return builder;
        },
        order() {
          return builder;
        },
        range(first: number, last: number) {
          query.range = [first, last];
          return builder;
        },
        limit(limit: number) {
          query.limit = limit;
          return builder;
        },
        maybeSingle() {
          return builder;
        },
        // The Supabase query builder is deliberately awaitable.
        // oxlint-disable-next-line unicorn/no-thenable
        then(
          fulfilled: (value: Result) => unknown,
          rejected: (reason: unknown) => unknown,
        ) {
          queries.push(query);
          return Promise.resolve(resolve(query)).then(fulfilled, rejected);
        },
      };
      return builder;
    },
    storage: {
      from: (bucket: string) => ({
        createSignedUrls: async (paths: string[], expiry: number) =>
          sign(bucket, paths, expiry),
      }),
    },
    auth: {
      getUser: async () => ({
        data: { user: { id: 'moderator' } },
        error: null,
      }),
      admin: {
        getUserById: async (id: string) => ({
          data: { user: { id } },
          error: null,
        }),
      },
    },
    rpc: async (name: string, payload: unknown) => {
      rpcCalls.push([name, payload]);
      return { data: { status: 'ACTIVE' }, error: null };
    },
  };
  return {
    backend: createModerationBackend(
      admin as unknown as Parameters<typeof createModerationBackend>[0],
    ),
    queries,
    rpcCalls,
  };
}

void test('queue retains reported active content, only reported message context, media ordering and unavailable protection', async () => {
  const signedCalls: unknown[][] = [];
  const reports = [
    {
      id: 'report1',
      target_type: 'POST',
      target_id: 'active-post',
      reason: 'SPAM',
      details: 'Review',
      created_at: '2026-10-01',
      context_message_id: 'message1',
      source: 'USER_REPORT',
    },
  ];
  const { backend, queries } = fakeAdmin(
    (q) => {
      if (q.table === 'reports') return { data: reports, error: null };
      if (q.table === 'profiles')
        return {
          data: [{ id: 'author', display_name: 'Public name' }],
          error: null,
        };
      if (q.table === 'community_posts')
        return {
          data: q.filters.some(([key]) => key === 'id')
            ? [
                {
                  id: 'active-post',
                  caption: 'Already published but reported',
                  status: 'ACTIVE',
                  author_id: 'author',
                },
              ]
            : [
                {
                  id: 'pending-post',
                  caption: 'Please review',
                  created_at: '2026-10-01T10:00:00Z',
                  status: 'PENDING_REVIEW',
                  author_id: 'author',
                  post_media: [
                    {
                      storage_path: 'second.jpg',
                      media_type: 'IMAGE',
                      sort_order: 2,
                    },
                    {
                      storage_path: 'first.mp4',
                      media_type: 'VIDEO',
                      sort_order: 1,
                    },
                  ],
                },
              ],
          error: null,
        };
      if (q.table === 'direct_messages')
        return {
          data: [
            {
              id: 'message1',
              body: 'Reported message',
              created_at: '2026-10-01',
            },
          ],
          error: null,
        };
      return { data: [], error: null };
    },
    (bucket, paths, expiry) => {
      signedCalls.push([bucket, paths, expiry]);
      return {
        data: [
          { signedUrl: 'https://signed.test/video' },
          { error: 'missing' },
        ],
        error: null,
      };
    },
  );
  const result = await backend.getQueue('pending', 0);
  assert.equal(result.items.length, 2);
  const pending = result.items.find(
    (item) => item.targetId === 'pending-post',
  )!;
  assert.equal(pending.mediaUnavailable, true);
  assert.equal(pending.authorDisplayName, 'Public name');
  assert.equal(pending.createdAt, '2026-10-01T10:00:00Z');
  assert.deepEqual(queries.find((q) => q.table === 'profiles')?.filters, [
    ['id', ['author']],
  ]);
  assert.equal(
    queries.find((q) => q.table === 'profiles')?.fields,
    'id,display_name',
  );
  assert.deepEqual(pending.media, [
    { url: 'https://signed.test/video', type: 'VIDEO' },
  ]);
  assert.deepEqual(signedCalls, [
    ['community-media', ['first.mp4', 'second.jpg'], 900],
  ]);
  const active = result.items.find((item) => item.targetId === 'active-post')!;
  assert.equal(active.reports[0].contextMessage?.body, 'Reported message');
  assert.deepEqual(
    queries.find((q) => q.table === 'direct_messages')?.filters,
    [['id', ['message1']]],
  );
  assert.equal(result.more, false);
});

void test('storage failure does not expose private paths or make incomplete media approvable', async () => {
  const { backend } = fakeAdmin(
    (q) => ({
      data:
        q.table === 'listings'
          ? [
              {
                id: 'listing1',
                status: 'pending_review',
                listing_images: [{ storage_path: 'private.jpg', position: 0 }],
              },
            ]
          : [],
      error: null,
    }),
    () => ({ data: null, error: { message: 'private path unavailable' } }),
  );
  const result = await backend.getQueue('pending', 0);
  assert.equal(result.items[0].mediaUnavailable, true);
  assert.deepEqual(result.items[0].media, []);
  assert.equal(JSON.stringify(result).includes('private.jpg'), false);
});

void test('missing reported profile falls back to authoritative Auth account and hides no unreported messages', async () => {
  const { backend, queries } = fakeAdmin(
    (q) => ({
      data:
        q.table === 'reports'
          ? [
              {
                id: 'r',
                target_type: 'USER',
                target_id: 'profileless',
                reason: 'OTHER',
                created_at: '2026-10-01',
                source: 'USER_BLOCK',
                details: 'Block notice',
              },
            ]
          : [],
      error: null,
    }),
    () => ({ data: [], error: null }),
  );
  const result = await backend.getQueue('pending', 0);
  assert.equal(result.items[0].targetType, 'USER');
  assert.equal(result.items[0].status, 'ACTIVE');
  assert.equal(result.items[0].reports[0].source, 'USER_BLOCK');
  assert.equal(
    queries.some((q) => q.table === 'direct_messages'),
    false,
  );
});

void test('hidden paging, bounded history and decision all preserve the original API semantics', async () => {
  const { backend, queries, rpcCalls } = fakeAdmin(
    (q) => ({
      data: q.table === 'user_moderation' ? [{ user_id: 'suspended' }] : [],
      error: null,
    }),
    () => ({ data: [], error: null }),
  );
  const queue = await backend.getQueue('hidden', 50);
  assert.deepEqual(
    queries.find((q) => q.table === 'user_moderation')?.range,
    [50, 99],
  );
  assert.equal(queue.items[0].status, 'SUSPENDED');
  await backend.getHistory();
  const history = queries.find((q) => q.table === 'moderation_actions')!;
  assert.equal(history.limit, 100);
  assert.equal(history.fields?.includes('moderator_id'), false);
  const decision = {
    targetType: 'POST' as const,
    targetId: 'post',
    action: 'REJECT' as const,
    reason: 'Spam e pubblicità indesiderata',
    expectedStatus: 'PENDING_REVIEW',
    reportIds: ['report'],
  };
  await backend.decide('verified-actor', decision);
  assert.deepEqual(rpcCalls, [
    [
      'cosmora_moderation_decision',
      {
        p_actor: 'verified-actor',
        p_target_type: 'POST',
        p_target_id: 'post',
        p_action: 'REJECT',
        p_reason: decision.reason,
        p_expected_status: 'PENDING_REVIEW',
        p_report_ids: ['report'],
      },
    ],
  ]);
});
