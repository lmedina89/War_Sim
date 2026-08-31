# War Sim v0.4.3.2.2 — Software Quality Report

## Scope

v0.4.3.2.2 was built from the exact packaged v0.4.3.2.1 baseline as a narrow rank-insignia and Current Situation formation-patch presentation hotfix. It does not implement the deferred save-recovery work or introduce new combat/gameplay systems.

- Runtime: **0.4.3.2.2**
- World schema: **16**
- Save format: **3**
- World generator: **v3**

## Implemented changes reviewed

- Added canonical formation metadata for six Operation Just Cause-associated Army formations.
- Added six original campaign-emblem definitions for future campaign/deployment use.
- Added runtime SVG builders for all twelve insignia designs.
- Added deterministic higher-formation seeding above the existing infantry company/platoon/squad organization.
- Added same-schema legacy normalization so existing generic v0.4.3.2 careers receive named formation context without replacing their existing squad/roster.
- Added formation patch/name presentation to Unit Assignment and Command Display.
- Added higher-formation context to personnel records and service-record preview.
- Updated initial assignment order summaries to use the full named assignment chain.
- Centered badge and ribbon groups beneath their corresponding uniform tapes.
- Replaced the text-only uniform rank marker with canonical-rank-driven SVG insignia for all Army ranks currently present in the registry.
- Added a compact current-formation patch beside the player identity block in Current Situation.
- Added `tests/rank-insignia-situation.mjs` to verify every current rank mapping and the new Situation/Uniform wiring.

## Formation-start rules

Default conventional 11B starts are limited to:
- 82d Airborne Division
- 7th Infantry Division
- 5th Infantry Division
- 193d Infantry Brigade

75th Ranger Regiment and 7th Special Forces Group are present in canonical formation metadata and the SVG renderer, but `careerStartEligible` is false. This prevents the current generic 11B entry pipeline from incorrectly bypassing future Ranger/Special Forces selection requirements.

Formation selection is derived from the world seed with a non-RNG-consuming hash. Tests confirm the same seed selects the same formation and that all four eligible conventional formations occur across a seed sweep.

## Automated test results

**19/19 test scripts PASS**:

- availability-qualification-history.mjs
- awards-soldier-identity.mjs
- capability-foundation.mjs
- career-continuity.mjs
- formation-identity.mjs
- living-career-polish.mjs
- living-unit.mjs
- migration-qualification-hotfix.mjs
- mobile-app-navigation.mjs
- mobile-polish-compatibility.mjs
- mobile-ux-consolidation.mjs
- quality.mjs
- save-storage.mjs
- service-record-foundation.mjs
- smoke.mjs
- stability-hotfix.mjs
- training-consolidation.mjs
- unit-interaction-integrity.mjs

### Dedicated formation/SVG verification

`formation-identity.mjs` verifies:
- six historical formation definitions are registered;
- six custom campaign emblems are registered;
- all twelve SVG renderer IDs exist;
- fresh career-start worlds always resolve a named formation patch;
- formation selection is deterministic and seed-stable;
- all four conventional start formations appear across a 128-seed sweep;
- Ranger and Special Forces formations are not used by the default 11B start pipeline;
- initial assignment orders contain named higher-formation and company context;
- a simulated same-schema v0.4.3.2 legacy world with generic company-only parentage is backfilled on load.

## World generation / stress validation

Existing `quality.mjs` PASS results:
- **300 generated-world seeds validated**
- **10,000 stress personnel**
- deterministic RNG audit PASS
- runtime ID audit PASS
- DOM/import/render containment audits PASS
- canonical scheduler and readiness integration PASS
- selector/index audit PASS
- same-schema hotfix normalization PASS

Index build during the final run: approximately **13.56 ms** for the 10,000-person stress fixture in this container run.

## Syntax and static-source checks

- **111** JS/MJS files passed `node --check`.
- Static production-source sweep found no:
  - `eval(...)`
  - `new Function(...)`
  - `.innerHTML = ...`
  - `document.write(...)`

## Save-system containment

`src/core/saveSystem.js` was verified byte-identical to the exact packaged v0.4.3.2 baseline.

SHA-256 in both builds:

`b67d3d64caecbe2cd32f2e8d683fd28174326439485f629be0f7fad2a4eb0c43`

Therefore the previously deferred save-recovery implementation has not been mixed into this patch.

## Browser-render smoke

A Chromium headless 390×844 launch was attempted against a local HTTP server. Chromium timed out with DBus/headless container-environment errors and did not produce a reliable screenshot. This check is explicitly recorded as **NOT PASSED / environment-limited**, not silently counted as successful QA.

## Risk notes

- Historical patch artwork is a clean SVG recreation based on the previously approved test designs, not scanned official raster artwork.
- The game world date is fictional/future-facing; inclusion of historical formation identities should not be interpreted as a claim about real-world 2046 Army force structure.
- Higher HQ nodes currently provide organizational identity/context around the detailed company-level simulation. Deeper higher-HQ staffing and command simulation remain future work.
- The six fictional campaign emblems are registered but are not attached to fabricated campaign records. They are reserved for the future canonical campaign/deployment system.

## Result

Within the requested v0.4.3.2.2 scope, automated regression, generation, stress, syntax, static-source, compatibility, and save-system-containment checks pass. On-device visual verification remains recommended before replacing the currently deployed v0.4.3.2 GitHub Pages build.

## v0.4.3.2.2 focused verification

- 19/19 test scripts passed after a clean rerun.
- New focused rank/situation test covers all 11 Army rank IDs currently registered plus the Current Situation formation-insignia wiring.
- 112 JavaScript/MJS files passed `node --check`.
- Static source hazard sweep found no `eval`, `new Function`, `innerHTML =`, or `document.write`.
- `src/core/saveSystem.js` remains SHA-256 `b67d3d64caecbe2cd32f2e8d683fd28174326439485f629be0f7fad2a4eb0c43`, unchanged from v0.4.3.2.1.
