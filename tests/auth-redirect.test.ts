import test from 'node:test';
import assert from 'node:assert/strict';
import { authRedirect } from '../lib/supabase/auth-redirect.ts';

test('authentication stays on either trusted COSMORA origin', () => {
  for (const origin of ['https://cosmora.kreluna.it', 'https://cosmora-app.andreagadducci.chatgpt.site']) {
    for (const path of ['/profile/me', '/auth/recovery'] as const) {
      assert.equal(authRedirect(origin, path), origin + path);
    }
  }
});
test('untrusted origins and development use the existing public destination', () => {
  for (const origin of ['http://127.0.0.1:3017', 'http://cosmora.kreluna.it', 'https://cosmora.kreluna.it.evil.test', 'null']) {
    assert.equal(authRedirect(origin, '/profile/me'), 'https://cosmora-app.andreagadducci.chatgpt.site/profile/me');
  }
});
