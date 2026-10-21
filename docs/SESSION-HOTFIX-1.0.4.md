# COSMORA session recovery hotfix

Prepared 21–22 October 2026. iOS candidate **1.0.4 (43)**, bundle `it.kreluna.cosmora`.

## Scope and observed failure

The user reports that opening Messages in the App Store installation leaves the app on “Verifica della sessione…”. The public App Store lookup for app 6809232374 reported version 1.0.3 (released 18 October). This hotfix starts from `81dc23e`, the 1.0.3 source, and does not include pending VIECC presentation changes.

The terms gate previously waited indefinitely for both `getSession()` and the initial auth event. With the installed Supabase SDK, both can wait on the same stalled refresh request. The underlying request could also stall while reading its response body. This reproduces the reported screen; no logs from the user's physical iPhone were available to prove its exact network failure.

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

## Delivery status

**Prepared locally only; not uploaded, submitted or released.** App Store Connect currently requires the operator to sign in. The maximum previously identified local build was 42; verify the candidate version/build in the authenticated console before uploading 43. Export used a separate plist with `destination=export`; the repository's `ios/ExportOptions.plist` uses `destination=upload` and must not be used for a preparation-only export.

The installed App Store app bundles its JavaScript. A website deployment cannot deliver this fix to that installed binary. Confirm the actual Messages flow on an iPhone after installing the updated build. Apply the auth fix to the ongoing feature branch before its next release as well.

Suggested Italian release notes: “Migliorata l’apertura dei messaggi e il recupero dell’accesso in caso di connessione lenta o interrotta.”
Suggested English release notes: “Improved opening Messages and recovering sign-in when the connection is slow or interrupted.”
