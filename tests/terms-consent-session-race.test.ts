import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import {
  createTermsConsent, createTermsConsentStore, createTermsConsentSynchronizer,
  writeTermsConsentMetadata,
} from '../lib/terms-consent.ts';

void test('SDK session A→B race writes with captured token A and never changes singleton session B', async () => {
  const userA = { id: '00000000-0000-4000-8000-000000000001', email: 'a@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const userB = { ...userA, id: '00000000-0000-4000-8000-000000000002', email: 'b@example.test', user_metadata: {} };
  const users = new Map([[userA.id, userA], [userB.id, userB]]);
  const writes: string[] = [];
  const token = (id: string) => [
    { alg: 'HS256', typ: 'JWT' },
    { sub: id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated', role: 'authenticated' },
  ].map((part) => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.test-signature';
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    assert.ok(typeof init?.body === 'string');
    if (url.pathname === '/auth/v1/token') {
      const body = JSON.parse(init.body) as { email: string };
      const user = body.email === userA.email ? userA : userB;
      return Response.json({ access_token: token(user.id), refresh_token: 'test-refresh-' + user.id,
        token_type: 'bearer', expires_in: 3600, user });
    }
    assert.equal(url.pathname, '/auth/v1/user');
    assert.equal(init?.method, 'PUT');
    const authorization = new Headers(init?.headers).get('authorization')!;
    const bearer = authorization.slice('Bearer '.length);
    const subject = (JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()) as { sub: string }).sub;
    writes.push(subject);
    const user = users.get(subject)!;
    user.user_metadata = (JSON.parse(init.body) as { data: Record<string, unknown> }).data;
    return Response.json(user);
  };
  const client = createClient('https://terms.example.test', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetcher },
  });
  await client.auth.signInWithPassword({ email: userA.email, password: 'test-only' });
  const getSession = client.auth.getSession.bind(client.auth);
  let switched = false;
  client.auth.getSession = async () => {
    const result = await getSession();
    if (!switched) {
      switched = true;
      await client.auth.signInWithPassword({ email: userB.email, password: 'test-only' });
    }
    return result;
  };
  const values = new Map<string, string>();
  const store = createTermsConsentStore(() => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  }));
  store.record(createTermsConsent(true, 'it', 'google')!);
  const sync = createTermsConsentSynchronizer(store, (accessToken, receipt) => writeTermsConsentMetadata(accessToken, receipt, {
    url: 'https://terms.example.test', apiKey: 'public-test-key', fetch: fetcher,
  }));
  await sync(client, userA, true);
  assert.deepEqual(writes, [userA.id]);
  assert.deepEqual(userB.user_metadata, {});
  assert.ok('cosmora_terms_consent' in userA.user_metadata);
  assert.equal((await getSession()).data.session?.user.id, userB.id);
  assert.equal(store.accepted(userA.id)?.userId, userA.id);
  assert.equal(store.accepted(userB.id), null);
});

void test('a response for another user never marks the consent as synchronized', async () => {
  const values = new Map<string, string>();
  const store = createTermsConsentStore(() => ({ getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } }));
  store.record(createTermsConsent(true, 'it', 'google')!);
  const user = { id: 'a', user_metadata: {} };
  const client = { auth: { getSession: async () => ({ data: { session: { user, access_token: 'token-a' } }, error: null }) } } as unknown as Parameters<ReturnType<typeof createTermsConsentSynchronizer>>[0];
  await createTermsConsentSynchronizer(store, async () => ({ id: 'b' }))(client, user, true);
  assert.equal(store.accepted('a'), null);
  assert.equal(store.pending()?.userId, 'a');
});
