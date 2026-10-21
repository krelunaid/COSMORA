import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient, type AuthChangeEvent, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { getSessionWithTimeout, observeSession, waitForAuth } from '../lib/supabase/session.ts';

type SessionResult = Awaited<ReturnType<SupabaseClient['auth']['getSession']>>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((accept, refuse) => { resolve = accept; reject = refuse; });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const result = (session: Session | null): SessionResult => session
  ? { data: { session }, error: null }
  : { data: { session: null }, error: null };
function session(id: string): Session {
  return {
    access_token: `test-access-${id}`, refresh_token: `test-refresh-${id}`,
    token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id, aud: 'authenticated', role: 'authenticated', created_at: '2026-01-01T00:00:00Z',
      app_metadata: {}, user_metadata: {} },
  };
}

function fixture() {
  const initial = deferred<SessionResult>();
  let listener: (event: AuthChangeEvent, session: Session | null) => void = () => undefined;
  let unsubscribed = 0;
  let calls = 0;
  const client = { auth: {
    getSession: () => { calls++; return initial.promise; },
    onAuthStateChange: (callback: typeof listener) => {
      listener = callback;
      return { data: { subscription: { unsubscribe: () => { unsubscribed++; } } } };
    },
  } } as unknown as SupabaseClient;
  // Retain the callback after unsubscribe to model an already queued auth event.
  return { client, initial, emit: (event: AuthChangeEvent, value: Session | null) => listener(event, value),
    unsubscribed: () => unsubscribed, calls: () => calls };
}

void test('a session check that never settles reports an error and remains subscribed for recovery', async (t) => {
  const f = fixture();
  const failed = deferred<void>();
  const sessions: Array<Session | null> = [];
  let errors = 0;
  const stop = observeSession(f.client, (value) => sessions.push(value), () => {
    errors++; failed.resolve();
  }, { timeoutMs: 10 });
  t.after(stop);
  await failed.promise;
  assert.equal(errors, 1);
  assert.deepEqual(sessions, [], 'a timeout must not be treated as a signed-out session');
  assert.equal(f.unsubscribed(), 0);
  const recovered = session('recovered-user');
  f.emit('TOKEN_REFRESHED', recovered);
  assert.deepEqual(sessions, [recovered]);
  f.initial.resolve(result(session('stale-bootstrap-user')));
  await flush();
  assert.deepEqual(sessions, [recovered]);
  assert.equal(errors, 1);
});

void test('a late initial session cannot overwrite a newer signed-in user', async (t) => {
  const f = fixture();
  const seen: Array<{ id: string | null; event?: AuthChangeEvent }> = [];
  const stop = observeSession(f.client, (value, event) => seen.push({ id: value?.user.id ?? null, event }),
    () => assert.fail('a successful bootstrap should not report an error'));
  t.after(stop);
  await flush();
  f.emit('SIGNED_IN', session('new-user'));
  f.initial.resolve(result(session('old-user')));
  await flush();
  assert.deepEqual(seen, [{ id: 'new-user', event: 'SIGNED_IN' }]);
});

void test('a late initial session cannot restore a user after a sign-out event', async (t) => {
  const f = fixture();
  const seen: Array<Session | null> = [];
  const stop = observeSession(f.client, (value) => seen.push(value), () => assert.fail('unexpected error'));
  t.after(stop);
  await flush();
  f.emit('SIGNED_OUT', null);
  f.initial.resolve(result(session('previous-user')));
  await flush();
  assert.deepEqual(seen, [null]);
});

void test('a stale bootstrap failure does not replace a newer successful auth event with an error', async (t) => {
  const f = fixture();
  const seen: Array<Session | null> = [];
  let errors = 0;
  const stop = observeSession(f.client, (value) => seen.push(value), () => { errors++; });
  t.after(stop);
  await flush();
  const current = session('current-user');
  f.emit('SIGNED_IN', current);
  f.initial.reject(new Error('old bootstrap failed'));
  await flush();
  assert.deepEqual(seen, [current]);
  assert.equal(errors, 0);
});

