# COSMORA session recovery hotfix

Prepared 21–22 October 2026. iOS candidate **1.0.4 (43)**, bundle `it.kreluna.cosmora`; Android candidate **1.0.4 (42)**, package `com.kreluna.cosmora`.

## Scope and observed failure

The user reports that opening Messages in the App Store installation leaves the app on “Verifica della sessione…”. They subsequently clarified that this happens when reopening the app after it has remained closed for a while. The public App Store lookup for app 6809232374 reported version 1.0.3 (released 18 October). This hotfix starts from `81dc23e`, the 1.0.3 source, and does not include pending VIECC presentation changes.

The terms gate previously waited indefinitely for both `getSession()` and the initial auth event. With the installed Supabase SDK, both can wait on the same stalled refresh request. The underlying request could also stall while reading its response body. This reproduces the reported screen; no logs from the user's physical iPhone were available to prove its exact network failure.

The native app already stops automatic refresh while inactive and restarts it when active. The installed SDK schedules an immediate refresh check on that restart. Capacitor also reloads the WebView after iOS terminates its content process; that path remounts the session gate. Both can require a stored, expired session to refresh. The hotfix bounds that Auth transport and the bootstrap read. A real physical-device background/resume observation remains necessary after installing the new build; the exact iPhone suspension or process-termination event is not known.

## Changes

- Bound same-origin Supabase Auth requests, including their response body, to ten seconds, while preserving request options and caller cancellation.
- Bound session reads to twelve seconds. Show an actionable error and Retry/login controls when session verification cannot finish.
- Continue listening for auth recovery and prevent late reads from overriding newer sign-in/sign-out events.
- Keep stored credentials on timeout; do not interpret a timeout as a successful guest session.
- Apply bounded reads to inbox loading, conversation account requests and user-bound mutations.
- Before explicit guest sign-out, finish a bounded session read; do not leave a timed-out sign-out queued to clear a later login.
- Keep server authorization and privacy/blocking checks unchanged.
- Localize the recovery error in Italian, English, French, German and Spanish; respect the iPhone safe area.

## Evidence

- TypeScript check: passed.
- Lint on changed auth/client files: passed. Project-wide lint reports pre-existing issues outside this fix.
- Targeted auth/session/terms/native transport tests: 62 passed.
- Full suite: 185 passed, 2 failed. Both failures reproduce on unchanged source from `81dc23e`: checkout test's unresolved `@/lib` alias under Node; outdated SVG image expectation in mobile-layout test. No production checkout/layout changes were included in this fix.
- Browser interaction checks using synthetic users and intercepted API requests: Chrome and WebKit passed Home → Messages → conversation, expired-session stalled refresh, error after about 12.5 seconds, Retry and subsequent recovery. No actual messages were sent and no real accounts were modified.
- iOS mobile bundle build, credential scan, native sync, archive, local IPA export and codesign verification passed.

Logs and screenshots are in ignored `outputs/session-hotfix/`. Signed artifact: `outputs/session-hotfix/ipa/App.ipa`.

IPA SHA-256: `29beb16b3796b2d6a984b965f219cc5b19261a57227fa1c2b55fdfaeceac8b6b`.

## Android artifact

- The authenticated Play Console inspection on 22 October showed production version 1.0.3, code 40, and bundles 39 and 40. Code 42 was chosen to avoid reusing the obsolete local VIECC candidate with code 41.
- Native sync used the existing hotfix `dist/mobile`; no VIECC changes were added. Local debug and release builds succeeded.
- Signed AAB: `outputs/session-hotfix/COSMORA-session-hotfix-Android-1.0.4-42.aab` (41,453,023 bytes).
- SHA-256: `e299efeeb0ff528e31c4e4d5b72afe76caaa111827be3b14cf631008877f3cc2`.
- Public signing metadata: `outputs/session-hotfix/COSMORA-session-hotfix-Android-1.0.4-42.json`.
- The manifest inside the signed AAB confirms `com.kreluna.cosmora`, version name `1.0.4`, version code `42` and compile SDK 36.
- `jarsigner` verified the signature. Upload certificate SHA-256: `0cd0bba9991a9e9cc37cbe734854667609dcac3b2d6f90db6f5a85816554cc23`. It matches the local archived code-40 AAB; this comparison does not independently verify the certificate configured in Play Console.
- All 161 files from `dist/mobile` match their packaged Android assets byte for byte. The Capacitor configuration has no hosted `server.url`.
- Android preparation left the 164 iOS public/configuration files unchanged. Their aggregate SHA-256 remains `a99715454634ab86bf49d824a6b6e3642d60ee783ad3292d9cea5961442eb467`, calculated from sorted relative paths followed by each file's bytes under `ios/App/App/public` and `ios/App/App/capacitor.config.json`.

## Delivery status

**Android upload accepted and submission confirmed on 22 October 2026.** Play Console accepted version 1.0.4, code 42, in production release 3. Release notes were entered in five languages. The publishing overview lists one app change, “1.0.4 (42) — Ripristino sessione”, under “Modifiche in fase di revisione”. At capture time, preliminary quick checks were still running, with an estimate of up to 12 minutes before the changes would proceed to review.

The release is configured for a complete rollout (100%) in 178 countries. Managed publishing remains disabled, preserving its existing setting. **Approval and public availability have not been confirmed.** Evidence: `outputs/session-hotfix/google-play-submitted-2026-10-22.jpg`.

**iOS 1.0.4 (43) is signed and prepared locally, but has not been uploaded.** The Mac was locked, Apple sign-in was still required, and the Xcode profiles view was empty during the delivery attempt. Those access prerequisites remain open. The maximum previously identified local iOS build was 42. Export used a separate plist with `destination=export`; the repository's `ios/ExportOptions.plist` uses `destination=upload` and must not be used for a preparation-only export.

The installed App Store app bundles its JavaScript. A website deployment cannot deliver this fix to that installed binary. Confirm the actual Messages flow on an iPhone after installing the updated build. Apply the auth fix to the ongoing feature branch before its next release as well.

Suggested Italian release notes: “Migliorata l’apertura dei messaggi e il recupero dell’accesso in caso di connessione lenta o interrotta.”
Suggested English release notes: “Improved opening Messages and recovering sign-in when the connection is slow or interrupted.”
