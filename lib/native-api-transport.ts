import type { HttpOptions, HttpResponse } from '@capacitor/core';

export const COSMORA_API_ORIGIN = 'https://cosmora.kreluna.it';
export const NATIVE_API_TIMEOUT_MS = 60_000;
type NativeRequest = (options: HttpOptions) => Promise<HttpResponse>;
type FormEntry = { key: string; value: string; type: 'string' | 'base64File';
  fileName?: string; contentType?: string };
const methods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
const requestHeaders = new Set(['authorization', 'content-type', 'accept', 'accept-language', 'cache-control']);

export function validateNativeApiUrl(raw: string): string {
  const url = new URL(raw);
  if (url.origin !== COSMORA_API_ORIGIN || !url.pathname.startsWith('/api/')
    || url.username || url.password || url.hash || raw.includes('\\')) {
    throw new TypeError('Expected a COSMORA API URL.');
  }
  return url.href;
}

function multipartName(value: string): string {
  // Capacitor writes these values into multipart headers without browser escaping.
  // ASCII encoding also avoids Android's writeBytes truncating Unicode file names.
  return value.replace(/[^\x20-\x21\x23-\x5b\x5d-\x7e]/gu, (character) => encodeURIComponent(character));
}

async function fileBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunks: string[] = [];
  // A multiple of three avoids padding in the middle of the complete base64 value.
  for (let offset = 0; offset < bytes.length; offset += 24_576) {
    chunks.push(btoa(String.fromCharCode(...bytes.subarray(offset, offset + 24_576))));
  }
  return chunks.join('');
}

async function requestOptions(url: string, options: RequestInit, timeoutMs: number): Promise<HttpOptions> {
  const method = (options.method ?? 'GET').toUpperCase();
  if (!methods.has(method)) throw new TypeError('Unsupported API method.');
  const supplied = new Headers(options.headers);
  for (const name of supplied.keys()) {
    if (!requestHeaders.has(name)) throw new TypeError(`Unsupported API header: ${name}`);
  }
  if (supplied.has('authorization') && !supplied.get('authorization')!.startsWith('Bearer ')) {
    throw new TypeError('Expected bearer authorization.');
  }
  const headers: Record<string, string> = Object.fromEntries(supplied.entries());
  headers.Accept = supplied.get('accept') ?? 'application/json';
  headers['Cache-Control'] = 'no-store';
  // Native implementations query the body Content-Type by this canonical key.
  delete headers.accept;
  delete headers['cache-control'];
  delete headers['content-type'];
  if (supplied.has('content-type')) headers['Content-Type'] = supplied.get('content-type')!;

  const result: HttpOptions = { url, method, headers, responseType: 'text',
    connectTimeout: timeoutMs, readTimeout: timeoutMs, disableRedirects: true };
  const body = options.body;
  if (body == null) return result;
  if (method === 'GET' || method === 'HEAD') throw new TypeError('GET and HEAD cannot contain an API body.');

  if (body instanceof FormData) {
    const entries: FormEntry[] = [];
    for (const [key, value] of body.entries()) {
      entries.push(typeof value === 'string'
        ? { key: multipartName(key), value, type: 'string' }
        : { key: multipartName(key), value: await fileBase64(value), type: 'base64File',
          fileName: multipartName(value.name),
          contentType: /^[\w.+-]+\/[\w.+-]+$/.test(value.type) ? value.type : 'application/octet-stream' });
    }
    result.data = entries;
    result.dataType = 'formData';
    // Each native platform creates a matching boundary when one is omitted.
    headers['Content-Type'] = 'multipart/form-data';
  } else if (typeof body === 'string') {
    result.data = body;
    headers['Content-Type'] ??= 'text/plain;charset=UTF-8';
  } else if (body instanceof URLSearchParams) {
    result.data = body.toString();
    headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
  } else {
    throw new TypeError('Unsupported API request body.');
  }
  return result;
}

function toResponse(value: HttpResponse, url: string, method: string): Response {
  // Reject even a same-origin redirect: native requests must never resend a mutation.
  if (value.status >= 300 && value.status < 400) throw new TypeError('Unexpected API redirect.');
  if (validateNativeApiUrl(value.url) !== url) throw new TypeError('Unexpected API response URL.');
  if (!Number.isInteger(value.status) || value.status < 200 || value.status > 599) {
    throw new TypeError('Invalid API response status.');
  }
  const headers = new Headers(value.headers);
  // Native has already decompressed and decoded the body. Never expose cookie headers.
  for (const name of ['content-encoding', 'content-length', 'set-cookie', 'set-cookie2']) headers.delete(name);
  const empty = method === 'HEAD' || value.status === 204 || value.status === 205;
  const body = empty ? null : typeof value.data === 'string' ? value.data : JSON.stringify(value.data);
  return new Response(body, { status: value.status, headers });
}

/**
 * Explicit native transport; never patches window.fetch. The dependency is injectable
 * so request serialization and cancellation can be checked without a live account.
 * CapacitorHttp cannot cancel an in-flight native operation: abort stops the consumer,
 * and native timeouts bound its network wait. Never retry a mutation automatically.
 * Its native cookie jar cannot be disabled per request; callers cannot supply cookies,
 * and COSMORA server authorization must remain bearer-only.
 */
export function nativeApiFetch(
  rawUrl: string,
  options: RequestInit,
  request: NativeRequest,
  timeoutMs = NATIVE_API_TIMEOUT_MS,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const signal = options.signal;
    if (signal?.aborted) { reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); return; }
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (error?: unknown, response?: Response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (error !== undefined) reject(error);
      else resolve(response!);
    };
    const abort = () => finish(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => finish(new DOMException('API request timed out', 'TimeoutError')), timeoutMs);
    void (async () => {
      const url = validateNativeApiUrl(rawUrl);
      const nativeOptions = await requestOptions(url, options, timeoutMs);
      if (settled) return;
      let value: HttpResponse;
      try { value = await request(nativeOptions); }
      catch (cause) { throw new TypeError('API network request failed.', { cause }); }
      if (!settled) finish(undefined, toResponse(value, url, nativeOptions.method!));
    })().catch((reason) => finish(reason));
  });
}
