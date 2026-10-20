import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { completeNativeAuthCallback } from '../lib/supabase/native-auth.ts';

const callback = 'com.kreluna.cosmora://auth/callback';
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
} });

test('native PKCE uses the original flow verifier and exchanges duplicate deliveries once', async () => {
  let calls = 0;
  const client = { auth: { exchangeCodeForSession: async (code: string, options: { flowId: string }) => {
    calls++;
    assert.equal(code, 'oauth-code');
    assert.equal(options.flowId, 'oauth_flow_12345');
    return { data: { session: {}, redirectType: null }, error: null };
  } } } as unknown as SupabaseClient;
  const link = `${callback}?code=oauth-code&sb_flow_id=oauth_flow_12345`;
  assert.deepEqual(await Promise.all([
    completeNativeAuthCallback(link, client),
    completeNativeAuthCallback(link, client),
  ]), ['/profile/me', '/profile/me']);
  assert.equal(calls, 1);
  assert.ok(storage.get('cosmora-completed-auth-links')?.includes('flow:oauth_flow_12345'));
  assert.ok(!storage.get('cosmora-completed-auth-links')?.includes('oauth-code'));
});

test('a later password recovery deep link remains usable and opens password recovery', async () => {
  const client = { auth: { exchangeCodeForSession: async () => ({
    data: { session: {}, redirectType: 'recovery' }, error: null,
  }) } } as unknown as SupabaseClient;
  assert.equal(await completeNativeAuthCallback(
    `${callback}?code=recovery-code&sb_flow_id=recovery_flow_12345`, client,
  ), '/auth/recovery');
});

test('a completed launch flow is not exchanged after a reload', async () => {
  storage.set('cosmora-completed-auth-links', JSON.stringify(['flow:completed_flow_12345']));
  const client = { auth: { exchangeCodeForSession: async () => {
    assert.fail('must not exchange a completed callback again');
  } } } as unknown as SupabaseClient;
  assert.equal(await completeNativeAuthCallback(
    `${callback}?code=old-code&sb_flow_id=completed_flow_12345`, client,
  ), null);
});

test('provider errors and unconfirmed sessions never complete authentication', async () => {
  const client = { auth: { exchangeCodeForSession: async () => ({
    data: { session: null }, error: { message: 'expired code' },
  }) } } as unknown as SupabaseClient;
  await assert.rejects(completeNativeAuthCallback(`${callback}?error=access_denied`, client));
  await assert.rejects(completeNativeAuthCallback(`${callback}?code=invalid`, client));
});

test('installed Supabase SDK preserves the recovery destination through a persisted PKCE exchange', async () => {
  const saved = new Map<string, string>();
  const now = Math.floor(Date.now() / 1000);
  const token = [
    { alg: 'HS256', typ: 'JWT' },
    { sub: '00000000-0000-4000-8000-000000000001', exp: now + 3600, iat: now, role: 'authenticated' },
  ].map((part) => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.test-signature';
  let calls = 0;
  const client = createClient('https://example.supabase.co', 'public-test-key', {
    auth: {
      flowType: 'pkce', persistSession: true, autoRefreshToken: false,
      detectSessionInUrl: false, storageKey: 'native-auth-sdk-test',
      storage: {
        getItem: (key) => saved.get(key) ?? null,
        setItem: (key, value) => { saved.set(key, value); },
        removeItem: (key) => { saved.delete(key); },
      },
    },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      calls++;
      if (url.pathname === '/auth/v1/recover') {
        assert.equal(url.searchParams.get('redirect_to'), callback);
        assert.equal(JSON.parse(String(init?.body)).code_challenge_method, 's256');
        return new Response('{}', { status: 200 });
      }
      assert.equal(url.pathname, '/auth/v1/token');
      assert.equal(url.searchParams.get('grant_type'), 'pkce');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.auth_code, 'sdk-recovery-code');
      assert.ok(body.code_verifier.length >= 43);
      return new Response(JSON.stringify({
        access_token: token, refresh_token: 'test-refresh-token', expires_in: 3600,
        token_type: 'bearer', user: { id: '00000000-0000-4000-8000-000000000001' },
      }), { status: 200 });
    } },
  });
  const recovery = await client.auth.resetPasswordForEmail('test@example.invalid', { redirectTo: callback });
  assert.equal(recovery.error, null);
  assert.equal(await completeNativeAuthCallback(`${callback}?code=sdk-recovery-code`, client), '/auth/recovery');
  assert.equal(calls, 2);
  assert.ok((await client.auth.getSession()).data.session);
});
