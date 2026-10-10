# Public review-fixture cleanup — 10 October 2026

**Final status:** all six authorized old accounts were permanently deleted and the final database checks returned zero remaining target records. The sections below record the earlier visibility-only work; the completed permanent cleanup section supersedes their pending deletion status.

## Published backend — earlier visibility-only work

- Production Site: `appgprj_6ac23124aa008191b49cfda336e9296b`, public audience preserved.
- Source base: `8c1b34e88014e765def6f9498d6f14e2122d7d45`; focused cleanup commit: `48dce44adb1c48092371cd2ddd617a76b6595efa`.
- Saved Site version 3: `appgprj_6ac23124aa008191b49cfda336e9296b~appgver_147222c07d708191b9dc95b10ef7f0e4`.
- Deployment `appgdep_6aca30a733d0819184c8184023036f33` succeeded at 12:34 UTC.
- Public API reads returned 200: profiles lists the two Andre accounts and Andrea; posts, listings and squads return empty lists.
- Three verified demo/review UUIDs are excluded from ordinary public reads before pagination and media signing. Verified reviewer sessions retain the Community safety fixture.
- At this stage, no accounts, credentials, content rows, media, orders or private messages were deleted or suspended.

## Database step recorded before permanent deletion

`supabase/migrations/20261010123000_review_fixture_visibility.sql` was prepared but **not applied**. It adds restrictive SELECT policies with the same UUID allowlist for profiles, posts, listings, squads and meetups. At that stage it was planned for direct Supabase reads in the native safety centre.

The browser's Supabase session initially only exposed Basket Montecatini. Access to the COSMORA project `pwdpwgonvnuwmgfiidut` was subsequently obtained for the permanent cleanup below. No new Store build was needed for the published API filters.

The focused API changes are mirrored into this mobile repository to preserve the cleanup in future releases. The full mobile repository, including unfinished payment work, was not deployed as the live backend.

## Earlier removal of all six existing profiles from public discovery

The two Andre profiles and Andrea are now excluded from public profile discovery, ID lookups and creator-link selectors. Their UUIDs are in a separate public-profile filter and do not grant review-fixture access or hide their ordinary content. Future signups are unaffected.

- Focused live source commit: `cc79f24d0293255c7d92b6756781e5bc8ac7c2e1`.
- Site version 4: `appgprj_6ac23124aa008191b49cfda336e9296b~appgver_e5d0cdb21c588191ae58b74dca8e924c`.
- Deployment `appgdep_6aca3865c2088191b1f51cc2623cc5ee` succeeded at 13:07 UTC.
- Public API now returns zero profiles and zero Community posts. The Andrea profile ID also returns zero results.

`supabase/migrations/20261010124500_retired_profile_visibility.sql` was also prepared but **not applied**. It adds one restrictive profile policy, preserving each user's own private account row. This was the initial visibility-only state, before the permanent cleanup below.

## Permanent cleanup completed — 10 October 2026

After explicit user consent, these six old accounts were permanently deleted through Supabase Auth Admin UI in the correct COSMORA project `pwdpwgonvnuwmgfiidut`:

- `66b0c100-e397-4971-946a-a8e3416b5f5b`
- `89d20859-246f-4619-a363-285655bb8e0f`
- `a082786e-8ef2-42c6-80c5-95b7ca3e997b`
- `39ed3f97-f290-41f2-9cb0-c0fb0ad6ac53`
- `5127b626-1077-48ee-a266-de2948e49b66`
- `1606e1bd-1635-4760-a1ac-51561b43accc`

The inventory contained no real or test orders, messages, listings, squads or meetups for these IDs. The cleanup removed one Community post, three seller-details rows, four authored reports and one block through the database cascades. The single moderation-action reference to a deleted moderator was set to NULL. The Community PNG and its remaining `.emptyFolderPlaceholder` were removed through Storage UI. Two unrelated Apple-linked accounts were preserved.

The final live SELECT returned **zero** for all target counts: Auth users, profiles, Community posts, storage objects, seller details, seller payment accounts, authored reports and blocks.

### Reviewer access preserved

The replacement account `ecd394b4-a6d9-47b4-a5ed-848fac5d9ec5` remains present in Auth and profiles, with profile role `buyer` and `moderation_hidden=true`. It is not suspended and has no admin or moderator role. The verified profile SELECT policy is `NOT moderation_hidden OR auth.uid() = id`, so the reviewer can access its own account while its profile stays out of public discovery.

- Apple version **1.0.2, build 40** is waiting for review. Replacement review credentials were saved and the notes were updated to remove the old fixture instructions.
- Google Play production **1.0.1, build 39** was sent back into review with the replacement App access credentials. Approval has not been confirmed.
- No passwords or personal email addresses are recorded here.

### Scope and remaining limitations

The two restrictive migrations for the old UUIDs remain **unapplied**. They are no longer necessary to hide records that have now been permanently deleted; no unrelated pending migrations were applied. This account cleanup did not produce a new Store build or deploy the unfinished payment implementation.

Apple OAuth revocation was **not verified**. No external Apple or Google identity-provider account was deleted; the permanent deletion concerned the six authorized COSMORA accounts in Supabase.
