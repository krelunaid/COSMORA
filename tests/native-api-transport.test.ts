import assert from 'node:assert/strict';
import test from 'node:test';
import type { HttpOptions, HttpResponse } from '@capacitor/core';
import { nativeApiFetch, NATIVE_API_TIMEOUT_MS } from '../lib/native-api-transport.ts';

const url = 'https://cosmora.kreluna.it/api/account';
const response = (overrides: Partial<HttpResponse> = {}): HttpResponse => ({
  url, status: 200, data: { ok: true }, headers: { 'content-type': 'application/json' }, ...overrides,
});

test('native JSON requests restrict headers and disable redirects with bounded timeouts', async () => {
  const body = JSON.stringify({ name: 'Léa', enabled: true });
  const result = await nativeApiFetch(url, { method: 'PATCH', body, credentials: 'include',
    headers: { Authorization: 'Bearer test-session', 'content-type': 'application/json' } }, async (options) => {
    assert.equal(options.url, url);
    assert.equal(options.method, 'PATCH');
    assert.equal(options.data, body);
    assert.equal(options.headers?.authorization, 'Bearer test-session');
    assert.equal(options.headers?.['Content-Type'], 'application/json');
    assert.equal(options.headers?.['Cache-Control'], 'no-store');
    assert.equal(options.disableRedirects, true);
    assert.equal(options.readTimeout, NATIVE_API_TIMEOUT_MS);
    assert.equal(options.connectTimeout, NATIVE_API_TIMEOUT_MS);
    assert.equal(options.webFetchExtra, undefined);
    assert.equal('credentials' in options, false);
    assert.equal(Object.keys(options.headers!).some((name) => name.toLowerCase() === 'cookie'), false);
    return response();
  });
  assert.deepEqual(await result.json(), { ok: true });
});

test('multipart carries repeated keys, Unicode values and exact file bytes in native format', async () => {
  const body = new FormData();
  const bytes = Uint8Array.from({ length: 50_001 }, (_, index) => index % 256);
  body.append('caption', 'La mia armatura 🛡️');
  body.append('photos', new Blob([bytes], { type: 'image/jpeg' }), 'étoile.jpg');
  body.append('photos', new Blob(['second'], { type: 'image/png' }), 'second.png');
  body.append('quoted"\r\n', new Blob([], { type: '' }), 'unsafe"\r\n.jpg');
  await nativeApiFetch(url, { method: 'POST', body, headers: { Authorization: 'Bearer test' } }, async (options) => {
    assert.equal(options.dataType, 'formData');
    assert.equal(options.headers?.['Content-Type'], 'multipart/form-data');
    const entries = options.data as Array<Record<string, string>>;
    assert.deepEqual(entries[0], { key: 'caption', value: 'La mia armatura 🛡️', type: 'string' });
    assert.equal(entries.filter((entry) => entry.key === 'photos').length, 2);
    assert.equal(entries[1].type, 'base64File');
    assert.equal(entries[1].fileName, '%C3%A9toile.jpg');
    assert.equal(entries[1].contentType, 'image/jpeg');
    assert.deepEqual(new Uint8Array(Buffer.from(entries[1].value, 'base64')), bytes);
    assert.equal(Buffer.from(entries[2].value, 'base64').toString(), 'second');
    assert.equal(entries[3].key, 'quoted%22%0D%0A');
    assert.equal(entries[3].fileName, 'unsafe%22%0D%0A.jpg');
    assert.equal(entries[3].value, '');
    assert.equal(entries[3].contentType, 'application/octet-stream');
    return response();
  });
});

test('native transport rejects external URLs, credential headers and unsupported request shapes before sending', async () => {
  let calls = 0;
  const request = async () => { calls++; return response(); };
  for (const candidate of ['https://evil.example/api/account', 'https://cosmora.kreluna.it/api/../account',
    'https://user:secret@cosmora.kreluna.it/api/account', url + '#fragment']) {
    await assert.rejects(nativeApiFetch(candidate, {}, request), /COSMORA API URL/);
  }
  const invalidRequests: RequestInit[] = [
    { headers: { Cookie: 'session=secret' } }, { headers: { Host: 'evil.example' } },
    { headers: { Authorization: 'Basic password' } }, { method: 'TRACE' },
    { method: 'GET', body: 'unexpected' }, { method: 'POST', body: new Blob(['unsupported']) },
  ];
  for (const options of invalidRequests) await assert.rejects(nativeApiFetch(url, options, request), TypeError);
  assert.equal(calls, 0);
});

