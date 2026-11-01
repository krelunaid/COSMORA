import assert from 'node:assert/strict';
import test from 'node:test';
import { handleRequest, normalizeMountedPath } from '../src/index.ts';

const base = 'https://example.invalid/cosmora-community';
const env = { SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' };

test('only exact Supabase mount paths are normalized', () => {
  for (const prefix of ['/cosmora-community', '/functions/v1/cosmora-community']) {
    for (const suffix of ['/api/community/posts', '/api/community/posts/interaction'])
      assert.equal(normalizeMountedPath(prefix + suffix), suffix);
  }
  for (const path of ['/api/community/posts', '/other/api/community/posts', '/cosmora-community-evil/api/community/posts', '/cosmora-community/api/community/posts/', '/functions/v1/cosmora-community/api/account/delete'])
    assert.equal(normalizeMountedPath(path), null);
});

test('only intended route/method pairs are exposed', async () => {
  for (const path of ['/api/account/delete', '/api/moderation', '/api/stripe/checkout', '/', '/api/community/posts/interaction/']) {
    assert.equal((await handleRequest(new Request(base + path), env)).status, 404);
  }
  for (const method of ['PATCH', 'DELETE', 'HEAD']) {
    assert.equal((await handleRequest(new Request(base + '/api/community/posts', { method }), env)).status, 405);
  }
  assert.equal((await handleRequest(new Request(base + '/api/community/posts/interaction'), env)).status, 405);
});

test('CORS is exact and preflight has no credentials wildcard', async () => {
  const path = base + '/api/community/posts';
  const allowed = await handleRequest(new Request(path, { method: 'OPTIONS', headers: { Origin: 'https://cosmora.kreluna.it' } }), env);
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://cosmora.kreluna.it');
  assert.equal(allowed.headers.get('Access-Control-Allow-Credentials'), null);
  const refused = await handleRequest(new Request(path, { headers: { Origin: 'https://evil.example' } }), env);
  assert.equal(refused.status, 403);
  assert.equal(refused.headers.get('Access-Control-Allow-Origin'), null);
});

test('mutation body is bounded before auth/database, including chunked bodies', async () => {
  const request = new Request(base + '/api/community/posts/interaction', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(4097) });
  const result = await handleRequest(request, env);
  assert.equal(result.status, 413);
  assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
});

test('missing server config fails closed and mutation requires JSON', async () => {
  assert.equal((await handleRequest(new Request(base + '/api/community/posts'), env)).status, 503);
  const mutation = (contentType: string) => new Request(base + '/api/community/posts/interaction', { method: 'PUT', headers: { 'Content-Type': contentType }, body: '{}' });
  assert.equal((await handleRequest(mutation('text/plain'), env)).status, 415);
  assert.equal((await handleRequest(mutation('application/json'), env)).status, 401);
});
