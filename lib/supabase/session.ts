import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';

export const SESSION_CHECK_TIMEOUT_MS = 12_000;
type AuthClient = Pick<SupabaseClient, 'auth'>;
type WaitOptions = { signal?: AbortSignal; timeoutMs?: number };

/** Bound the UI wait without clearing credentials or treating a timeout as sign-out. */
export function waitForAuth<T>(operation: () => Promise<T>, options: WaitOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      callback();
    };
    const abort = () => finish(() => reject(options.signal?.reason ?? new DOMException('Aborted', 'AbortError')));
    const timer = setTimeout(() => finish(() => reject(new Error(
      'La connessione sta impiegando troppo tempo. Controlla la rete e riprova.',
    ))), options.timeoutMs ?? SESSION_CHECK_TIMEOUT_MS);
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) { abort(); return; }
    Promise.resolve().then(() => {
      if (!settled) return operation();
      return undefined;
    }).then((value) => finish(() => resolve(value as T)), (error: unknown) => finish(() => reject(error)));
  });
}

export function getSessionWithTimeout(client: AuthClient, options: WaitOptions = {}) {
  return waitForAuth(() => client.auth.getSession(), options);
}

/** A late bootstrap result must never overwrite a newer sign-in/sign-out event. */
export function observeSession(
  client: AuthClient,
  onSession: (session: Session | null, event?: AuthChangeEvent) => void,
  onError: () => void,
  options: Pick<WaitOptions, 'timeoutMs'> = {},
) {
  let active = true;
  let authEvents = 0;
  const controller = new AbortController();
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    if (!active) return;
    authEvents++;
    onSession(session, event);
  });
  void getSessionWithTimeout(client, { timeoutMs: options.timeoutMs, signal: controller.signal }).then(({ data, error }) => {
    if (!active || authEvents !== 0) return;
    if (error) onError();
    else onSession(data.session);
  }).catch(() => {
    if (active && authEvents === 0) onError();
  });
  return () => {
    active = false;
    controller.abort();
    subscription.unsubscribe();
  };
}
