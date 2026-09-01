# War Sim v0.4.3.7 — Consolidated UI Architecture + Mobile Hardening

War Sim v0.4.3.7 is built directly from the verified v0.4.3.6 checkpoint. It consolidates the completed Personnel Profile architecture refactor with a narrow mobile/UI containment hardening pass discovered during real-device iPhone testing.

Runtime **0.4.3.7**, world schema **16**, save format **3**, generator **v3**.

## Included from v0.4.3.6

- `src/ui/dialogs/personProfile.js` remains the presentation-only Personnel Profile controller.
- Canonical lookup/state ownership remains in `src/app.js` through the injected profile context.
- The dialog module does not directly import commands, services, state, core, or selectors.
- Save/persistence architecture remains unchanged.

## Mobile/UI hardening

- Long values in shared military metric blocks now wrap instead of forcing horizontal overflow.
- Soldier Identity Awards/Insignia cards explicitly constrain dynamic metric values, including long `WHY EARNED` provenance text.
- Award Catalog copy/title grid children are explicitly shrinkable and wrap safely.
- Existing narrow-screen containment rules for DD214/service-record fields, record strips, unit metrics, school cards, situation text, dialogs, and navigation remain preserved.
- Added `tests/mobile-ui-hardening.mjs` to guard the concrete iPhone overflow regression and related containment rules.

## Compatibility

- World schema remains **16**.
- Save format remains **3**.
- Generator remains **v3**.
- Existing schema-16 saves continue through the existing same-schema normalization path.
- `src/core/saveSystem.js` is unchanged from the stabilized baseline.
- No gameplay rules, commands, services, selectors, data definitions, canonical entity schemas, save keys, checksums, or slot behavior changed.

## Still intentionally out of scope

This release does not add deployments/combat, additional MOS starts, Ranger/Special Forces pipelines, deep equipment, interactive schools, campaign generation, or the reusable interactive-duty/event framework planned for later feature work.
