const appOrigin = 'https://cosmora.kreluna.it';
// Keep requesting the legacy callback until the new exact URL has been added
// to and verified in Supabase's redirect allowlist. The iOS bundle ID differs.
export const nativeAuthCallbackURL = 'com.kreluna.cosmora://auth/callback';
const acceptedNativeCallbacks = new Set([
  nativeAuthCallbackURL,
  'it.kreluna.cosmora://auth/callback',
]);
const legacyOrigin = 'https://cosmora-app.andreagadducci.chatgpt.site';
const trustedOrigins = new Set([appOrigin, legacyOrigin]);
const localPreviewOrigins = new Set([
  'http://localhost:4317',
  'http://127.0.0.1:4317',
]);

// Allow only the known local preview, the custom domain, and the legacy app host.
export function authRedirect(
  origin: string,
  path: '/profile/me' | '/auth/recovery' | '/account/delete',
  native = false,
) {
  if (native) return nativeAuthCallbackURL;
  const destination = trustedOrigins.has(origin) || localPreviewOrigins.has(origin)
    ? origin
    : appOrigin;
  return `${destination}${path}`;
}

// Native links come from other apps. Match the complete callback authority,
// reject credentials/ambiguous parameters, and accept only our PKCE response.
export function parseNativeAuthCallback(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (
      !acceptedNativeCallbacks.has(`${url.protocol}//${url.host}${url.pathname}`) ||
      url.username || url.password ||
      url.searchParams.getAll('code').length > 1 ||
      url.searchParams.getAll('sb_flow_id').length > 1 ||
      (url.searchParams.has('sb_flow_id') &&
        !/^[a-zA-Z0-9_-]{8,64}$/.test(url.searchParams.get('sb_flow_id') ?? ''))
    ) return null;
    if (url.hash) {
      // Supabase includes this error fragment even for PKCE email callbacks.
      // Normalize only known error fields; implicit bearer tokens stay rejected.
      const fragment = new URLSearchParams(url.hash.slice(1));
      const allowed = new Set(['error', 'error_code', 'error_description', 'sb']);
      if ((!fragment.has('error') && !fragment.has('error_code')) ||
        [...fragment.keys()].some((key) => !allowed.has(key) || fragment.getAll(key).length !== 1)) return null;
      for (const [key, value] of fragment) {
        if (key === 'sb') continue;
        if (url.searchParams.has(key) && url.searchParams.get(key) !== value) return null;
        url.searchParams.set(key, value);
      }
      url.hash = '';
    }
    return url;
  } catch {
    return null;
  }
}
