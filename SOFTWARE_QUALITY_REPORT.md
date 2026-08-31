# War Sim v0.3.2.2 — Software Quality Report

## Result

**PASS — no release-blocking defects found after the v0.3.2.2 fixes.**

This was performed as a separate audit from the feature smoke test. The audit covers the complete current source tree (59 JavaScript source modules, approximately 2,500 source lines) plus HTML/CSS integration and save behavior.

## Release-blocking issues found and fixed during this audit

1. **Hardcoded replacement career data** — replacements previously assumed Army / Active / 11B and used a hardcoded billet-rank table. Replaced with generation-profile and registry resolution.
2. **Hardcoded NPC promotion maps** — fixed rank/XP/TIS maps were removed. NPC progression now resolves next rank and requirements from rank definitions.
3. **Hardcoded generation interpretations** — rank IDs were parsed for service years and one billet ID was checked to choose a weapon. Both were moved into generation/billet definitions.
4. **Player weapon hardcoding** — initial player weapon now comes from the assigned billet definition.
5. **ETS off-by-one** — expiration now occurs on the contract end date.
6. **Time-step dependence** — NPC lifecycle formerly treated every call shorter than 30 days as a full monthly cycle. Simulation now uses elapsed-day month boundaries so 30×1-day and 1×30-day advancement agree for personnel progression.
7. **UI architecture** — bottom navigation was only scrolling a long page. It now switches among five real views.
8. **Render failure containment** — a render exception is now caught at the top-level UI boundary and reported without mutating canonical state.
9. **HTML injection hygiene** — the remaining `innerHTML` assignment in Inbox rendering was replaced with DOM text nodes.
10. **Selector efficiency** — vacant billets and open replacement requests now use derived indexes.

## Automated quality checks

### Source / module integrity
- all JavaScript files pass Node syntax parsing
- every static relative import resolves to an existing module
- no duplicate HTML IDs
- every DOM ID queried by `app.js` exists in `index.html`
- no `eval`, `new Function`, or `document.write`
- no runtime `innerHTML =` injection

### Determinism / data-driven architecture
- no direct `Math.random()` calls in source
- normal runtime modules contain no concrete `branch_army`, `specialty_army_11b`, concrete Army rank IDs, service-rifle IDs, or automatic-rifleman conditional IDs
- concrete content IDs remain allowed in definition files and isolated legacy migration/repair code
- same seed reproduction remains deterministic

### Definition/world integrity
- all registry definitions validate
- 300 additional generated worlds validated successfully across different seeds
- each generated world preserves unit/billet/person reference integrity
- generated worlds retain 91 billets / 90 pre-player personnel with one valid starting vacancy

### Save system
- manual save round trip preserves canonical state
- save metadata includes character/specialty/unit context
- checksum corruption is detected and blocks load
- existing schema migration coverage remains in smoke tests

### Simulation regression coverage
- squad roster integrity remains 9 personnel per rifle squad after player creation
- player appears in exactly one squad
- reenlistment flow still works
- personnel separation creates a durable vacancy/request
- replacement fills the correct billet after the configured latency
- replacement branch/specialty/equipment derive from data definitions
- ETS occurs exactly on contract end date
- 30×1-day vs 1×30-day advancement produces equal NPC experience/fatigue/readiness/rank outcomes

### Performance sanity check
A synthetic **10,000-person** world was passed through the derived index builder. The benchmark completed in tens of milliseconds in the test container, well below the deliberately generous 2-second regression threshold.

This is not a promise that a future nation-scale simulation is already optimized; it confirms the current index construction remains linear enough for the present architecture and guards against accidental quadratic regressions.

## Manual/static architecture review

### Passed
- player remains a normal Person entity
- definitions are immutable registries
- authoritative state is separate from UI
- selectors read state; commands/services own normal state changes
- indexes are rebuilt/derived rather than serialized
- generation metadata is stored with the world
- stable IDs are independent of names/display text
- legacy organization seeding is only referenced by migration code
- current UI view state is presentation-only and is not serialized into world state

### Known limitations (not defects for v0.3.2.2)
- only Active Army 11B is currently enabled as a player career
- 11A and 42A exist as NPC/framework specialties; their player training/career pipelines are intentionally not enabled yet
- organization generation currently creates one infantry company profile; battalion/brigade-scale content comes later
- administrative action history selector still sorts a small action collection at view time; this should gain a chronology index when action volume grows materially
- save persistence still uses browser localStorage; adequate for the current GitHub Pages build, but a larger save backend/export path may be needed as world size grows
- automated browser interaction testing is not yet part of the repository; current UI verification is DOM/controller structural testing plus live user testing

## Release recommendation

**Recommended as the stable v0.3.x foundation checkpoint**, assuming the live GitHub Pages visual test confirms the new five-view navigation and existing save loads correctly on the target iPhone browser.

After that live check, development can proceed to v0.4.x without another foundation release unless a real regression is discovered.
