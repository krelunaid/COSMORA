import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { COSMORA_API_ORIGIN, nativeApiFetch, resolveNativeApiUrl } from './native-api-transport.ts';

const apiOrigin = COSMORA_API_ORIGIN;

/** Only the native bundle needs an absolute URL; web and previews stay same-origin. */
export function resolveApiUrl(path: string, native = Capacitor.isNativePlatform(), method = 'GET'): string {
  if (!path.startsWith('/api/') || path.includes('\\')) {
    throw new TypeError('Expected a COSMORA API path.');
  }
  const url = new URL(path, apiOrigin);
  if (url.origin !== apiOrigin || !url.pathname.startsWith('/api/')) {
    throw new TypeError('Expected a COSMORA API path.');
  }
  return native ? resolveNativeApiUrl(url.href, method) : path;
}

/** Explicit native HTTP keeps the bundled app independent of browser CORS deployment. */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const native = Capacitor.isNativePlatform();
  const url = resolveApiUrl(path, native, options.method ?? 'GET');
  return native
    ? nativeApiFetch(url, options, (request) => CapacitorHttp.request(request))
    : fetch(url, options);
}
