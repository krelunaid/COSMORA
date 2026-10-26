import assert from 'node:assert/strict';
import test from 'node:test';
import { createThanksStore, createThanksTransport, shouldShowThanks, syncThanksReceipt, THANKS_RECEIPT_KEY, type ThanksSession, type ThanksTransport } from '../lib/community-thanks.ts';
import { communityThanksMessages } from '../lib/i18n/community-thanks.ts';
import { supportedLocales } from '../lib/i18n/config.ts';

const date = '2026-10-26T12:00:00.000Z';
const session = (id = 'account-a') => ({ access_token: `token-${id}`, user: { id, user_metadata: {} } }) as ThanksSession;
const store = () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  return { receipts: createThanksStore(() => storage), storage };
};
const remote = (id = 'account-a', readAt?: string): ThanksTransport => ({
  read: async () => ({ id, user_metadata: readAt ? { [THANKS_RECEIPT_KEY]: readAt } : {} }),
  write: async (_token, at) => ({ id, user_metadata: { [THANKS_RECEIPT_KEY]: at } }),
});

void test('existing and new registered accounts without a receipt see the message', async () => {
  for (const id of ['account-a', 'new-account']) assert.equal(await shouldShowThanks(session(id), remote(id), store().receipts), true);
});
void test('server receipt suppresses the message on a fresh device with stale session metadata', async () => {
  const local = store();
  assert.equal(await shouldShowThanks(session(), remote('account-a', date), local.receipts), false);
  assert.deepEqual(local.receipts.read('account-a'), { readAt: date, synced: true });
});
void test('dismissal is persisted across app restarts and isolated by account', async () => {
  const local = store();
  local.receipts.record('account-a', date);
  const restarted = createThanksStore(() => local.storage);
  assert.equal(await shouldShowThanks(session(), remote(), restarted), false);
  assert.equal(await shouldShowThanks(session('account-b'), remote('account-b'), restarted), true);
});
void test('failed acknowledgement stays dismissed locally and retries successfully later', async () => {
  const { receipts } = store();
  receipts.record('account-a', date);
  await syncThanksReceipt(session(), { ...remote(), write: async () => { throw new Error('offline'); } }, receipts);
  assert.deepEqual(receipts.read('account-a'), { readAt: date, synced: false });
  assert.equal(await shouldShowThanks(session(), remote(), receipts), false);
  assert.equal(receipts.read('account-a')?.synced, true);
});
void test('failed read defers the announcement without recording a dismissal', async () => {
  const { receipts } = store();
  assert.equal(await shouldShowThanks(session(), { ...remote(), read: async () => { throw new Error('offline'); } }, receipts), false);
  assert.equal(receipts.read('account-a'), null);
  assert.equal(await shouldShowThanks(session(), remote(), receipts), true);
});
void test('wrong-user and aborted responses cannot open the announcement or mark it read', async () => {
  const { receipts } = store();
  assert.equal(await shouldShowThanks(session(), remote('account-b'), receipts), false);
  const controller = new AbortController();
  const transport = { ...remote(), read: async () => { controller.abort(); return { id: 'account-a', user_metadata: {} }; } };
  assert.equal(await shouldShowThanks(session(), transport, receipts, controller.signal), false);
  assert.equal(receipts.read('account-a'), null);
  receipts.record('account-a', date);
  await syncThanksReceipt(session(), remote('account-b'), receipts);
  assert.equal(receipts.read('account-a')?.synced, false);
});
void test('dismissal during an in-flight read wins over a late unread response', async () => {
  const { receipts } = store();
  assert.equal(await shouldShowThanks(session(), { ...remote(), read: async () => {
    receipts.record('account-a', date); return { id: 'account-a', user_metadata: {} };
  } }, receipts), false);
});
void test('storage failure preserves dismissal in memory without affecting another account', async () => {
  const receipts = createThanksStore(() => { throw new Error('denied'); });
  receipts.record('account-a', date);
  assert.equal(await shouldShowThanks(session(), remote(), receipts), false);
  assert.equal(receipts.read('account-b'), null);
});
void test('transport uses the captured account token and only patches the thank-you preference', async () => {
  const requests: { token: string | null; body: unknown }[] = [];
  const transport = createThanksTransport({ url: 'https://thanks.example.test', apiKey: 'public-test-key', fetcher: async (url, init) => {
    assert.equal(url, 'https://thanks.example.test/auth/v1/user');
    requests.push({ token: new Headers(init?.headers).get('Authorization'), body: typeof init?.body === 'string' ? JSON.parse(init.body) : null });
    return Response.json({ id: 'account-a', user_metadata: { [THANKS_RECEIPT_KEY]: date } });
  } });
  const { receipts } = store();
  receipts.record('account-a', date);
  await syncThanksReceipt(session(), transport, receipts);
  assert.deepEqual(requests, [{ token: 'Bearer token-account-a', body: { data: { [THANKS_RECEIPT_KEY]: date } } }]);
  assert.equal(receipts.read('account-a')?.synced, true);
});
void test('a stalled transport is bounded, preserving the pending receipt', async () => {
  const transport = createThanksTransport({ url: 'https://thanks.example.test', apiKey: 'public-test-key', timeoutMs: 20, fetcher: () => new Promise(() => {}) });
  const { receipts } = store();
  receipts.record('account-a', date);
  await syncThanksReceipt(session(), transport, receipts);
  assert.equal(receipts.read('account-a')?.synced, false);
});
void test('all app languages contain the full message and an acknowledgement label', () => {
  for (const locale of supportedLocales) {
    const copy = communityThanksMessages[locale];
    assert.equal(copy.paragraphs.length, 3);
    for (const text of [copy.title, copy.intro, ...copy.paragraphs, copy.closing, copy.signoff, copy.signature, copy.continue]) assert.ok(text.trim());
  }
});
