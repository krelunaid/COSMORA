> Updated choice: the user now wants hashtags only. See COMMUNITY-HASHTAGS-ONLY-2026-10-31.md; the connection-picker and consent work described below is superseded.

# Community diagnosis and local corrections — 31 October 2026

## Verified live, read-only

- Five ACTIVE posts share an author with no public.profiles row. No display name exists in the public profile table. No auth.users insert trigger was returned. No authentication metadata or email was copied to a public profile.
- Zero active marketplace listings. Connections currently allow only the viewer's own active products; an empty product list is expected.
- community-media objects average 2,942,134 bytes and reach 4,938,269 bytes. Grid and home use original signed media URLs, without thumbnail variants. This establishes avoidable byte weight, not physical-device timing.

## Local code corrections (not deployed)

- Optional connection remains optional even when a category is selected and no item exists. Disabled empty select, distinct loading/error/empty states, local search among returned options, explicit own-active-product copy.
- Name-setting link to /profile/me; hashtag explanation. No automatic use of private account names or emails.
- Large JPEG uploads are downscaled to a maximum 2048-pixel edge and JPEG quality .82, keeping the original file if the encoded file would grow. HEIC conversion remains. PNG/WebP transparency/animation and videos are preserved. Decode failure retains the existing fallback.
- Detail gallery eagerly loads its first photo only; others use lazy loading and async decoding.
- Connections endpoint and POST validation respect bilateral profile blocks. Embedded profile links in the app feed suppress blocked and hidden-discovery targets.

## Boundaries and outstanding work

- User selected explicit consent before profile linking. The local implementation and release prerequisites are documented in COMMUNITY-PROFILE-CONSENT-2026-10-31.md. Production has not changed.
- The original app backend still owns POST creation and GET connections. The scoped Edge Function owns native feed GET and interactions. These source changes have NOT been deployed to either service or packaged for stores; the existing Edge Function remains unchanged.
- Existing heavy photos have not been replaced or converted to thumbnails; their current loading cost remains. Future-upload compression alone does not fix existing media.
- Missing authors must save their chosen public name through the account profile. No live profile/data changes were performed.
- UI and physical-device performance were not exercised. 309 tests pass; TypeScript passes; targeted lint passes. Whole-repository lint still reports pre-existing issues in native-api-transport, seller onboarding, profile, moderation and checkout.
