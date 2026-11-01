import assert from 'node:assert/strict';
import test from 'node:test';
import { Capacitor } from '@capacitor/core';
import { apiFetch, resolveApiUrl } from '../lib/api-fetch.ts';

test('bundled apps use the production API and browser previews keep relative paths', () => {
  assert.equal(resolveApiUrl('/api/listings?q=cosplay&offset=12', true),
    'https://cosmora.kreluna.it/api/listings?q=cosplay&offset=12');
  assert.equal(resolveApiUrl('/api/listings?q=cosplay', false), '/api/listings?q=cosplay');
});

test('API transport rejects external destinations and paths that escape the API', () => {
  for (const path of ['https://evil.example/api/messages', '//evil.example/api/messages',
    '/api/../../other', '/api/%2e%2e/other', '/api/\\evil.example', '/marketplace']) {
    assert.throws(() => resolveApiUrl(path, true), /COSMORA API path/);
  }
});

test('web fetch semantics remain unchanged', async (t) => {
  t.mock.method(Capacitor, 'isNativePlatform', () => false);
  const options: RequestInit = { cache: 'no-store', headers: { Authorization: 'Bearer web-session' } };
  t.mock.method(globalThis, 'fetch', async (url: RequestInfo | URL, received: RequestInit) => {
    assert.equal(url, '/api/account');
    assert.equal(received, options);
    return Response.json({ ok: true });
  });
  await apiFetch('/api/account', options);
});

test('native Community routing preserves query and leaves unrelated API operations on the existing service', () => {
  const base = 'https://pwdpwgonvnuwmgfiidut.supabase.co/functions/v1/cosmora-community';
  assert.equal(resolveApiUrl('/api/community/posts?q=%23cosplay&offset=12&saved=1', true),
    base + '/api/community/posts?q=%23cosplay&offset=12&saved=1');
  assert.equal(resolveApiUrl('/api/community/posts/interaction', true, 'put'),
    base + '/api/community/posts/interaction');
  for (const [path, method] of [
    ['/api/community/posts', 'DELETE'],
    ['/api/community/posts/interaction', 'GET'], ['/api/community/posts/interaction', 'POST'],
    ['/api/community/posts/other', 'GET'], ['/api/community/postscript', 'GET'],
    ['/api/account/delete', 'POST'], ['/api/profiles', 'GET'], ['/api/messages', 'POST'],
  ]) {
    assert.equal(resolveApiUrl(path, true, method), 'https://cosmora.kreluna.it' + path);
  }
  assert.equal(resolveApiUrl('/api/community/posts?saved=1', false), '/api/community/posts?saved=1');
  assert.equal(resolveApiUrl('/api/community/posts/interaction', false, 'PUT'), '/api/community/posts/interaction');
});

test('native apiFetch dispatches only the intended Community operation and retains its bearer and body', async (t) => {
  t.mock.method(Capacitor, 'isNativePlatform', () => true);
  const requests: Array<{ url: string; method?: string }> = [];
  // In Node, CapacitorHttp's web implementation lets us observe dispatch without a network call.
  t.mock.method(globalThis, 'fetch', async (target: RequestInfo | URL, options?: RequestInit) => {
    const dispatchedUrl = typeof target === 'string' ? target : target instanceof URL ? target.href : target.url;
    requests.push({ url: dispatchedUrl, method: options?.method });
    assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer current-user');
    assert.equal(options?.body, body);
    const result = Response.json({ ok: true });
    Object.defineProperty(result, 'url', { value: dispatchedUrl });
    return result;
  });
  const body = JSON.stringify({ postId: 'post', action: 'save', active: true });
  const options = { method: 'PUT', body, headers: { Authorization: 'Bearer current-user' } };
  await apiFetch('/api/community/posts/interaction', options);
  await apiFetch('/api/community/posts', { ...options, method: 'POST' });
  assert.equal(requests[0].url,
    'https://pwdpwgonvnuwmgfiidut.supabase.co/functions/v1/cosmora-community/api/community/posts/interaction');
  assert.equal(requests[0].method, 'PUT');
  assert.equal(requests[1].url, 'https://pwdpwgonvnuwmgfiidut.supabase.co/functions/v1/cosmora-community/api/community/posts');
  assert.equal(requests[1].method, 'POST');
});
