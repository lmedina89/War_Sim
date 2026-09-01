# War Sim v0.4.3.15 — UI Architecture Refactor Phase 11

War Sim v0.4.3.15 is built directly from the verified v0.4.3.14 Phase 10 baseline. Runtime **0.4.3.15**, world schema **16**, save format **3**, generator **v3**.

## Phase 11 scope

Phase 11 extracts the Career Gameplay / Actions presentation boundary into `src/ui/render/careerGameplay.js`.

The extracted presentation module owns rendering for:

- Career objectives and completed-objective history
- Next 30 Days lookahead
- Unit Situation Feed
- Current Duty and Duty Schedule presentation
- Recent Unit Training presentation and UI-only archive controls
- Career Opportunities cards
- Military School catalog presentation
- Skill/performance presentation
- Pending decision cards
- Focused activity cards and Activity Log presentation

Canonical behavior remains outside the renderer. `src/app.js` still owns command execution, autosave, state/store access, opportunity acceptance/decline, decision resolution, focused activities, school requests, result dialogs, and render orchestration. These behaviors are injected into the renderer as callbacks.

No gameplay rules, save schema, world schema, generator behavior, RNG behavior, progression rules, or simulation services were changed.

## Architecture impact

`src/app.js` changed from **52,148 bytes / 609 lines** in v0.4.3.14 to **33,373 bytes / 495 lines** in v0.4.3.15.

New module:

- `src/ui/render/careerGameplay.js`

New regression coverage:

- `tests/career-gameplay-module.mjs`
- Phase 11 checks added to `tests/browser-regression.py`

The browser regression now explicitly verifies Career objectives, current duty, 30-day lookahead, duty schedule, opportunities, school catalog, skills, activity cards, actual activity execution, time advancement, and zero browser/runtime errors.

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
