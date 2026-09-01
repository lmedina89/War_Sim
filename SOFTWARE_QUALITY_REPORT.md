# War Sim v0.4.3.20 — Software Quality Report

## Release

v0.4.3.20 is Product Hardening 3: Mobile UI Resilience, built directly from the accepted v0.4.3.19 Product Hardening 2 baseline. Runtime **0.4.3.20**, world schema **16**, save format **3**, generator **v3**.

## Scope

Mobile usability and resilience only. No gameplay, career progression, RNG, world schema, save-format, or save-system logic changes.

## Hardening changes

- Breadcrumb and unit-link touch targets are at least 44 px high.
- Compact buttons, including Inbox compact actions, are at least 44 px high.
- Existing iOS-safe 16 px form text, dynamic viewport dialog bounds, safe-area padding, and bottom navigation safe-area handling are preserved and regression-tested.
- Permanent browser geometry audit spans four portrait phone sizes plus phone landscape.
- Mobile regression checks document/body width, major application views, Soldier subtabs, Unit/Personnel/Orders/More views, and Save Manager dialog containment.

## Worktree verification

- 42/42 JS/MJS test suites PASS.
- 157/157 JS/MJS files PASS explicit ES-module syntax parsing.
- 247/247 runtime relative imports resolved; 0 missing imports; 0 circular imports.
- Full Chromium regression: 85/85 PASS.
- Mobile geometry regression: 105/105 overflow checks PASS across 5 viewport/orientation configurations.
- Save Manager dialog remains within viewport in all 5 configurations.
- Browser page exceptions: 0.
- Browser console errors: 0.
- World schema 16; save format 3; generator v3 unchanged.
- Save-system logic unchanged from v0.4.3.19.
- Save-system SHA-256: `d7e08132195959230e5c92458120fa3ef205bc72a25fb9eab78fff19e198f623`.

## Candidate exact-package verification

Candidate ZIP was clean-extracted and verified independently from the worktree:

- 42/42 JS/MJS test suites PASS.
- 157/157 explicit ES-module syntax checks PASS.
- Full Chromium regression: 85/85 PASS, process exit code 0.
- Mobile geometry regression: 105/105 PASS, process exit code 0.
- Browser page exceptions: 0.
- Browser console errors: 0.
- Save-system SHA-256 matches worktree.
- `src/app.js` and `src/ui/styles.css` hashes match worktree.

## Final exact-package verification

A final ZIP was clean-extracted and subjected to the complete gate:

- 42/42 JS/MJS test suites PASS.
- 157/157 explicit ES-module syntax checks PASS.
- Full Chromium regression: 85/85 PASS, process exit code 0.
- Mobile geometry regression: 105/105 PASS, process exit code 0.
- Browser page exceptions: 0.
- Browser console errors: 0.
- Save Manager dialog contained within every tested viewport.
- Runtime source hashes match the verified worktree/candidate.

After recording these verified results in this report, the release archive is rebuilt once and the complete exact-artifact gate is repeated so the published ZIP contains this stamped report.
