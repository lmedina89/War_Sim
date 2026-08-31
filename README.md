# War Sim v0.4.3.2.2 — Rank Insignia & Situation Patch Polish

War Sim v0.4.3.2.2 is a narrow follow-up built directly from the exact packaged v0.4.3.2.1 Formation Identity & Insignia Integration release. It keeps world schema 16, save format 3, generator v3, and preserves the deferred save-recovery scope while preserving the named-formation work and adding SVG rank insignia plus a compact Current Situation formation-patch treatment.

Runtime **0.4.3.2.2**, world schema **16**, save format **3**, generator **v3**.

## v0.4.3.2.2 changes

- Army 11B careers no longer exist only inside generic `Alpha Company / Platoon / Squad` context. Every compatible career now receives a deterministic, seed-stable named higher formation.
- Default conventional starting formation pool: 82d Airborne Division, 7th Infantry Division, 5th Infantry Division, or 193d Infantry Brigade.
- 75th Ranger Regiment and 7th Special Forces Group are registered as historical formation identities but are deliberately excluded from the default 11B start pool until future selection/qualification pipelines exist.
- Higher formation lineage is inserted above the existing company/platoon/squad structure without replacing the existing roster, billets, relationships, schedule, readiness, or player assignment.
- Same-schema v0.4.3.2 saves are normalized on load: if the old career has only generic company/platoon/squad parents, the higher named formation is added deterministically from the existing world seed.
- Initial assignment orders now identify the complete named chain rather than only the squad.
- Unit Assignment and Command Display surfaces show the current formation patch and name.
- Personnel records now include Formation as distinct assignment context, and personnel/unit metadata includes higher-formation context.
- DD214-style record preview uses the complete assignment chain instead of only the squad label.
- Uniform badges are centered beneath the soldier name tape; ribbons are centered beneath the `U.S. ARMY` tape.
- The text-only uniform rank marker has been replaced by SVG Army rank insignia derived from the canonical `rankId` (PVT through 1SG and 2LT through CPT as currently defined).
- Current Situation now shows a compact version of the player's current higher-formation insignia beside the identity block.

## SVG asset integration

Twelve SVG designs are now represented in the runtime insignia renderer:

Historical unit-patch identities:
- 82d Airborne Division
- 7th Infantry Division
- 5th Infantry Division
- 193d Infantry Brigade
- 75th Ranger Regiment
- 7th Special Forces Group

Original fictional campaign emblems:
- Northern Shield
- Iron Viper
- Falcon Spear
- Ember Watch
- Night Anvil
- Red Horizon

The six campaign emblems are registered now but intentionally remain future-facing until the campaign/deployment system has a canonical campaign record to attach them to. Source SVG sheets are preserved under `assets/insignia/`.

## Compatibility and architecture

- Save format remains **3**.
- World schema remains **16**.
- Generator remains **v3**.
- Formation choice is derived from the existing world seed without consuming or shifting runtime RNG state.
- No `src/core/saveSystem.js` changes were made.
- Existing v0.4.3.2 award/ribbon compatibility logic remains intact.
- Unit patch art is a presentation reference attached to canonical formation identity; it is not duplicated per soldier.

## QA summary

- **18/18** test scripts pass.
- Dedicated formation/SVG compatibility test passes.
- **300** deterministic generated-world seeds validated.
- **10,000-person** stress/index audit passes.
- **111** JS/MJS files pass `node --check`.
- Static unsafe-code sweep passes: no `eval`, `new Function`, `innerHTML =`, or `document.write` in production source.
- `src/core/saveSystem.js` remains byte-identical to v0.4.3.2.
- Headless Chromium 390×844 smoke attempt was made but timed out in the container with DBus/headless-environment errors; it is **not** claimed as a successful browser-render test.

## Deferred work

The previously audited save-recovery defects remain deferred for the planned v0.4.3.3 Save Recovery & Save Integrity release. Generated campaign emblems are intentionally not assigned to fake campaign records; they will plug into the future interactive campaign/deployment architecture when that canonical data exists.
