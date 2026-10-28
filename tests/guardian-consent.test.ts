import assert from 'node:assert/strict';
import test from 'node:test';
import { createGuardianHandler, createGuardianToken, hashGuardianToken, GUARDIAN_NOTICE_VERSION,
  type GuardianDependencies, type GuardianRecord, type GuardianStore, type VerifiedGuardianUser } from '../supabase/functions/guardian-consent/handler.ts';
import { createGuardianStore } from '../supabase/functions/guardian-consent/store.ts';

const origin = 'https://software.kreluna.it';
const childId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const challenge = 'a'.repeat(64);
const baseRecord: GuardianRecord = {
  id: requestId, userId: childId, guardianEmail: 'parent@example.test', age: 15, locale: 'it',
  state: 'pending_request', createdAt: '2026-10-28T10:00:00Z',
};
function harness() {
  const calls: Array<[string, unknown]> = [];
  let user: VerifiedGuardianUser | null = { id: childId, email: 'child@example.test', email_confirmed_at: '2026-10-28T09:00:00Z' };
  let record: GuardianRecord | null = null;
  let suspended = false;
  let limit = true;
  const store: GuardianStore = {
    takeRateLimit: async (...values) => { calls.push(['rate', values]); return limit; },
    status: async value => { calls.push(['status', value]); return record; },
    request: async value => { calls.push(['request', value]); record = { ...baseRecord, ...value, state: 'pending_request' }; return record; },
    verifyEmail: async (...values) => { calls.push(['verify', values]); if (!record || record.state !== 'pending_request') return null;
      record = { ...record, state: 'email_verified' }; return record; },
    consent: async (...values) => { calls.push(['consent', values]); if (!record || record.state !== 'email_verified') return null;
      record = { ...record, state: 'pending_review' }; return record; },
    review: async value => { calls.push(['review', value]); if (!record || record.state !== value.expectedState) return null;
      record = { ...record, state: value.decision }; return record; },
  };
  const dependencies: GuardianDependencies = {
    enabled: true, allowedOrigins: new Set([origin]), reviewerIds: new Set([ownerId]),
    guardianPageUrl: `${origin}/cosmora/genitori/`,
    getUser: async token => { calls.push(['auth', token]); return { user, error: null }; },
    isSuspended: async id => { calls.push(['suspended', id]); return suspended; },
    store, sendGuardianEmail: async value => { calls.push(['email', value]); },
    now: () => new Date('2026-10-28T10:00:00Z'), randomToken: () => challenge,
  };
  const handler = createGuardianHandler(() => dependencies);
  const send = (action: string, body?: unknown, method = action === 'status' ? 'GET' : 'POST', headers: Record<string, string> = {}) =>
    handler(new Request(`https://example.test/functions/v1/guardian-consent/${action}`, {
      method, headers: { Origin: origin, Authorization: 'Bearer real-token', 'Content-Type': 'application/json', ...headers },
      ...(method === 'GET' || method === 'HEAD' || body === undefined ? {} : { body: JSON.stringify(body) }),
    }));
  return { calls, dependencies, send, setUser: (value: VerifiedGuardianUser | null) => { user = value; },
    setRecord: (value: GuardianRecord | null) => { record = value; }, record: () => record,
    suspend: () => { suspended = true; }, limit: () => { limit = false; } };
}
const requestBody = { guardianEmail: 'parent@example.test', age: 15, locale: 'it' };
const consentBody = { consentToken: challenge, noticeVersion: GUARDIAN_NOTICE_VERSION,
  isAdult: true, hasParentalResponsibility: true, authorizesCommunity: true };
const reviewBody = { requestId, expectedState: 'pending_review', decision: 'approved',
  responsibilityChecked: true, reason: 'Responsabilità verificata direttamente con il genitore.' };

