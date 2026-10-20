import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  TERMS_VERSION,
  createTermsConsent,
  createTermsConsentStore,
  createTermsConsentSynchronizer,
  termsConsentMetadata,
  setAccountDeletionLogin,
  consumeAccountDeletionLogin,
} from '../lib/terms-consent.ts';
import { authRedirect } from '../lib/supabase/auth-redirect.ts';

function storageFixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  return { values, storage, store: createTermsConsentStore(() => storage) };
}
const receipt = () => createTermsConsent(true, 'it', 'google')!;
const user = { id: 'user-one', email: 'one@example.test', user_metadata: {} } as User;
function clientFixture(currentUser: User = user, update?: () => Promise<{ error: unknown }>) {
  let updates = 0;
  const payloads: unknown[] = [];
  const client = { auth: {
    getSession: async () => ({ data: { session: { user: currentUser, access_token: 'token-' + currentUser.id } }, error: null }),
    updateUser: () => { assert.fail('Never mutate the singleton auth session'); },
  } } as unknown as SupabaseClient;
  const write = async (accessToken: string, consent: Parameters<typeof termsConsentMetadata>[0]) => {
    assert.equal(accessToken, 'token-' + currentUser.id);
    updates++;
    payloads.push(termsConsentMetadata(consent));
    const result = update ? await update() : { error: null };
    return result.error ? null : { id: currentUser.id };
  };
  return { client, write, payloads, updates: () => updates };
}

void test('only affirmative acceptance creates a versioned receipt without marketing or authorization claims', () => {
  assert.equal(createTermsConsent(false, 'it', 'google'), null);
  const consent = createTermsConsent(true, 'it', 'email-register', new Date('2026-10-06T12:00:00.000Z'))!;
  assert.deepEqual(termsConsentMetadata(consent), { cosmora_terms_consent: {
    version: TERMS_VERSION, accepted_at: '2026-10-06T12:00:00.000Z', locale: 'it', source: 'email-register',
  } });
});

void test('local receipt survives OAuth reloads and rejects old versions, corrupt data and expired attempts', () => {
  const { values, storage, store } = storageFixture();
  const consent = receipt();
  store.record(consent);
  assert.deepEqual(createTermsConsentStore(() => storage).pending(), consent);
  assert.equal(store.pending(Date.parse(consent.acceptedAt) + 86_400_001), null);
  const key = [...values.keys()][0];
  storage.setItem(key, JSON.stringify({ pending: { ...consent, version: 'old' } }));
  assert.equal(store.pending(), null);
  storage.setItem(key, 'not-json');
  assert.equal(createTermsConsentStore(() => storage).pending(), null);
});

void test('storage denial and quota failures retain an in-memory receipt for the current login', () => {
  for (const getStorage of [
    () => { throw new Error('Storage denied'); },
    () => ({ getItem: () => null, setItem: () => { throw new Error('Quota'); }, removeItem: () => undefined }),
  ]) {
    const store = createTermsConsentStore(getStorage);
    const consent = receipt();
    store.record(consent);
    assert.deepEqual(store.pending(), consent);
  }
});

void test('initial sessions cannot attach an unbound consent to an already signed-in account', async () => {
  const { store } = storageFixture();
  store.record(receipt());
  const fake = clientFixture();
  await createTermsConsentSynchronizer(store, fake.write)(fake.client, user);
  assert.equal(fake.updates(), 0);
  assert.ok(store.pending());
});

void test('email consent only follows the matching authenticated email and account', async () => {
  const { store } = storageFixture();
  store.record(createTermsConsent(true, 'it', 'email-login')!, '  ONE@example.test ');
  const fake = clientFixture();
  const sync = createTermsConsentSynchronizer(store, fake.write);
  await sync(fake.client, { ...user, email: 'other@example.test' }, true);
  assert.equal(fake.updates(), 0);
  await sync(fake.client, user, true);
  assert.equal(fake.updates(), 1);
  assert.equal(store.pending(), null);
  assert.equal(store.accepted(user.id)?.userId, user.id);
  assert.equal(store.accepted(user.id)?.expectedEmail, undefined);
  assert.equal(store.accepted('different-user'), null);
});

void test('a changed session never updates the other account', async () => {
  const { store } = storageFixture();
  store.record(receipt());
  const fake = clientFixture({ ...user, id: 'other-user' });
  await createTermsConsentSynchronizer(store, fake.write)(fake.client, user, true);
  assert.equal(fake.updates(), 0);
  assert.equal(store.pending()?.userId, user.id);
});

