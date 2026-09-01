# War Sim v0.4.3.10.3 — Software Quality Report

## Scope

Browser Startup Recovery Hotfix built directly from the exact user-uploaded `War-Sim-v0.4.3.10.2-GitHub(1).zip`.

Runtime **0.4.3.10.3**, world schema **16**, save format **3**, generator **v3**.

## Root cause

The Phase 5 history/archive extraction moved archive persistence behind `createHistoryArchiveController()`. `src/ui/dialogs/personProfile.js` still requires both `readUiArchive` and `writeUiArchive`, but the controller return object exposed `read` without exposing its existing `write` operation, and `src/app.js` passed `writeUiArchive` to `createPersonProfileController()` without defining that identifier. Real browser startup therefore failed with `ReferenceError: writeUiArchive is not defined` before the initial render, leaving only the static HTML/CSS shell.

## Fix

- `src/ui/historyArchive.js` now exposes its existing `write` operation.
- `src/app.js` binds `const writeUiArchive = historyArchive.write;` before Person Profile composition.
- Added `tests/startup-runtime-bindings.mjs` to verify the archive write contract, round-trip persistence, composition ordering, and Person Profile injection.
- No gameplay rules, schema, save format, generator behavior, commands, services, selectors, canonical records, or save-system behavior changed.

## Verification

- **31/31** test suites passed.
- **138/138** JS/MJS files passed ES-module-aware syntax parsing.
- `tests/quality.mjs`: PASS.
- **300** deterministic generated worlds validated.
- **10,000-person** stress/index audit passed.
- Import graph integrity: PASS.
- DOM integrity: PASS.
- Deterministic RNG audit: PASS.
- Save/migration compatibility: PASS.
- Career-boundary regression: PASS.
- Soldier Identity regression: PASS.
- Mobile UI hardening regression: PASS.
- Startup composition regression: PASS.
- New startup runtime-binding regression: PASS.
- Chromium browser startup proof: PASS with **0 page errors**; visible New Career form rendered with 3 inputs, 4 selects, `Begin Career`, and `Load Existing Career`.

## Stable save implementation

`src/core/saveSystem.js` SHA-256 remains:

`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`
