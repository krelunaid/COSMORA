// Server-only: import exclusively from API routes. Provider credentials must
// never be copied into public environment variables or client bundles.
export type AppleRevocationConfiguration = { clientId: string; clientSecret: string };
export type AppleRevocationStatus = 'not-applicable' | 'manual-required' | 'revoked';

type AppleIdentity = { provider: string; id?: string; identity_data?: Record<string, unknown> };
type AppleFetch = typeof fetch;

export class AppleRevocationError extends Error {
  readonly code: 'APPLE_IDENTITY_MISMATCH' | 'APPLE_REVOCATION_UNAVAILABLE';
  readonly status: number;
  constructor(code: AppleRevocationError['code']) {
    super(code === 'APPLE_IDENTITY_MISMATCH'
      ? 'Il collegamento Apple non corrisponde a questo account. Accedi di nuovo con Apple e riprova.'
      : 'Apple non è al momento disponibile. Riprova l’eliminazione tra poco.');
    this.name = 'AppleRevocationError';
    this.code = code;
    this.status = code === 'APPLE_IDENTITY_MISMATCH' ? 403 : 503;
  }
}

export function getAppleRevocationConfiguration(): AppleRevocationConfiguration | null {
  const clientId = process.env.APPLE_CLIENT_ID?.trim();
  const clientSecret = process.env.APPLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function decodeBase64url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new AppleRevocationError('APPLE_IDENTITY_MISMATCH');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
}

async function appleRequest(url: string, init: RequestInit, fetcher: AppleFetch) {
  try {
    return await fetcher(url, {
      ...init, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new AppleRevocationError('APPLE_REVOCATION_UNAVAILABLE');
  }
}

async function verifyAppleIdentity(
  token: unknown,
  configuration: AppleRevocationConfiguration,
  subjects: string[],
  fetcher: AppleFetch,
) {
  if (typeof token !== 'string' || token.length > 32768)
    throw new AppleRevocationError('APPLE_IDENTITY_MISMATCH');
  const parts = token.split('.');
  if (parts.length !== 3) throw new AppleRevocationError('APPLE_IDENTITY_MISMATCH');
  let header: Record<string, unknown> | null;
  let claims: Record<string, unknown> | null;
  let signature: Uint8Array<ArrayBuffer>;
  try {
    header = record(JSON.parse(new TextDecoder().decode(decodeBase64url(parts[0]))));
    claims = record(JSON.parse(new TextDecoder().decode(decodeBase64url(parts[1]))));
    signature = decodeBase64url(parts[2]);
  } catch {
    throw new AppleRevocationError('APPLE_IDENTITY_MISMATCH');
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    header?.alg !== 'RS256' || typeof header.kid !== 'string' ||
    claims?.iss !== 'https://appleid.apple.com' || claims.aud !== configuration.clientId ||
    typeof claims.sub !== 'string' || !subjects.includes(claims.sub) ||
    typeof claims.exp !== 'number' || claims.exp <= now ||
    typeof claims.iat !== 'number' || claims.iat > now + 60
  ) throw new AppleRevocationError('APPLE_IDENTITY_MISMATCH');
  const response = await appleRequest('https://appleid.apple.com/auth/keys', { method: 'GET' }, fetcher);
  if (!response.ok) throw new AppleRevocationError('APPLE_REVOCATION_UNAVAILABLE');
  const jwks = record(await response.json().catch(() => null));
  const key = Array.isArray(jwks?.keys)
    ? jwks.keys.map(record).find((candidate) => candidate !== null && candidate.kid === header.kid && candidate.kty === 'RSA' && candidate.alg === 'RS256' && candidate.use === 'sig')
    : null;
  if (!key) throw new AppleRevocationError('APPLE_IDENTITY_MISMATCH');
  try {
    const publicKey = await crypto.subtle.importKey('jwk', key as JsonWebKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) throw new Error('Signature mismatch');
  } catch {
    throw new AppleRevocationError('APPLE_IDENTITY_MISMATCH');
  }
}

export type AppleRevocationPlan = {
  status: AppleRevocationStatus | 'ready';
  revoke?: () => Promise<void>;
};

// TN3194 requires deletion even when a legacy account has no provider token.
// A supplied refresh token is first validated by Apple; its signed ID token
// must match the authenticated Supabase user's Apple subject before revocation.
export async function prepareAppleRevocation({
  identities,
  refreshToken,
  alreadyRevoked = false,
  configuration = getAppleRevocationConfiguration(),
  fetcher = fetch,
}: {
  identities: AppleIdentity[];
  refreshToken: unknown;
  alreadyRevoked?: boolean;
  configuration?: AppleRevocationConfiguration | null;
  fetcher?: AppleFetch;
}): Promise<AppleRevocationPlan> {
  const apple = identities.filter((identity) => identity.provider === 'apple');
  if (!apple.length) return { status: 'not-applicable' };
  if (alreadyRevoked) return { status: 'revoked' };
  if (!configuration || !refreshToken) return { status: 'manual-required' };
  if (typeof refreshToken !== 'string' || refreshToken.length > 16384 || /\s/.test(refreshToken))
    throw new AppleRevocationError('APPLE_IDENTITY_MISMATCH');
  const subjects = apple.map((identity) => identity.identity_data?.sub ?? identity.id)
    .filter((subject): subject is string => typeof subject === 'string' && subject.length > 0);
  if (!subjects.length) throw new AppleRevocationError('APPLE_IDENTITY_MISMATCH');
  const form = new URLSearchParams({
    client_id: configuration.clientId, client_secret: configuration.clientSecret,
    grant_type: 'refresh_token', refresh_token: refreshToken,
  });
  const response = await appleRequest('https://appleid.apple.com/auth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(),
  }, fetcher);
  const result = record(await response.json().catch(() => null));
  // Expired/revoked legacy tokens cannot be used for automatic revocation.
  if (!response.ok && result?.error === 'invalid_grant') return { status: 'manual-required' };
  if (!response.ok || result?.error) throw new AppleRevocationError('APPLE_REVOCATION_UNAVAILABLE');
  await verifyAppleIdentity(result?.id_token, configuration, subjects, fetcher);
  return {
    status: 'ready',
    revoke: async () => {
      const revoked = await appleRequest('https://appleid.apple.com/auth/revoke', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: configuration.clientId, client_secret: configuration.clientSecret,
          token: refreshToken, token_type_hint: 'refresh_token',
        }).toString(),
      }, fetcher);
      if (revoked.status !== 200) throw new AppleRevocationError('APPLE_REVOCATION_UNAVAILABLE');
    },
  };
}
