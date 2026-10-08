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
