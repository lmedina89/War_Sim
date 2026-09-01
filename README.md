# War Sim v0.4.3.19 — Product Hardening 2: Load & Recovery Resilience

War Sim v0.4.3.19 is built directly from the accepted v0.4.3.18 Product Hardening 1 baseline. Runtime **0.4.3.19**, world schema **16**, save format **3**, generator **v3**.

## Product Hardening 2

This release strengthens player-facing load and recovery behavior without changing gameplay rules, progression, RNG, world schema, or save format.

- Distinguishes healthy, backup-recoverable, damaged, and incompatible save slots.
- A valid manual backup remains loadable when the primary copy is damaged.
- Damaged slots with no valid backup are clearly marked and are not offered a misleading Load action.
- Unsupported save-format/world-schema slots are classified as incompatible and never partially loaded.
- Load failures use stable player-facing messages while preserving useful integrity diagnostics.
- The Save Manager labels backup recovery as **Recover & Load**.
- Backward compatibility is explicitly tested with a v0.4.3.17 save-format-3 / world-schema-16 fixture.
- Permanent Chromium regression now injects damaged and unsupported save fixtures and verifies their UI behavior.

## Architecture baseline

The v0.4.3.17 architecture-refactor baseline remains intact. `app.js` remains controller/orchestration code; no gameplay presentation was moved back into it.

## Compatibility

- World schema: **16**
- Save format: **3**
- Generator: **v3**
- Existing compatible v0.4.3.17/v0.4.3.18 careers remain loadable and are normalized to the current runtime version during migration.
