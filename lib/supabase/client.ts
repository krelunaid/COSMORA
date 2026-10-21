import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { syncPendingTermsConsent } from '../terms-consent.ts';
import { createAuthFetch } from './auth-fetch.ts';

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  if (!browserClient) {
    const native = Capacitor.isNativePlatform();
    let returningFromAuth = !native && typeof window !== 'undefined' && window.location.pathname !== '/auth/recovery' &&
      (/(?:^#|&)access_token=/.test(window.location.hash) || new URLSearchParams(window.location.search).has('code'));
    browserClient = createClient(url, anonKey, {
      global: { fetch: createAuthFetch(url) },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Native callbacks are exchanged by NativeAuthCallback. Keeping PKCE
        // in this persisted client also survives an OS-terminated app process.
        flowType: native ? 'pkce' : 'implicit',
        detectSessionInUrl: !native,
      },
    });
    const client = browserClient;
    client.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        const allowUnbound = returningFromAuth;
        returningFromAuth = false;
        // Defer metadata requests to avoid re-entering auth during its event callback.
        setTimeout(() => { void syncPendingTermsConsent(client, session.user, allowUnbound); }, 0);
      }
    });
  }
  return browserClient;
}
