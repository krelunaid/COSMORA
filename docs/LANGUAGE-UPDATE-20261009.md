# Language update — 9 October 2026

## Changes

- First launch shows a language selector before mounting the app. Italian, English, French, German and Spanish are available, with a supported device language preselected and English as fallback.
- Continue confirms and saves the choice. Existing preferences skip the selector; Profile can change the language at any time. If storage is denied, the current session retains the choice.
- Service errors for listings, seller registration and Community are translated at render time. Original errors, HTTP status and codes remain available to authentication and retry logic. Unknown internal errors use a localized fallback.
- Moderation labels, shared close/carousel controls and development demo notices are localized. User-written content and historical moderation details retain their original language.

## Verification

- TypeScript check and mobile production build succeeded; the build's public-secret and mobile asset checks succeeded.
- 54 existing focused regression checks passed: locale resolution, Community/commerce/sale localization, submission errors, account HTTP handling, terms, native authentication callbacks, mobile routes and moderation blocks.
- Direct assertions verified known API errors, validation/authentication fallbacks and preservation of user content in all five languages.
- Browser preview verified the selector copy in all five languages, Continue, persistence after reload and changing language from Profile.
- Static review found no blocking regression. Existing lint findings in the affected legacy UI components remain; this is not a claim that the whole lint suite passes.

## Distribution boundary

This document records a source update and local verification. It does not record a new IPA/AAB upload, App Store or Google Play submission, backend deployment, or physical-device validation. The already submitted Google release remains separate from this update.
