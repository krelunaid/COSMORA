# COSMORA — parental authorisation preparation

Prepared 28 October 2026. **Not active, not deployed, and no database migration applied.**

## Scope delivered

- `supabase/functions/guardian-consent/handler.ts`: dependency-injected request, email verification, explicit declaration, status and owner-review endpoints.
- `store.ts`: service-role RPC adapter.
- `index.ts`: deliberately returns HTTP 503 `workflow_not_active` for every request. It does not instantiate an admin client, send email or call the database.
- `20261028060326_guardian_consent_preparation.sql`: private tables, no client grants/policies, atomic challenge consumption and compare-and-set review transitions. It changes no existing community permission.
- `components/guardian-consent-page.tsx`: prepared parent-facing copy in Italian, English, French, German and Spanish. It is not mounted on a route and its flag is OFF in `lib/guardian-feature.ts`.
- `tests/guardian-consent.test.ts`: 14 tests of authentication, feature-off behavior, expiry rejection contract, state transitions, explicit consent, owner restrictions, rate limits and RPC error handling.

The tests exercise the injected handler, not a real Postgres deployment or email service. SQL concurrency and privilege tests remain required on an isolated database before migration approval.

## Required product behavior

The owner has selected a process for ages 13–17. It is not evidence that one email is sufficient under every country's law. Email verification proves control of a mailbox; the adult/responsibility statements are declarations. A parent declaration therefore ends in **pending_review**, never in approved. A separately configured owner must document a proportionate check of parental responsibility before approval. Do not collect an identity document automatically and do not label this as verified identity.

Under-13 accounts are outside the declared audience. No under-13 request is accepted by this prepared endpoint. That is not yet a universal registration block: the current Apple/Google/email registration flows do not use it.

The minor's age is self-declared, stored as an age between 13 and 17 and assessed at request time. No birth date is collected by this preparation. How to reassess age/adult eligibility and how to migrate existing users must be decided and implemented before enablement. A child must not bypass a denied/revoked state by submitting a new adult declaration.

## State machine and proof

1. Confirmed, non-anonymous, unsuspended app account submits a different parent email and an age from 13 to 17: `pending_request`.
2. A 256-bit cryptographic random link is emailed. Only SHA-256 is stored. The email link expires after 48 hours (security expiry, not a general retention rule). New requests invalidate earlier challenges. No name, minor email, profile or chat is exposed to the parent endpoint.
3. The parent explicitly presses **Verify my email**. POST atomically consumes the email token, records `email_verified`, and issues a new 256-bit declaration token expiring in 30 minutes. A GET, mail scanner or link preview cannot verify or approve.
4. The parent reads the notice and separately confirms adulthood, parental responsibility and authorisation for the community features. POST consumes the second token and records the notice version and `pending_review`.
5. Fresh Auth lookup plus a server-side reviewer UID allowlist and the existing admin/dashboard grant are necessary. The database also checks its own **initially empty** reviewer table and current Auth/moderation state. The owner supplies a reason and responsibility-check declaration: `approved` or `denied`. Only `approved → revoked` is allowed afterward.
6. Revocation requests go to support until a separately verified parent self-service route is implemented. This preparation does not grant the parent the child's login or access to private messages.

Pending/denied/revoked records cannot be reset by the child's request endpoint. Every transition is recorded in a private audit table. Request/event records cascade with account deletion. No lifecycle purge or automatic expiry of accounts is introduced by this migration. A documented retention schedule for pending requests, review evidence and rate-limit records is still required; token validity is not data-retention duration.

## Exact integration checklist before any activation

