# War Sim v0.4.3.16 — UI Architecture Refactor Phase 12

War Sim v0.4.3.16 is built directly from the verified v0.4.3.15 Phase 11 baseline. Runtime **0.4.3.16**, world schema **16**, save format **3**, generator **v3**.

## Phase 12 scope

Phase 12 extracts the remaining Personnel Administration presentation boundary into `src/ui/render/administration.js`.

The extracted renderer owns only presentation for:

- active / vacant / replacement-request / separated manpower summary chips
- open vacancy and replacement-request list presentation
- recent personnel-action list presentation

Canonical personnel administration state remains selected by `selectPersonnelAdministration`, which is injected into the renderer from `src/app.js`. The renderer has no direct imports from commands, services, state, core, or selectors and performs no state mutation.

No gameplay rules, personnel lifecycle behavior, save schema, world schema, generator behavior, RNG behavior, progression rules, or simulation services were changed.

## Architecture impact

`src/app.js` changed from **33,373 bytes / 495 lines** in v0.4.3.15 to **32,652 bytes / 497 lines** in v0.4.3.16. The slight line-count increase comes from explicit dependency composition while the remaining inline Administration implementation was removed.

New module:

- `src/ui/render/administration.js`

New regression coverage:

- `tests/administration-module.mjs`
- Phase 12 Administration assertions added to `tests/browser-regression.py`

## Release gate

The source tree and exact packaged ZIP are required to pass:

- all JS/MJS test suites
- ES-module-aware syntax parsing
- relative import-target closure
- circular-import audit
- deterministic 300-world quality validation
- 10,000-person stress/index audit
- unsafe runtime-code scan
- save-system hash preservation
- app-wide Chromium browser regression
- clean extraction and repeat verification of the final ZIP

After Phase 12, the remaining `src/app.js` responsibilities should be audited before deciding whether any further extraction is architecturally justified.
