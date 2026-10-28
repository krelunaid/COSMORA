import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createModerationHandler,
  type ModerationDependencies,
} from '../supabase/functions/community-moderation/handler.ts';

const origin = 'https://software.kreluna.it';
const account = {
  id: '11111111-1111-4111-8111-111111111111',
  app_metadata: { cosmora_role: 'moderator' },
};
const decision = {
  targetType: 'POST',
  targetId: '22222222-2222-4222-8222-222222222222',
  action: 'APPROVE',
  reason: 'Contenuto conforme alle regole',
  expectedStatus: 'PENDING_REVIEW',
  reportIds: [],
};

function harness(overrides: Partial<ModerationDependencies> = {}) {
  const calls: unknown[][] = [];
  const handler = createModerationHandler(() => ({
    getUser: async (token) => {
      calls.push(['auth', token]);
      return { user: account, error: null };
    },
    isSuspended: async (id) => {
      calls.push(['suspended', id]);
      return false;
    },
    getQueue: async (view, offset) => {
      calls.push(['queue', view, offset]);
      return { items: [], more: false };
    },
    getHistory: async () => {
      calls.push(['history']);
      return { history: [] };
    },
    decide: async (actor, body) => {
      calls.push(['decision', actor, body]);
      return { data: { status: 'ACTIVE' }, error: null };
    },
    ...overrides,
  }));
  return { handler, calls };
}
function request(query = '', options: RequestInit = {}) {
  const headers = new Headers({
    origin,
    authorization: 'Bearer current-token',
    'content-type': 'application/json',
  });
  new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  return new Request(
    'https://example.supabase.co/functions/v1/community-moderation' + query,
    {
      ...options,
      headers,
    },
  );
}
const post = (body: unknown = decision) =>
  request('', { method: 'POST', body: JSON.stringify(body) });

void test('fresh role verification precedes queue access and actor is never supplied by the client', async () => {
  const { handler, calls } = harness();
  const response = await handler(
    post({
      ...decision,
      p_actor: 'attacker',
      reason: '  Contenuto conforme alle regole  ',
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    saved: true,
    result: { status: 'ACTIVE' },
  });
  assert.deepEqual(calls, [
    ['auth', 'current-token'],
    ['suspended', account.id],
    ['decision', account.id, decision],
  ]);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});

void test('dashboard-only, stale JWT roles and editable metadata never grant moderation access', async () => {
  const metadata = [
    { app_metadata: { cosmora_dashboard_access: true } },
    { app_metadata: {}, user_metadata: { cosmora_role: 'admin' } },
    { app_metadata: { cosmora_role: 'user' } },
    { app_metadata: { cosmora_role: ['moderator'] } },
    { app_metadata: {}, role: 'admin' },
  ];
  for (const entry of metadata) {
    const { handler, calls } = harness({
      getUser: async () => ({ user: { ...account, ...entry }, error: null }),
    });
    assert.equal((await handler(post())).status, 403, JSON.stringify(entry));
    assert.equal(calls.length, 0);
  }
  for (const role of ['admin', 'moderator']) {
    const { handler } = harness({
      getUser: async () => ({
        user: { ...account, app_metadata: { cosmora_role: role } },
        error: null,
      }),
    });
    assert.equal((await handler(request())).status, 200);
  }
});

void test('invalid, deleted, anonymous and suspended accounts cannot read or decide', async () => {
  for (const user of [
    null,
    { ...account, is_anonymous: true },
    {
      ...account,
      app_metadata: { ...account.app_metadata, deletion_pending: true },
    },
  ]) {
    const { handler, calls } = harness({
      getUser: async () => ({ user, error: null }),
    });
    for (const input of [request(), post()])
      assert.equal((await handler(input)).status, 401);
    assert.equal(calls.length, 0);
  }
  const invalid = harness({
    getUser: async () => ({ user: account, error: new Error('bad token') }),
  });
  assert.equal((await invalid.handler(post())).status, 401);
  const suspended = harness({ isSuspended: async () => true });
  assert.equal((await suspended.handler(post())).status, 403);
  assert.equal(
    suspended.calls.some(([name]) => name === 'decision'),
    false,
  );
});

void test('exact origin allowlist and OPTIONS do not access private data', async () => {
  for (const allowed of [origin, 'http://127.0.0.1:4330']) {
    const { handler, calls } = harness();
    const response = await handler(
      request('', { method: 'OPTIONS', headers: { origin: allowed } }),
    );
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), allowed);
    assert.equal(calls.length, 0);
  }
  for (const denied of [
    '',
    'null',
    'https://software.kreluna.it.evil.test',
    'http://localhost:4330',
  ]) {
    const { handler, calls } = harness();
    const response = await handler(
      request('', { headers: { origin: denied } }),
    );
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(calls.length, 0);
  }
});