void test('off by server flag performs no authentication, data write or email', async () => {
  const h = harness(); h.dependencies.enabled = false;
  assert.equal((await h.send('request', requestBody)).status, 503);
  assert.deepEqual(h.calls, []);
});
void test('rejects foreign origins and refuses mutations over GET', async () => {
  const h = harness();
  assert.equal((await h.send('request', requestBody, 'POST', { Origin: 'https://attacker.test' })).status, 403);
  assert.equal((await h.send('verify', undefined, 'GET')).status, 405);
  assert.equal((await h.send('review', undefined, 'GET')).status, 405);
  assert.deepEqual(h.calls, []);
});
void test('fresh Auth identity is required; anonymous, unconfirmed, deleting and suspended users fail', async () => {
  for (const user of [null, { id: childId }, { id: childId, is_anonymous: true, email_confirmed_at: 'yes' },
    { id: childId, email_confirmed_at: 'yes', app_metadata: { deletion_pending: true } }]) {
    const h = harness(); h.setUser(user);
    assert.equal((await h.send('request', requestBody)).status, 401);
    assert.equal(h.calls.some(([name]) => name === 'request' || name === 'email'), false);
  }
  const h = harness(); h.suspend();
  assert.equal((await h.send('request', requestBody)).status, 403);
});
void test('accepts only ages 13–17 and a different syntactically valid guardian email', async () => {
  for (const body of [{ ...requestBody, age: 12 }, { ...requestBody, age: 18 }, { ...requestBody, age: 14.5 },
    { ...requestBody, guardianEmail: ' CHILD@example.test ' }, { ...requestBody, guardianEmail: 'a\r\nBcc:b@test.test' }]) {
    const h = harness(); assert.equal((await h.send('request', body)).status, 400);
    assert.equal(h.calls.some(([name]) => name === 'request'), false);
  }
});
void test('request stores a SHA-256 hash only and sends a fragment link without exposing parent email to child', async () => {
  const h = harness(); const result = await h.send('request', requestBody);
  assert.equal(result.status, 202);
  const body = await result.json() as Record<string, unknown>;
  assert.equal(body.guardianEmail, undefined); assert.equal(body.token, undefined);
  const stored = h.calls.find(([name]) => name === 'request')![1] as Record<string, unknown>;
  assert.equal(stored.tokenHash, await hashGuardianToken(challenge)); assert.notEqual(stored.tokenHash, challenge);
  const sent = h.calls.find(([name]) => name === 'email')![1] as { link: string };
  assert.equal(new URL(sent.link).search, ''); assert.equal(new URL(sent.link).hash, `#token=${challenge}`);
  assert.equal(stored.expiresAt, '2026-10-30T10:00:00.000Z');
});
void test('rate limits fail closed before email and reviewed records cannot be reset by child', async () => {
  const h = harness(); h.limit();
  assert.equal((await h.send('request', requestBody)).status, 429);
  assert.equal(h.calls.some(([name]) => name === 'email'), false);
  for (const state of ['pending_review', 'approved', 'denied', 'revoked'] as const) {
    const current = harness(); current.setRecord({ ...baseRecord, state });
    assert.equal((await current.send('request', requestBody)).status, 409);
  }
});
void test('email verification alone only produces email_verified, then explicit consent awaits manual review', async () => {
  const h = harness(); h.setRecord(baseRecord);
  const verified = await h.send('verify', { token: challenge });
  assert.equal(verified.status, 200); assert.equal(h.record()?.state, 'email_verified');
  assert.equal(h.calls.some(([name]) => name === 'auth'), false);
  assert.equal((await h.send('consent', { ...consentBody, hasParentalResponsibility: false })).status, 400);
  assert.equal((await h.send('consent', { ...consentBody, noticeVersion: 'old' })).status, 400);
  assert.equal((await h.send('consent', consentBody)).status, 202);
  assert.equal(h.record()?.state, 'pending_review');
  assert.equal((await h.send('consent', consentBody)).status, 400);
});
void test('invalid, expired, consumed or missing challenge fails and cannot create an approval', async () => {
  const h = harness();
  assert.equal((await h.send('verify', { token: 'bad' })).status, 400);
  h.dependencies.store.verifyEmail = async () => null; // Persistence rejects expired/consumed hashes atomically.
  assert.equal((await h.send('verify', { token: challenge })).status, 400);
  assert.equal(h.record(), null);
});
void test('dashboard grant alone, owner ID alone or child claims cannot review', async () => {
  for (const user of [
    { id: childId, email_confirmed_at: 'yes', app_metadata: { cosmora_dashboard_access: true } },
    { id: ownerId, email_confirmed_at: 'yes' },
    { id: childId, email_confirmed_at: 'yes', user_metadata: { cosmora_role: 'admin' } },
  ]) {
    const h = harness(); h.setUser(user); h.setRecord({ ...baseRecord, state: 'pending_review' });
    assert.equal((await h.send('review', reviewBody)).status, 403);
    assert.equal(h.calls.some(([name]) => name === 'review'), false);
  }
});
void test('owner must record responsibility check; approved can only transition to revoked', async () => {
  const h = harness(); h.setUser({ id: ownerId, email_confirmed_at: 'yes', app_metadata: { cosmora_dashboard_access: true } });
  h.setRecord({ ...baseRecord, state: 'pending_review' });
  assert.equal((await h.send('review', { ...reviewBody, responsibilityChecked: false })).status, 400);
  assert.equal((await h.send('review', reviewBody)).status, 200); assert.equal(h.record()?.state, 'approved');
  assert.equal((await h.send('review', { ...reviewBody, expectedState: 'approved', decision: 'denied' })).status, 400);
  assert.equal((await h.send('review', { ...reviewBody, expectedState: 'approved', decision: 'revoked' })).status, 200);
  assert.equal(h.record()?.state, 'revoked');
});
void test('state races and backend failures do not fall back to approval or expose secrets', async () => {
  const h = harness(); h.setUser({ id: ownerId, email_confirmed_at: 'yes', app_metadata: { cosmora_role: 'admin' } });
  h.dependencies.store.review = async () => null;
  assert.equal((await h.send('review', reviewBody)).status, 409);
  h.dependencies.getUser = async () => { throw new Error('secret token password'); };
  const result = await h.send('status'); assert.equal(result.status, 503);
  assert.equal(await result.text(), '{"error":"unavailable"}');
});
void test('oversized streamed payload is rejected before persistence', async () => {
  const h = harness(); assert.equal((await h.send('request', { ...requestBody, junk: 'x'.repeat(5000) })).status, 400);
  assert.equal(h.calls.some(([name]) => name === 'request'), false);
});
void test('random challenges contain 256 bits from crypto and independent generations differ', () => {
  const a = createGuardianToken(); const b = createGuardianToken();
  assert.match(a, /^[0-9a-f]{64}$/); assert.notEqual(a, b);
});
void test('service-role adapter uses atomic RPC transitions and rejects persistence errors', async () => {
  const calls: unknown[] = [];
  const store = createGuardianStore(async (name, parameters) => { calls.push([name, parameters]); return { data: null, error: null }; });
  await store.verifyEmail('hash', 'proof', 'date');
  assert.deepEqual(calls, [['cosmora_guardian_verify', { p_token_hash: 'hash', p_consent_hash: 'proof', p_expires_at: 'date' }]]);
  const failed = createGuardianStore(async () => ({ data: { state: 'approved' }, error: new Error('failed') }));
  await assert.rejects(failed.status(childId), /unavailable/);
});
