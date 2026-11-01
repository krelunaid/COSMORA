# Community profile links — 28 October 2026

## Observed problem

The iPhone screenshot is the public profile route, `/profile/[username]`, showing its empty-result state. `/profile/me` is a separate screen, and the native route test confirms its precedence.

A read-only production query found five ACTIVE posts from one author without a corresponding `public.profiles` row. The feed previously linked every author ID even when its profile lookup returned no row. This reproduces a path to the reported screen; the screenshot alone does not establish which tap the user made.

No non-internal signup trigger exists on `auth.users`. Email registration stores a display name in Auth metadata; it does not create the separate public profile row. Saving the profile in `/profile/me` creates that row through the authenticated account endpoint. This change does not backfill or publish private account metadata.

## Changes

- The posts endpoint returns `author_profile_url` only for an existing public profile allowed by the current visibility rules. Existing author labels and posts are retained.
- Profile lookup failure returns 503 rather than being mistaken for a missing profile.
- A viewer's own author link opens `/profile/me`, including when the public profile is absent.
- Other authors without an explicitly returned matching profile URL render as text, not a broken link. Older API responses without the new field are handled conservatively.
- Existing public-profile deep links use neutral unavailable copy. An authenticated owner can open their account to review and save their public name.

No account, profile row, block, moderation state, or production service was changed. The two Community layout mockups remain separate and unselected.

## Verification and release boundary

- TypeScript check and mobile web bundle build pass. Public environment, client credential scan, and mobile asset checks pass.
- The existing native route test passes.
- Eleven new behavior tests pass: real author component rendering plus posts GET execution with controlled database responses, covering absent/present/hidden authors, owner navigation, bilateral blocks, review fixtures, and query failures.
- The profile safety suite has one pre-existing source-regex failure: it expects `BlockFeedback` immediately before the closing `TermsConsentGate`, but HEAD already contains `CommunityThanks` there. The other 11 safety tests pass.
- Targeted lint reports two pre-existing React compiler findings in `app/community/page.tsx` (render-time `Date.now` and an effect state update); both constructs are unchanged in HEAD. No release was performed.

The mobile build is local validation, not an IPA/AAB, store submission, or physical-device proof. Deployment of the API and distribution of updated native clients are still required for the installed app to use this change.