void test('repeated auth events share one metadata update and do not loop on USER_UPDATED', async () => {
  const { store } = storageFixture();
  store.record(receipt());
  let finish!: () => void;
  const pending = new Promise<{ error: null }>((resolve) => { finish = () => resolve({ error: null }); });
  const fake = clientFixture(user, () => pending);
  const sync = createTermsConsentSynchronizer(store, fake.write);
  const first = sync(fake.client, user, true);
  const second = sync(fake.client, user, true);
  assert.equal(first, second);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fake.updates(), 1);
  finish();
  await first;
  await sync(fake.client, user, true);
  assert.equal(fake.updates(), 1);
  assert.equal(store.pending(), null);
});

void test('metadata failure keeps the local receipt, does not reject authentication and retries only after reload', async () => {
  const { store } = storageFixture();
  store.record(receipt());
  const fake = clientFixture(user, async () => { throw new Error('Offline'); });
  const sync = createTermsConsentSynchronizer(store, fake.write);
  await sync(fake.client, user, true);
  await sync(fake.client, user, true);
  assert.equal(fake.updates(), 1);
  assert.equal(store.pending()?.userId, user.id);
  const recovered = clientFixture();
  await createTermsConsentSynchronizer(store, recovered.write)(recovered.client, user);
  assert.equal(recovered.updates(), 1);
  assert.equal(store.pending(), null);
});

void test('signup metadata already stored on the user does not cause an unnecessary update', async () => {
  const { store } = storageFixture();
  const consent = receipt();
  store.record(consent);
  const fake = clientFixture({ ...user, user_metadata: termsConsentMetadata(consent) });
  await createTermsConsentSynchronizer(store, fake.write)(fake.client, user, true);
  assert.equal(fake.updates(), 0);
  assert.equal(store.pending(), null);
});

void test('finishing an older sync never discards a newer acceptance', async () => {
  const { store } = storageFixture();
  const first = receipt();
  const second = { ...first, acceptedAt: new Date(Date.parse(first.acceptedAt) + 1).toISOString() };
  store.record(first);
  store.record(second);
  store.complete(first, user.id);
  assert.equal(store.pending()?.acceptedAt, second.acceptedAt);
});

void test('a late account A completion preserves account B acceptance even with the same timestamp', async () => {
  const { store } = storageFixture();
  const consent = receipt();
  const otherUser = { ...user, id: 'user-two', email: 'two@example.test' };
  let finishFirst!: () => void;
  const waiting = new Promise<{ error: null }>((resolve) => { finishFirst = () => resolve({ error: null }); });
  const first = clientFixture(user, () => waiting);
  const second = clientFixture(otherUser);
  const sync = createTermsConsentSynchronizer(store, (token, value) =>
    token === 'token-' + user.id ? first.write(token, value) : second.write(token, value));

  store.record(consent);
  const firstCompletion = sync(first.client, user, true);
  await new Promise((resolve) => setImmediate(resolve));
  store.record(consent);
  await sync(second.client, otherUser, true);
  assert.equal(store.accepted(otherUser.id)?.userId, otherUser.id);
  assert.equal(store.pending(), null);

  finishFirst();
  await firstCompletion;
  assert.equal(store.accepted(otherUser.id)?.userId, otherUser.id);
  assert.equal(store.accepted(user.id), null);
  assert.equal(store.pending(), null);
});

void test('a stale completion cannot consume a receipt bound to another account', () => {
  const { store } = storageFixture();
  const consent = receipt();
  store.record(consent);
  store.bind(consent, 'user-two');
  store.complete(consent, user.id);
  assert.equal(store.pending()?.userId, 'user-two');
  assert.equal(store.accepted(user.id), null);
});

void test('account-deletion intent is one-use navigation, expires and accepts no arbitrary redirect', () => {
  const { values, storage } = storageFixture();
  setAccountDeletionLogin(true, () => storage);
  assert.equal(consumeAccountDeletionLogin(() => storage), true);
  assert.equal(consumeAccountDeletionLogin(() => storage), false);
  setAccountDeletionLogin(true, () => storage);
  assert.equal(consumeAccountDeletionLogin(() => storage, Date.now() + 86_400_001), false);
  setAccountDeletionLogin(true, () => storage);
  const key = [...values.keys()][0];
  storage.setItem(key, 'https://untrusted.example');
  assert.equal(consumeAccountDeletionLogin(() => storage), false);
  assert.equal(authRedirect('https://cosmora.kreluna.it', '/account/delete'), 'https://cosmora.kreluna.it/account/delete');
  assert.equal(authRedirect('https://untrusted.example', '/account/delete'), 'https://cosmora.kreluna.it/account/delete');
  assert.equal(authRedirect('capacitor://localhost', '/account/delete', true), 'com.kreluna.cosmora://auth/callback');
});