1. **Registration and sessions.** `components/auth/auth-form.tsx` currently calls Supabase `signUp`/OAuth directly. `lib/supabase/native-auth.ts` uses the native OAuth callback for Apple/Google. Introduce a neutral age step before collecting child account fields where feasible, plus a trusted pending-eligibility status for the OAuth path and existing sessions. Do not store permission in `user_metadata` or localStorage. The existing `components/auth/terms-consent-gate.tsx` is expressly UX-only and cannot serve as authorisation.
2. **Adult and pre-existing accounts.** Implement a server-maintained eligibility record and an explicit, reviewed migration path. Do not suddenly block all existing users when a status row is absent; equally, do not allow missing status to silently bypass a newly active gate. Account recovery, privacy, support and account deletion must remain available.
3. **API guard.** `lib/supabase/server.ts:requireAuthenticatedUser` is the central guard for community, messages, profiles, listings, saved items, seller/order and report routes. Add eligibility checks there with explicit exemptions for guardian status/request, deletion and safety/support. API responses must distinguish a pending authorisation from a bad login. The current account GET/delete `allowDeleting` path needs explicit review so the exemption does not expose ordinary user actions.
4. **Separate functions.** `supabase/functions/push-devices/index.ts` performs its own fresh Auth check; integrate eligibility before registration/sending. `community-admin` must retain its own owner restrictions; do not make the dashboard read-only grant alone a parental-review permission. Push sender must exclude pending/denied/revoked accounts without treating disabled notifications as deletion.
5. **Public visibility and data API.** Recheck live RLS, RPC grants, Realtime and storage against all applied migrations. The October 3 moderation migration already revokes client writes and makes media buckets private, but direct participant reads and profiles can still bypass a UI gate. Prevent publication of a pending minor's profile/content and ensure service-role read endpoints also filter it. Do not solve this by broadly granting or replacing dozens of policies without targeted tests.
6. **Email delivery.** No custom parent-email provider is present in this code. Supabase Auth SMTP configuration was not exposed by the available connector and has not been verified. The default Supabase email service is not suitable for production delivery to arbitrary parents. Confirm an existing provider and its processing contract, configure the sender/domain safely, then bind `sendGuardianEmail`. An Auth Send Email Hook replaces authentication email sending; it is not a general parent-email endpoint and should not be repurposed casually.
7. **Endpoint hosting.** Existing mobile API requests are pinned to `https://cosmora.kreluna.it/api/` by `lib/native-api-transport.ts`. A separately deployed Supabase guardian function can be called via its explicit endpoint, but this alone does not patch the old main API. Main Sites project/deployment access remains a release gate.
8. **Public page.** Publish a dedicated HTTPS parent page with no trackers, remote embeds or advertising, `Referrer-Policy: no-referrer`, no token logging, and CSP restricting scripts/connections. The prepared component strips the token fragment from history on mount and keeps tokens only in memory. Reloading even before verification loses the in-memory token: reopen the original email link if still unused, or request a new link if already consumed. Privacy opens in a separate tab so reading it does not discard the pending declaration. There is no local token persistence.
9. **Gateway and origins.** Parent verify/consent calls have no user JWT, so a future deployed function needs an explicit public gateway configuration, while the handler enforces fresh `getUser` on authenticated actions itself. Configure exact app/admin/parent origins, including tested Capacitor origins; CORS alone is not authorisation. Do not trust a user-supplied forwarding IP for rate limits. Current stored limits are atomic per child/parent/token and include a bounded global public-action limiter; production abuse/rate retention policy still needs a test.
10. **Review operations.** Provide a protected review queue showing only necessary data, then configure the existing owner's UID in both the trusted wrapper and private reviewer table. No reviewer is configured by this change. A manual checklist must document how responsibility was checked without turning an email address into proof of parenthood.
11. **Native/UI gate.** Only after all server checks work, mount a separate age/guardian UX gate and enable the public flag. The prepared parent page is not a child registration gate. Do not activate it as if it enforces server access. Bundle/store submissions require separate release verification.
12. **Privacy and store disclosures.** The current privacy notice still truthfully describes the current lack of age/guardian verification. Update that paragraph, the legal basis/retention for parent contact and review evidence, child-safety copy, age audience declarations and store data forms only once the actual flow has been verified. Obtain any necessary local legal review of parental authority, child safety and contract capacity.

## Verification before release

Use an isolated database: unauthenticated and normal authenticated roles cannot SELECT private tables or call RPCs; expired/consumed challenges and concurrent duplicate POSTs succeed at most once; denial cannot become approval; forged `user_metadata`, stale/removed admin grant and suspended reviewer fail; email delivery failure is visible without sending duplicates; email previews cannot trigger transitions; guardian declaration does not open community access; parent and user withdrawal/deletion work; authorisation does not grant optional push or advertising consent. Verify all three sign-in methods, prior installed clients, public profiles, private chat, media, reports, delete/recovery and offline/resume.

## Official implementation references

- Auth hooks (Free supports Before User Created, Custom Access Token and Send Email): https://supabase.com/docs/guides/auth/auth-hooks
- Before User Created hook: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
- Custom SMTP production limits: https://supabase.com/docs/guides/auth/auth-smtp
- Send Email hook semantics: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook

These references document platform capabilities, not proof that COSMORA has enabled them or satisfies every country's child-protection requirements.
