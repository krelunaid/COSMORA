# Native API transport

The bundled iOS/Android UI uses `apiFetch` for COSMORA API requests. On native platforms this calls the core `CapacitorHttp.request` method explicitly. Browser builds retain ordinary relative `fetch` requests. Global `window.fetch`/XHR patching stays disabled, including for Supabase and local photo/model reads.

## Request boundary

- Only HTTPS `https://cosmora.kreluna.it/api/…` destinations are accepted. URL credentials, fragments, external origins and paths escaping `/api/` are rejected.
- HTTP redirects are disabled in native code. Redirect status codes or a changed response URL also fail at the application boundary. Requests are never retried automatically.
- Allowed request headers are Authorization (Bearer only), Content-Type, Accept, Accept-Language and Cache-Control. Caller-supplied Cookie, Host and other headers are rejected. Native requests explicitly request `Cache-Control: no-store`.
- COSMORA's server validates the supplied bearer token. A local app origin or the native transport does not confer authorization.

## Uploads and responses

JSON strings pass through unchanged. URLSearchParams retain their encoded text. FormData preserves repeated fields, UTF-8 text, filenames and file bytes by using Capacitor's supported array of `string`/`base64File` entries with `dataType: 'formData'`. Both native platforms create the multipart boundary. Multipart header names and filenames are escaped before native serialization; file content types are restricted to MIME syntax.

The serializer matches the installed Capacitor 8.5.1 native-bridge conversion and iOS/Android request-body implementations. It does not pass browser FormData directly to the bridge. Large media selections still require real-device memory testing: base64 plus native serialization has memory overhead, especially near the existing limit of eight 25 MB files. No reduced media limit has been silently introduced.

Native HTTP results become standard Response objects, preserving status, headers and JSON/error bodies. Empty/HEAD responses remain empty. Stale Content-Length/Content-Encoding and Set-Cookie headers are removed from the JavaScript response. All current COSMORA API responses use object/array JSON or plain error text; binary responses are outside this adapter's scope.

## Cancellation, timeout and native cookies

AbortSignal immediately rejects the JavaScript consumer. Aborting during file preparation prevents later upload dispatch. CapacitorHttp has no public per-request cancellation method after dispatch: the OS request may still complete, and a mutation may have reached the server. The adapter ignores late results and never retries. It sets native connection/read timeouts and a JavaScript deadline of 60 seconds. Account operations normally use a 20-second UI timeout; account deletion uses 60 seconds to accommodate Apple revocation and storage cleanup. Neither a timeout nor cancellation proves a write was rolled back.

CapacitorHttp has no native equivalent of `credentials: 'omit'`. Its OS cookie jar may send/store same-domain cookies even though caller-supplied Cookie headers are rejected. This adapter therefore does not claim cookie-free native traffic. Authentication stays bearer-only, destinations are fixed, and redirects are disabled. `webFetchExtra.credentials` would affect only the web plugin and is deliberately not used as a false native guarantee.

## Checks

`tests/native-api-transport.test.ts` injects the native request dependency to verify header and URL boundaries, multipart bytes/repeated fields, redirects, responses, timeouts and cancellation. `tests/api-fetch.test.ts` checks web-relative behavior, and `tests/account-http.test.ts` checks existing consumer errors. These checks do not replace a native-device smoke test against the live backend.

Reference: [CapacitorHttp](https://capacitorjs.com/docs/apis/http).
