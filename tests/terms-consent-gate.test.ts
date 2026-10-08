import assert from 'node:assert/strict';
import test from 'node:test';
import type { User } from '@supabase/supabase-js';
import {
  TERMS_VERSION, createTermsConsent, createTermsConsentStore,
  hasCurrentTermsReceipt, isTermsExemptPath, termsConsentMetadata,
} from '../lib/terms-consent.ts';

function emptyStore() {
  const data = new Map<string, string>();
  return createTermsConsentStore(() => ({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
  }));
}
const user = { id: 'user-a', user_metadata: {} } as User;

void test('an existing session from a previous build needs current terms before UGC mounts', () => {
  const store = emptyStore();
  assert.equal(hasCurrentTermsReceipt(user, store), false);
  const old = { ...createTermsConsent(true, 'it', 'session-upgrade')!, version: 'older-version' };
  assert.equal(hasCurrentTermsReceipt({ ...user, user_metadata: termsConsentMetadata(old) }, store), false);
  for (const path of ['/profile/me', '/sell', '/community/post/new', '/inbox', '/squads/create', '/seller', '/'])
    assert.equal(isTermsExemptPath(path), false, path);
});

void test('account-deletion cancellation returns to a protected profile route', () => {
  for (const path of ['/account/delete', '/account/delete/', '/auth/login', '/auth/register', '/auth/recovery', '/community/rules', '/privacy', '/support'])
    assert.equal(isTermsExemptPath(path), true, path);
  for (const path of ['/profile/me', '/account/delete/other', '/support/../sell', '//auth/login'])
    assert.equal(isTermsExemptPath(path), false, path);
});

void test('local explicit acceptance unblocks only its account before metadata sync completes', () => {
  const store = emptyStore();
  const receipt = createTermsConsent(true, 'it', 'session-upgrade')!;
  store.record(receipt);
  assert.equal(hasCurrentTermsReceipt(user, store), false, 'Unbound consent cannot belong to an arbitrary session');
  store.bind(receipt, user.id);
  assert.equal(hasCurrentTermsReceipt(user, store), true);
  assert.equal(hasCurrentTermsReceipt({ ...user, id: 'user-b' }, store), false);
  store.complete(receipt, user.id);
  assert.equal(hasCurrentTermsReceipt(user, store), true);
  assert.equal(hasCurrentTermsReceipt({ ...user, id: 'user-b' }, store), false);
});

void test('a well-formed metadata receipt suppresses the UX prompt, but missing or malformed current receipts do not', () => {
  const store = emptyStore();
  const receipt = createTermsConsent(true, 'en', 'google')!;
  assert.equal(hasCurrentTermsReceipt({ ...user, user_metadata: termsConsentMetadata(receipt) }, store), true);
  for (const value of [null, true, {}, { version: TERMS_VERSION }, { version: TERMS_VERSION, accepted_at: 'invalid', source: 'google', locale: 'en' }])
    assert.equal(hasCurrentTermsReceipt({ ...user, user_metadata: { cosmora_terms_consent: value } }, store), false);
});
