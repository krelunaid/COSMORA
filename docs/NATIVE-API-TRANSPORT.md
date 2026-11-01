# Native API transport

The bundled iOS/Android UI uses `apiFetch` for COSMORA API requests. On native platforms this calls the core `CapacitorHttp.request` method explicitly. Browser builds retain ordinary relative `fetch` requests. Global `window.fetch`/XHR patching stays disabled, including for Supabase and local photo/model reads.

## Request boundary

- HTTPS `https://cosmora.kreluna.it/api/…` remains the destination for ordinary API operations. Native `GET/POST /api/community/posts`, `PUT /api/community/posts/interaction`, `GET/PUT /api/account`, `GET /api/account/name-availability`, and `GET/POST /api/seller/profile` use the dedicated service at `https://pwdpwgonvnuwmgfiidut.supabase.co/functions/v1/cosmora-community`, with the API path appended. Only those exact method/path pairs are accepted on that origin; other Supabase functions, REST/Auth endpoints, projects and paths are rejected. Other operations (including deletion, moderation, messaging and payments) remain on the original API. Browser requests remain same-origin.
- URL credentials, fragments, external origins and paths escaping `/api/` are rejected. The Community exception does not add a general Supabase origin allowance.
- HTTP redirects are disabled in native code. Redirect status codes or a changed response URL also fail at the application boundary. Requests are never retried automatically.
- Allowed request headers are Authorization (Bearer only), Content-Type, Accept, Accept-Language and Cache-Control. Caller-supplied Cookie, Host and other headers are rejected. Native requests explicitly request `Cache-Control: no-store`.
- COSMORA's server validates the supplied bearer token. A local app origin or the native transport does not confer authorization.

## Uploads and responses

JSON strings pass through unchanged. URLSearchParams retain their encoded text. FormData preserves repeated fields, UTF-8 text, filenames and file bytes by using Capacitor's supported array of `string`/`base64File` entries with `dataType: 'formData'`. Both native platforms create the multipart boundary. Multipart header names and filenames are escaped before native serialization; file content types are restricted to MIME syntax.

The serializer matches the installed Capacitor 8.5.1 native-bridge conversion and iOS/Android request-body implementations. It does not pass browser FormData directly to the bridge. Large media selections still require real-device memory testing: base64 plus native serialization has memory overhead, Community uploads now enforce 32 MB total across at most eight files (25 MB per file) in the composer and server. The recovery ingress is bounded at 34 MiB including multipart overhead and authenticates before buffering. The app explains the aggregate limit; other upload surfaces retain their existing limits.

Native HTTP results become standard Response objects, preserving status, headers and JSON/error bodies. Empty/HEAD responses remain empty. Stale Content-Length/Content-Encoding and Set-Cookie headers are removed from the JavaScript response. All current COSMORA API responses use object/array JSON or plain error text; binary responses are outside this adapter's scope.

## Cancellation, timeout and native cookies

AbortSignal immediately rejects the JavaScript consumer. Aborting during file preparation prevents later upload dispatch. CapacitorHttp has no public per-request cancellation method after dispatch: the OS request may still complete, and a mutation may have reached the server. The adapter ignores late results and never retries. It sets native connection/read timeouts and a JavaScript deadline of 60 seconds. Account operations normally use a 20-second UI timeout; account deletion uses 60 seconds to accommodate Apple revocation and storage cleanup. Neither a timeout nor cancellation proves a write was rolled back.

CapacitorHttp has no native equivalent of `credentials: 'omit'`. Its OS cookie jar may send/store same-domain cookies even though caller-supplied Cookie headers are rejected. This adapter therefore does not claim cookie-free native traffic. Authentication stays bearer-only, destinations are fixed, and redirects are disabled. `webFetchExtra.credentials` would affect only the web plugin and is deliberately not used as a false native guarantee.

## Checks

`tests/native-api-transport.test.ts` injects the native request dependency to verify header and URL boundaries, multipart bytes/repeated fields, redirects, responses, timeouts and cancellation. `tests/api-fetch.test.ts` checks web-relative behavior, and `tests/account-http.test.ts` checks existing consumer errors. These checks do not replace a native-device smoke test against the live backend.

Reference: [CapacitorHttp](https://capacitorjs.com/docs/apis/http).
