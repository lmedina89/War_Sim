# War Sim v0.4.3.17 — UI Architecture Refactor Phase 13

War Sim v0.4.3.17 is built directly from the verified v0.4.3.16 Phase 12 baseline. Runtime **0.4.3.17**, world schema **16**, save format **3**, generator **v3**.

## Phase 13 scope

This is the final planned UI-architecture cleanup phase. It extracts the remaining NPC Person Profile uniform DOM builder from `src/app.js` into `src/ui/render/personProfileUniform.js` and moves shared award-repeat device formatting into `src/ui/awardPresentation.js`.

The Person Profile context remains controller-owned in `src/app.js`; store/index access, selector composition, navigation, profile opening, commands, autosave, save/load, simulation services, progression rules, and canonical mutation remain unchanged.

`src/ui/render/personProfileUniform.js` is dependency-injected with registries, Soldier Identity selection, insignia creation, rank-insignia creation, and award-device formatting. It has no direct imports from commands, services, state, core, or selectors.

The permanent Chromium regression now explicitly opens a Tier-1 NPC personnel file, clicks **View Uniform**, verifies the uniform is visible and populated, then hides it again.

## Controller size

- v0.4.3.16 `src/app.js`: **32,652 bytes / 497 lines**
- v0.4.3.17 `src/app.js`: **29,714 bytes / 484 lines**

At this point the remaining `app.js` responsibilities are primarily legitimate application orchestration: store/event-bus composition, selector/context assembly, renderer wiring, command execution, autosave, save/load coordination, navigation, subscriptions, diagnostics, and top-level render sequencing. Further extraction should be justified by a concrete architecture need rather than line-count reduction.

## Compatibility invariants

- World schema: **16**
- Save format: **3**
- Generator: **v3**
- Existing save-system implementation remains unchanged.
