# Session opening presentation — 27 October 2026

The user supplied a Samsung screenshot of “Verifica della sessione…” on reopening, then confirmed that the app opens by itself after waiting. The installed Android version was not established. This report therefore does not establish an indefinite authentication hang or a failure of the previous timeout fix.

## Change

The pending TermsConsentGate now uses the existing COSMORA startup branding with a visible, localized opening message and reduced-motion-aware spinner. Recovery, login, privacy, support and account-deletion controls remain on the error/terms screen; exempt routes still bypass the gate. The initial language startup shares the same presentation.

Authentication requests, session storage, timeouts, authorization and consent logic are unchanged. This presentation change does not claim a reduction in network recovery time.

## Verification and delivery

- TypeScript, targeted lint and mobile production build passed.
- Existing session recovery and Auth fetch tests: 17/17 passed, including stalled responses and subsequent recovery.
- Actual shared startup component inspected at 390 × 844 in the browser. Preview: `outputs/session-reopen-preview/apertura-cosmora.png`. This is a local UI preview, not a physical Samsung or iPhone verification.
- Independent review confirmed the exempt-route and recovery branches remain intact. Removed a persistent aria-busy ancestor so the status announcement is not suppressed.
- Local source and mobile web build only. No new native package was signed or submitted for this change; existing store artifacts remain unchanged. A new store release is required to deliver this presentation to installed native apps.
- During this check Google Play still listed Android 1.0.5 (44), “Notifiche della community”, under changes in review. That pending package does not contain this new presentation.
