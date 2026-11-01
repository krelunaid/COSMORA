import assert from 'node:assert/strict';
import test from 'node:test';
import { requireAuthenticatedUser } from '../src/lib/supabase/server.ts';

const env = {
  SUPABASE_URL: 'https://pwdpwgonvnuwmgfiidut.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key-for-unit-test',
};
const owner = '10000000-0000-4000-8000-000000000001';
const auth = () => new Request('https://example.invalid/', { headers: { Authorization: 'Bearer synthetic-viewer-token' } });

test('real auth helper verifies the bearer with Auth and checks server moderation', async () => {
  const original = globalThis.fetch;
  const seen: string[] = [];
  try {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      seen.push(url);
      if (url.endsWith('/auth/v1/user')) {
        assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer synthetic-viewer-token');
        return Response.json({ id: owner, app_metadata: {}, identities: [] });
      }
      assert.match(url, /rest\/v1\/user_moderation/);
      assert.match(url, new RegExp('user_id=eq\\.' + owner));
      assert.match(url, /suspended=eq\.true/);
      return Response.json(null);
    };
    const result = await requireAuthenticatedUser(auth(), env);
    assert.equal(result?.user.id, owner);
    assert.equal(seen.length, 2);
  } finally { globalThis.fetch = original; }
});

test('deletion, suspension, invalid token and unavailable moderation fail closed', async () => {
  const original = globalThis.fetch;
  try {
    for (const mode of ['deleted', 'suspended', 'invalid', 'moderation-error']) {
      globalThis.fetch = async (input) => {
        const url = String(input);
        if (url.endsWith('/auth/v1/user')) {
          if (mode === 'invalid') return Response.json({ message: 'invalid JWT' }, { status: 401 });
          return Response.json({ id: owner, app_metadata: { deletion_pending: mode === 'deleted' }, identities: [] });
        }
        if (mode === 'moderation-error') return Response.json({ message: 'unavailable' }, { status: 500 });
        return Response.json(mode === 'suspended' ? { user_id: owner } : null);
      };
      assert.equal(await requireAuthenticatedUser(auth(), env), null, mode);
    }
    globalThis.fetch = async () => { throw new Error('No anonymous network request expected'); };
    assert.equal(await requireAuthenticatedUser(new Request('https://example.invalid/'), env), null);
    assert.equal(await requireAuthenticatedUser(auth(), { ...env, SUPABASE_URL: 'https://other.supabase.co' }), null);
  } finally { globalThis.fetch = original; }
});
