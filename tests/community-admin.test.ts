import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDashboardHandler, type DashboardDependencies } from '../supabase/functions/community-admin/handler.ts';

const origin = 'https://software.kreluna.it';
const account = { id: 'operator', is_anonymous: false, app_metadata: { cosmora_dashboard_access: true } };
const dashboard = { generatedAt: '2026-10-27T12:00:00Z', users: { items: [] } };

function harness(overrides: Partial<DashboardDependencies> = {}) {
  const calls: unknown[][] = [];
  const handler = createDashboardHandler(() => ({
    getUser: async (token) => { calls.push(['auth', token]); return { user: account, error: null }; },
    isSuspended: async (id) => { calls.push(['moderation', id]); return false; },
    getDashboard: async (q, page) => { calls.push(['rpc', q, page]); return dashboard; },
    ...overrides,
  }));
  return { handler, calls };
}

function request(query = '', options: RequestInit = {}) {
  return new Request('https://example.supabase.co/functions/v1/community-admin' + query, {
    ...options, headers: { origin, authorization: 'Bearer verified-token', ...options.headers },
  });
}

test('a scoped operator is freshly authenticated before moderation and dashboard access', async () => {
  const { handler, calls } = harness();
  const result = await handler(request('?q=literal%25_&page=2'));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), dashboard);
  assert.deepEqual(calls, [['auth', 'verified-token'], ['moderation', 'operator'], ['rpc', 'literal%_', 2]]);
  assert.equal(result.headers.get('cache-control'), 'private, no-store');
  assert.equal(result.headers.get('vary'), 'Origin');
  assert.equal(result.headers.get('access-control-allow-origin'), origin);
});

test('existing admin is allowed but moderator, string flags and editable metadata never grant access', async () => {
  const metadataCases = [
    { app_metadata: { cosmora_role: 'admin' }, status: 200 },
    { app_metadata: { cosmora_role: 'moderator' }, status: 403 },
    { app_metadata: { cosmora_dashboard_access: 'true' }, status: 403 },
    { app_metadata: {}, user_metadata: { cosmora_dashboard_access: true, cosmora_role: 'admin' }, status: 403 },
    { app_metadata: {}, role: 'admin', status: 403 },
  ];
  for (const { status, ...metadata } of metadataCases) {
    const { handler, calls } = harness({ getUser: async () => ({ user: { ...account, ...metadata }, error: null }) });
    assert.equal((await handler(request())).status, status);
    assert.equal(calls.some(([call]) => call === 'rpc'), status === 200);
  }
});

test('missing, forged, deleted and anonymous identities do not reach private data', async () => {
  const identities = [
    { user: null, error: null },
    { user: account, error: new Error('invalid token') },
    { user: { ...account, is_anonymous: true }, error: null },
    { user: { ...account, app_metadata: { ...account.app_metadata, deletion_pending: true } }, error: null },
  ];
  for (const identity of identities) {
    const { handler, calls } = harness({ getUser: async () => identity });
    assert.equal((await handler(request())).status, 401);
    assert.equal(calls.length, 0);
  }
  for (const authorization of ['', 'Basic abc', 'Bearer ', 'Bearer token with spaces']) {
    const { handler, calls } = harness();
    assert.equal((await handler(request('', { headers: { authorization } }))).status, 401);
    assert.equal(calls.length, 0);
  }
});

test('a claimed role in the bearer itself cannot override the authoritative user record', async () => {
  const forged = 'header.' + Buffer.from(JSON.stringify({ app_metadata: { cosmora_role: 'admin' } })).toString('base64url') + '.signature';
  const { handler, calls } = harness({ getUser: async () => ({ user: { ...account, app_metadata: {} }, error: null }) });
  assert.equal((await handler(request('', { headers: { authorization: 'Bearer ' + forged } }))).status, 403);
  assert.equal(calls.length, 0);
});

test('suspension and every upstream failure fail closed with sanitized errors', async () => {
  const blocked = harness({ isSuspended: async () => true });
  assert.equal((await blocked.handler(request())).status, 403);
  assert.equal(blocked.calls.some(([call]) => call === 'rpc'), false);
  const secret = 'private-token-and-email@example.test';
  const fail = async () => { throw new Error(secret); };
  for (const overrides of [{ getUser: fail }, { isSuspended: fail }, { getDashboard: fail }]) {
    const { handler } = harness(overrides);
    const response = await handler(request());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'unavailable' });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('only exact approved origins are accepted; preflight reads no account data', async () => {
  for (const allowed of [origin, 'http://127.0.0.1:4330']) {
    const { handler, calls } = harness();
    const response = await handler(request('', { method: 'OPTIONS', headers: { origin: allowed, authorization: '' } }));
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), allowed);
    assert.equal(calls.length, 0);
  }
  for (const denied of ['null', 'https://evil.example', 'https://software.kreluna.it.evil.example', 'http://localhost:4330', '']) {
    const { handler, calls } = harness();
    const response = await handler(request('', { headers: { origin: denied } }));
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(calls.length, 0);
  }
});

test('write methods never authenticate or invoke the backend', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']) {
    const { handler, calls } = harness();
    assert.equal((await handler(request('', { method }))).status, 405);
    assert.equal(calls.length, 0);
  }
});

test('search and pagination bounds reject oversized, ambiguous or malformed requests', async () => {
  for (const query of ['?q=' + 'x'.repeat(101), '?q=%00', '?page=0', '?page=-1', '?page=1.5', '?page=10001', '?page=1e2', '?page=', '?page=01', '?q=a&q=b', '?page=1&page=2']) {
    const { handler, calls } = harness();
    assert.equal((await handler(request(query))).status, 400, query);
    assert.equal(calls.length, 0);
  }
  const { handler } = harness();
  assert.equal((await handler(request('?q=' + 'x'.repeat(100) + '&page=10000'))).status, 200);
});

test('Edge adapter keeps the privileged key server-only and bounds all Supabase fetches', () => {
  const source = readFileSync(new URL('../supabase/functions/community-admin/index.ts', import.meta.url), 'utf8');
  assert.match(source, /Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
  assert.match(source, /AbortSignal\.timeout\(8000\)/);
  assert.match(source, /admin\.auth\.getUser\(token\)/);
  assert.doesNotMatch(source, /console\.|NEXT_PUBLIC_|user_metadata|\.getSession\(/);
});
