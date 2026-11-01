# COSMORA 1.0.7 — release in progress

## Final artifacts

Use outputs/release-1.0.7-final-20261031/: iOS 1.0.7 (48), Android 1.0.7 (47). The older outputs/release-1.0.7-20261031 candidates are superseded and must not be uploaded. Both final packages were rebuilt after the native routing changes. 161 shared web assets match dist/mobile in both packages. SHA-256 and versions are recorded in artifact-verification.json. Native signing and iOS archive/export verification passed.

## Online

- Privacy presentation in five languages: https://software.kreluna.it/cosmora/privacy/ (website deployment 1bd15b21-7aae-4617-88ff-50e3676d6007).
- Unique public-name migration applied; existing duplicate no longer present. No real account renamed/deleted.
- Supabase cosmora-community ACTIVE v3, SHA-256 a2acd4575f238831927eb0f70ea0c8df42535a57a7992286927c6a098a494746. New native routes cover account, name availability, seller profile and post creation. Exact route/method allowlist, verified bearer authentication, bounded uploads, metadata sanitization and pending moderation preserved.
- Original Sites project remains inaccessible; no unrelated project overwritten. Browser builds still use the original same-origin API, while native 1.0.7 uses the scoped recovery routes.

## Verification

316 app tests and 22 recovery-function tests passed. TypeScript/mobile build, native build and signatures passed. Nine live HTTP checks passed. The new multipart test verifies ownership, photo metadata removal, ignored connection fields and PENDING_REVIEW status without creating live content.

Security advisor: server-only tables intentionally have RLS enabled without client policies. Supabase reports leaked-password protection disabled; this was not changed by this release. Old full-size community photos have not been recompressed, and missing public profiles still use the privacy-preserving generic author fallback.

## Store progress

Google final AAB uploaded and processed as 47 (1.0.7), release 7, notes saved, 100% of existing target countries. Submission confirmed in the console under "Modifiche in fase di revisione"; automated pre-review checks still running. This does not mean approved or published. Non-blocking console warnings: missing deobfuscation mapping and native debug symbols. Existing production also reports DEX optimization advisory due February 2027 and edge-to-edge API advisory; those are separate native optimization tasks.

Apple 1.0.7 (48) uploaded through Transporter, processed and associated with the version. Release notes saved for all five App Store languages. Submission confirmed by App Store Connect: “1 elemento inviato”. Awaiting Apple review; not yet approved or published. Proof: outputs/release-1.0.7-final-20261031/apple-submitted.jpg.
