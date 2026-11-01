# Current source snapshot — 1 November 2026

This directory contains the source of the existing live `cosmora-community` Edge Function, its tests, local maintenance scripts, pinned dependencies and last deployed esbuild entrypoint in `deployment/entrypoint.ts`. The older historical notes below do not describe the entire current endpoint set. Current routes are defined in `src/index.ts`; thumbnail serving is `src/routes/thumbnail.ts`. The service includes feed/interactions, account/name availability, seller profile and moderated post creation.

Current thumbnail delivery uses the server-only `community_media_previews` table and the service-only `cosmora_read_media_preview(uuid)` SQL function. Eight current public-photo previews were backfilled; automatic preview generation for future uploads is not enabled. No credentials, photo originals, signed URLs or personal-media backfill SQL are included. The production secret is supplied by the platform. Schema migrations are in the app repository's `supabase/migrations/`; some were applied through the dashboard and are not in the provider migration ledger. Do not run a bulk database push without reconciling that history. See `docs/COMMUNITY-MEDIA-OPTIMIZATION-2026-10-31.md` at the repository root for evidence and limits.

To check locally, install dependencies in this directory and run its test and typecheck scripts. This is a source backup, not a new deployment.

---

# COSMORA Community API recovery

Deployed 30 October 2026 at 10:38 UTC. This folder is the source of the active
Supabase Edge Function `cosmora-community`, version 1. It serves only the
Community feed and private interactions; the existing Sites application,
database, accounts, and content remain in place. Deployment evidence is in
`deployment.json`; production HTTP checks are in `live-checks.json`.

## Deployment contract

- Existing project only: `pwdpwgonvnuwmgfiidut`.
- Function name: `cosmora-community`; no prior function with this name existed
  when version 1 was deployed.
- Entrypoint: `index.ts`; Deno import map: `deno.json`.
- Upload `index.ts`, `deno.json`, and every TypeScript file under `src/`.
- `verify_jwt: false` permits the existing anonymous public feed. The handler
  itself calls Supabase Auth `getUser(token)` and verifies server moderation
  before all private reads and all writes. Invalid supplied tokens never fall
  back to anonymous access. Saved feeds require verified authentication.
- Runtime injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. No credential
  must be added to source or to native bundles. The URL is pinned to this
  existing project. No new database, storage bucket, or account is created.

The only endpoints are:

```
GET /functions/v1/cosmora-community/api/community/posts
PUT /functions/v1/cosmora-community/api/community/posts/interaction
```

The runtime may present the path without `/functions/v1`; both exact forms
are accepted. Arbitrary prefixes, trailing route segments, other methods and
all other application APIs are rejected. OPTIONS exists only on those routes.
POST creation, uploads, moderation, profiles, auth flows, payment routes and
the public app stay on their existing services.

## Data and privacy equivalence

Copied the reviewed Community GET/PUT and their helpers from the 29 October
backend candidate. Public feed still selects ACTIVE posts, excludes review
fixtures for ordinary viewers, applies bilateral blocks before pagination and
signing, and creates time-limited URLs from the existing `community-media`
bucket. Author links obey the existing hidden-profile rules. Private likes
and saves are read and written only for the user verified by Auth; the input
schema rejects caller-supplied owner IDs. Desired-state PUTs are idempotent.

No public like totals or lists of users are exposed. Saved filtering uses an
owner-filtered inner join before pagination. Hidden/inactive/missing/blocked
posts cannot receive interactions. Errors in auth, moderation, blocks or
private-state lookup fail closed. Responses are private/no-store. CORS allows
only the existing app origin and exact native WebView origins; CORS is not
used as authorization. Request bodies are bounded to 4096 bytes and never
logged by the handler. Provider request logging remains a separate operational
setting. No new retention policy or
parental-consent behavior is introduced.

The previously applied `community_post_interactions` migration is reused;
do not apply it again and do not run a broad database push. The two tables
remain server-only with their existing RLS and grants.

## Validation and remaining checks

The inherited route tests cover two-account ownership, anonymous/invalid auth,
saved pagination, private-state failure, bilateral blocks beyond one API page,
idempotent updates and removal, inactive/review-only post visibility and
database failures. Additional tests cover real auth-helper invocation, rejected
deleted/suspended accounts, ingress isolation, exact mounts, CORS and body
limits. Local tests make no production mutations.

17 function tests, 18 focused native-routing tests, TypeScript checks, and the
full 307-test mobile suite passed. Eight production HTTP checks passed: public
feed, login requirements, invalid-token rejection, anonymous-write rejection,
route/method isolation, foreign-origin rejection, and native CORS preflight.
Authenticated mutations with two real accounts have not been performed; the
ownership/isolation evidence for those cases is automated test coverage.

The native client now routes only GET feed and PUT interaction to this
function. Signed Android 1.0.6 (46) and iOS 1.0.6 (47) packages are verified in
`/Users/andreagadducci/Documents/Codex/2026-10-21/COSMORA-session-hotfix/outputs/release-1.0.6-recovery-20261030/`.
iOS 47 was uploaded successfully by Transporter on 30 October at 18:50
Europe/Rome and processing has completed; it has not been submitted for review. Android
46 is not yet uploaded. The Mac is now unlocked, but browser use is still
disabled in Work settings. Current progress is recorded in the mobile release
folder's `store-progress.json`. Existing installed releases keep their original
endpoint until the new store update is installed.

Data limitation: the five current active posts share an author with no row in
`profiles`. Their generic author label and absent profile link accurately
reflect missing profile data. No name was fabricated or copied from private
authentication metadata. The independent review also identified an inherited
edge case for a post's embedded `link_url` targeting a hidden-discovery profile;
author links themselves apply the visibility filter. No current post is affected.

Official sources reviewed:

- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/functions/auth-legacy-jwt
- https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- https://supabase.com/changelog.md (including announced CBC TLS retirement;
  no dependency API change relevant to this handler was identified).

Local `node_modules` is a symlink to the already installed, pinned candidate
dependencies for validation only; it is not part of the deployment files.
