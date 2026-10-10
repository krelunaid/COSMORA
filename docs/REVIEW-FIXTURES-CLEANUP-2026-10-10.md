# Public review-fixture cleanup — 10 October 2026

## Published backend

- Production Site: `appgprj_6ac23124aa008191b49cfda336e9296b`, public audience preserved.
- Source base: `8c1b34e88014e765def6f9498d6f14e2122d7d45`; focused cleanup commit: `48dce44adb1c48092371cd2ddd617a76b6595efa`.
- Saved Site version 3: `appgprj_6ac23124aa008191b49cfda336e9296b~appgver_147222c07d708191b9dc95b10ef7f0e4`.
- Deployment `appgdep_6aca30a733d0819184c8184023036f33` succeeded at 12:34 UTC.
- Public API reads returned 200: profiles lists the two Andre accounts and Andrea; posts, listings and squads return empty lists.
- Three verified demo/review UUIDs are excluded from ordinary public reads before pagination and media signing. Verified reviewer sessions retain the Community safety fixture.
- No accounts, credentials, content rows, media, orders or private messages were deleted or suspended.

## Remaining database step

`supabase/migrations/20261010123000_review_fixture_visibility.sql` is prepared but **not applied**. It adds restrictive SELECT policies with the same UUID allowlist for profiles, posts, listings, squads and meetups. This is required for direct Supabase reads in the native safety centre.

The browser's current Supabase session only exposes Basket Montecatini. Access to the COSMORA project `pwdpwgonvnuwmgfiidut` is needed to apply this one migration; do not run unrelated pending migrations. No new Store build is needed for the published API filters or database policies.

The focused API changes are mirrored into this mobile repository to preserve the cleanup in future releases. The full mobile repository, including unfinished payment work, was not deployed as the live backend.

## User requested removal of all six existing public profiles

The two Andre profiles and Andrea are now excluded from public profile discovery, ID lookups and creator-link selectors. Their UUIDs are in a separate public-profile filter and do not grant review-fixture access or hide their ordinary content. Future signups are unaffected.

- Focused live source commit: `cc79f24d0293255c7d92b6756781e5bc8ac7c2e1`.
- Site version 4: `appgprj_6ac23124aa008191b49cfda336e9296b~appgver_e5d0cdb21c588191ae58b74dca8e924c`.
- Deployment `appgdep_6aca3865c2088191b1f51cc2623cc5ee` succeeded at 13:07 UTC.
- Public API now returns zero profiles and zero Community posts. The Andrea profile ID also returns zero results.

`supabase/migrations/20261010124500_retired_profile_visibility.sql` is also prepared but **not applied**, pending access to the COSMORA Supabase project. It adds one restrictive profile policy, preserving each user's own private account row. Both database migrations and permanent account deletion remain unexecuted. Only public API visibility has been changed; accounts have not been deleted.
