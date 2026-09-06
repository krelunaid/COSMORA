import assert from 'node:assert/strict';
import test from 'node:test';
import { accountHttp } from '../lib/account-http.ts';

test('account HTTP preserves authorization and disables caching', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_path: RequestInfo | URL, options: RequestInit) => {
    assert.equal(options.cache, 'no-store');
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test');
    return Response.json({ ok: true });
  });
  assert.deepEqual(await accountHttp('/api/messages', { headers: { Authorization: 'Bearer test' } }), { ok: true });
});
test('non-JSON server errors are readable and mutations are not retried', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('<html>Unavailable</html>', { status: 503 }); });
  await assert.rejects(accountHttp('/api/messages', { method: 'POST' }), /temporaneamente non disponibile/);
  assert.equal(calls, 1);
});
test('API validation errors remain visible', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Non puoi contattare questo utente.' }, { status: 403 }));
  await assert.rejects(accountHttp('/api/messages', {}), /Non puoi contattare/);
});
test('slow requests terminate with an actionable error', async (t) => {
  t.mock.method(globalThis, 'fetch', (_path: RequestInfo | URL, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  await assert.rejects(accountHttp('/api/messages', {}, 5), /troppo tempo/);
});
test('network failures are readable', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(accountHttp('/api/messages', {}), /Connessione non disponibile/);
});
