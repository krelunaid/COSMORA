import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const base = process.env.TEST_APP_URL || 'http://localhost:3000';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const created = [];
const uploaded = [];
async function request(path, token, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
try {
  assert.equal((await request('/api/messages')).status, 401);
  const users = [];
  for (let i = 0; i < 3; i++) {
    const email = `cosmora-test-${crypto.randomUUID()}@example.com`;
    const password = crypto.randomUUID() + 'aA!9';
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    created.push(data.user.id);
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
    users.push({ id: data.user.id, token: signed.data.session.access_token });
    assert.equal((await request('/api/account', users[i].token, 'PUT', { displayName: `Temporary test ${i}`, country: 'Italy' })).status, 200);
  }
  const [a,b,c] = users;
  assert.equal((await request('/api/account', a.token)).body.displayName, 'Temporary test 0');
  const message = { id: crypto.randomUUID(), recipientId: b.id, body: 'Account integration test' };
  assert.equal((await request('/api/messages', a.token, 'POST', message)).status, 201);
  assert.equal((await request('/api/messages', a.token, 'POST', message)).status, 200);
  assert.equal((await request(`/api/messages?peer=${a.id}`, b.token)).body.messages.length, 1);
  assert.equal((await request(`/api/messages?peer=${a.id}`, c.token)).body.messages.length, 0);
  assert.equal((await request('/api/orders', a.token)).body.orders.length, 0);
  const form = new FormData();
  for (const [key, value] of Object.entries({ title: 'Temporary integration listing', description: 'Temporary test listing to verify storage.', category: 'Cosplay', condition: 'New', saleMode: 'buy', salePrice: '10' })) form.set(key, value);
  form.append('photos', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF8cAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'test.png');
  const listingResponse = await fetch(`${base}/api/listings`, { method: 'POST', headers: { Authorization: `Bearer ${a.token}` }, body: form });
  const listingBody = await listingResponse.json();
  assert.equal(listingResponse.status, 201);
  const imageRows = await admin.from('listing_images').select('storage_path').eq('listing_id', listingBody.listing.id);
  uploaded.push(...imageRows.data.map((row) => row.storage_path));
  const catalog = await request(`/api/listings?slug=${listingBody.listing.slug}`);
  assert.equal(catalog.body.listings[0].seller_id, a.id);
  assert.equal(catalog.body.listings[0].images.length, 1);
  const block = await admin.from('user_blocks').insert({ blocker_id: b.id, blocked_id: a.id });
  if (block.error) throw block.error;
  assert.equal((await request('/api/messages', a.token, 'POST', { ...message, id: crypto.randomUUID() })).status, 403);
  console.log('PASS: account persistence, authenticated messaging, retry deduplication, participant isolation, empty orders, blocked sender.');
} finally {
  if (uploaded.length) {
    const result = await admin.storage.from('listing-images').remove(uploaded);
    if (result.error) throw result.error;
  }
  for (const id of created) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) throw result.error;
  }
  console.log('Temporary test accounts removed.');
}
