# Unique public names — 31 October 2026

User requested unique public names so people can be distinguished in search.

## Verified live (read-only)

The latest live check found only three public profiles and no duplicate group. The second former Andre profile was already absent; this deployment did not rename or delete any real account. Therefore no duplicate-resolution decision was needed.

Read-only SQL confirmed normalization for Andre / ANDRE / surrounding spaces / full-width Latin and repeated internal spaces.

## Prepared in source

- NFKC and whitespace normalization; duplicate comparison uses database lower-case normalization. User names retain display casing. API validation rejects control/format characters and names outside 2–80 Unicode characters.
- Account update performs a literal, case-insensitive availability check excluding the current owner and handles the authoritative unique-index conflict as 409 PUBLIC_NAME_TAKEN. Wildcards are escaped; no wildcard search or other-owner ID can be supplied.
- Seller writes check the same public namespace, prefer the already saved public profile name, and handle the same unique conflict. Legal/business details remain separate. Existing seller_details/profile writes remain non-transactional; a concurrent profile conflict can follow an already-saved details update, but cannot create a duplicate public profile once the index is active.
- Registration performs a preliminary availability check. It does NOT reserve a name or create a public profile: the actual reservation happens on successful profile save. Concurrent registrations may both pass the preliminary check; the database index prevents both from later publishing the same public name. Social login also chooses its public name through profile save.
- Translated public-name labels/hints and conflict error; profile-save response returns normalized name. New anonymous availability API returns only a boolean, no account IDs/status/email.
- Migration 20261031140000_unique_public_names.sql adds normalization and a unique expression index. It deliberately ABORTS if existing duplicate names remain. It was applied successfully after verifying no duplicates remained. A transactional probe confirmed that a full-width/spaced variant of Andre is rejected by profiles_public_name_unique; the failed write rolled back and the original profile name stayed unchanged.

## Release boundaries

Migration is active. Supabase cosmora-community v3 now serves account, public-name availability, seller profile and post creation routes in addition to feed/interactions. Native 1.0.7 uses these exact routes; unrelated APIs remain on the original backend. Nine live HTTP checks passed, including occupied/free names and unauthenticated write rejection. Original Sites deployment remains inaccessible and browser builds are not redirected by the native transport. See the current release document for store status.

Sources checked: https://www.postgresql.org/docs/current/indexes-unique.html and https://www.postgresql.org/docs/current/functions-string.html .
