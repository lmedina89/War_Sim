# War Sim v0.4.3.2 — Mobile Polish & Legacy Award Compatibility

War Sim v0.4.3.2 is a narrowly scoped hotfix built directly from the packaged v0.4.3.1 Mobile App UX Overhaul. It preserves the established military visual identity and app-style navigation while correcting the Soldier Identity tab sizing, reducing Situation Feed scrolling, and repairing Army Service Ribbon compatibility for qualifying older careers.

Runtime **0.4.3.2**, world schema **16**, save format **3**, generator **v3**.

## v0.4.3.2 changes

- **Soldier Identity mobile tabs:** `Uniform / Loadout / Awards / Catalog / Record` now use five equal-width columns inside their own card instead of minimum-width columns that could visually over-size/overflow on narrow phones. A tighter <=420px rule keeps all five labels usable without changing the established active-tab design.
- **Situation Feed mobile compaction:** the Home Situation Feed is now a persisted disclosure panel. When open it shows only the three newest events by default, displays the total event count, and offers `Show All` / `Show Recent` controls. This keeps normal Home usage short while preserving intentional access to full history.
- **Legacy Army Service Ribbon compatibility:** qualifying older Army player careers that entered the operational unit after initial entry training but predate the v0.4.3 ASR grant now receive exactly one historical Army Service Ribbon record during same-schema load normalization.
- If an older save already contains the retired `award_basic_training` representation, that record is upgraded in place rather than duplicated. Existing prestige is preserved in that path.
- Historical ASR backfill uses the original enlistment/operational-entry evidence date and is idempotent across repeated loads. It does not create a current-time "Award Earned" notification for a historical migration.
- No world-schema or save-format bump was required.

## Preserved systems

The v0.4.3/v0.4.3.1 architecture remains intact: canonical `awardRecords`, qualification-derived marksmanship insignia, SVG ribbons/badges/tabs, uniform rendering, loadout-derived combat profile, award catalog, DD214-style preview, Career/Unit/Personnel app screens, bottom navigation, living career/unit simulation, schools, qualifications, service record, relationships, and all canonical gameplay state.

The architectural rule remains **earn once → record once → display everywhere**.

## Compatibility and deferred work

Same-schema saves are normalized to runtime version 0.4.3.2 through the existing migration path. The ASR repair is deliberately evidence-based and duplicate-safe.

The previously audited save-recovery defects remain deferred by design. `src/core/saveSystem.js` is byte-identical to the packaged v0.4.3.1 baseline; automatic manual-backup restoration and corrupted save-index reconstruction are not changed in this hotfix.

## QA

The packaged release passes **17/17 test scripts**, including the new `mobile-polish-compatibility.mjs` regression suite. The core quality suite validates **300 deterministic generated worlds** and a **10,000-person** stress/index case. All **108 JS/MJS files** under `src/` and `tests/` pass `node --check`.

The dedicated hotfix regression coverage verifies:

- qualifying legacy careers receive exactly one ASR backfill;
- repeated migration does not duplicate the ribbon;
- legacy ASR records upgrade in place without double-counting prestige;
- migrated worlds remain validator-clean;
- Situation Feed is a persisted disclosure with a three-event default preview and explicit expansion control;
- Soldier Identity uses five equal-width mobile tab columns.

A Chromium headless smoke attempt was made at a 390×844 mobile viewport, but Chromium timed out in the container with environment/DBus errors. It is therefore explicitly **not** claimed as a passing browser-render test. Device screenshots supplied during development remain the primary real-browser visual evidence for the v0.4.3.1 design baseline.
