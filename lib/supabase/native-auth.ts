import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import type { SupabaseClient } from '@supabase/supabase-js';
import { nativeAuthCallbackURL, parseNativeAuthCallback } from './auth-redirect.ts';
import { consumeAccountDeletionLogin, syncPendingTermsConsent } from '../terms-consent.ts';

const nativeAuth = registerPlugin<{
  authenticate(options: { url: string }): Promise<{ url: string }>;
}>('CosmoraAuth');

type AuthDestination = '/profile/me' | '/auth/recovery' | '/account/delete';
const exchanges = new Map<string, Promise<AuthDestination | null>>();
const completedStorageKey = 'cosmora-completed-auth-links';

async function callbackFingerprint(url: URL) {
  const flowId = url.searchParams.get('sb_flow_id');
  if (flowId) return `flow:${flowId}`;
  if (!globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(url.searchParams.get('code') ?? '');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function completedCallbacks(): string[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(completedStorageKey) ?? '[]');
    return Array.isArray(saved)
      ? saved.filter((item): item is string => typeof item === 'string' && /^(?:flow:[a-zA-Z0-9_-]{8,64}|sha256:[a-f0-9]{64})$/.test(item)).slice(-32)
      : [];
  } catch {
    return [];
  }
}

// iOS can report the same link to the auth session and App listener. Cold-start
// delivery can also repeat after a WebView reload. Exchange a code only once;
// retain only the non-secret flow ID (or code digest) across reloads.
export function completeNativeAuthCallback(rawUrl: string, client: SupabaseClient) {
  const url = parseNativeAuthCallback(rawUrl);
  const code = url?.searchParams.get('code');
  if (!url || !code || url.searchParams.has('error') || url.searchParams.has('error_code')) {
    return Promise.reject(new Error('Accesso non completato. Riprova.'));
  }
  const key = `${code}:${url.searchParams.get('sb_flow_id') ?? ''}`;
  const existing = exchanges.get(key);
  if (existing) return existing;
  const pending = (async (): Promise<AuthDestination | null> => {
    const fingerprint = await callbackFingerprint(url);
    if (fingerprint && completedCallbacks().includes(fingerprint)) return null;
    const flowId = url.searchParams.get('sb_flow_id');
    const { data, error } = await client.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error || !data.session) throw new Error('Sessione non confermata. Riprova l’accesso.');
    try {
      if (fingerprint) sessionStorage.setItem(completedStorageKey, JSON.stringify([...completedCallbacks(), fingerprint].slice(-32)));
    } catch {
      // In-memory deduplication still works when storage is unavailable.
    }
    if ('redirectType' in data && data.redirectType === 'recovery') {
      consumeAccountDeletionLogin();
      return '/auth/recovery';
    }
    const deletingAccount = consumeAccountDeletionLogin() || data.user?.app_metadata?.deletion_pending === true;
    if (!deletingAccount && data.session.user)
      void syncPendingTermsConsent(client, data.session.user, true);
    return deletingAccount ? '/account/delete' : '/profile/me';
  })();
  exchanges.set(key, pending);
  if (exchanges.size > 32) exchanges.delete(exchanges.keys().next().value!);
  return pending;
}

export async function signInOnIOS(
  provider: 'apple' | 'google',
  client: SupabaseClient,
): Promise<AuthDestination | false> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return false;
  if (!Capacitor.isPluginAvailable('CosmoraAuth')) {
    throw new Error('Accesso Apple o Google non disponibile. Puoi accedere con email.');
  }
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: nativeAuthCallbackURL, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error('Impossibile avviare l’accesso. Riprova.');
  const result = await nativeAuth.authenticate({ url: data.url });
  return (await completeNativeAuthCallback(result.url, client)) ?? '/profile/me';
}

export async function signInOnAndroid(
  provider: 'apple' | 'google',
  client: SupabaseClient,
) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return false;
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: nativeAuthCallbackURL, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error('Impossibile avviare l’accesso. Riprova.');
  await Browser.open({ url: data.url });
  return true;
}
