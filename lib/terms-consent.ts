import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Locale } from './i18n/config.ts';

export const TERMS_VERSION = '2026-10-06';
const consentKey = 'cosmora-terms-consent';
const deletionLoginKey = 'cosmora-account-deletion-login';
const maxPendingAgeMs = 24 * 60 * 60 * 1000;
type ConsentSource = 'email-login' | 'email-register' | 'google' | 'apple' | 'session-upgrade';
type ConsentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type TermsConsent = {
  version: string;
  acceptedAt: string;
  locale: Locale;
  source: ConsentSource;
  userId?: string;
  expectedEmail?: string;
};
type ConsentState = { pending?: TermsConsent; accepted?: TermsConsent };

/** Informational receipt only: never use local storage or user_metadata for authorization. */
export function createTermsConsent(
  accepted: boolean,
  locale: Locale,
  source: ConsentSource,
  now = new Date(),
): TermsConsent | null {
  return accepted === true
    ? { version: TERMS_VERSION, acceptedAt: now.toISOString(), locale, source }
    : null;
}

function validReceipt(value: unknown): value is TermsConsent {
  if (!value || typeof value !== 'object') return false;
  const receipt = value as Partial<TermsConsent>;
  return receipt.version === TERMS_VERSION &&
    typeof receipt.acceptedAt === 'string' && Number.isFinite(Date.parse(receipt.acceptedAt)) &&
    ['it', 'en', 'fr', 'de', 'es'].includes(receipt.locale ?? '') &&
    ['email-login', 'email-register', 'google', 'apple', 'session-upgrade'].includes(receipt.source ?? '') &&
    (receipt.userId === undefined || typeof receipt.userId === 'string') &&
    (receipt.expectedEmail === undefined || typeof receipt.expectedEmail === 'string');
}

export function termsConsentMetadata(receipt: TermsConsent) {
  return { cosmora_terms_consent: {
    version: receipt.version,
    accepted_at: receipt.acceptedAt,
    locale: receipt.locale,
    source: receipt.source,
  } };
}

export function createTermsConsentStore(getStorage: () => ConsentStorage) {
  let fallback: ConsentState = {};
  let storageUnavailable = false;
  function read(): ConsentState {
    if (storageUnavailable) return fallback;
    try {
      const value: unknown = JSON.parse(getStorage().getItem(consentKey) ?? '{}');
      if (!value || typeof value !== 'object') return {};
      const state = value as ConsentState;
      return {
        pending: validReceipt(state.pending) ? state.pending : undefined,
        accepted: validReceipt(state.accepted) ? state.accepted : undefined,
      };
    } catch { return fallback; }
  }
  function write(state: ConsentState) {
    fallback = state;
    try { getStorage().setItem(consentKey, JSON.stringify(state)); }
    catch { storageUnavailable = true; }
  }
  return {
    record(receipt: TermsConsent, expectedEmail?: string) {
      write({ ...read(), pending: {
        ...receipt,
        ...(expectedEmail ? { expectedEmail: expectedEmail.trim().toLowerCase() } : {}),
      } });
    },
    pending(now = Date.now()) {
      const receipt = read().pending;
      if (!receipt) return null;
      const age = now - Date.parse(receipt.acceptedAt);
      return age >= -5 * 60 * 1000 && age <= maxPendingAgeMs ? receipt : null;
    },
    accepted(userId: string) {
      const receipt = read().accepted;
      return receipt?.userId === userId ? receipt : null;
    },
    bind(receipt: TermsConsent, userId: string) {
      const state = read();
      if (state.pending?.acceptedAt === receipt.acceptedAt && state.pending.source === receipt.source)
        write({ ...state, pending: { ...receipt, userId } });
    },
    complete(receipt: TermsConsent, userId: string) {
      const state = read();
      const samePending = state.pending?.acceptedAt === receipt.acceptedAt && state.pending.source === receipt.source &&
        (!state.pending.userId || state.pending.userId === userId);
      // A completed request from an earlier account must not replace a newer local receipt.
      if (!samePending) return;
      const { expectedEmail: _email, ...accepted } = receipt;
      write({ accepted: { ...accepted, userId } });
    },
    clearPending() { write({ ...read(), pending: undefined }); },
  };
}

export const termsConsentStore = createTermsConsentStore(() => localStorage);
type ConsentClient = Pick<SupabaseClient, 'auth'>;
type ConsentWriter = (accessToken: string, receipt: TermsConsent) => Promise<{ id?: string } | null>;

