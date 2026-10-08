import assert from 'node:assert/strict';
import test from 'node:test';
import { accountHttp, AccountRequestError } from '../lib/account-http.ts';

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
for (const [status, message, code] of [
  [401, 'Accedi per creare una crew.', 'AUTH_REQUIRED'],
  [400, 'Scegli una data futura e un luogo pubblico.', 'INVALID_CREW'],
  [503, 'Creazione non disponibile.', 'SERVICE_UNAVAILABLE'],
] as const) {
  test(`crew API errors preserve HTTP ${status} instead of treating every failure as login`, async (t) => {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => {
      calls++;
      return Response.json({ error: message, code }, { status });
    });
    await assert.rejects(accountHttp('/api/squads', { method: 'POST' }), (error: unknown) => {
      assert.ok(error instanceof AccountRequestError);
      assert.equal(error.status, status);
      assert.equal(error.code, code);
      assert.equal(error.message, message);
      assert.equal(error.status === 401, status === 401);
      return true;
    });
    assert.equal(calls, 1, 'crew creation must not retry automatically');
  });
}
test('slow requests terminate with an actionable error', async (t) => {
  t.mock.method(globalThis, 'fetch', (_path: RequestInfo | URL, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  await assert.rejects(accountHttp('/api/messages', {}, 5), /troppo tempo/);
});
test('network failures are readable', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(accountHttp('/api/messages', {}), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /Connessione non disponibile/);
    assert.equal(error instanceof AccountRequestError, false, 'a network outage must not request login');
    return true;
  });
});
