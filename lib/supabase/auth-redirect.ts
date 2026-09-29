const legacyOrigin = 'https://cosmora-app.andreagadducci.chatgpt.site';
const trustedOrigins = new Set([legacyOrigin, 'https://cosmora.kreluna.it']);
const localPreviewOrigins = new Set([
  'http://localhost:4317',
  'http://127.0.0.1:4317',
]);

// Allow only the known local preview, the custom domain, and the legacy app host.
export function authRedirect(origin: string, path: '/profile/me' | '/auth/recovery') {
  const destination = trustedOrigins.has(origin) || localPreviewOrigins.has(origin)
    ? origin
    : legacyOrigin;
  return `${destination}${path}`;
}
