import type { Session } from '@supabase/supabase-js';
import { createAuthFetch } from './supabase/auth-fetch.ts';

// A presentation preference only. Never use this user-editable receipt for authorization.
export const THANKS_RECEIPT_KEY = 'cosmora_community_thanks_v1';
type Receipt = { readAt: string; synced: boolean };
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type ThanksUser = { id: string; user_metadata?: Record<string, unknown> };
export type ThanksSession = Pick<Session, 'access_token'> & {
  user: Pick<Session['user'], 'id' | 'user_metadata'>;
};

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function createThanksStore(getStorage: () => StorageLike) {
  const memory = new Map<string, Receipt>();
  const key = (userId: string) => `${THANKS_RECEIPT_KEY}:${userId}`;
  return {
    read(userId: string): Receipt | null {
      try {
        const value = JSON.parse(getStorage().getItem(key(userId)) ?? 'null');
        if (value && validDate(value.readAt) && typeof value.synced === 'boolean') {
          memory.set(userId, value);
          return value;
        }
      } catch { /* Storage may be unavailable in a private browser or WebView. */ }
      return memory.get(userId) ?? null;
    },
    record(userId: string, readAt = new Date().toISOString(), synced = false) {
      if (!validDate(readAt)) return;
      const value = { readAt, synced };
      memory.set(userId, value);
      try { getStorage().setItem(key(userId), JSON.stringify(value)); }
      catch { /* Keep the dismissal for this app session. */ }
    },
  };
}

export const thanksStore = createThanksStore(() => localStorage);
type ThanksStore = ReturnType<typeof createThanksStore>;
export type ThanksTransport = {
  read: (token: string, signal?: AbortSignal) => Promise<ThanksUser | null>;
  write: (token: string, readAt: string, signal?: AbortSignal) => Promise<ThanksUser | null>;
};

/** Bind each request to the captured token, even if another account signs in meanwhile. */
export function createThanksTransport(options: {
  url?: string; apiKey?: string; fetcher?: typeof fetch; timeoutMs?: number;
} = {}): ThanksTransport {
  const url = options.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = options.apiKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const fetcher = url ? createAuthFetch(url, options.fetcher, options.timeoutMs) : null;
  async function request(token: string, readAt?: string, signal?: AbortSignal): Promise<ThanksUser | null> {
    if (!url || !apiKey || !token || !fetcher) return null;
    const response = await fetcher(`${url.replace(/\/+$/, '')}/auth/v1/user`, {
      method: readAt ? 'PUT' : 'GET',
      headers: { apikey: apiKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(readAt ? { body: JSON.stringify({ data: { [THANKS_RECEIPT_KEY]: readAt } }) } : {}),
      credentials: 'omit', cache: 'no-store', signal,
    });
    if (!response.ok) return null;
    const user: unknown = await response.json();
    return user && typeof user === 'object' && 'id' in user && typeof user.id === 'string'
      ? user as ThanksUser : null;
  }
  return { read: (token, signal) => request(token, undefined, signal), write: request };
}

export async function syncThanksReceipt(session: ThanksSession, transport: ThanksTransport, store = thanksStore, signal?: AbortSignal) {
  const local = store.read(session.user.id);
  if (!local || local.synced || signal?.aborted) return;
  try {
    const user = await transport.write(session.access_token, local.readAt, signal);
    if (user?.id === session.user.id && validDate(user.user_metadata?.[THANKS_RECEIPT_KEY])) {
      store.record(user.id, user.user_metadata[THANKS_RECEIPT_KEY] as string, true);
    }
  } catch { /* Retry pending acknowledgements on the next launch/online event. */ }
}

/** Unknown/offline receipt state never interrupts navigation or shows a duplicate. */
export async function shouldShowThanks(session: ThanksSession, transport: ThanksTransport, store: ThanksStore = thanksStore, signal?: AbortSignal): Promise<boolean> {
  if (store.read(session.user.id)) {
    await syncThanksReceipt(session, transport, store, signal);
    return false;
  }
  const cached = session.user.user_metadata?.[THANKS_RECEIPT_KEY];
  if (validDate(cached)) { store.record(session.user.id, cached, true); return false; }
  try {
    const user = await transport.read(session.access_token, signal);
    if (signal?.aborted || !user || user.id !== session.user.id) return false;
    const remote = user.user_metadata?.[THANKS_RECEIPT_KEY];
    if (validDate(remote)) { store.record(user.id, remote, true); return false; }
    // A dismissal in another mounted view/tab wins over this late check.
    return !store.read(user.id);
  } catch { return false; }
}
