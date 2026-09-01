# War Sim v0.4.3.9 — Software Quality Report

## Release identity

- Release: **v0.4.3.9 — UI Architecture Refactor Phase 5**
- Baseline: exact verified **v0.4.3.8** GitHub package
- Runtime: **0.4.3.9**
- World schema: **16**
- Save format: **3**
- Generator: **v3**

## Scope

This is a presentation-architecture refactor only. It extracts shared presentation primitives, relationship rendering, presentation-only history archive controls, and Inbox rendering from `src/app.js`. Canonical state, commands, services, selectors, save-format behavior, world schema, gameplay rules, and content definitions are not redesigned.

New focused modules:

- `src/ui/presentation.js`
- `src/ui/historyArchive.js`
- `src/ui/render/relationships.js`
- `src/ui/render/inbox.js`

`src/app.js` remains the composition root. It continues to own the state store, canonical selectors/actions, command execution, save validation/persistence coordination, and render orchestration. The extracted UI modules receive their dependencies through narrow presentation contracts.

## app.js reduction

- v0.4.3.8 baseline: **103,524 bytes / 785 lines**
- v0.4.3.9 final: **91,504 bytes / 747 lines**
- Reduction this phase: **12,020 bytes**

The Phase-5 architecture regression ceiling now requires `app.js` to remain below 100 KB.

## Automated verification

- **28/28 packaged test suites PASS**
- **134/134 JS/MJS files pass `node --check`**
- **106 runtime JS modules**
- `tests/quality.mjs`: **PASS**
- **300 deterministic generated worlds validated**
- **10,000-person index stress audit PASS**
- Observed final source-worktree index build: **10.85 ms** (environment-dependent regression indicator only)
- deterministic RNG audit PASS
- concrete runtime-ID audit PASS
- DOM integrity PASS
- import graph integrity PASS
- render containment PASS
- selector/index audit PASS
- migrations and same-schema runtime normalization PASS
- scheduler/opportunity/orders/readiness integration PASS
- mobile/UI regression suites PASS
- career-boundary integrity PASS
- save-storage regression PASS

## Phase-5 regression coverage

`tests/presentation-modules.mjs` exercises the extracted modules with a minimal fake DOM and verifies:

- shared rank/branch/status/document formatting;
- stable compact record references;
- military date formatting;
- metric/progress DOM construction;
- relationship band/meter/card rendering and profile-open callback behavior;
- UI archive persistence, clear/restore controls, and rerender callback behavior;
- Inbox unread/attention badges;
- dispatch rendering;
- opportunity-open/read acknowledgement/archive action callbacks;
- presentation modules remain free of canonical command/service imports and unsafe `innerHTML` assignment.

Existing tests that previously asserted presentation implementation strings inside `app.js` were redirected to the extracted module that now owns that behavior. The checks were preserved rather than removed.

## Structural safety checks

- **0 circular dependencies** in the runtime `src/` import graph.
- Static sweep found no runtime `eval`, `new Function`, `document.write`, or `.innerHTML =` assignment.
- New UI modules do not directly import canonical command/service/state/core mutation infrastructure.
- History archive state remains presentation-only and is stored through the existing resilient `uiStorage` wrapper.
- Inbox renderer receives notification mutations through injected callbacks rather than importing commands.

## Save compatibility

`src/core/saveSystem.js` is byte-identical to the stabilized baseline.

SHA-256:
`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`

World schema remains 16 and save format remains 3. Existing compatible saves normalize their runtime version to 0.4.3.9 through the existing same-schema migration path.

## Release assessment

**PASS.** v0.4.3.9 is suitable as the next provisional architecture checkpoint, subject to the user's later cumulative real-device smoke test after several refactor phases.
