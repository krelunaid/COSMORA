/**
 * Keep session recovery finite even when a WebView's connection stalls after
 * sending the request or after receiving its headers. No session data is changed.
 */
export function createAuthFetch(
  supabaseUrl: string,
  fetcher: typeof fetch = globalThis.fetch,
  timeoutMs = 10000,
): typeof fetch {
  const origin = new URL(supabaseUrl).origin;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('The authentication request timeout must be positive.');
  }

  return async (input, init) => {
    let url: URL;
    try {
      const value = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      url = new URL(value, typeof location === 'undefined' ? undefined : location.href);
    } catch {
      // Preserve fetch's own URL validation and relative-URL behavior.
      return fetcher(input, init);
    }
    if (url.origin !== origin || !(url.pathname === '/auth/v1' || url.pathname.startsWith('/auth/v1/'))) {
      return fetcher(input, init);
    }

    // A provided init.signal overrides a Request's signal; explicit null clears it.
    const requestSignal = typeof input === 'object' && 'signal' in input ? input.signal : undefined;
    const callerSignal = init?.signal !== undefined ? init.signal : requestSignal;
    const callerReason = () => callerSignal?.reason ?? new DOMException('The request was aborted.', 'AbortError');
    if (callerSignal?.aborted) throw callerReason();

    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let rejectAbort!: (reason: unknown) => void;
    const aborted = new Promise<never>((_resolve, reject) => { rejectAbort = reject; });
    const abort = (reason: unknown) => {
      if (controller.signal.aborted) return;
      controller.abort(reason);
      // A custom fetch/stream may ignore AbortSignal; the race still ends promptly.
      rejectAbort(reason);
      if (reader) void reader.cancel(reason).catch(() => undefined);
    };
    const onCallerAbort = () => abort(callerReason());
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
    const timer = setTimeout(() => {
      abort(new DOMException('The authentication request timed out.', 'TimeoutError'));
    }, timeoutMs);

    const request = (async () => {
      const response = await fetcher(input, { ...init, signal: controller.signal });
      if (controller.signal.aborted) {
        if (response.body) void response.body.cancel(controller.signal.reason).catch(() => undefined);
        throw controller.signal.reason;
      }
      if (!response.body) return response;

      // Supabase Auth responses are small JSON payloads. Buffering them here also
      // bounds a stalled response.json() after fetch has already returned headers.
      reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (controller.signal.aborted) throw controller.signal.reason;
          if (part.done) break;
          chunks.push(part.value);
          length += part.value.byteLength;
        }
      } finally {
        reader.releaseLock();
        reader = undefined;
      }
      const body = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const buffered = new Response(body, {
        status: response.status, statusText: response.statusText, headers: response.headers,
      });
      Object.defineProperties(buffered, {
        url: { value: response.url },
        redirected: { value: response.redirected },
        type: { value: response.type },
      });
      return buffered;
    })();

    try {
      return await Promise.race([request, aborted]);
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  };
}
