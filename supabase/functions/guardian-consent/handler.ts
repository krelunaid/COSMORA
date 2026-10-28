/** Prepared workflow. It is OFF unless a trusted server dependency enables it.
 * Email possession is not proof of identity or parental responsibility.
 * No action here grants access without a separate, documented owner review.
 */
export const GUARDIAN_NOTICE_VERSION = '2026-10-28-draft';
export const EMAIL_LINK_TTL_MS = 48 * 60 * 60 * 1000;
export const CONSENT_TTL_MS = 30 * 60 * 1000;
const locales = ['it', 'en', 'fr', 'de', 'es'] as const;
export type GuardianLocale = typeof locales[number];
export type GuardianState = 'pending_request' | 'email_verified' | 'pending_review' | 'approved' | 'denied' | 'revoked';
export type VerifiedGuardianUser = {
  id: string; email?: string; email_confirmed_at?: string;
  is_anonymous?: boolean; app_metadata?: Record<string, unknown>;
};
export type GuardianRecord = {
  id: string; userId: string; guardianEmail: string; age: number; locale: GuardianLocale;
  state: GuardianState; createdAt: string; expiresAt?: string;
};
export type GuardianStore = {
  /** Database rate limits and transitions MUST be atomic across all instances. */
  takeRateLimit: (key: string, windowSeconds: number, limit: number) => Promise<boolean>;
  status: (userId: string) => Promise<GuardianRecord | null>;
  request: (value: {
    userId: string; guardianEmail: string; age: number; locale: GuardianLocale;
    tokenHash: string; expiresAt: string; noticeVersion: string;
  }) => Promise<GuardianRecord>;
  verifyEmail: (tokenHash: string, consentHash: string, expiresAt: string) => Promise<GuardianRecord | null>;
  consent: (consentHash: string, noticeVersion: string) => Promise<GuardianRecord | null>;
  review: (value: {
    requestId: string; reviewerId: string; decision: 'approved' | 'denied' | 'revoked';
    expectedState: GuardianState; reason: string; responsibilityChecked: boolean;
  }) => Promise<GuardianRecord | null>;
};
export type GuardianDependencies = {
  enabled: boolean;
  allowedOrigins: ReadonlySet<string>;
  reviewerIds: ReadonlySet<string>;
  guardianPageUrl: string;
  getUser: (token: string) => Promise<{ user: VerifiedGuardianUser | null; error: unknown }>;
  isSuspended: (userId: string) => Promise<boolean>;
  store: GuardianStore;
  sendGuardianEmail: (value: { email: string; locale: GuardianLocale; link: string; noticeVersion: string }) => Promise<void>;
  now?: () => Date;
  randomToken?: () => string;
};

export function createGuardianToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function hashGuardianToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function validToken(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}
function email(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 254 || ['\r', '\n', '\0'].some(character => value.includes(character))) return null;
  const normalized = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}
function uuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function publicStatus(record: GuardianRecord | null) {
  // The child-facing endpoint never exposes a parent's email or token.
  return record ? { id: record.id, state: record.state, createdAt: record.createdAt } : { state: 'not_requested' };
}
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return null;
  // Bound streamed data too; Content-Length is optional and untrusted.
  const reader = request.body?.getReader();
  if (!reader) return null;
  let bytes = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 4096) { await reader.cancel(); return null; }
      parts.push(part.value);
    }
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const part of parts) { joined.set(part, offset); offset += part.length; }
    const parsed: unknown = JSON.parse(new TextDecoder().decode(joined));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { return null; }
  finally { reader.releaseLock(); }
}

