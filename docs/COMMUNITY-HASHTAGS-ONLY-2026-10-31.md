# Community: hashtags only — 31 October 2026

The user chose to remove the optional content association UI entirely, superseding the consent workflow.

- Composer: photos/video, caption with hashtag help, category and submit. No event/product/profile/crew picker or connection fetch. A short caption such as #cosplay is accepted; empty/whitespace captions remain invalid.
- Existing hashtag extraction, topic filtering and Unicode support are retained. Authors remain attributed and their available profile remains accessible; that is separate from an optional association.
- POST ignores legacy connection fields and explicitly stores null link type/label/URL. No lookup or consent-table dependency.
- Both app and recovery-function feed sources suppress old optional links. The post-detail component also suppresses them when served by an older backend. Stored historical metadata is not deleted.
- The retired connections endpoint returns 410 without reading profiles or products.
- The unshipped consent implementation and migration have been withdrawn. No migration is needed for hashtags-only behavior.

This is a local source change. It has not been deployed to the original backend, the recovery function, or either store. Earlier signed packages have not been altered. The previous missing-author-name and existing-heavy-image findings remain separate.
