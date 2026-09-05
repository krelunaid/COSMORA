import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const base = process.env.TEST_APP_URL || 'http://localhost:3000';
const fixtures = [];
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
async function remove(token, confirmation, id) {
  const res = await fetch(base + '/api/account/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify({ confirmation, id }) });
  return { status: res.status, body: await res.json() };
}
try {
  assert.equal((await remove(null, 'ELIMINA')).status, 401);
  for (let i = 0; i < 2; i++) {
    const email = `cosmora-delete-test-${crypto.randomUUID()}@example.com`;
    const password = crypto.randomUUID() + 'aA!9';
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    const fixture = { id: created.data.user.id, token: '' }; fixtures.push(fixture);
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
    fixture.token = signed.data.session.access_token;
    const profile = await admin.from('profiles').upsert({ id: fixture.id, display_name: 'Temporary deletion test' });
    if (profile.error) throw profile.error;
    for (const bucket of ['listing-images', 'community-media']) {
      const uploaded = await admin.storage.from(bucket).upload(fixture.id + '/deletion-test/photo.png', image, { contentType: 'image/png' });
      if (uploaded.error) throw uploaded.error;
    }
  }
  const [a,b] = fixtures;
  assert.equal((await remove(a.token, 'NO')).status, 400);
  assert.ok((await admin.auth.admin.getUserById(a.id)).data.user);
  const result = await remove(a.token, 'ELIMINA', b.id);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.deleted, true);
  assert.ok((await admin.auth.admin.getUserById(a.id)).error);
  assert.ok((await admin.auth.admin.getUserById(b.id)).data.user, 'Foreign user must survive');
  for (const bucket of ['listing-images', 'community-media']) {
    assert.equal((await admin.storage.from(bucket).list(a.id + '/deletion-test')).data.length, 0);
    assert.equal((await admin.storage.from(bucket).list(b.id + '/deletion-test')).data.length, 1);
  }
  assert.equal((await admin.from('profiles').select('id').eq('id', a.id)).data.length, 0);
  assert.equal((await fetch(base + '/api/account', { headers: { Authorization: 'Bearer ' + a.token } })).status, 401);
  console.log('PASS: confirmation, authentication, own-account-only deletion, storage cleanup, profile cascade and old-token rejection.');
} finally {
  for (const fixture of fixtures) {
    for (const bucket of ['listing-images', 'community-media']) await admin.storage.from(bucket).remove([fixture.id + '/deletion-test/photo.png']);
    const exists = await admin.auth.admin.getUserById(fixture.id);
    if (exists.data.user) { const removed = await admin.auth.admin.deleteUser(fixture.id); if (removed.error) throw removed.error; }
  }
  console.log('Temporary deletion-test accounts and images cleaned up.');
}