export function createGuardianHandler(dependencies: () => GuardianDependencies) {
  return async (request: Request): Promise<Response> => {
    const baseHeaders: Record<string, string> = {
      'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
    };
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
      status, headers: { ...baseHeaders, 'Content-Type': 'application/json' },
    });
    try {
      const backend = dependencies();
      if (!backend.enabled) return reply(503, { error: 'workflow_not_active' });
      const origin = request.headers.get('origin');
      if (!origin || !backend.allowedOrigins.has(origin)) return reply(403, { error: 'origin_not_allowed' });
      Object.assign(baseHeaders, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: baseHeaders });
      const action = new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
      if (!['status', 'request', 'verify', 'consent', 'review'].includes(action ?? '')) return reply(404, { error: 'not_found' });
      if (request.method !== (action === 'status' ? 'GET' : 'POST')) return reply(405, { error: 'method_not_allowed' });

      const now = backend.now?.() ?? new Date();
      const token = () => {
        const value = backend.randomToken?.() ?? createGuardianToken();
        if (!validToken(value)) throw new Error('Invalid token source');
        return value;
      };
      const limited = async (key: string, seconds: number, limit: number) =>
        backend.store.takeRateLimit(await hashGuardianToken(key), seconds, limit);
      let user: VerifiedGuardianUser | null = null;
      if (action === 'status' || action === 'request' || action === 'review') {
        const authorization = request.headers.get('authorization');
        const bearer = authorization && authorization.length <= 16384 ? authorization.match(/^Bearer ([^\s]+)$/i)?.[1] : null;
        if (!bearer) return reply(401, { error: 'authentication_required' });
        const result = await backend.getUser(bearer);
        user = result.user;
        if (result.error || !user || user.is_anonymous || !user.email_confirmed_at || user.app_metadata?.deletion_pending)
          return reply(401, { error: 'authentication_required' });
        if (await backend.isSuspended(user.id)) return reply(403, { error: 'account_unavailable' });
      }
      if (action === 'status') return reply(200, publicStatus(await backend.store.status(user!.id)));
      const body = await readBody(request);
      if (!body) return reply(400, { error: 'invalid_request' });
      if (action === 'request') {
        const guardianEmail = email(body.guardianEmail);
        if (!guardianEmail || guardianEmail === email(user!.email) || !Number.isInteger(body.age)
          || Number(body.age) < 13 || Number(body.age) > 17 || !locales.includes(body.locale as GuardianLocale))
          return reply(400, { error: 'invalid_request' });
        if (!await limited(`request-minute:${user!.id}`, 60, 1)
          || !await limited(`request-day:${user!.id}`, 86400, 3)
          || !await limited(`guardian-day:${guardianEmail}`, 86400, 5)) return reply(429, { error: 'try_later' });
        const existing = await backend.store.status(user!.id);
        // An already reviewed account cannot replace its record to evade a decision.
        if (existing && !['pending_request', 'email_verified'].includes(existing.state))
          return reply(409, { error: 'contact_support' });
        const challenge = token();
        const record = await backend.store.request({
          userId: user!.id, guardianEmail, age: Number(body.age), locale: body.locale as GuardianLocale,
          tokenHash: await hashGuardianToken(challenge), expiresAt: new Date(now.getTime() + EMAIL_LINK_TTL_MS).toISOString(),
          noticeVersion: GUARDIAN_NOTICE_VERSION,
        });
        const page = new URL(backend.guardianPageUrl);
        if (page.protocol !== 'https:' || page.username || page.password || page.search || page.hash) throw new Error('Invalid guardian page');
        // Fragment avoids sending the token to the public page server or referrer.
        page.hash = `token=${challenge}`;
        await backend.sendGuardianEmail({ email: guardianEmail, locale: body.locale as GuardianLocale,
          link: page.href, noticeVersion: GUARDIAN_NOTICE_VERSION });
        return reply(202, publicStatus(record));
      }
      if (action === 'verify') {
        if (!validToken(body.token)) return reply(400, { error: 'invalid_link' });
        if (!await limited('public-verification-global', 60, 120)) return reply(429, { error: 'try_later' });
        const hash = await hashGuardianToken(body.token);
        if (!await limited(`verify:${hash}`, 600, 5)) return reply(429, { error: 'try_later' });
        const consentToken = token();
        const record = await backend.store.verifyEmail(hash, await hashGuardianToken(consentToken),
          new Date(now.getTime() + CONSENT_TTL_MS).toISOString());
        if (!record) return reply(400, { error: 'invalid_link' });
        // Verifying an email never authorizes the child to use the community.
        return reply(200, { state: record.state, locale: record.locale, consentToken, noticeVersion: GUARDIAN_NOTICE_VERSION });
      }
      if (action === 'consent') {
        if (!validToken(body.consentToken) || body.noticeVersion !== GUARDIAN_NOTICE_VERSION
          || body.isAdult !== true || body.hasParentalResponsibility !== true || body.authorizesCommunity !== true)
          return reply(400, { error: 'explicit_confirmation_required' });
        if (!await limited('public-consent-global', 60, 120)) return reply(429, { error: 'try_later' });
        const hash = await hashGuardianToken(body.consentToken);
        if (!await limited(`consent:${hash}`, 600, 5)) return reply(429, { error: 'try_later' });
        const record = await backend.store.consent(hash, GUARDIAN_NOTICE_VERSION);
        if (!record) return reply(400, { error: 'invalid_link' });
        return reply(202, { state: record.state });
      }
      if (action === 'review') {
        const grant = user!.app_metadata?.cosmora_role === 'admin' || user!.app_metadata?.cosmora_dashboard_access === true;
        if (!backend.reviewerIds.has(user!.id) || !grant) return reply(403, { error: 'access_denied' });
        if (!uuid(body.requestId) || !['approved', 'denied', 'revoked'].includes(String(body.decision))
          || !['pending_review', 'approved'].includes(String(body.expectedState))
          || !((body.expectedState === 'pending_review' && ['approved', 'denied'].includes(String(body.decision)))
            || (body.expectedState === 'approved' && body.decision === 'revoked'))
          || typeof body.reason !== 'string' || body.reason.trim().length < 20 || body.reason.length > 1000
          || (body.decision === 'approved' && body.responsibilityChecked !== true)) return reply(400, { error: 'invalid_review' });
        if (!await limited(`review:${user!.id}`, 60, 20)) return reply(429, { error: 'try_later' });
        const record = await backend.store.review({
          requestId: body.requestId, reviewerId: user!.id, decision: body.decision as 'approved' | 'denied' | 'revoked',
          expectedState: body.expectedState as GuardianState, reason: body.reason.trim(), responsibilityChecked: body.responsibilityChecked === true,
        });
        return record ? reply(200, { id: record.id, state: record.state }) : reply(409, { error: 'state_changed' });
      }
      return reply(404, { error: 'not_found' });
    } catch {
      // Never log request bodies, emails, tokens, SMTP responses or raw errors.
      return reply(503, { error: 'unavailable' });
    }
  };
}