void test('unsubscribe ignores both late bootstrap completion and queued auth callbacks', async () => {
  const f = fixture();
  const seen: Array<Session | null> = [];
  let errors = 0;
  const stop = observeSession(f.client, (value) => seen.push(value), () => { errors++; });
  await flush();
  stop();
  assert.equal(f.unsubscribed(), 1);
  f.initial.resolve(result(session('late-user')));
  f.emit('SIGNED_IN', session('queued-user'));
  await flush();
  assert.deepEqual(seen, []);
  assert.equal(errors, 0);
});

void test('a caller already aborted never starts the auth operation', async () => {
  const controller = new AbortController();
  const cancellation = new Error('caller cancelled');
  controller.abort(cancellation);
  let calls = 0;
  await assert.rejects(waitForAuth(async () => { calls++; return 'unused'; }, { signal: controller.signal }),
    (error: unknown) => error === cancellation);
  assert.equal(calls, 0);
});

void test('caller abort during a wait rejects promptly and ignores a late success', async () => {
  const controller = new AbortController();
  const pending = deferred<string>();
  const operation = waitForAuth(() => pending.promise, { signal: controller.signal });
  await flush();
  const cancellation = new Error('screen closed');
  controller.abort(cancellation);
  await assert.rejects(operation, (error: unknown) => error === cancellation);
  pending.resolve('late result');
  await flush();
});

void test('a successful empty session is delivered as signed out without an error', async (t) => {
  const f = fixture();
  const seen: Array<Session | null> = [];
  const stop = observeSession(f.client, (value) => seen.push(value), () => assert.fail('unexpected error'));
  t.after(stop);
  f.initial.resolve(result(null));
  await flush();
  assert.deepEqual(seen, [null]);
  assert.equal(f.calls(), 1);
});

void test('a thrown auth operation preserves its error and allows an independent retry', async () => {
  const failure = new Error('storage temporarily unavailable');
  await assert.rejects(waitForAuth(() => { throw failure; }), (error: unknown) => error === failure);
  assert.equal(await waitForAuth(async () => 'recovered'), 'recovered');
});

void test('real Supabase expired-session refresh can time out without erasing credentials, then recover', async (t) => {
  const storageKey = 'cosmora-session-recovery-test';
  const expired = { ...session('f30c1999-0536-4fb9-a5ee-694f9d171c43'), expires_at: Math.floor(Date.now() / 1000) - 3600 };
  const values = new Map([[storageKey, JSON.stringify(expired)]]);
  const response = deferred<Response>();
  const requests: string[] = [];
  const recovered = session(expired.user.id);
  const client = createClient('https://session-recovery.example.test', 'test-public-anon-key', {
    auth: {
      storageKey, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
      storage: { getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => { values.set(key, value); },
        removeItem: (key) => { values.delete(key); } },
    },
    global: { fetch: async (input) => { requests.push(String(input)); return response.promise; } },
  });
  t.after(async () => {
    response.resolve(new Response(JSON.stringify(recovered), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await client.auth.dispose();
  });
  await assert.rejects(getSessionWithTimeout(client, { timeoutMs: 20 }), /troppo tempo/);
  assert.equal(requests.length, 1, 'the SDK must actually attempt token refresh');
  assert.match(requests[0], /\/auth\/v1\/token\?grant_type=refresh_token$/);
  assert.equal(JSON.parse(values.get(storageKey)!).refresh_token, expired.refresh_token,
    'a UI timeout must preserve the stored session for a later retry');
  response.resolve(new Response(JSON.stringify(recovered), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const retry = await getSessionWithTimeout(client, { timeoutMs: 1000 });
  assert.equal(retry.error, null);
  assert.equal(retry.data.session?.user.id, expired.user.id);
  assert.equal(retry.data.session?.access_token, recovered.access_token);
  assert.equal(requests.length, 1, 'the timeout must not launch a duplicate refresh request');
});
