# War Sim v0.4.0 — Software Quality Report

## Result

**PASS**

This report is separate from the gameplay implementation summary. It covers source integrity, simulation determinism, data-model correctness, migration safety, runtime architecture, save integrity, browser/UI coupling, and basic scaling characteristics for the final v0.4.0 worktree.

## Scope audited

- 67 JavaScript modules under `src/`
- canonical world schema 12
- four new gameplay entity collections
- four new definition registries
- activity/effect/event/decision pipeline
- existing military organization, contracts, reenlistment, personnel administration, migration, save/load, and five-view UI foundation

## Automated quality results

| Check | Result |
|---|---|
| JavaScript syntax | PASS |
| Static relative-import resolution | PASS |
| Definition validation | PASS |
| DOM IDs required by controller | PASS |
| Duplicate DOM IDs | PASS |
| Five-view navigation foundation | PASS |
| Unit/Personnel state independence | PASS |
| Render error containment | PASS |
| Direct `Math.random()` audit | PASS |
| `eval` / `new Function` / `document.write` audit | PASS |
| Runtime `innerHTML =` audit | PASS |
| Concrete Army/11B/rank/weapon ID audit in normal runtime modules | PASS |
| Hot-selector global people-scan guard | PASS |
| Save/checksum round trip | PASS |
| Corrupted-save checksum rejection | PASS |
| Schema 11 → 12 preservation | PASS |
| Same-seed world determinism | PASS |
| Same-seed activity determinism | PASS |
| Generated-world integrity (formal suite) | PASS — 300 seeds |
| Extended generated-world sweep | PASS — 1,000 seeds, 0 failures |
| 10,000-person index stress | PASS |

Formal quality-suite index benchmark on the final worktree: approximately **12 ms** for the 10,000-person synthetic index build in this container environment. This is a regression indicator, not a device-performance guarantee.

## Gameplay-system checks

The QA suite verifies that:

- every generated person has exactly one skill profile;
- skill values remain inside definition bounds;
- activity definitions resolve through registries;
- activities consume canonical world time;
- activity effects update skills through the generic effect engine;
- activity completion creates canonical activity and performance records;
- event tables use centralized deterministic RNG;
- pending decision records expose definition-driven choices;
- resolving a decision applies the selected definition effects and closes the pending event;
- fresh generated personnel specialty matches the billet-specialty mapping in the generation profile;
- replacement personnel continue to resolve branch/specialty/rank/equipment from definitions/profiles;
- old v0.3.2.3 careers migrate without roster regeneration or reassignment.

## Efficiency review

The normal gameplay paths use derived indexes for person-by-unit, relationships-by-person, activities-by-person, events-by-person, skill-profile-by-person, career/order/admin lookups, and recent personnel actions. The generic effect engine accepts indexed relationship IDs from the activity command so squad relationship effects do not require a world-wide relationship scan.

Known whole-collection passes remain where they are appropriate or currently bounded: index construction, full validation, migration/repair code, world generation, personnel lifecycle batch simulation, and rare replacement-name uniqueness checks. These are not normal per-card UI query paths.

## Architecture review

The v0.4 runtime remains definition-driven. Content-specific identifiers are allowed in definition files and historical migration/repair code, but the quality audit rejects concrete Army/11B/rank/weapon IDs in normal runtime modules. The new gameplay services consume registry definitions by ID and execute generic rules.

A pre-existing generator inconsistency was identified during this review and corrected: fresh NPC specialty affiliation now resolves from the generation profile's billet-specialty map instead of copying the player scenario specialty to every generated billet.

## Risk / deferred work

v0.4.0 intentionally does **not** attempt to implement the whole v0.4 roadmap in one release. Deferred systems include calculated unit readiness from underlying training/equipment state, NPC scheduled training, richer qualifications, unit field exercises/AARs, evaluations, leave/pass, broad event libraries, deployment alerts/staging, and deployment missions. Building those on the generic v0.4.0 activity/effect/event framework is safer than implementing them as isolated features now.

No blocker was found that should prevent progression to v0.4.1 after live-device validation.
