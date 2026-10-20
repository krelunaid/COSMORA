import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { COSMORA_API_ORIGIN, nativeApiFetch } from './native-api-transport.ts';

const apiOrigin = COSMORA_API_ORIGIN;

/** Only the native bundle needs an absolute URL; web and previews stay same-origin. */
export function resolveApiUrl(path: string, native = Capacitor.isNativePlatform()): string {
  if (!path.startsWith('/api/') || path.includes('\\')) {
    throw new TypeError('Expected a COSMORA API path.');
  }
  const url = new URL(path, apiOrigin);
  if (url.origin !== apiOrigin || !url.pathname.startsWith('/api/')) {
    throw new TypeError('Expected a COSMORA API path.');
  }
  return native ? url.href : path;
}

/** Explicit native HTTP keeps the bundled app independent of browser CORS deployment. */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const native = Capacitor.isNativePlatform();
  const url = resolveApiUrl(path, native);
  return native
    ? nativeApiFetch(url, options, (request) => CapacitorHttp.request(request))
    : fetch(url, options);
}