void test('missing tokens and unsupported methods fail before backend access', async () => {
  for (const authorization of [
    '',
    'Basic abc',
    'Bearer ',
    'Bearer token with spaces',
  ]) {
    const { handler, calls } = harness();
    assert.equal(
      (await handler(request('', { headers: { authorization } }))).status,
      401,
    );
    assert.equal(calls.length, 0);
  }
  for (const method of ['PUT', 'PATCH', 'DELETE', 'HEAD']) {
    const { handler, calls } = harness();
    assert.equal((await handler(request('', { method }))).status, 405);
    assert.equal(calls.length, 0);
  }
});

void test('bounded views and pagination route to the correct authorized query', async () => {
  const { handler, calls } = harness();
  assert.equal((await handler(request('?view=hidden&offset=50'))).status, 200);
  assert.deepEqual(calls.at(-1), ['queue', 'hidden', 50]);
  assert.equal((await handler(request('?view=history'))).status, 200);
  assert.deepEqual(calls.at(-1), ['history']);
  for (const query of [
    '?view=users',
    '?view=hidden&view=history',
    '?offset=-1',
    '?offset=1.5',
    '?offset=1e2',
    '?offset=100001',
    '?offset=0&offset=1',
  ]) {
    const invalid = harness();
    assert.equal((await invalid.handler(request(query))).status, 400, query);
    assert.equal(invalid.calls.length, 0);
  }
});

void test('decision validation rejects invalid identifiers, state, reason, actions and report snapshots', async () => {
  const bad = [
    null,
    [],
    { ...decision, targetType: 'TABLE' },
    { ...decision, targetId: 'not-uuid' },
    { ...decision, action: 'DELETE' },
    { ...decision, expectedStatus: '' },
    { ...decision, expectedStatus: 'x'.repeat(31) },
    { ...decision, reason: '    ' },
    { ...decision, reason: 'abcd' },
    { ...decision, reason: 'x'.repeat(2001) },
    { ...decision, reason: 'valid\0invalid' },
    { ...decision, reportIds: ['not-uuid'] },
    { ...decision, reportIds: Array(101).fill(decision.targetId) },
    { ...decision, action: 'DISMISS' },
    { ...decision, action: 'RESOLVE' },
  ];
  for (const body of bad) {
    const { handler, calls } = harness();
    assert.equal((await handler(post(body))).status, 400);
    assert.equal(
      calls.some(([name]) => name === 'decision'),
      false,
    );
  }
});

void test('malformed, wrong-type and oversized request bodies cannot trigger a decision', async () => {
  for (const input of [
    request('', { method: 'POST', body: '{bad' }),
    request('', {
      method: 'POST',
      body: JSON.stringify(decision),
      headers: { 'content-type': 'text/plain' },
    }),
    post({ ...decision, ignored: 'x'.repeat(33000) }),
  ]) {
    const { handler, calls } = harness();
    assert.equal((await handler(input)).status, 400);
    assert.equal(
      calls.some(([name]) => name === 'decision'),
      false,
    );
  }
});

void test('atomic RPC rejects stale status and denied transitions without fallback writes', async () => {
  for (const [code, status] of [
    ['40001', 409],
    ['42501', 403],
    ['P0002', 404],
    ['22023', 400],
    ['XX000', 503],
  ] as const) {
    let writes = 0;
    const { handler } = harness({
      decide: async () => {
        writes++;
        return { data: null, error: { code } };
      },
    });
    const response = await handler(post());
    assert.equal(response.status, status);
    assert.equal(writes, 1);
    assert.equal((await response.text()).includes(code), false);
  }
});

void test('upstream failures fail closed with no sensitive error details', async () => {
  const fail = async () => {
    throw new Error('sensitive-user@example.test private-token');
  };
  for (const overrides of [
    { getUser: fail },
    { isSuspended: fail },
    { getQueue: fail },
    { getHistory: fail },
    { decide: fail },
  ]) {
    const { handler } = harness(overrides);
    const response = await handler(
      'decide' in overrides
        ? post()
        : request('getHistory' in overrides ? '?view=history' : ''),
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: 'Servizio non disponibile. Riprova tra poco.',
    });
  }
});
