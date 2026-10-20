import test from 'node:test';
import assert from 'node:assert/strict';
import { AppleRevocationError, prepareAppleRevocation } from '../lib/apple-auth.ts';

const configuration = { clientId: 'com.example.cosmora.web', clientSecret: 'test-server-secret' };
const identities = [{ provider: 'apple', id: 'apple-subject', identity_data: { sub: 'apple-subject' } }];
const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const publicKey = { ...await crypto.subtle.exportKey('jwk', keys.publicKey), kid: 'test-apple-key', alg: 'RS256', use: 'sig' };
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
async function identityToken(changes: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = `${encode({ alg: 'RS256', kid: publicKey.kid })}.${encode({
    iss: 'https://appleid.apple.com', aud: configuration.clientId, sub: 'apple-subject', iat: now, exp: now + 3600, ...changes,
  })}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(payload));
  return `${payload}.${Buffer.from(signature).toString('base64url')}`;
}
function mockApple(token: string, calls: string[] = [], revokeStatus = 200): typeof fetch {
  return async (input, options) => {
    const url = String(input);
    calls.push(url);
    assert.equal(options?.redirect, 'error');
    assert.equal(options?.cache, 'no-store');
    if (url === 'https://appleid.apple.com/auth/keys') return Response.json({ keys: [publicKey] });
    const body = new URLSearchParams(String(options?.body));
    assert.equal(body.get('client_secret'), configuration.clientSecret);
    assert.equal(body.get('client_id'), configuration.clientId);
    if (url === 'https://appleid.apple.com/auth/token') {
      assert.equal(body.get('refresh_token'), 'apple-refresh');
      assert.equal(body.get('grant_type'), 'refresh_token');
      return Response.json({ id_token: token });
    }
    assert.equal(url, 'https://appleid.apple.com/auth/revoke');
    assert.equal(body.get('token'), 'apple-refresh');
    assert.equal(body.get('token_type_hint'), 'refresh_token');
    return new Response('', { status: revokeStatus });
  };
}

test('valid Apple refresh token is revoked only after identity verification', async () => {
  const calls: string[] = [];
  const plan = await prepareAppleRevocation({ identities, refreshToken: 'apple-refresh', configuration, fetcher: mockApple(await identityToken(), calls) });
  assert.equal(plan.status, 'ready');
  assert.equal(calls.length, 2);
  await plan.revoke!();
  assert.equal(calls.at(-1), 'https://appleid.apple.com/auth/revoke');
});

test('foreign subjects, audiences, issuers and expired tokens cannot revoke or delete', async () => {
  for (const changes of [
    { sub: 'another-user' }, { aud: 'another-client' }, { iss: 'https://attacker.invalid' },
    { exp: 1 }, { iat: Math.floor(Date.now() / 1000) + 3600 },
  ]) {
    const calls: string[] = [];
    await assert.rejects(prepareAppleRevocation({ identities, refreshToken: 'apple-refresh', configuration, fetcher: mockApple(await identityToken(changes), calls) }),
      (reason: unknown) => reason instanceof AppleRevocationError && reason.code === 'APPLE_IDENTITY_MISMATCH');
    assert.ok(!calls.some((url) => url.endsWith('/revoke')));
  }
});

test('forged Apple JWT signature cannot reach revocation', async () => {
  const genuine = await identityToken();
  const parts = genuine.split('.');
  const signature = Buffer.from(parts[2], 'base64url');
  signature[0] ^= 255;
  const forged = `${parts[0]}.${parts[1]}.${signature.toString('base64url')}`;
  const calls: string[] = [];
  await assert.rejects(prepareAppleRevocation({ identities, refreshToken: 'apple-refresh', configuration, fetcher: mockApple(forged, calls) }), AppleRevocationError);
  assert.ok(!calls.some((url) => url.endsWith('/revoke')));
});

test('non-Apple, legacy missing-token/config and already-revoked accounts need no Apple request', async () => {
  const fetcher: typeof fetch = async () => { assert.fail('must not call Apple'); };
  assert.equal((await prepareAppleRevocation({ identities: [], refreshToken: 'apple-refresh', configuration, fetcher })).status, 'not-applicable');
  assert.equal((await prepareAppleRevocation({ identities, refreshToken: undefined, configuration, fetcher })).status, 'manual-required');
  assert.equal((await prepareAppleRevocation({ identities, refreshToken: 'apple-refresh', configuration: null, fetcher })).status, 'manual-required');
  assert.equal((await prepareAppleRevocation({ identities, refreshToken: undefined, alreadyRevoked: true, configuration, fetcher })).status, 'revoked');
});

test('a revoked legacy token permits account deletion with explicit manual fallback', async () => {
  const fetcher: typeof fetch = async () => Response.json({ error: 'invalid_grant' }, { status: 400 });
  assert.equal((await prepareAppleRevocation({ identities, refreshToken: 'expired-apple-refresh', configuration, fetcher })).status, 'manual-required');
});

test('Apple outage is actionable and never reports successful revocation', async () => {
  const plan = await prepareAppleRevocation({ identities, refreshToken: 'apple-refresh', configuration, fetcher: mockApple(await identityToken(), [], 503) });
  await assert.rejects(plan.revoke!(), (reason: unknown) => reason instanceof AppleRevocationError && reason.code === 'APPLE_REVOCATION_UNAVAILABLE' && !reason.message.includes(configuration.clientSecret));
});
