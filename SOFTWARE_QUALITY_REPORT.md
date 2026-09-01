# War Sim v0.4.3.22 — Software Quality Report

## Release

v0.4.3.22 is Product Hardening 5: Interaction & State Consistency, built directly from the exact verified v0.4.3.21 package. Runtime **0.4.3.22**, world schema **16**, save format **3**, generator **v3**.

## Scope

Rapid/repeated interaction and queued-dialog consistency only. No gameplay, career progression, RNG, world schema, save-format, or architecture changes.

## Hardening changes

- Controller command boundary suppresses rapid duplicate semantic actions using stable interaction keys.
- Rapid duplicate time-advance activation cannot advance the world twice.
- Queued Achievement/Opportunity acknowledgement has a short guard so a second physical tap cannot acknowledge the next notice that just appeared.
- Existing atomic state-store rollback behavior remains unchanged.
- Permanent regression coverage was added for duplicate command suppression and queued-notice acknowledgement.

## Verified worktree gate

- 44/44 JS/MJS test suites PASS.
- 159/159 explicit ES-module syntax checks PASS.
- Full Chromium regression: 94/94 PASS, exit code 0.
- Mobile geometry regression: 105/105 PASS, exit code 0.
- Browser page exceptions: 0.
- Browser console errors: 0.
- World schema 16; save format 3; generator v3 unchanged.
- `src/app.js` SHA-256: `9273c9a76cb27f331113a795002717ab687a192091f8abd330ccbe49cc7fd3c5`.
- `src/core/saveSystem.js` SHA-256: `ed6b3c72a0840d1a0bfe63ac8c9f513e950bbc18811efa1474f055c163a391f8`.
- `src/ui/dialogs/achievementDialog.js` SHA-256: `058ef22b210b32cac2407ed871b2f25fd18beab5eb1d09edbedf25ddb8539d1e`.

## Candidate exact-package verification

Candidate ZIP was clean-extracted and independently verified:

- 44/44 JS/MJS test suites PASS.
- 159/159 explicit ES-module syntax checks PASS.
- Runtime source hashes matched the verified worktree.
- Full Chromium regression: 94/94 PASS, exit code 0.
- Mobile geometry regression: 105/105 PASS, exit code 0.
- Browser page exceptions: 0.
- Browser console errors: 0.

## Published exact-package verification

The published ZIP was clean-extracted and subjected to the complete release gate:

- 44/44 JS/MJS test suites PASS.
- 159/159 explicit ES-module syntax checks PASS.
- Runtime import closure: 247 relative imports resolved.
- Full Chromium regression: 94/94 PASS, exit code 0.
- Mobile geometry regression: 105/105 PASS, exit code 0.
- Browser page exceptions: 0.
- Browser console errors: 0.
- Runtime source hashes matched the verified worktree and candidate.
