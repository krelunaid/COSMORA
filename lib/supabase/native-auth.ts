import { Capacitor, registerPlugin } from '@capacitor/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const callbackURL = 'com.kreluna.cosmora://auth/callback';
const nativeAuth = registerPlugin<{
  authenticate(options: { url: string }): Promise<{ url: string }>;
}>('CosmoraAuth');

export async function signInOnIOS(
  provider: 'apple' | 'google',
  client: SupabaseClient,
) {
  if (Capacitor.getPlatform() !== 'ios') return false;
  if (!Capacitor.isPluginAvailable('CosmoraAuth')) {
    throw new Error('Aggiorna COSMORA da TestFlight per usare l’accesso Apple dentro l’app. Nel frattempo puoi accedere con email.');
  }
  // Separate PKCE storage preserves email confirmation and recovery flows.
  const oauth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'pkce', storageKey: 'cosmora-native-oauth',
      persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { data, error } = await oauth.auth.signInWithOAuth({
    provider, options: { redirectTo: callbackURL, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error('Impossibile avviare l’accesso. Riprova.');
  const result = await nativeAuth.authenticate({ url: data.url });
  const callback = new URL(result.url);
  if (`${callback.protocol}//${callback.host}${callback.pathname}` !== callbackURL)
    throw new Error('Risposta di accesso non valida.');
  const code = callback.searchParams.get('code');
  if (!code || callback.searchParams.has('error'))
    throw new Error('Accesso non completato. Riprova.');
  const exchange = await oauth.auth.exchangeCodeForSession(code);
  if (exchange.error || !exchange.data.session)
    throw new Error('Sessione non confermata. Riprova l’accesso.');
  const session = exchange.data.session;
  const saved = await client.auth.setSession({
    access_token: session.access_token, refresh_token: session.refresh_token,
  });
  if (saved.error) throw new Error('Impossibile salvare l’accesso nell’app.');
  return true;
}