/** Uses the captured user's token, never the SDK singleton's potentially changed current session. */
export async function writeTermsConsentMetadata(
  accessToken: string,
  receipt: TermsConsent,
  options: { url?: string; apiKey?: string; fetch?: typeof fetch } = {},
): Promise<{ id?: string } | null> {
  const url = options.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = options.apiKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !apiKey || !accessToken) return null;
  const response = await (options.fetch ?? fetch)(`${url.replace(/\/+$/, '')}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: apiKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: termsConsentMetadata(receipt) }),
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const value: unknown = await response.json();
  return value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
    ? { id: value.id } : null;
}

/** UX only. This must never be used by API authorization or database policies. */
export function hasCurrentTermsReceipt(
  user: Pick<User, 'id' | 'user_metadata'>,
  store = termsConsentStore,
): boolean {
  if (store.accepted(user.id) || store.pending()?.userId === user.id) return true;
  const metadata: unknown = user.user_metadata?.cosmora_terms_consent;
  if (!metadata || typeof metadata !== 'object') return false;
  const record = metadata as Record<string, unknown>;
  return validReceipt({
    version: record.version, acceptedAt: record.accepted_at,
    locale: record.locale, source: record.source, userId: user.id,
  });
}

/** Only account access and documents stay mounted before current terms are accepted. */
export function isTermsExemptPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return ['/auth/login', '/auth/register', '/auth/recovery', '/account/delete',
    '/community/rules', '/privacy', '/support'].includes(path);
}

/** Runs outside onAuthStateChange's callback/lock and never blocks sign-in on metadata failure. */
export function createTermsConsentSynchronizer(store = termsConsentStore, write: ConsentWriter = writeTermsConsentMetadata) {
  const attempts = new Map<string, Promise<void>>();
  return function sync(client: ConsentClient, user: Pick<User, 'id' | 'email' | 'user_metadata'>, allowUnbound = false) {
    const receipt = store.pending();
    if (!receipt || (receipt.userId ? receipt.userId !== user.id : !allowUnbound)) return Promise.resolve();
    if (receipt.expectedEmail && receipt.expectedEmail !== user.email?.trim().toLowerCase()) return Promise.resolve();
    const key = `${user.id}:${receipt.acceptedAt}:${receipt.source}`;
    const previous = attempts.get(key);
    if (previous) return previous;
    store.bind(receipt, user.id);
    const pending = (async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (error || data.session?.user.id !== user.id) return;
        const existing = data.session.user.user_metadata?.cosmora_terms_consent;
        if (existing?.version !== receipt.version || existing?.accepted_at !== receipt.acceptedAt) {
          const result = await write(data.session.access_token, receipt);
          if (result?.id !== user.id) return;
        }
        store.complete(receipt, user.id);
      } catch { /* Local receipt remains; a later app launch can retry without losing the session. */ }
    })();
    // Keep attempted entries for this app lifetime: focus/SIGNED_IN events must not retry in a loop.
    attempts.set(key, pending);
    if (attempts.size > 32) attempts.delete(attempts.keys().next().value!);
    return pending;
  };
}

export const syncPendingTermsConsent = createTermsConsentSynchronizer();

/** Fixed navigation intent only; it grants no account access and never deletes an account. */
let deletionLoginStartedAt: number | null = null;
export function setAccountDeletionLogin(enabled: boolean, getStorage: () => ConsentStorage = () => localStorage) {
  deletionLoginStartedAt = enabled ? Date.now() : null;
  try {
    if (enabled) getStorage().setItem(deletionLoginKey, String(deletionLoginStartedAt));
    else getStorage().removeItem(deletionLoginKey);
  } catch { /* An existing session can still use the account deletion page directly. */ }
}

export function consumeAccountDeletionLogin(getStorage: () => ConsentStorage = () => localStorage, now = Date.now()) {
  let startedAt = deletionLoginStartedAt;
  deletionLoginStartedAt = null;
  try {
    const raw = getStorage().getItem(deletionLoginKey);
    getStorage().removeItem(deletionLoginKey);
    if (raw !== null) startedAt = Number(raw);
  } catch { /* Use the non-secret in-memory navigation intent. */ }
  if (startedAt === null) return false;
  const age = now - startedAt;
  return Number.isFinite(age) && age >= 0 && age <= maxPendingAgeMs;
}