test('HTTP errors preserve status and JSON for the existing account error handling', async () => {
  const result = await nativeApiFetch(url, {}, async () => response({ status: 401,
    data: { error: 'Accedi per continuare.', code: 'auth_required' },
    headers: { 'content-type': 'application/json', 'content-length': '999',
      'content-encoding': 'gzip', 'Set-Cookie': 'secret=value', 'x-request-id': 'review' } }));
  assert.equal(result.status, 401);
  assert.equal(result.ok, false);
  assert.deepEqual(await result.json(), { error: 'Accedi per continuare.', code: 'auth_required' });
  assert.equal(result.headers.get('x-request-id'), 'review');
  assert.equal(result.headers.has('set-cookie'), false);
  assert.equal(result.headers.has('content-length'), false);
  assert.equal(result.headers.has('content-encoding'), false);
});

test('non-JSON errors, empty responses and HEAD retain fetch-compatible bodies', async () => {
  const error = await nativeApiFetch(url, {}, async () => response({ status: 503,
    data: '<html>Unavailable</html>', headers: { 'content-type': 'text/html' } }));
  assert.equal(error.status, 503);
  await assert.rejects(error.json(), SyntaxError);
  for (const [method, status] of [['DELETE', 204], ['HEAD', 200]] as const) {
    const empty = await nativeApiFetch(url, { method }, async () => response({ status }));
    assert.equal(await empty.text(), '');
  }
});

test('native redirect and changed response URL fail without a second request', async () => {
  for (const value of [response({ status: 302 }), response({ url: 'https://evil.example/api/account' }),
    response({ url: url + '?redirected=1' })]) {
    let calls = 0;
    await assert.rejects(nativeApiFetch(url, { method: 'POST', body: '{}' }, async () => {
      calls++; return value;
    }), TypeError);
    assert.equal(calls, 1);
  }
});

test('already-aborted requests never reach native HTTP', async () => {
  let calls = 0;
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(nativeApiFetch(url, { signal: controller.signal }, async () => {
    calls++; return response();
  }), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('abort while serializing a file does not start an upload later', async (t) => {
  let calls = 0;
  let finishRead!: (value: ArrayBuffer) => void;
  t.mock.method(Blob.prototype, 'arrayBuffer', () => new Promise<ArrayBuffer>((resolve) => { finishRead = resolve; }));
  const body = new FormData();
  body.append('photo', new Blob(['photo']), 'photo.jpg');
  const controller = new AbortController();
  const pending = nativeApiFetch(url, { method: 'POST', body, signal: controller.signal }, async () => {
    calls++; return response();
  });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  finishRead(new ArrayBuffer(0));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 0);
});

test('abort after dispatch rejects the consumer and ignores the eventual native result without retry', async () => {
  let finishRequest!: (value: HttpResponse) => void;
  let notifyStart!: () => void;
  let calls = 0;
  const started = new Promise<void>((resolve) => { notifyStart = resolve; });
  const controller = new AbortController();
  const pending = nativeApiFetch(url, { method: 'POST', body: '{}', signal: controller.signal }, () => {
    calls++; notifyStart();
    return new Promise((resolve) => { finishRequest = resolve; });
  });
  await started;
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  finishRequest(response());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
});

test('a stalled native request has a consumer deadline and is never retried', async () => {
  let calls = 0;
  await assert.rejects(nativeApiFetch(url, {}, async (options: HttpOptions) => {
    calls++;
    assert.equal(options.readTimeout, 5);
    assert.equal(options.connectTimeout, 5);
    return new Promise(() => {});
  }, 5), { name: 'TimeoutError' });
  assert.equal(calls, 1);
});

test('native network rejections retain the existing readable network-error path', async () => {
  await assert.rejects(nativeApiFetch(url, {}, async () => { throw new Error('native offline'); }), TypeError);
});
