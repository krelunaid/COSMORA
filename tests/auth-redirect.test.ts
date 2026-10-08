import test from 'node:test';
import assert from 'node:assert/strict';
import { authRedirect, nativeAuthCallbackURL, parseNativeAuthCallback } from '../lib/supabase/auth-redirect.ts';

test('authentication stays on either trusted COSMORA origin', () => {
  for (const origin of ['https://cosmora.kreluna.it', 'https://cosmora-app.andreagadducci.chatgpt.site']) {
    for (const path of ['/profile/me', '/auth/recovery'] as const) {
      assert.equal(authRedirect(origin, path), origin + path);
    }
  }
});
test('local preview authentication returns to the preview', () => {
  for (const origin of ['http://localhost:4317', 'http://127.0.0.1:4317']) {
    for (const path of ['/profile/me', '/auth/recovery'] as const) {
      assert.equal(authRedirect(origin, path), origin + path);
    }
  }
});
test('untrusted origins and development use the primary app destination', () => {
  for (const origin of ['http://127.0.0.1:3017', 'http://cosmora.kreluna.it', 'https://cosmora.kreluna.it.evil.test', 'null']) {
    assert.equal(authRedirect(origin, '/profile/me'), 'https://cosmora.kreluna.it/profile/me');
  }
});
test('native confirmation and recovery return through the registered app scheme', () => {
  for (const path of ['/profile/me', '/auth/recovery'] as const) {
    assert.equal(authRedirect('capacitor://localhost', path, true), nativeAuthCallbackURL);
    assert.equal(authRedirect('https://localhost', path, true), nativeAuthCallbackURL);
  }
});
test('native callback allows a PKCE response but rejects ambiguous or foreign URLs', () => {
  assert.equal(parseNativeAuthCallback(`${nativeAuthCallbackURL}?code=one&sb_flow_id=1234567890abcdef`)?.searchParams.get('code'), 'one');
  for (const raw of [
    'https://auth/callback?code=one',
    'com.kreluna.cosmora://auth.evil/callback?code=one',
    'com.kreluna.cosmora://user@auth/callback?code=one',
    'com.kreluna.cosmora://auth:81/callback?code=one',
    `${nativeAuthCallbackURL}/extra?code=one`,
    `${nativeAuthCallbackURL}?code=one&code=two`,
    `${nativeAuthCallbackURL}?code=one&sb_flow_id=one&sb_flow_id=two`,
    `${nativeAuthCallbackURL}?code=one&sb_flow_id=../../bad`,
    `${nativeAuthCallbackURL}#access_token=untrusted`,
    'not a URL',
  ]) assert.equal(parseNativeAuthCallback(raw), null, raw);
});
