import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthFetch } from '../lib/supabase/auth-fetch.ts';

const supabaseUrl = 'https://cosmora-auth.example.test';
const authUrl = supabaseUrl + '/auth/v1/token?grant_type=refresh_token';

test('auth deadline rejects a fetch that never returns and aborts its signal', async () => {
  let signal: AbortSignal | null | undefined;
  const fetcher: typeof fetch = async (_input, init) => {
    signal = init?.signal;
    return new Promise(() => {});
  };
  const fetchAuth = createAuthFetch(supabaseUrl, fetcher, 20);
  await assert.rejects(fetchAuth(authUrl), { name: 'TimeoutError' });
  assert.equal(signal?.aborted, true);
});

test('auth deadline includes a response body that stalls after the headers', async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode('{"session":')); },
    cancel() { cancelled = true; },
  }), { headers: { 'Content-Type': 'application/json' } });
  const fetchAuth = createAuthFetch(supabaseUrl, async () => response, 20);
  await assert.rejects(fetchAuth(authUrl), { name: 'TimeoutError' });
  assert.equal(cancelled, true);
});

test('normal auth response preserves input, init, payload and response metadata', async (t) => {
  const caller = new AbortController();
  let added = 0;
  let removed = 0;
  const add = caller.signal.addEventListener.bind(caller.signal);
  const remove = caller.signal.removeEventListener.bind(caller.signal);
  t.mock.method(caller.signal, 'addEventListener', (...args: Parameters<typeof add>) => {
    added += args[0] === 'abort' ? 1 : 0;
    return add(...args);
  });
  t.mock.method(caller.signal, 'removeEventListener', (...args: Parameters<typeof remove>) => {
    removed += args[0] === 'abort' ? 1 : 0;
    return remove(...args);
  });
  const input = new Request(authUrl, { method: 'POST', body: '{"test":true}' });
  const headers = { 'X-Test': 'preserved' };
  let networkSignal: AbortSignal | null | undefined;
  const original = new Response('{"ok":true}', {
    status: 201, statusText: 'Created', headers: { 'Content-Type': 'application/json', 'X-Reply': 'preserved' },
  });
  Object.defineProperties(original, { url: { value: authUrl }, redirected: { value: true } });
  const fetcher: typeof fetch = async (received, init) => {
    assert.equal(received, input);
    assert.equal(init?.headers, headers);
    assert.equal(init?.credentials, 'omit');
    networkSignal = init?.signal;
    assert.notEqual(networkSignal, caller.signal);
    return original;
  };
  const result = await createAuthFetch(supabaseUrl, fetcher, 20)(input, {
    signal: caller.signal, headers, credentials: 'omit',
  });
  assert.equal(result.status, 201);
  assert.equal(result.statusText, 'Created');
  assert.equal(result.headers.get('X-Reply'), 'preserved');
  assert.equal(result.url, authUrl);
  assert.equal(result.redirected, true);
  assert.equal(result.type, original.type);
  assert.deepEqual(await result.json(), { ok: true });
  assert.equal(added, 1);
  assert.equal(removed, 1);
  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.equal(networkSignal?.aborted, false, 'successful response must clear its deadline');
});

test('a caller abort before fetch prevents the auth network request', async () => {
  const caller = new AbortController();
  const reason = new Error('Cancelled by caller');
  caller.abort(reason);
  let calls = 0;
  const fetchAuth = createAuthFetch(supabaseUrl, async () => { calls++; return Response.json({}); }, 20);
  await assert.rejects(fetchAuth(authUrl, { signal: caller.signal }), (error) => error === reason);
  assert.equal(calls, 0);
});

test('Request signal aborts an auth request while its body is arriving', async () => {
  const caller = new AbortController();
  const reason = new Error('Cancelled during response');
  let cancelled = false;
  const response = new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } }));
  const request = new Request(authUrl, { signal: caller.signal });
  const pending = createAuthFetch(supabaseUrl, async () => response, 1000)(request);
  const rejected = assert.rejects(pending, (error) => error === reason);
  await Promise.resolve();
  caller.abort(reason);
  await rejected;
  assert.equal(cancelled, true);
});

test('init signal replaces Request signal, and explicit null clears Request signal', async () => {
  const requestController = new AbortController();
  requestController.abort(new Error('Original request cancelled'));
  const request = new Request(authUrl, { signal: requestController.signal });
  const replacement = new AbortController();
  const fetchAuth = createAuthFetch(supabaseUrl, async (_input, init) => {
    assert.equal(init?.signal?.aborted, false);
    return Response.json({ ok: true });
  }, 20);
  assert.deepEqual(await (await fetchAuth(request, { signal: replacement.signal })).json(), { ok: true });
  assert.deepEqual(await (await fetchAuth(request, { signal: null })).json(), { ok: true });
});

test('only same-origin Auth API calls are bounded and buffered', async () => {
  for (const url of [
    supabaseUrl + '/rest/v1/profiles',
    supabaseUrl + '/storage/v1/object/photo.jpg',
    supabaseUrl + '/auth/v1-other',
    'https://other.example.test/auth/v1/token',
  ]) {
    const response = new Response(new ReadableStream<Uint8Array>());
    const caller = new AbortController();
    const init = { signal: caller.signal };
    const fetchAuth = createAuthFetch(supabaseUrl, async (input, received) => {
      assert.equal(input, url);
      assert.equal(received, init);
      return response;
    }, 20);
    assert.equal(await fetchAuth(url, init), response);
    assert.equal(response.bodyUsed, false);
    await response.body?.cancel();
  }
});
