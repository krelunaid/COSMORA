import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { setAccountDeletionLogin, consumeAccountDeletionLogin } from '../lib/terms-consent.ts';
import { completeNativeAuthCallback } from '../lib/supabase/native-auth.ts';

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });

function client(redirectType: string | null = null) {
  let exchanges = 0;
  return {
    count: () => exchanges,
    value: { auth: { exchangeCodeForSession: async () => {
      exchanges++;
      return { data: { session: {}, redirectType }, error: null };
    } } } as unknown as SupabaseClient,
  };
}

void test('deletion OAuth returns to account deletion without accepting terms or deleting anything', async () => {
  setAccountDeletionLogin(true);
  const fake = client();
  const callback = 'com.kreluna.cosmora://auth/callback?code=terms-delete&sb_flow_id=terms_delete_flow';
  assert.deepEqual(await Promise.all([
    completeNativeAuthCallback(callback, fake.value),
    completeNativeAuthCallback(callback, fake.value),
  ]), ['/account/delete', '/account/delete']);
  assert.equal(fake.count(), 1);
  assert.equal(consumeAccountDeletionLogin(), false);
});

void test('password recovery takes precedence over deletion intent and clears stale navigation', async () => {
  setAccountDeletionLogin(true);
  const fake = client('recovery');
  assert.equal(await completeNativeAuthCallback(
    'com.kreluna.cosmora://auth/callback?code=terms-recover&sb_flow_id=terms_recovery_flow', fake.value,
  ), '/auth/recovery');
  assert.equal(consumeAccountDeletionLogin(), false);
});
