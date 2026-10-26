# COSMORA 1.0.5 — community thank-you

Prepared 26 October 2026. iOS build 44 (`it.kreluna.cosmora`); Android code 43 (`com.kreluna.cosmora`).

## Behaviour

- Existing and newly registered members see the approved thank-you message after sign-in and any required terms acceptance.
- Italian, English, French, German and Spanish follow the app language. Guests and the existing exempt account/privacy/recovery/support routes do not display it.
- Continue, Escape and tapping outside dismiss the message immediately. The full text scrolls; the acknowledgement stays reachable on small screens.
- The versioned `cosmora_community_thanks_v1` read preference is stored per account locally and in Supabase user metadata. It is a presentation preference, never authorization, a role or consent.
- Requests use the captured account token and the existing bounded Auth transport. A lookup failure defers the message without blocking navigation; a failed acknowledgement remains dismissed locally and retries on reopen, reconnect or return to foreground.
- A second device consults the server receipt. If the first device has not synchronized its offline acknowledgement yet, the second device may still show the message. Simultaneous sessions can both show an unread message until acknowledgement reaches the server.
- The installed app bundles its code. Existing users need version 1.0.5; no email or push notification was sent. No schema migration or write to existing production accounts was performed.

## Checks

- TypeScript passed; focused lint passed on new files and the web entrypoint. Repository-wide lint still reports existing errors in checkout, moderation, community, profile, seller onboarding and native transport, outside this change.
- 30 targeted unit/integration tests passed, including account isolation, stale metadata, aborted/mismatched responses, failed writes, retry and stalled transport, plus existing session hotfix regressions.
- Ten browser scenarios per engine passed in Chromium and WebKit using synthetic users and intercepted API requests: all five languages, small-screen layout and reachable button, dismissal/reload, fresh device with existing server receipt, guest, exempt privacy page, failed lookup and failed acknowledgement.
- Production Supabase read-only metadata-shape check found no incompatible metadata. Browser tests do not constitute a physical-device or live Auth write test.
- Mobile production build, credential scan and both native builds passed. Android release signed with the existing upload key; iOS archive exported for App Store Connect.
- Every packaged iOS and Android web asset matches the browser-tested mobile bundle byte for byte.
- The session hotfix remains included; VIECC preview changes are not included.

Evidence and local browser harness: `outputs/community-thanks/` (ignored).

## Artifacts

- iOS: `outputs/community-thanks/ipa/App.ipa`
  - version 1.0.5, build 44
  - SHA-256 `91e2d54dc7e7272e63ad376ccd54bb7dcae6b898c05ea6704d2bcf0128c96477`
- Android: `outputs/community-thanks/COSMORA-Android-1.0.5-43.aab`
  - version 1.0.5, code 43
  - SHA-256 `6a711b0194e9fb43bff5f157ba5faf4d3bc73b2daf8d1ed27d592d7d51c331cd`

## Delivery

Before starting the update, App Store Connect showed iOS 1.0.4 (43) **Pronta per la distribuzione**; Google Play showed Android 1.0.4 (42) active in production, 100% rollout. Fresh 1.0.5 version records were created, retaining existing metadata, review credentials and automatic-release settings. Final upload/submission evidence is recorded below after verification.

### Verified store submission — 26 October 2026 (Europe/Rome)

- **Apple:** Transporter confirmed upload at 20:27. App Store Connect processed build `11062cfc-be20-484e-930d-dcf9aeec55b8`, version **1.0.5 (44)**. It was selected, saved, added to review and submitted at **20:38**. The final submission page explicitly shows **In attesa di verifica**. Submission ID: `b12590e0-c5d7-415b-962d-0c3c79624ce8`; app ID: `6809232374`.
- **Google Play:** signed **1.0.5 (43)** uploaded to the existing production track of app `4974190705613393494`, release name **1.0.5 (43) — Grazie alla community**, full rollout in the existing countries. The final confirmation was submitted. Quick checks completed and the publishing overview explicitly shows **Modifiche in fase di revisione** and **Le modifiche sono ora in fase di revisione**.
- Release notes were saved in all five app locales. Existing automatic publication after approval was retained on both stores. Neither final screen confirms approval or public availability of **1.0.5** yet; installed users will need to update before the new thank-you message can appear.
- Evidence: `outputs/community-thanks/transporter-uploaded.png`, `outputs/community-thanks/apple-submitted.png`, `outputs/community-thanks/google-play-submitted.png`.

### Superseded by the native-push release, later on 26 October

The user then requested actual phone notifications. iOS44 was replaced by **iOS45**, and **Android44** was submitted as the next release. See `NATIVE-PUSH-1.0.5.md` for the active store submissions, private backend, consent flow, checks and delivery limits. No actual broadcast has been sent; the earlier in-app-only evidence above is historical.
