const legacyOrigin = 'https://cosmora-app.andreagadducci.chatgpt.site';
const trustedOrigins = new Set([legacyOrigin, 'https://cosmora.kreluna.it']);

// Never send authentication tokens to an arbitrary preview or forwarded host.
export function authRedirect(origin: string, path: '/profile/me' | '/auth/recovery') {
  return `${trustedOrigins.has(origin) ? origin : legacyOrigin}${path}`;
}
